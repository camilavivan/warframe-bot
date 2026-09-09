import pino from 'pino';
import { loadConfig } from '../config.js';

export function createLogger(name?: string) {
  const cfg = loadConfig();
  return pino({
    name,
    level: cfg.logLevel,
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino/file', options: { destination: 1 } }
        : undefined,
  });
}

export const logger = createLogger('warframe-bot');
