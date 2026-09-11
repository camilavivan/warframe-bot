/**
 * Tencent COS helper for hosting QQ theme images.
 * Secrets only via env (COS_SECRET_ID / COS_SECRET_KEY or TENCENT_*).
 * Never log secret values. When bucket/region/creds missing → no-op (disabled).
 */
import { readFileSync } from 'node:fs';
import COS from 'cos-nodejs-sdk-v5';
import { loadConfig } from '../config.js';
import { createLogger } from './logger.js';

const log = createLogger('cos');

export const COS_IMG_PREFIX = 'warframe-bot/img/';

export type CosRuntimeConfig = {
  enabled: boolean;
  secretId: string;
  secretKey: string;
  bucket: string;
  region: string;
  /** Optional CDN / custom domain, no trailing slash */
  publicBaseUrl?: string;
};

let cachedClient: COS | null = null;
let cachedClientKey = '';

/** In-flight ensure/upload promises keyed by object key (never stores secrets). */
const ensureInflight = new Map<string, Promise<string>>();

export function resetCosState(): void {
  cachedClient = null;
  cachedClientKey = '';
  ensureInflight.clear();
}

function envFirst(...keys: string[]): string {
  for (const k of keys) {
    const v = process.env[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

/**
 * Resolve COS settings from env + config.yaml (images.cos).
 * Env wins for secrets and for bucket/region/publicBase when set.
 * Enabled when credentials + bucket + region are present, unless images.cos.enabled === false.
 */
export function resolveCosConfig(): CosRuntimeConfig {
  const cfg = loadConfig();
  const cosYaml = cfg.images?.cos ?? {
    enabled: undefined,
    bucket: '',
    region: '',
    publicBaseUrl: undefined,
  };

  const secretId = envFirst('COS_SECRET_ID', 'TENCENT_SECRET_ID');
  const secretKey = envFirst('COS_SECRET_KEY', 'TENCENT_SECRET_KEY');
  const bucket = envFirst('COS_BUCKET') || (cosYaml.bucket ?? '').trim();
  const region = envFirst('COS_REGION') || (cosYaml.region ?? '').trim();
  const publicBaseRaw = envFirst('COS_PUBLIC_BASE') || (cosYaml.publicBaseUrl ?? '').trim();
  const publicBaseUrl = publicBaseRaw.replace(/\/+$/, '') || undefined;

  const hasCreds = Boolean(secretId && secretKey && bucket && region);
  let enabled = hasCreds;
  if (cosYaml.enabled === false) enabled = false;
  else if (cosYaml.enabled === true) enabled = hasCreds;

  return {
    enabled,
    secretId,
    secretKey,
    bucket,
    region,
    publicBaseUrl,
  };
}

export function isCosEnabled(): boolean {
  return resolveCosConfig().enabled;
}

export function cosKeyForFile(fileName: string): string {
  const base = fileName.replace(/^\/+/, '').replace(/^.*\//, '');
  return `${COS_IMG_PREFIX}${base}`;
}

/** Build public HTTPS URL for an object key (no network). */
export function getPublicUrl(key: string, settings?: CosRuntimeConfig): string {
  const s = settings ?? resolveCosConfig();
  const cleanKey = key.replace(/^\/+/, '');
  if (s.publicBaseUrl) {
    return `${s.publicBaseUrl}/${cleanKey}`;
  }
  return `https://${s.bucket}.cos.${s.region}.myqcloud.com/${cleanKey}`;
}

function getClient(s: CosRuntimeConfig): COS | null {
  if (!s.enabled) return null;
  const ck = `${s.bucket}|${s.region}|id:${s.secretId.length}|key:${s.secretKey.length}`;
  if (!cachedClient || cachedClientKey !== ck) {
    cachedClient = new COS({
      SecretId: s.secretId,
      SecretKey: s.secretKey,
    });
    cachedClientKey = ck;
  }
  return cachedClient;
}

function contentTypeForKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'application/octet-stream';
}

/** HEAD object — true if exists. On disabled COS, false. */
export async function objectExists(key: string): Promise<boolean> {
  const s = resolveCosConfig();
  const client = getClient(s);
  if (!client) return false;
  const cleanKey = key.replace(/^\/+/, '');
  try {
    await client.headObject({
      Bucket: s.bucket,
      Region: s.region,
      Key: cleanKey,
    });
    return true;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404) return false;
    log.warn({ key: cleanKey, status }, 'COS headObject failed');
    return false;
  }
}

export async function putObject(
  key: string,
  body: Buffer,
  opts?: { contentType?: string; acl?: 'public-read' | 'default' | 'private' },
): Promise<string | null> {
  const s = resolveCosConfig();
  const client = getClient(s);
  if (!client) return null;
  const cleanKey = key.replace(/^\/+/, '');
  const ContentType = opts?.contentType ?? contentTypeForKey(cleanKey);
  const ACL = opts?.acl ?? 'public-read';
  await client.putObject({
    Bucket: s.bucket,
    Region: s.region,
    Key: cleanKey,
    Body: body,
    ContentType,
    ACL,
  });
  return getPublicUrl(cleanKey, s);
}

export async function putObjectFromPath(key: string, filePath: string): Promise<string | null> {
  const buf = readFileSync(filePath);
  return putObject(key, buf);
}

/**
 * If object already exists, skip upload and return public URL.
 * Otherwise putObject and return public URL. No-op → null when COS disabled.
 */
export async function ensureObject(
  key: string,
  body: Buffer,
  opts?: { contentType?: string },
): Promise<string | null> {
  const s = resolveCosConfig();
  if (!s.enabled) return null;
  const cleanKey = key.replace(/^\/+/, '');
  if (await objectExists(cleanKey)) {
    return getPublicUrl(cleanKey, s);
  }
  return putObject(cleanKey, body, opts);
}

/**
 * Download sourceUrl with undici, then put if missing.
 * Returns public COS URL, or null if COS disabled / download or upload failed.
 */
export async function uploadFromUrl(sourceUrl: string, key: string): Promise<string | null> {
  const s = resolveCosConfig();
  if (!s.enabled) return null;
  const cleanKey = key.replace(/^\/+/, '');

  const existing = ensureInflight.get(cleanKey);
  if (existing) {
    try {
      return await existing;
    } catch {
      return null;
    }
  }

  const job = (async (): Promise<string> => {
    if (await objectExists(cleanKey)) {
      return getPublicUrl(cleanKey, s);
    }
    const res = await fetch(sourceUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      throw new Error(`download status ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) {
      throw new Error('empty body');
    }
    const ctHeader = res.headers.get('content-type');
    const ct = ctHeader ? ctHeader.split(';')[0]?.trim() : undefined;
    const url = await putObject(cleanKey, buf, {
      contentType: ct || contentTypeForKey(cleanKey),
    });
    if (!url) throw new Error('putObject returned null');
    return url;
  })();

  ensureInflight.set(cleanKey, job);
  try {
    return await job;
  } catch (err) {
    ensureInflight.delete(cleanKey);
    log.warn({ key: cleanKey, err }, 'COS uploadFromUrl failed');
    return null;
  }
}

/** Map a Fandom/wiki or generic HTTPS image URL to a COS object key, if possible. */
export function cosKeyFromSourceUrl(sourceUrl: string): string | null {
  try {
    const u = new URL(sourceUrl);
    const filePath = u.pathname.match(/Special:FilePath\/([^/]+)$/i);
    if (filePath) {
      return cosKeyForFile(decodeURIComponent(filePath[1]));
    }
    const leaf = u.pathname.match(/\/([^/]+\.(?:png|jpe?g|webp|gif))$/i);
    if (leaf) {
      return cosKeyForFile(decodeURIComponent(leaf[1]));
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function isCosPublicUrl(url: string, settings?: CosRuntimeConfig): boolean {
  const s = settings ?? resolveCosConfig();
  if (!/^https:\/\//i.test(url)) return false;
  if (s.publicBaseUrl && url.startsWith(`${s.publicBaseUrl}/`)) return true;
  if (s.bucket && s.region) {
    const host = `${s.bucket}.cos.${s.region}.myqcloud.com`;
    try {
      return new URL(url).hostname === host;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * When COS enabled: ensure object exists (upload once from sourceUrl on miss) and return COS HTTPS URL.
 * On failure or disabled: return sourceUrl unchanged (QQ adapter still has text fallback).
 */
export async function hostImageUrl(sourceUrl: string): Promise<string> {
  if (!sourceUrl || !/^https:\/\//i.test(sourceUrl)) return sourceUrl;
  const s = resolveCosConfig();
  if (!s.enabled) return sourceUrl;
  if (isCosPublicUrl(sourceUrl, s)) return sourceUrl;

  const key = cosKeyFromSourceUrl(sourceUrl);
  if (!key) return sourceUrl;

  const uploaded = await uploadFromUrl(sourceUrl, key);
  return uploaded ?? sourceUrl;
}

export async function hostImages(urls: string[]): Promise<string[]> {
  if (!urls.length) return [];
  if (!isCosEnabled()) return [...urls];
  return Promise.all(urls.map((u) => hostImageUrl(u)));
}
