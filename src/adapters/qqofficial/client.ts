import {
  Bot,
  ReceiverMode,
  segment,
  type GroupMessageEvent,
  type PrivateMessageEvent,
} from 'qq-official-bot';
import type { AppConfig } from '../../config.js';
import { logger } from '../../core/logger.js';
import { dispatch } from '../../commands/registry.js';
import { replyImages, replyText, type ReplyPayload } from '../../commands/types.js';

const log = logger.child({ module: 'qqofficial' });

export interface QQOfficialAdapter {
  sendGroupMsg: (groupOpenid: string, message: string) => Promise<void>;
  sendPrivateMsg: (userOpenid: string, message: string) => Promise<void>;
  close: () => Promise<void>;
}

/** SDK Bot is generic over ReceiverMode; erase mode for shared wiring. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBot = Bot<any>;

function createBot(cfg: AppConfig['qqofficial']): AnyBot {
  const common = {
    appid: cfg.appId,
    secret: cfg.secret,
    sandbox: cfg.sandbox,
    removeAt: cfg.removeAt,
    intents: ['GROUP_AND_C2C_EVENT'] as const,
    logLevel: 'warn' as const,
  };

  if (cfg.mode === 'webhook') {
    return new Bot({
      ...common,
      mode: ReceiverMode.WEBHOOK,
      port: cfg.webhookPort,
      path: cfg.webhookPath,
    }) as AnyBot;
  }

  return new Bot({
    ...common,
    mode: ReceiverMode.WEBSOCKET,
  }) as AnyBot;
}


async function replyQQ(event: { reply: (msg: unknown) => Promise<unknown> }, payload: ReplyPayload): Promise<void> {
  const text = replyText(payload);
  const images = replyImages(payload);
  if (!images.length) {
    await event.reply(text);
    return;
  }
  await event.reply([...images.map((url) => segment.image(url)), segment.text(text)]);
}

function wireDispatch(bot: AnyBot): void {
  bot.on('message.group', (event: GroupMessageEvent) => {
    const text = String(event.raw_message ?? '').trim();
    const userId = String(event.user_id ?? '');
    const chatId = String(event.group_id ?? '');
    if (!text || !chatId) return;

    dispatch({
      platform: 'qqofficial',
      chatType: 'group',
      chatId,
      groupId: chatId,
      userId,
      text,
      // Passive reply keeps msg_id — required by QQ Open Platform for group @ replies
      reply: async (msg) => {
        await replyQQ(event, msg);
      },
    }).catch((err) => log.error({ err }, 'dispatch error'));
  });

  bot.on('message.private', (event: PrivateMessageEvent) => {
    const text = String(event.raw_message ?? '').trim();
    const userId = String(event.user_id ?? '');
    if (!text || !userId) return;

    dispatch({
      platform: 'qqofficial',
      chatType: 'private',
      chatId: userId,
      groupId: userId,
      userId,
      text,
      reply: async (msg) => {
        await replyQQ(event, msg);
      },
    }).catch((err) => log.error({ err }, 'dispatch error'));
  });
}

export async function startQQOfficial(cfg: AppConfig['qqofficial']): Promise<QQOfficialAdapter> {
  if (!cfg.appId?.trim() || !cfg.secret?.trim()) {
    throw new Error('qqofficial.appId and qqofficial.secret are required (or QQ_BOT_APP_ID / QQ_BOT_SECRET)');
  }

  const bot = createBot(cfg);
  wireDispatch(bot);

  await bot.start();
  log.info(
    {
      mode: cfg.mode,
      sandbox: cfg.sandbox,
      webhookPort: cfg.mode === 'webhook' ? cfg.webhookPort : undefined,
      webhookPath: cfg.mode === 'webhook' ? cfg.webhookPath : undefined,
    },
    'QQ official bot started',
  );

  return {
    sendGroupMsg: async (groupOpenid, message) => {
      await bot.group(groupOpenid).send(message);
      log.debug({ groupOpenid }, 'sent group msg');
    },
    sendPrivateMsg: async (userOpenid, message) => {
      await bot.user(userOpenid).send(message);
      log.debug({ userOpenid }, 'sent private msg');
    },
    close: async () => {
      await bot.stop();
    },
  };
}
