import type { ChatType, CommandContext, CommandHandler, ReplyPayload } from './types.js';
import { loadConfig } from '../config.js';
import { globalCache } from '../core/cache.js';

const handlers: CommandHandler[] = [];

/** Commands that mutate subscription state — never cache their replies. */
const NO_REPLY_CACHE = new Set([
  '订阅',
  '取消订阅',
  '订阅列表',
  'subscribe',
  'unsubscribe',
  'unsub',
  'sub',
  'subs',
  'subscriptions',
]);

/** Short TTL for spam-query reply payloads (skip re-fetch / re-format). */
const REPLY_CACHE_TTL_MS = 20_000;

function replyCacheKey(name: string, args: string): string {
  return `cmd-reply:${name.toLowerCase()}:${args.trim().toLowerCase()}`;
}

export function registerCommand(handler: CommandHandler): void {
  handlers.push(handler);
}

export function listCommands(): CommandHandler[] {
  return [...handlers];
}

/**
 * Parse incoming message against configured prefixes.
 * In private chat, prefix is optional (bare command names allowed).
 * In group chat, a configured prefix is required for safety.
 */
export function matchCommand(
  text: string,
  opts: { chatType?: ChatType } = {},
): { name: string; args: string } | null {
  const cfg = loadConfig();
  const trimmed = text.trim();
  let rest = trimmed;

  const prefixes = [...cfg.prefix].sort((a, b) => b.length - a.length);
  let matched = false;
  for (const p of prefixes) {
    if (rest.toLowerCase().startsWith(p.toLowerCase())) {
      rest = rest.slice(p.length).trim();
      matched = true;
      break;
    }
  }

  if (!matched) {
    // Private / DM: allow bare commands without prefix
    if (opts.chatType === 'private') {
      rest = trimmed;
    } else {
      return null;
    }
  }

  if (!rest) return { name: '菜单', args: '' };

  const spaceIdx = rest.search(/\s/);
  const name = spaceIdx === -1 ? rest : rest.slice(0, spaceIdx);
  const args = spaceIdx === -1 ? '' : rest.slice(spaceIdx + 1).trim();
  return { name, args };
}

export async function dispatch(ctx: {
  platform: CommandContext['platform'];
  chatType?: ChatType;
  chatId?: string;
  groupId: string;
  userId: string;
  text: string;
  reply: CommandContext['reply'];
}): Promise<boolean> {
  const chatType: ChatType = ctx.chatType ?? 'group';
  const chatId = ctx.chatId ?? ctx.groupId;
  const matched = matchCommand(ctx.text, { chatType });
  if (!matched) return false;

  const nameLower = matched.name.toLowerCase();
  const handler =
    handlers.find((h) => h.name === matched.name || h.aliases.includes(matched.name)) ||
    handlers.find((h) => h.name.toLowerCase() === nameLower || h.aliases.some((a) => a.toLowerCase() === nameLower));

  if (!handler) {
    await ctx.reply(`未知命令：${matched.name}\n发送「菜单」查看帮助。`);
    return true;
  }

  const cacheable = !NO_REPLY_CACHE.has(handler.name) && !NO_REPLY_CACHE.has(nameLower);
  const cacheKey = replyCacheKey(handler.name, matched.args);
  if (cacheable) {
    const hit = globalCache.get<ReplyPayload>(cacheKey);
    if (hit !== undefined) {
      await ctx.reply(hit);
      return true;
    }
  }

  let cachedPayload: ReplyPayload | undefined;
  const reply: CommandContext['reply'] = async (payload) => {
    if (cacheable) {
      cachedPayload = payload;
      globalCache.set(cacheKey, payload, REPLY_CACHE_TTL_MS);
    }
    await ctx.reply(payload);
  };

  await handler.handle({
    platform: ctx.platform,
    chatType,
    chatId,
    groupId: chatId,
    userId: ctx.userId,
    raw: ctx.text,
    args: matched.args,
    reply,
  });

  void cachedPayload;
  return true;
}
