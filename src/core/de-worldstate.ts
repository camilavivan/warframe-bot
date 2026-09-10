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

  return plain;
}

/** Parse raw DE worldState.php JSON string into our WorldState shape. */
export async function parseDeWorldStateJson(
  raw: string,
  locale = 'zh',
): Promise<WorldState> {
  const parsed = await WorldStateParser.build(raw, {
    locale: (locale || 'zh') as 'zh',
  });
  return mapParsedWorldState(parsed);
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
