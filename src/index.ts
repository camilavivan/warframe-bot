import { loadConfig } from './config.js';
import { logger } from './core/logger.js';
import { registerAllCommands } from './commands/handlers.js';
import { getDb } from './push/db.js';
import { startPoller } from './push/poller.js';
import { startOneBot, type OneBotAdapter } from './adapters/onebot/server.js';
import { startKook, type KookAdapter } from './adapters/kook/client.js';
import { startQQOfficial, type QQOfficialAdapter } from './adapters/qqofficial/client.js';
import { startHealthServer, type HealthServer } from './health.js';
import { isCosEnabled, syncBundledThemeAssets } from './core/cos.js';

async function main(): Promise<void> {
  const cfg = loadConfig();
  registerAllCommands();
  getDb(cfg.push.sqlitePath);

  let onebot: OneBotAdapter | null = null;
  let kook: KookAdapter | null = null;
  let qqofficial: QQOfficialAdapter | null = null;
  let health: HealthServer | null = null;

  if (cfg.onebot.enabled) {
    onebot = await startOneBot(cfg.onebot);
  } else {
    logger.info('OneBot adapter disabled');
  }

  // Health always available: dedicated server when OneBot off or different port
  health = await startHealthServer(cfg);

  if (cfg.kook.enabled) {
    kook = await startKook(cfg.kook);
  } else {
    logger.info('KOOK adapter disabled');
  }

  if (cfg.qqofficial.enabled) {
    qqofficial = await startQQOfficial(cfg.qqofficial);
  } else {
    logger.info('QQ official adapter disabled');
  }

  if (isCosEnabled()) {
    void syncBundledThemeAssets().catch((err) => {
      logger.warn({ err }, 'syncBundledThemeAssets failed');
    });
  }

  const send = async (
    platform: 'onebot' | 'kook' | 'qqofficial',
    chatId: string,
    text: string,
    chatType: 'group' | 'private' = 'group',
  ): Promise<void> => {
    if (platform === 'onebot') {
      if (!onebot) throw new Error('OneBot not running');
      if (chatType === 'private') {
        await onebot.sendPrivateMsg(chatId, text);
      } else {
        await onebot.sendGroupMsg(chatId, text);
      }
      return;
    }
    if (platform === 'qqofficial') {
      if (!qqofficial) throw new Error('QQ official not running');
      if (chatType === 'private') {
        await qqofficial.sendPrivateMsg(chatId, text);
      } else {
        await qqofficial.sendGroupMsg(chatId, text);
      }
      return;
    }
    if (!kook) throw new Error('KOOK not running');
    if (chatType === 'private') {
      await kook.sendPrivateMsg(chatId, text);
    } else {
      await kook.sendChannelMsg(chatId, text);
    }
  };

  if (cfg.push.enabled) {
    startPoller(cfg.push.intervalMs, send);
  }

  logger.info(
    {
      healthPort: cfg.health.port,
      onebot: cfg.onebot.enabled,
      kook: cfg.kook.enabled,
      qqofficial: cfg.qqofficial.enabled,
    },
    'warframe-bot started',
  );

  const shutdown = async () => {
    logger.info('shutting down');
    await health?.close();
    await onebot?.close();
    await kook?.close();
    await qqofficial?.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error({ err }, 'fatal');
  process.exit(1);
});
