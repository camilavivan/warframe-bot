import type { CommandContext, CommandHandler } from './types.js';
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
 * Returns matched command name + args, or null.
 */
export function matchCommand(text: string): { name: string; args: string } | null {
  const cfg = loadConfig();
  const trimmed = text.trim();
  let rest = trimmed;

  // Prefer longer prefixes first
  const prefixes = [...cfg.prefix].sort((a, b) => b.length - a.length);
  let matched = false;
  for (const p of prefixes) {
    if (rest.toLowerCase().startsWith(p.toLowerCase())) {
      rest = rest.slice(p.length).trim();
      matched = true;
      break;
    }
  }
  // Also allow bare Chinese keywords without prefix when message is short command-like
  // but require prefix for safety in groups — only skip prefix if starts with known cmd
  if (!matched) {
    // allow `/cmd` style already covered; bare menu keywords without prefix: no
    return null;
  }

  if (!rest) return { name: '菜单', args: '' };

  const spaceIdx = rest.search(/\s/);
  const name = spaceIdx === -1 ? rest : rest.slice(0, spaceIdx);
  const args = spaceIdx === -1 ? '' : rest.slice(spaceIdx + 1).trim();
  return { name, args };
}

export async function dispatch(ctx: {
  platform: CommandContext['platform'];
  groupId: string;
  userId: string;
  text: string;
  reply: CommandContext['reply'];
}): Promise<boolean> {
  const matched = matchCommand(ctx.text);
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
    groupId: ctx.groupId,
    userId: ctx.userId,
    raw: ctx.text,
    args: matched.args,
    reply: ctx.reply,
  });
  return true;
}
