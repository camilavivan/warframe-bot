/**
 * Native DE CDN worldstate source — fetch api.warframe.com/cdn/worldState.php
 * and parse with warframe-worldstate-parser (no warframe-status required).
 */
import 'reflect-metadata';
import { fetch, type Dispatcher } from 'undici';
import WorldStateParser from 'warframe-worldstate-parser';
import { loadConfig } from '../config.js';
import { globalCache } from './cache.js';
import { logger } from './logger.js';
import {
  getApiDispatcher,
  getApiRequestHeaders,
  isVoidTraderActive,
  type WorldState,
} from './warframestat.js';

const log = logger.child({ module: 'de-worldstate' });

const DEFAULT_DE_URL = 'https://api.warframe.com/cdn/worldState.php';

/** No-op debug logger so parser kuva/outpost/drop messages stay quiet (console.debug is noisy). */
const quietParserLogger = { debug: (_message: string) => {} };

/** Match warframestat drops enrichment URLs (Cloudflare HTML breaks JSON). */
function isWarframestatDropsUrl(url: string): boolean {
  return /warframestat\.us\/drops(?:\/|$|\?)/i.test(url) || /\/drops\/search\//i.test(url);
}

function resolveFetchUrl(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  if (input && typeof input === 'object' && 'url' in input && typeof (input as { url: unknown }).url === 'string') {
    return (input as { url: string }).url;
  }
  return String(input);
}

/** Convert parser class instances → plain JSON matching warframestat shapes. */
export function mapParsedWorldState(parsed: unknown): WorldState {
  const plain = JSON.parse(JSON.stringify(parsed)) as WorldState;

  if (plain.timestamp && typeof plain.timestamp !== 'string') {
    plain.timestamp = new Date(plain.timestamp as unknown as string | number | Date).toISOString();
  }

  // Normalize void trader active flag (parser may omit it)
  if (plain.voidTrader && typeof plain.voidTrader.active !== 'boolean') {
    plain.voidTrader.active = isVoidTraderActive(plain.voidTrader);
  }
  if (Array.isArray(plain.voidTraders)) {
    for (const vt of plain.voidTraders) {
      if (vt && typeof vt.active !== 'boolean') {
        vt.active = isVoidTraderActive(vt);
      }
    }
  }
  if (plain.vaultTrader && typeof plain.vaultTrader.active !== 'boolean') {
    plain.vaultTrader.active = isVoidTraderActive(plain.vaultTrader);
  }

  // Drop obviously stub / expired arbitration (no kuva feed when offline from DE-only)
  const arb = plain.arbitration as { expired?: boolean; node?: string; type?: string } | undefined;
  if (arb && (arb.expired === true || arb.node === 'SolNode000' || arb.type === 'Unknown')) {
    delete plain.arbitration;
  }

  // Parser invasions are nested (attacker/defender); flatten for formatInvasions
  if (Array.isArray((plain as { invasions?: unknown }).invasions)) {
    type NestedReward = {
      asString?: string;
      credits?: number;
      countedItems?: Array<{ type?: string; key?: string; count?: number }>;
      items?: string[];
      thumbnail?: string;
    };
    type NestedSide = { faction?: string; reward?: NestedReward };
    type NestedInvasion = {
      attackingFaction?: string;
      defendingFaction?: string;
      attackerReward?: NestedReward;
      defenderReward?: NestedReward;
      attacker?: NestedSide;
      defender?: NestedSide;
      [k: string]: unknown;
    };
    const rewardAsString = (reward?: NestedReward): string | undefined => {
      if (!reward) return undefined;
      if (reward.asString?.trim()) return reward.asString;
      const parts: string[] = [];
      for (const it of reward.countedItems ?? []) {
        const name = (it.type || it.key || '').trim();
        if (!name) continue;
        parts.push(it.count && it.count > 1 ? `${name}×${it.count}` : name);
      }
      for (const it of reward.items ?? []) {
        if (it?.trim()) parts.push(it.trim());
      }
      if (reward.credits && reward.credits > 0) parts.push(`${reward.credits}cr`);
      return parts.length ? parts.join('、') : undefined;
    };
    (plain as { invasions: NestedInvasion[] }).invasions = (
      plain as { invasions: NestedInvasion[] }
    ).invasions.map((inv) => {
      const ar = rewardAsString(inv.attackerReward ?? inv.attacker?.reward);
      const dr = rewardAsString(inv.defenderReward ?? inv.defender?.reward);
      const attackerReward = ar
        ? { ...(inv.attacker?.reward ?? inv.attackerReward ?? {}), asString: ar }
        : inv.attackerReward;
      const defenderReward = dr
        ? { ...(inv.defender?.reward ?? inv.defenderReward ?? {}), asString: dr }
        : inv.defenderReward;
      return {
        ...inv,
        attackingFaction: inv.attackingFaction ?? inv.attacker?.faction,
        defendingFaction: inv.defendingFaction ?? inv.defender?.faction,
        attackerReward,
        defenderReward,
      };
    });
  }

  return plain;
}

