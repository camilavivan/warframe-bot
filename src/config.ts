import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

const DEFAULT_UA = 'warframe-bot/1.1 (+https://github.com/camilavivan/warframe-bot)';

const ConfigSchema = z.object({
  prefix: z.array(z.string()).default(['wf ', '/']),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  api: z
    .object({
      baseUrl: z.string().default('https://api.warframestat.us'),
      platform: z.string().default('pc'),
      language: z.string().default('zh'),
      cacheTtlMs: z.number().default(30_000),
      userAgent: z.string().default(DEFAULT_UA),
      /** Extra warframe-status bases tried after primary (e.g. self-hosted) */
      fallbackBaseUrls: z.array(z.string()).default([]),
      /** Optional explicit proxy; prefer HTTPS_PROXY / WARFRAMESTAT_PROXY env */
      proxyUrl: z.string().optional(),
    })
    .default({}),
  push: z
    .object({
      enabled: z.boolean().default(true),
      intervalMs: z.number().default(60_000),
      sqlitePath: z.string().default('./data/bot.db'),
    })
    .default({}),
  /** Always-on health HTTP. Reuses OneBot port when onebot.enabled && ports match. */
  health: z
    .object({
      host: z.string().default('0.0.0.0'),
      port: z.number().default(6700),
    })
    .default({}),
  onebot: z
    .object({
      enabled: z.boolean().default(true),
      host: z.string().default('0.0.0.0'),
      port: z.number().default(6700),
      accessToken: z.string().default(''),
      apiBase: z.string().default('http://127.0.0.1:5700'),
      apiAccessToken: z.string().default(''),
    })
    .default({}),
  kook: z
    .object({
      enabled: z.boolean().default(false),
      token: z.string().default(''),
      compress: z.boolean().default(true),
    })
    .default({}),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

let cached: AppConfig | null = null;

export function loadConfig(path?: string): AppConfig {
  if (cached && !path) return cached;

  const candidates = [
    path,
    process.env.CONFIG_PATH,
    resolve(process.cwd(), 'config.yaml'),
    resolve(process.cwd(), 'config.example.yaml'),
  ].filter(Boolean) as string[];

  let raw: unknown = {};
  for (const p of candidates) {
    if (existsSync(p)) {
      raw = parseYaml(readFileSync(p, 'utf8')) ?? {};
      break;
    }
  }

  const cfg = ConfigSchema.parse(raw);

  // Env overrides
  if (process.env.ONEBOT_ACCESS_TOKEN) cfg.onebot.accessToken = process.env.ONEBOT_ACCESS_TOKEN;
  if (process.env.ONEBOT_API_ACCESS_TOKEN) cfg.onebot.apiAccessToken = process.env.ONEBOT_API_ACCESS_TOKEN;
  if (process.env.KOOK_TOKEN) cfg.kook.token = process.env.KOOK_TOKEN;
  if (process.env.LOG_LEVEL) cfg.logLevel = process.env.LOG_LEVEL as AppConfig['logLevel'];
  if (process.env.HEALTH_PORT) cfg.health.port = Number(process.env.HEALTH_PORT) || cfg.health.port;
  if (process.env.WARFRAMESTAT_PROXY) cfg.api.proxyUrl = process.env.WARFRAMESTAT_PROXY;
  else if (process.env.HTTPS_PROXY) cfg.api.proxyUrl = process.env.HTTPS_PROXY;
  else if (process.env.HTTP_PROXY) cfg.api.proxyUrl = process.env.HTTP_PROXY;
  else if (process.env.https_proxy) cfg.api.proxyUrl = process.env.https_proxy;
  else if (process.env.http_proxy) cfg.api.proxyUrl = process.env.http_proxy;

  cached = cfg;
  return cfg;
}

export function resetConfigCache(): void {
  cached = null;
}
