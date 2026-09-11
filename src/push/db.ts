import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { logger } from '../core/logger.js';
import type { ChatType } from '../commands/types.js';

const log = logger.child({ module: 'db' });

export type Platform = 'onebot' | 'kook' | 'qqofficial';

export const PUSH_TOPICS = [
  'worldstate',
  'sortie',
  'arbitration',
  'fissures',
  'cetus-night',
  'invasions',
  'voidtrader',
  'darvo',
  'archon',
  'calendar',
  'events',
] as const;

export type PushTopic = (typeof PUSH_TOPICS)[number];

/** Topics that fan out to umbrella `worldstate` subscribers. */
export const WORLDSTATE_CHILD_TOPICS = [
  'sortie',
  'arbitration',
  'fissures',
  'cetus-night',
  'invasions',
  'voidtrader',
  'darvo',
  'archon',
  'calendar',
  'events',
] as const satisfies readonly PushTopic[];

export function isPushTopic(s: string): s is PushTopic {
  return (PUSH_TOPICS as readonly string[]).includes(s);
}

/** Chinese display labels for push topics. */
export const PUSH_TOPIC_LABELS: Record<PushTopic, string> = {
  worldstate: '世界状态',
  sortie: '突击',
  arbitration: '仲裁',
  fissures: '裂缝',
  'cetus-night': '平原夜',
  invasions: '入侵',
  voidtrader: '奸商',
  darvo: '特惠',
  archon: '猎杀',
  calendar: '日历',
  events: '特殊事件',
};

/** Chinese (and synonym) aliases → canonical English topic. */
export const PUSH_TOPIC_ALIASES: Record<string, PushTopic> = {
  世界状态: 'worldstate',
  特殊事件: 'events',
  突击: 'sortie',
  仲裁: 'arbitration',
  裂缝: 'fissures',
  裂隙: 'fissures',
  虚空裂缝: 'fissures',
  平原夜: 'cetus-night',
  希图斯夜: 'cetus-night',
  入侵: 'invasions',
  奸商: 'voidtrader',
  特惠: 'darvo',
  猎杀: 'archon',
  日历: 'calendar',
};

/** Resolve English topic or Chinese alias to a PushTopic. */
export function resolvePushTopic(input: string): PushTopic | null {
  const raw = input.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (isPushTopic(lower)) return lower;
  const fromAlias = PUSH_TOPIC_ALIASES[raw] ?? PUSH_TOPIC_ALIASES[lower];
  return fromAlias ?? null;
}

/** Multi-line topic help for 订阅 / 菜单 (uses 「」 not <>). */
export function formatPushTopicsHelp(): string {
  return PUSH_TOPICS.map((t) => `· ${PUSH_TOPIC_LABELS[t]}`).join('\n');
}

export interface Subscriber {
  platform: Platform;
  /** group_id / channel_id / user_id */
  chatId: string;
  chatType: ChatType;
  /** @deprecated alias of chatId */
  groupId: string;
  /** Optional push filter; null/undefined = all */
  filter: SubscriptionFilter | null;
}

/** Stored on subscription rows (filter_json). null = receive all. */
export type SubscriptionFilter = {
  hard?: boolean;
  storm?: boolean;
  tier?: string;
  tierNum?: number;
  fast?: boolean;
  /** Arbitration mission type keyword (EN or ZH), e.g. survival / 生存 */
  missionType?: string;
};

export interface SubscriptionRow {
  topic: PushTopic;
  filter: SubscriptionFilter | null;
}

export type SubscribeOutcome = 'created' | 'updated' | 'unchanged';

const ARB_MISSION_ALIASES: Record<string, string> = {
  survival: 'survival',
  生存: 'survival',
  defense: 'defense',
  防御: 'defense',
  防守: 'defense',
  exterminate: 'exterminate',
  extermination: 'exterminate',
  歼灭: 'exterminate',
  capture: 'capture',
  捕获: 'capture',
  rescue: 'rescue',
  救援: 'rescue',
  spy: 'spy',
  间谍: 'spy',
  interception: 'interception',
  拦截: 'interception',
  excavation: 'excavation',
  挖掘: 'excavation',
  disruption: 'disruption',
  干扰: 'disruption',
  defection: 'defection',
  叛逃: 'defection',
  'mobile defense': 'mobile defense',
  移动防御: 'mobile defense',
  hijack: 'hijack',
  劫持: 'hijack',
  sabotage: 'sabotage',
  破坏: 'sabotage',
};

