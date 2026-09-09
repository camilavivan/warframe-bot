/**
 * Always-on lightweight health HTTP server.
 * - When OneBot is enabled and health.port === onebot.port, reuse OneBot's /health.
 * - Otherwise (or OneBot disabled), start a tiny Fastify server on config.health.port (default 6700).
 */
import Fastify from 'fastify';
import type { AppConfig } from './config.js';
import { logger } from './core/logger.js';

const log = logger.child({ module: 'health' });

export interface HealthServer {
  close: () => Promise<void>;
  port: number;
}

/**
 * Start dedicated health server when OneBot is off, or when health uses a different port.
 * Returns null if OneBot already exposes /health on the same port.
 */
export async function startHealthServer(cfg: AppConfig): Promise<HealthServer | null> {
  const healthPort = cfg.health.port;
  const onebotShares =
    cfg.onebot.enabled && cfg.onebot.port === healthPort;

  if (onebotShares) {
    log.info(
      { port: healthPort },
      'health served via OneBot /health (same port)',
    );
    return null;
  }

  const app = Fastify({ logger: false });
  app.get('/health', async () => ({
    ok: true,
    service: 'warframe-bot',
    onebot: cfg.onebot.enabled,
    kook: cfg.kook.enabled,
    ts: new Date().toISOString(),
  }));

  await app.listen({ host: cfg.health.host, port: healthPort });
  log.info({ host: cfg.health.host, port: healthPort }, 'health server listening');

  return {
    port: healthPort,
    close: async () => {
      await app.close();
    },
  };
}
