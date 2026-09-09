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
    assert.equal(subscribe('onebot', '12345', 'sortie'), true);
    assert.equal(subscribe('onebot', '12345', 'sortie'), false); // duplicate
    assert.equal(subscribe('onebot', '12345', 'arbitration'), true);
    assert.deepEqual(listSubscriptions('onebot', '12345'), ['arbitration', 'sortie']);

    const subs = getSubscribers('sortie');
    assert.ok(subs.some((s) => s.platform === 'onebot' && s.groupId === '12345'));

    assert.equal(unsubscribe('onebot', '12345', 'sortie'), true);
    assert.equal(unsubscribe('onebot', '12345', 'sortie'), false);
    assert.deepEqual(listSubscriptions('onebot', '12345'), ['arbitration']);
  });

  it('kook platform isolation', () => {
    subscribe('kook', 'ch1', 'fissures');
    assert.deepEqual(listSubscriptions('kook', 'ch1'), ['fissures']);
    assert.deepEqual(listSubscriptions('onebot', 'ch1'), []);
  });
});
