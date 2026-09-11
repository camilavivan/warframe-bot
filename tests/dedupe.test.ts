import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  closeDb,
  getSubscribers,
  listSubscriptions,
  resetDbForTests,
  subscribe,
  tryMarkPushed,
  unsubscribe,
  hasPushed,
} from '../src/push/db.js';

describe('push dedupe & subscriptions', () => {
  let dir: string;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'wfbot-'));
    resetDbForTests(join(dir, 'test.db'));
  });

  after(() => {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  });

  it('tryMarkPushed returns true once then false', () => {
    assert.equal(tryMarkPushed('sortie', 'sortie:abc'), true);
    assert.equal(tryMarkPushed('sortie', 'sortie:abc'), false);
    assert.equal(hasPushed('sortie', 'sortie:abc'), true);
    assert.equal(tryMarkPushed('sortie', 'sortie:xyz'), true);
  });

  it('subscribe / list / unsubscribe', () => {
    assert.equal(subscribe('onebot', '12345', 'sortie'), 'created');
    assert.equal(subscribe('onebot', '12345', 'sortie'), 'unchanged'); // duplicate
    assert.equal(subscribe('onebot', '12345', 'arbitration'), 'created');
    assert.deepEqual(
      listSubscriptions('onebot', '12345').map((r) => r.topic),
      ['arbitration', 'sortie'],
    );

    const subs = getSubscribers('sortie');
    assert.ok(subs.some((s) => s.platform === 'onebot' && s.chatId === '12345' && s.chatType === 'group' && s.filter === null));

    assert.equal(unsubscribe('onebot', '12345', 'sortie'), true);
    assert.equal(unsubscribe('onebot', '12345', 'sortie'), false);
    assert.deepEqual(
      listSubscriptions('onebot', '12345').map((r) => r.topic),
      ['arbitration'],
    );
  });

  it('private chat subscriptions store chat_type', () => {
    assert.equal(subscribe('onebot', '99901', 'cetus-night', 'private'), 'created');
    const subs = getSubscribers('cetus-night');
    const row = subs.find((s) => s.chatId === '99901');
    assert.ok(row);
    assert.equal(row!.chatType, 'private');
    assert.equal(row!.groupId, '99901');
  });

  it('kook platform isolation', () => {
    subscribe('kook', 'ch1', 'fissures');
    assert.deepEqual(listSubscriptions('kook', 'ch1').map((r) => r.topic), ['fissures']);
    assert.deepEqual(listSubscriptions('onebot', 'ch1'), []);
  });

  it('qqofficial platform isolation', () => {
    subscribe('qqofficial', 'g_openid_1', 'sortie', 'group');
    subscribe('qqofficial', 'u_openid_1', 'cetus-night', 'private');
    assert.deepEqual(listSubscriptions('qqofficial', 'g_openid_1').map((r) => r.topic), ['sortie']);
    assert.deepEqual(listSubscriptions('qqofficial', 'u_openid_1').map((r) => r.topic), ['cetus-night']);
    assert.deepEqual(listSubscriptions('onebot', 'g_openid_1'), []);
    assert.deepEqual(listSubscriptions('kook', 'g_openid_1'), []);
  });
});
