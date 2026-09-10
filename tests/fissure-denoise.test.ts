import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { closeDb, resetDbForTests, subscribe } from '../src/push/db.js';
import {
  pollFromWorldState,
  resetFissurePushSnapshotForTests,
  type SendFn,
} from '../src/push/poller.js';
import type { Fissure, WorldState } from '../src/core/warframestat.js';

function fis(partial: Partial<Fissure> & { id: string }): Fissure {
  return {
    tier: 'Lith',
    tierNum: 1,
    node: 'Test Node',
    missionType: 'Capture',
    enemy: 'Grineer',
    isHard: false,
    isStorm: false,
    expiry: new Date(Date.now() + 3600_000).toISOString(),
    ...partial,
  };
}

describe('fissure push denoise', () => {
  let dir: string;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'wfbot-fis-'));
    resetDbForTests(join(dir, 'test.db'));
    subscribe('onebot', 'g1', 'fissures', 'group');
  });

  after(() => {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    resetFissurePushSnapshotForTests();
  });

  it('first run pushes full list; identical set does not re-push; new id pushes 新增', async () => {
    const sent: string[] = [];
    const send: SendFn = async (_p, _c, text) => {
      sent.push(text);
    };

    const a = fis({ id: 'a1', node: 'NodeA' });
    const b = fis({ id: 'b1', node: 'NodeB', tier: 'Meso', tierNum: 2 });

    const ws1 = { fissures: [a, b], invasions: [], dailyDeals: [], events: [] } as unknown as WorldState;
    await pollFromWorldState(ws1, send);
    assert.ok(sent.some((t) => /裂缝更新/.test(t)), 'first run should full-push');
    const afterFirst = sent.length;

    await pollFromWorldState(ws1, send);
    assert.equal(sent.length, afterFirst, 'same id set should not re-push');

    const c = fis({ id: 'c1', node: 'NodeC', tier: 'Neo', tierNum: 3 });
    const ws2 = { fissures: [a, b, c], invasions: [], dailyDeals: [], events: [] } as unknown as WorldState;
    await pollFromWorldState(ws2, send);
    const last = sent[sent.length - 1] || '';
    assert.match(last, /新增裂缝/);
    assert.match(last, /NodeC/);
    assert.doesNotMatch(last, /NodeA/, 'denoise message should list newcomers only');
  });
});
