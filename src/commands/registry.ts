import type { ChatType, CommandContext, CommandHandler } from './types.js';
import { loadConfig } from '../config.js';

const handlers: CommandHandler[] = [];

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

  await handler.handle({
    platform: ctx.platform,
    chatType,
    chatId,
    groupId: chatId,
    userId: ctx.userId,
    raw: ctx.text,
    args: matched.args,
    reply: ctx.reply,
  });
  return true;
}
