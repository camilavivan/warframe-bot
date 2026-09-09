import { loadConfig } from './config.js';
import { logger } from './core/logger.js';
import { registerAllCommands } from './commands/handlers.js';
import { getDb } from './push/db.js';
import { startPoller } from './push/poller.js';
import { startOneBot, type OneBotAdapter } from './adapters/onebot/server.js';
import { startKook, type KookAdapter } from './adapters/kook/client.js';

async function main(): Promise<void> {
  const cfg = loadConfig();
  registerAllCommands();
  getDb(cfg.push.sqlitePath);

  let onebot: OneBotAdapter | null = null;
  let kook: KookAdapter | null = null;

  if (cfg.onebot.enabled) {
    onebot = await startOneBot(cfg.onebot);
  } else {
    logger.info('OneBot adapter disabled');
  }

  if (cfg.kook.enabled) {
    kook = await startKook(cfg.kook);
  } else {
    logger.info('KOOK adapter disabled');
  }

  const send = async (platform: 'onebot' | 'kook', groupId: string, text: string): Promise<void> => {
    if (platform === 'onebot') {
      if (!onebot) throw new Error('OneBot not running');
      await onebot.sendGroupMsg(groupId, text);
      return;
    }
    if (!kook) throw new Error('KOOK not running');
    await kook.sendChannelMsg(groupId, text);
  };

  if (cfg.push.enabled) {
    startPoller(cfg.push.intervalMs, send);
  }

  logger.info('warframe-bot started');

  const shutdown = async () => {
    logger.info('shutting down');
    await onebot?.close();
    await kook?.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error({ err }, 'fatal');
  process.exit(1);
});
