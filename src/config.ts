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
      /**
       * Worldstate source:
       * - de: fetch DE CDN + warframe-worldstate-parser (recommended for CN VPS)
       * - warframestat: api.warframestat.us or self-hosted warframe-status
       * - mock: local fixture (same as mock:true)
       */
      source: z.enum(['de', 'warframestat', 'mock']).default('de'),
      /** DE raw worldState.php URL (used when source=de) */
      deWorldStateUrl: z.string().default('https://api.warframe.com/cdn/worldState.php'),
      baseUrl: z.string().default('https://api.warframestat.us'),
      platform: z.string().default('pc'),
      language: z.string().default('zh'),
      cacheTtlMs: z.number().default(60_000),
      userAgent: z.string().default(DEFAULT_UA),
      /** Extra warframe-status bases tried after primary (e.g. self-hosted) */
      fallbackBaseUrls: z.array(z.string()).default([]),
      /** Optional explicit proxy; prefer HTTPS_PROXY / WARFRAMESTAT_PROXY env */
      proxyUrl: z.string().optional(),
      /** Offline fixture mode — no outbound worldstate fetch */
      mock: z.boolean().default(false),
      /** Path to worldstate JSON; relative to process cwd unless absolute */
      mockFixturePath: z.string().default('./fixtures/worldstate-pc-zh.json'),
      /** How often mock fixture is re-read from disk (mtime always wins sooner) */
      mockReloadMs: z.number().default(300_000),
      /**
       * External kuva arbitration schedule (DE CDN / parser lacks live arb).
       * Default CN-friendly JSON feed; empty string disables external fetch.
       * Do NOT point at api.warframestat.us.
       */
      arbitrationUrl: z.string().default('https://wf.555590.xyz/api/arbys?days=30'),
      /** Cache TTL for external arbitration feed (5–15 min recommended) */
      arbitrationCacheTtlMs: z.number().default(600_000),
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
  /** QQ Open Platform official bot (AppID + Secret, not OneBot / WorkBuddy) */
  qqofficial: z
    .object({
      enabled: z.boolean().default(false),
      appId: z.string().default(''),
      secret: z.string().default(''),
      /** Kept for config compatibility; SDK sandbox flag is deprecated but still accepted */
      sandbox: z.boolean().default(true),
      removeAt: z.boolean().default(true),
      /**
       * Attach HTTPS images via segment.image (QQ uploads by URL).
       * Fandom/外链在国内常导致 850027 富媒体上传超时；失败会自动回退纯文字。
       * 设 false 可彻底关闭配图。环境变量 QQ_BOT_SEND_IMAGES=0/1 可覆盖。
       */
      sendImages: z.boolean().default(true),
      mode: z.enum(['websocket', 'webhook']).default('websocket'),
      webhookPort: z.number().default(9000),
      webhookPath: z.string().default('/qqbot/webhook'),
      /** Proactive send rate limit (push / sendGroupMsg); passive reply untouched */
      rateLimit: z
        .object({
          enabled: z.boolean().default(true),
          /** Soft per-group proactive msgs / minute */
          perGroupPerMin: z.number().default(15),
          /** Soft global proactive msgs / minute */
          globalPerMin: z.number().default(30),
          maxQueuePerGroup: z.number().default(40),
          rateLimitBackoffMs: z.number().default(3000),
        })
        .default({}),
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
  if (process.env.QQ_BOT_APP_ID) cfg.qqofficial.appId = process.env.QQ_BOT_APP_ID;
  if (process.env.QQ_BOT_SECRET) cfg.qqofficial.secret = process.env.QQ_BOT_SECRET;
  if (process.env.LOG_LEVEL) cfg.logLevel = process.env.LOG_LEVEL as AppConfig['logLevel'];
  if (process.env.HEALTH_PORT) cfg.health.port = Number(process.env.HEALTH_PORT) || cfg.health.port;
  if (process.env.WARFRAMESTAT_PROXY) cfg.api.proxyUrl = process.env.WARFRAMESTAT_PROXY;
  else if (process.env.HTTPS_PROXY) cfg.api.proxyUrl = process.env.HTTPS_PROXY;
  else if (process.env.HTTP_PROXY) cfg.api.proxyUrl = process.env.HTTP_PROXY;
  else if (process.env.https_proxy) cfg.api.proxyUrl = process.env.https_proxy;
  else if (process.env.http_proxy) cfg.api.proxyUrl = process.env.http_proxy;

  const mockEnv = process.env.WARFRAMESTAT_MOCK;
  if (mockEnv !== undefined) {
    const v = mockEnv.trim().toLowerCase();
    cfg.api.mock = v === '1' || v === 'true' || v === 'yes' || v === 'on';
  }
  if (process.env.WARFRAMESTAT_MOCK_FIXTURE) {
    cfg.api.mockFixturePath = process.env.WARFRAMESTAT_MOCK_FIXTURE;
  }

  const sourceEnv = process.env.WARFRAMESTAT_SOURCE;
  if (sourceEnv !== undefined) {
    const s = sourceEnv.trim().toLowerCase();
    if (s === 'de' || s === 'warframestat' || s === 'mock') {
      cfg.api.source = s;
    }
  }
  if (process.env.WARFRAME_DE_WORLDSTATE_URL) {
    cfg.api.deWorldStateUrl = process.env.WARFRAME_DE_WORLDSTATE_URL.trim();
  }
  if (process.env.WARFRAME_ARBITRATION_URL !== undefined) {
    cfg.api.arbitrationUrl = process.env.WARFRAME_ARBITRATION_URL.trim();
  }

  // mock flag / source=mock both mean fixture mode
  if (cfg.api.source === 'mock') {
    cfg.api.mock = true;
  }
  if (cfg.api.mock) {
    cfg.api.source = 'mock';
  }

  cached = cfg;
  return cfg;
}

export function resetConfigCache(): void {
  cached = null;
}
