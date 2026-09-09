export type Platform = 'onebot' | 'kook' | 'cli';

export interface CommandContext {
  platform: Platform;
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