function parseFilterJson(raw: string | null | undefined): SubscriptionFilter | null {
  if (raw == null || raw === '') return null;
  try {
    const v = JSON.parse(raw) as SubscriptionFilter;
    if (!v || typeof v !== 'object') return null;
    return v;
  } catch {
    return null;
  }
}

export function serializeSubscriptionFilter(filter: SubscriptionFilter | null | undefined): string | null {
  if (!filter) return null;
  const keys = Object.keys(filter).filter((k) => (filter as Record<string, unknown>)[k] !== undefined);
  if (!keys.length) return null;
  return JSON.stringify(filter);
}

/** Human-readable filter suffix for replies / 订阅列表. */
export function formatSubscriptionFilterLabel(filter: SubscriptionFilter | null | undefined): string {
  if (!filter) return '';
  const parts: string[] = [];
  if (filter.hard) parts.push('钢铁');
  if (filter.storm) parts.push('风暴');
  if (filter.fast) parts.push('速刷');
  if (filter.tier) parts.push(filter.tier);
  else if (filter.tierNum) parts.push(`t${filter.tierNum}`);
  if (filter.missionType) {
    const mt = filter.missionType;
    const zhHit = Object.entries(ARB_MISSION_ALIASES).find(
      ([k, en]) => en === mt && /[\u4e00-\u9fff]/.test(k),
    );
    parts.push(zhHit?.[0] ?? mt);
  }
  return parts.length ? parts.join('·') : '';
}

/**
 * Parse `订阅` args: topic [filter...].
 * Examples: `裂缝 钢铁` / `fissures steel` / `仲裁 生存`.
 */
