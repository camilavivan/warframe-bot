import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  PUSH_TOPICS,
  PUSH_TOPIC_ALIASES,
  WORLDSTATE_CHILD_TOPICS,
  closeDb,
  formatPushTopicsHelp,
  isPushTopic,
  resolvePushTopic,
  resetDbForTests,
  subscribe,
  tryMarkPushed,
} from '../src/push/db.js';
import { pollFromWorldState, type SendFn } from '../src/push/poller.js';
import type { WorldState } from '../src/core/warframestat.js';
import { formatMenu } from '../src/core/formatters.js';

describe('push topic aliases', () => {
  it('resolves Chinese aliases and English ids', () => {
    assert.equal(resolvePushTopic('世界状态'), 'worldstate');
    assert.equal(resolvePushTopic('特殊事件'), 'events');
    assert.equal(resolvePushTopic('突击'), 'sortie');
    assert.equal(resolvePushTopic('仲裁'), 'arbitration');
    assert.equal(resolvePushTopic('裂缝'), 'fissures');
    assert.equal(resolvePushTopic('平原夜'), 'cetus-night');
    assert.equal(resolvePushTopic('希图斯夜'), 'cetus-night');
    assert.equal(resolvePushTopic('入侵'), 'invasions');
    assert.equal(resolvePushTopic('奸商'), 'voidtrader');
    assert.equal(resolvePushTopic('特惠'), 'darvo');
    assert.equal(resolvePushTopic('猎杀'), 'archon');
    assert.equal(resolvePushTopic('日历'), 'calendar');
    assert.equal(resolvePushTopic('worldstate'), 'worldstate');
    assert.equal(resolvePushTopic('EVENTS'), 'events');
    assert.equal(resolvePushTopic('Sortie'), 'sortie');
    assert.equal(resolvePushTopic(''), null);
    assert.equal(resolvePushTopic('不存在'), null);
  });

  it('alias map covers required Chinese keys', () => {
    const required = [
      '世界状态',
      '特殊事件',
      '突击',
      '仲裁',
      '裂缝',
      '平原夜',
      '希图斯夜',
      '入侵',
      '奸商',
      '特惠',
      '猎杀',
      '日历',
    ];
    for (const k of required) {
      assert.ok(PUSH_TOPIC_ALIASES[k], `missing alias ${k}`);
      assert.ok(isPushTopic(PUSH_TOPIC_ALIASES[k]));
    }
  });

  it('PUSH_TOPICS includes worldstate and events', () => {
    assert.ok(PUSH_TOPICS.includes('worldstate'));
    assert.ok(PUSH_TOPICS.includes('events'));
    assert.ok(WORLDSTATE_CHILD_TOPICS.includes('events'));
    assert.ok(!WORLDSTATE_CHILD_TOPICS.includes('worldstate' as never));
  });

  it('topic help and menu use 「」 not raw <>', () => {
    const help = formatPushTopicsHelp();
    assert.match(help, /世界状态 「worldstate」/);
    assert.match(help, /特殊事件 「events」/);
    assert.doesNotMatch(help, /<worldstate>/);
    const menu = formatMenu('wf ');
    assert.match(menu, /世界状态 「worldstate」/);
    assert.match(menu, /特殊事件 「events」/);
    assert.doesNotMatch(menu, /<[^「」\n]+>/);
  });
});

describe('worldstate umbrella fan-out', () => {
  let dir: string;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'wfbot-ws-'));
    resetDbForTests(join(dir, 'test.db'));
  });

  after(() => {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  });

  it('delivers child-topic pushes to worldstate subscribers only', async () => {
    subscribe('onebot', 'ws-only', 'worldstate', 'group');
    subscribe('onebot', 'sortie-only', 'sortie', 'group');
    // unsubscribed chat must never receive

    const sent: Array<{ chatId: string; text: string }> = [];
    const send: SendFn = async (_platform, chatId, text) => {
      sent.push({ chatId, text });
    };

    const ws = {
      sortie: {
        id: 'sortie-fanout-1',
        faction: 'Corpus',
        boss: 'Test Boss',
        variants: [],
        eta: '1h',
      },
      events: [],
      fissures: [],
      invasions: [],
      dailyDeals: [],
    } as unknown as WorldState;

    await pollFromWorldState(ws, send);

    const toWs = sent.filter((s) => s.chatId === 'ws-only');
    const toSortie = sent.filter((s) => s.chatId === 'sortie-only');
    const toNobody = sent.filter((s) => s.chatId === 'nobody');

    assert.ok(toWs.length >= 1, 'worldstate subscriber should get sortie fan-out');
    assert.ok(toSortie.length >= 1, 'sortie subscriber should get sortie');
    assert.equal(toNobody.length, 0);

    // second poll same itemKey — dedupe, no more sends for sortie
    const before = sent.length;
    await pollFromWorldState(ws, send);
    assert.equal(sent.length, before, 'dedupe should skip identical sortie itemKey');
  });

  it('tryMarkPushed is independent per topic for same itemKey', () => {
    assert.equal(tryMarkPushed('fissures', 'fis:abc'), true);
    assert.equal(tryMarkPushed('worldstate', 'fis:abc'), true);
    assert.equal(tryMarkPushed('fissures', 'fis:abc'), false);
    assert.equal(tryMarkPushed('worldstate', 'fis:abc'), false);
  });
});
