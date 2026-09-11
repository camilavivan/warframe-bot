import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  closeDb,
  formatSubscriptionFilterLabel,
  matchesArbitrationFilter,
  parseSubscribeArgs,
  resetDbForTests,
  subscribe,
  listSubscriptions,
  getSubscribers,
} from '../src/push/db.js';
import {
  pollFromWorldState,
  resetFissurePushSnapshotForTests,
  type SendFn,
} from '../src/push/poller.js';
import type { Fissure, WorldState } from '../src/core/warframestat.js';

describe('parseSubscribeArgs filters', () => {
  it('parses 裂缝 钢铁 / fissures steel', () => {
    const a = parseSubscribeArgs('裂缝 钢铁');
    assert.equal(a?.topic, 'fissures');
    assert.equal(a?.filter?.hard, true);
    assert.match(a?.filterLabel || '', /钢铁/);

    const b = parseSubscribeArgs('fissures steel');
    assert.equal(b?.topic, 'fissures');
    assert.equal(b?.filter?.hard, true);
  });

  it('parses 裂隙 / 虚空裂缝 aliases', () => {
    assert.equal(parseSubscribeArgs('裂隙')?.topic, 'fissures');
    assert.equal(parseSubscribeArgs('虚空裂缝 速刷')?.filter?.fast, true);
  });

  it('parses 仲裁 生存', () => {
    const a = parseSubscribeArgs('仲裁 生存');
    assert.equal(a?.topic, 'arbitration');
    assert.equal(a?.filter?.missionType, 'survival');
    assert.ok(formatSubscriptionFilterLabel(a!.filter).includes('生存'));
  });

  it('null filter when topic only', () => {
    const a = parseSubscribeArgs('突击');
    assert.equal(a?.topic, 'sortie');
    assert.equal(a?.filter, null);
  });
});

describe('matchesArbitrationFilter', () => {
  it('null filter matches all', () => {
    assert.equal(matchesArbitrationFilter('Survival', null), true);
  });
  it('matches EN/ZH', () => {
    assert.equal(matchesArbitrationFilter('Survival', { missionType: 'survival' }), true);
    assert.equal(matchesArbitrationFilter('Defense', { missionType: 'survival' }), false);
  });
});

describe('subscription filter_json persistence + fissure poller', () => {
  let dir: string;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'wfbot-subfilt-'));
    resetDbForTests(join(dir, 'test.db'));
  });

  after(() => {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    resetFissurePushSnapshotForTests();
  });

  it('stores and updates filter_json', () => {
    assert.equal(subscribe('onebot', 'g-steel', 'fissures', 'group', { hard: true }), 'created');
    const rows = listSubscriptions('onebot', 'g-steel');
    assert.equal(rows[0].filter?.hard, true);
    assert.equal(subscribe('onebot', 'g-steel', 'fissures', 'group', { hard: true, fast: true }), 'updated');
    assert.equal(listSubscriptions('onebot', 'g-steel')[0].filter?.fast, true);
    assert.equal(getSubscribers('fissures').find((s) => s.chatId === 'g-steel')?.filter?.hard, true);
  });

  it('poller only sends matching fissures to filtered subscriber', async () => {
    subscribe('onebot', 'g-all', 'fissures', 'group', null);
    // g-steel already subscribed with hard+fast from previous test — reset to hard only
    subscribe('onebot', 'g-steel', 'fissures', 'group', { hard: true });

    const sent: Array<{ chat: string; text: string }> = [];
    const send: SendFn = async (_p, chatId, text) => {
      sent.push({ chat: chatId, text });
    };

    const normal = {
      id: 'n1',
      tier: 'Lith',
      tierNum: 1,
      node: 'NormalNode',
      missionType: 'Capture',
      isHard: false,
      isStorm: false,
      expiry: new Date(Date.now() + 3600_000).toISOString(),
    } as Fissure;
    const hard = {
      id: 'h1',
      tier: 'Neo',
      tierNum: 3,
      node: 'HardNode',
      missionType: 'Survival',
      isHard: true,
      isStorm: false,
      expiry: new Date(Date.now() + 3600_000).toISOString(),
    } as Fissure;

    const ws = { fissures: [normal, hard], invasions: [], dailyDeals: [], events: [] } as unknown as WorldState;
    await pollFromWorldState(ws, send);

    const toAll = sent.filter((s) => s.chat === 'g-all');
    const toSteel = sent.filter((s) => s.chat === 'g-steel');
    assert.ok(toAll.length >= 1);
    assert.match(toAll[0].text, /NormalNode/);
    assert.match(toAll[0].text, /HardNode/);
    assert.ok(toSteel.length >= 1);
    assert.match(toSteel[0].text, /HardNode/);
    assert.doesNotMatch(toSteel[0].text, /NormalNode/);
  });
});