export function parseSubscribeArgs(args: string): {
  topic: PushTopic;
  filter: SubscriptionFilter | null;
  filterLabel: string;
} | null {
  const tokens = args
    .trim()
    .split(/[\s,，、|/]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (!tokens.length) return null;

  // Longest-first topic match on joined prefixes (handles cetus-night as one token already)
  let topic: PushTopic | null = null;
  let rest: string[] = [];
  for (let n = Math.min(tokens.length, 2); n >= 1; n--) {
    const candidate = tokens.slice(0, n).join(' ');
    const resolved = resolvePushTopic(candidate);
    if (resolved) {
      topic = resolved;
      rest = tokens.slice(n);
      break;
    }
  }
  if (!topic) {
    // also try first token only via resolve
    topic = resolvePushTopic(tokens[0]);
    if (!topic) return null;
    rest = tokens.slice(1);
  }

  if (!rest.length) {
    return { topic, filter: null, filterLabel: '' };
  }

  if (topic === 'fissures') {
    // lazy import avoided — fissure filter fields mirrored here via dynamic require pattern
    // Callers pass through parseFissureArgs from formatters; we inline compatible parse:
    const filter = parseFissureSubscribeFilter(rest.join(' '));
    return { topic, filter, filterLabel: formatSubscriptionFilterLabel(filter) };
  }

  if (topic === 'arbitration') {
    const joined = rest.join(' ').toLowerCase();
    const raw = rest.join(' ');
    const mapped =
      ARB_MISSION_ALIASES[raw] ||
      ARB_MISSION_ALIASES[joined] ||
      ARB_MISSION_ALIASES[rest[0]] ||
      ARB_MISSION_ALIASES[rest[0].toLowerCase()];
    if (!mapped) {
      // still store as missionType keyword for substring match
      const filter: SubscriptionFilter = { missionType: rest[0] };
      return { topic, filter, filterLabel: rest[0] };
    }
    const filter: SubscriptionFilter = { missionType: mapped };
    return { topic, filter, filterLabel: formatSubscriptionFilterLabel(filter) };
  }

  // Other topics: ignore unknown trailing tokens (treat as unfiltered) — caller may warn
  return { topic, filter: null, filterLabel: '' };
}

function parseFissureSubscribeFilter(args: string): SubscriptionFilter {
  // Mirror parseFissureArgs semantics without importing formatters (avoid cycle).
  const tokens = args
    .trim()
    .split(/[\s,，、|/]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const filter: SubscriptionFilter = {};
  let sawFast = false;
  const tierMap: Record<string, { tier: string; tierNum: number }> = {
    t1: { tier: 'Lith', tierNum: 1 },
    lith: { tier: 'Lith', tierNum: 1 },
    古纪: { tier: 'Lith', tierNum: 1 },
    t2: { tier: 'Meso', tierNum: 2 },
    meso: { tier: 'Meso', tierNum: 2 },
    前纪: { tier: 'Meso', tierNum: 2 },
    t3: { tier: 'Neo', tierNum: 3 },
    neo: { tier: 'Neo', tierNum: 3 },
    中纪: { tier: 'Neo', tierNum: 3 },
    t4: { tier: 'Axi', tierNum: 4 },
    axi: { tier: 'Axi', tierNum: 4 },
    后纪: { tier: 'Axi', tierNum: 4 },
    t5: { tier: 'Requiem', tierNum: 5 },
    requiem: { tier: 'Requiem', tierNum: 5 },
    安魂: { tier: 'Requiem', tierNum: 5 },
    t6: { tier: 'Omnia', tierNum: 6 },
    omnia: { tier: 'Omnia', tierNum: 6 },
    万用: { tier: 'Omnia', tierNum: 6 },
  };
  for (const raw of tokens) {
    const t = raw.toLowerCase();
    if (t === '钢铁' || t === 'hard' || t === 'sp' || t === 'steel' || t === 'steelpath') {
      filter.hard = true;
      continue;
    }
    if (t === '风暴' || t === 'storm' || t === '虚空风暴') {
      filter.storm = true;
      continue;
    }
    if (t === '速刷' || t === 'fast' || t === 'quick' || t === 'speed') {
      filter.fast = true;
      sawFast = true;
      continue;
    }
    if (t === '普通' || t === 'normal') {
      filter.hard = false;
      filter.storm = false;
      continue;
    }
    const mapped = tierMap[t];
    if (mapped) {
      filter.tier = mapped.tier;
      filter.tierNum = mapped.tierNum;
    }
  }
  if (sawFast && filter.hard === undefined) filter.hard = false;
  return filter;
}

/** Whether an arbitration mission type matches an optional subscription filter. */
export function matchesArbitrationFilter(
  missionType: string | undefined | null,
  filter: SubscriptionFilter | null | undefined,
): boolean {
  if (!filter?.missionType) return true;
  const want = filter.missionType.toLowerCase();
  const raw = (missionType || '').toLowerCase();
  if (!raw) return false;
  if (raw === want || raw.includes(want) || want.includes(raw)) return true;
  // alias reverse: compare canonical
  const canonRaw = ARB_MISSION_ALIASES[raw] || ARB_MISSION_ALIASES[missionType || ''];
  if (canonRaw && canonRaw === want) return true;
  return false;
}


let db: Database.Database | null = null;

function ensureSubscriptionColumns(database: Database.Database): void {
  const cols = database.prepare(`PRAGMA table_info(subscriptions)`).all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));
  if (!names.has('chat_type')) {
    database.exec(`ALTER TABLE subscriptions ADD COLUMN chat_type TEXT NOT NULL DEFAULT 'group'`);
    log.info('migrated subscriptions: added chat_type');
  }
  if (!names.has('filter_json')) {
    database.exec(`ALTER TABLE subscriptions ADD COLUMN filter_json TEXT`);
    log.info('migrated subscriptions: added filter_json');
  }
}

