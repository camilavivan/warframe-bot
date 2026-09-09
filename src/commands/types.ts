export type Platform = 'onebot' | 'kook' | 'cli';

export type ChatType = 'group' | 'private';

export interface CommandContext {
  platform: Platform;
  /** 'group' = QQ群/KOOK频道；'private' = 私聊/DM */
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
  reply: (text: string) => Promise<void>;
}

export interface CommandHandler {
  name: string;
  aliases: string[];
  description: string;
  handle: (ctx: CommandContext) => Promise<void>;
}
