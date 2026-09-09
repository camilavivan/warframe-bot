import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { logger } from '../core/logger.js';
import type { ChatType } from '../commands/types.js';

const log = logger.child({ module: 'db' });

export type Platform = 'onebot' | 'kook';

export const PUSH_TOPICS = [
  'sortie',
  'arbitration',
  'fissures',
  'cetus-night',
  'invasions',
  'voidtrader',
  'darvo',
  'archon',
  'calendar',
] as const;

export type PushTopic = (typeof PUSH_TOPICS)[number];

export function isPushTopic(s: string): s is PushTopic {
  return (PUSH_TOPICS as readonly string[]).includes(s);
}

export interface Subscriber {
  platform: Platform;
  /** group_id / channel_id / user_id */
  chatId: string;
  chatType: ChatType;
  /** @deprecated alias of chatId */
  groupId: string;
}

let db: Database.Database | null = null;

function ensureChatTypeColumn(database: Database.Database): void {
  const cols = database.prepare(`PRAGMA table_info(subscriptions)`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === 'chat_type')) {
    database.exec(`ALTER TABLE subscriptions ADD COLUMN chat_type TEXT NOT NULL DEFAULT 'group'`);
    log.info('migrated subscriptions: added chat_type');
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
  ensureChatTypeColumn(db);
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
 * Subscribe chat to topic. Returns true if newly inserted.
 * Updates chat_type if the row already existed with a different type.
 */
export function subscribe(
  platform: Platform,
  chatId: string,
  topic: PushTopic,
  chatType: ChatType = 'group',
): boolean {
  if (!db) throw new Error('db not init');
  const row = db
    .prepare('SELECT chat_type FROM subscriptions WHERE platform = ? AND group_id = ? AND topic = ?')
    .get(platform, chatId, topic) as { chat_type?: string } | undefined;
  if (row) {
    if (row.chat_type !== chatType) {
      db.prepare(
        'UPDATE subscriptions SET chat_type = ? WHERE platform = ? AND group_id = ? AND topic = ?',
      ).run(chatType, platform, chatId, topic);
    }
    return false;
  }
  db.prepare(
    'INSERT INTO subscriptions (platform, group_id, topic, chat_type) VALUES (?, ?, ?, ?)',
  ).run(platform, chatId, topic, chatType);
  return true;
}

export function unsubscribe(platform: Platform, chatId: string, topic: PushTopic): boolean {
  if (!db) throw new Error('db not init');
  const info = db
    .prepare('DELETE FROM subscriptions WHERE platform = ? AND group_id = ? AND topic = ?')
    .run(platform, chatId, topic);
  return info.changes > 0;
}

export function listSubscriptions(platform: Platform, chatId: string): PushTopic[] {
  if (!db) throw new Error('db not init');
  const rows = db
    .prepare('SELECT topic FROM subscriptions WHERE platform = ? AND group_id = ? ORDER BY topic')
    .all(platform, chatId) as Array<{ topic: string }>;
  return rows.map((r) => r.topic as PushTopic);
}

export function getSubscribers(topic: PushTopic): Subscriber[] {
  if (!db) throw new Error('db not init');
  const rows = db
    .prepare('SELECT platform, group_id, chat_type FROM subscriptions WHERE topic = ?')
    .all(topic) as Array<{ platform: string; group_id: string; chat_type?: string }>;
  return rows.map((r) => {
    const chatType: ChatType = r.chat_type === 'private' ? 'private' : 'group';
    return {
      platform: r.platform as Platform,
      chatId: r.group_id,
      chatType,
      groupId: r.group_id,
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