/**
 * Parse raw DE worldState.php JSON string into our WorldState shape.
 * Short-circuits warframestat drops enrichment fetch (Cloudflare HTML) and
 * uses a quiet parser logger so kuva/outpost skip debug lines do not spam console.
 */
export async function parseDeWorldStateJson(
  raw: string,
  locale = 'zh',
): Promise<WorldState> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (...args: Parameters<typeof globalThis.fetch>) => {
    const url = resolveFetchUrl(args[0]);
    if (isWarframestatDropsUrl(url)) {
      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return originalFetch(...args);
  }) as typeof globalThis.fetch;

  try {
    const parsed = await WorldStateParser.build(raw, {
      locale: (locale || 'zh') as 'zh',
      logger: quietParserLogger,
    });
    return mapParsedWorldState(parsed);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchDeRaw(url: string, dispatcher?: Dispatcher): Promise<string> {
  const headers = {
    ...getApiRequestHeaders(),
    Accept: 'application/json, text/plain, */*',
  };
  const opts: Parameters<typeof fetch>[1] = {
    headers,
    ...(dispatcher ? { dispatcher } : {}),
  };
  log.debug({ url }, 'fetch DE worldstate');
  const res = await fetch(url, opts);
  if (!res.ok) {
    const snippet = (await res.text().catch(() => '')).slice(0, 200).replace(/\s+/g, ' ').trim();
    throw new Error(`HTTP ${res.status} for ${url}${snippet ? ` body=${JSON.stringify(snippet)}` : ''}`);
  }
  return res.text();
}

/**
 * Fetch + parse DE CDN worldstate (cached by URL + locale + TTL).
 */
export async function fetchDeWorldState(): Promise<WorldState> {
  const cfg = loadConfig();
  const url = (cfg.api.deWorldStateUrl || DEFAULT_DE_URL).trim() || DEFAULT_DE_URL;
  const locale = cfg.api.language || 'zh';
  const ttl = cfg.api.cacheTtlMs ?? 30_000;
  const cacheKey = `de-ws:${url}:${locale}`;

  const cached = globalCache.get<WorldState>(cacheKey);
  if (cached !== undefined) return cached;

  const dispatcher = getApiDispatcher();
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await fetchDeRaw(url, dispatcher);
      const ws = await parseDeWorldStateJson(raw, locale);
      globalCache.set(cacheKey, ws, ttl);
      log.info(
        {
          url,
          locale,
          fissures: ws.fissures?.length ?? 0,
          hasSortie: !!ws.sortie,
          hasCalendar: !!ws.calendar,
        },
        'DE worldstate hydrated',
      );
      return ws;
    } catch (err) {
      lastErr = err;
      if (attempt === 0) {
        log.warn({ err, attempt }, 'DE worldstate fetch retry');
        await sleep(400);
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
