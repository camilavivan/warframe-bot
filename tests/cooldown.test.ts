import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  dispatch,
  matchCommand,
  registerCommand,
  resetCommandCooldownsForTests,
} from '../src/commands/registry.js';

describe('command cooldown in dispatch', () => {
  beforeEach(() => {
    resetCommandCooldownsForTests();
  });

  it('matchCommand still parses prefixes', () => {
    const m = matchCommand('wf 突击', { chatType: 'group' });
    assert.equal(m?.name, '突击');
  });

  it('blocks rapid same command with 稍后再试', async () => {
    registerCommand({
      name: '冷却测',
      aliases: ['cdtest'],
      description: 'test',
      async handle(ctx) {
        await ctx.reply('ok');
      },
    });

    const replies: string[] = [];
    const reply = async (payload: string | { text: string }) => {
      replies.push(typeof payload === 'string' ? payload : payload.text);
    };

    const base = {
      platform: 'onebot' as const,
      chatType: 'group' as const,
      chatId: 'g-cd',
      groupId: 'g-cd',
      userId: 'u1',
      reply,
    };

    assert.equal(await dispatch({ ...base, text: 'wf 冷却测' }), true);
    assert.equal(replies.at(-1), 'ok');

    assert.equal(await dispatch({ ...base, text: 'wf 冷却测' }), true);
    assert.equal(replies.at(-1), '稍后再试');
  });

  it('skips cooldown for 订阅列表', async () => {
    let hits = 0;
    registerCommand({
      name: '订阅列表',
      aliases: ['subs-test-unique'],
      description: 'test sub list',
      async handle(ctx) {
        hits += 1;
        await ctx.reply(`subs-${hits}`);
      },
    });

    const replies: string[] = [];
    const reply = async (payload: string | { text: string }) => {
      replies.push(typeof payload === 'string' ? payload : payload.text);
    };
    const base = {
      platform: 'onebot' as const,
      chatType: 'private' as const,
      chatId: 'u-sub',
      groupId: 'u-sub',
      userId: 'u-sub',
      reply,
    };

    await dispatch({ ...base, text: '订阅列表' });
    await dispatch({ ...base, text: '订阅列表' });
    assert.equal(hits, 2);
    assert.equal(replies.at(-1), 'subs-2');
  });
});