export function getDb(sqlitePath: string): Database.Database {
  if (db) return db;
  mkdirSync(dirname(sqlitePath), { recursive: true });
  db = new Database(sqlitePath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      platform TEXT NOT NULL,
      group_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      chat_type TEXT NOT NULL DEFAULT 'group',
      filter_json TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      PRIMARY KEY (platform, group_id, topic)
    );
    CREATE TABLE IF NOT EXISTS push_dedupe (
      topic TEXT NOT NULL,
      item_key TEXT NOT NULL,
      pushed_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      PRIMARY KEY (topic, item_key)
    );
  `);
  ensureSubscriptionColumns(db);
  log.info({ sqlitePath }, 'sqlite ready');
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Subscribe chat to topic with optional filter_json.
 * created = new row; updated = filter/chatType changed; unchanged = same.
 */
export function subscribe(
  platform: Platform,
  chatId: string,
  topic: PushTopic,
  chatType: ChatType = 'group',
  filter: SubscriptionFilter | null = null,
): SubscribeOutcome {
  if (!db) throw new Error('db not init');
  const filterJson = serializeSubscriptionFilter(filter);
  const row = db
    .prepare(
      'SELECT chat_type, filter_json FROM subscriptions WHERE platform = ? AND group_id = ? AND topic = ?',
    )
    .get(platform, chatId, topic) as { chat_type?: string; filter_json?: string | null } | undefined;
  if (row) {
    const prevFilter = row.filter_json ?? null;
    const sameFilter = prevFilter === filterJson || (prevFilter == null && filterJson == null);
    const sameType = row.chat_type === chatType;
    if (sameFilter && sameType) return 'unchanged';
    db.prepare(
      'UPDATE subscriptions SET chat_type = ?, filter_json = ? WHERE platform = ? AND group_id = ? AND topic = ?',
    ).run(chatType, filterJson, platform, chatId, topic);
    return 'updated';
  }
  db.prepare(
    'INSERT INTO subscriptions (platform, group_id, topic, chat_type, filter_json) VALUES (?, ?, ?, ?, ?)',
  ).run(platform, chatId, topic, chatType, filterJson);
  return 'created';
}

export function unsubscribe(platform: Platform, chatId: string, topic: PushTopic): boolean {
  if (!db) throw new Error('db not init');
  const info = db
    .prepare('DELETE FROM subscriptions WHERE platform = ? AND group_id = ? AND topic = ?')
    .run(platform, chatId, topic);
  return info.changes > 0;
}

export function listSubscriptions(platform: Platform, chatId: string): SubscriptionRow[] {
  if (!db) throw new Error('db not init');
  const rows = db
    .prepare(
      'SELECT topic, filter_json FROM subscriptions WHERE platform = ? AND group_id = ? ORDER BY topic',
    )
    .all(platform, chatId) as Array<{ topic: string; filter_json?: string | null }>;
  return rows.map((r) => ({
    topic: r.topic as PushTopic,
    filter: parseFilterJson(r.filter_json),
  }));
}

export function getSubscribers(topic: PushTopic): Subscriber[] {
  if (!db) throw new Error('db not init');
  const rows = db
    .prepare('SELECT platform, group_id, chat_type, filter_json FROM subscriptions WHERE topic = ?')
    .all(topic) as Array<{
    platform: string;
    group_id: string;
    chat_type?: string;
    filter_json?: string | null;
  }>;
  return rows.map((r) => {
    const chatType: ChatType = r.chat_type === 'private' ? 'private' : 'group';
    return {
      platform: r.platform as Platform,
      chatId: r.group_id,
      chatType,
      groupId: r.group_id,
      filter: parseFilterJson(r.filter_json),
    };
  });
}

/**
 * Returns true if this key has NOT been pushed before (and marks it).
 * Used for dedupe across poll cycles.
 */
export function tryMarkPushed(topic: string, itemKey: string): boolean {
  if (!db) throw new Error('db not init');
  const info = db
    .prepare('INSERT OR IGNORE INTO push_dedupe (topic, item_key) VALUES (?, ?)')
    .run(topic, itemKey);
  return info.changes > 0;
}

export function hasPushed(topic: string, itemKey: string): boolean {
  if (!db) throw new Error('db not init');
  const row = db.prepare('SELECT 1 AS ok FROM push_dedupe WHERE topic = ? AND item_key = ?').get(topic, itemKey);
  return !!row;
}

/** Purge old dedupe rows older than maxAgeSec (default 7 days) */
export function purgeOldDedupe(maxAgeSec = 7 * 24 * 3600): number {
  if (!db) throw new Error('db not init');
  const info = db.prepare(`DELETE FROM push_dedupe WHERE pushed_at < strftime('%s','now') - ?`).run(maxAgeSec);
  return info.changes;
}

/** Test helpers */
export function resetDbForTests(sqlitePath: string): Database.Database {
  closeDb();
  return getDb(sqlitePath);
}
