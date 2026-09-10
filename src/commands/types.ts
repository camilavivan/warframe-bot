export type Platform = 'onebot' | 'kook' | 'qqofficial' | 'cli';

export type ChatType = 'group' | 'private';

/** Plain text, or text plus public HTTPS image URLs (QQ official / OneBot CQ). */
export type ReplyPayload = string | { text: string; images?: string[] };

export interface CommandContext {
  platform: Platform;
  /** 'group' = QQ群/官方群/KOOK频道；'private' = 私聊/DM/C2C */
  chatType: ChatType;
  /** group_id / channel_id / user_id（私聊时） */
  chatId: string;
  /**
   * @deprecated 与 chatId 相同，保留以兼容旧调用方
   */
  groupId: string;
  userId: string;
  raw: string;
  args: string;
  reply: (payload: ReplyPayload) => Promise<void>;
}

export interface CommandHandler {
  name: string;
  aliases: string[];
  description: string;
  handle: (ctx: CommandContext) => Promise<void>;
}

export function replyText(payload: ReplyPayload): string {
  return typeof payload === 'string' ? payload : payload.text;
}

export function replyImages(payload: ReplyPayload): string[] {
  if (typeof payload === 'string') return [];
  return (payload.images ?? []).filter((u) => typeof u === 'string' && /^https:\/\//i.test(u));
}

/** OneBot v11 string message with optional CQ image prefixes. */
export function toOneBotMessage(payload: ReplyPayload): string {
  const text = replyText(payload);
  const images = replyImages(payload);
  if (!images.length) return text;
  return `${images.map((url) => `[CQ:image,url=${url}]`).join('')}${text}`;
}
