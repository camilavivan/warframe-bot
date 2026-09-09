import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { logger } from '../core/logger.js';

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
] as const;

export type PushTopic = (typeof PUSH_TOPICS)[number];

export function isPushTopic(s: string): s is PushTopic {
  return (PUSH_TOPICS as readonly string[]).includes(s);
}

let db: Database.Database | null = null;

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
  log.info({ sqlitePath }, 'sqlite ready');
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function subscribe(platform: Platform, groupId: string, topic: PushTopic): boolean {
  if (!db) throw new Error('db not init');
  const info = db
    .prepare('INSERT OR IGNORE INTO subscriptions (platform, group_id, topic) VALUES (?, ?, ?)')
    .run(platform, groupId, topic);
  return info.changes > 0;
}

export function unsubscribe(platform: Platform, groupId: string, topic: PushTopic): boolean {
  if (!db) throw new Error('db not init');
  const info = db
    .prepare('DELETE FROM subscriptions WHERE platform = ? AND group_id = ? AND topic = ?')
    .run(platform, groupId, topic);
  return info.changes > 0;
}

export function listSubscriptions(platform: Platform, groupId: string): PushTopic[] {
  if (!db) throw new Error('db not init');
  const rows = db
    .prepare('SELECT topic FROM subscriptions WHERE platform = ? AND group_id = ? ORDER BY topic')
    .all(platform, groupId) as Array<{ topic: string }>;
  return rows.map((r) => r.topic as PushTopic);
}

export function getSubscribers(topic: PushTopic): Array<{ platform: Platform; groupId: string }> {
  if (!db) throw new Error('db not init');
  const rows = db
    .prepare('SELECT platform, group_id FROM subscriptions WHERE topic = ?')
    .all(topic) as Array<{ platform: string; group_id: string }>;
  return rows.map((r) => ({ platform: r.platform as Platform, groupId: r.group_id }));
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
