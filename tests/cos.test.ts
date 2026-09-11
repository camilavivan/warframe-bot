import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  cosKeyForFile,
  cosKeyFromSourceUrl,
  getPublicUrl,
  hostImageUrl,
  hostImages,
  isCosEnabled,
  isCosPublicUrl,
  listBundledThemeFiles,
  resolveCosConfig,
  resolveLocalAssetPath,
  resetCosState,
  syncBundledThemeAssets,
  COS_IMG_PREFIX,
} from '../src/core/cos.js';
import { resetConfigCache } from '../src/config.js';
import { THEME_FILES, wikiImage } from '../src/core/images.js';

const ENV_KEYS = [
  'COS_SECRET_ID',
  'COS_SECRET_KEY',
  'TENCENT_SECRET_ID',
  'TENCENT_SECRET_KEY',
  'COS_BUCKET',
  'COS_REGION',
  'COS_PUBLIC_BASE',
] as const;

describe('COS URL builder / config (no real credentials)', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    resetConfigCache();
    resetCosState();
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    resetConfigCache();
    resetCosState();
  });

  it('getPublicUrl uses virtual-hosted default', () => {
    const url = getPublicUrl('warframe-bot/img/Void_Fissure.png', {
      enabled: true,
      secretId: 'x',
      secretKey: 'y',
      bucket: 'wf-1311711592',
      region: 'ap-shanghai',
    });
    assert.equal(
      url,
      'https://wf-1311711592.cos.ap-shanghai.myqcloud.com/warframe-bot/img/Void_Fissure.png',
    );
  });

  it('getPublicUrl respects publicBaseUrl', () => {
    const url = getPublicUrl('warframe-bot/img/a.png', {
      enabled: true,
      secretId: 'x',
      secretKey: 'y',
      bucket: 'wf-1311711592',
      region: 'ap-shanghai',
      publicBaseUrl: 'https://cdn.example.com',
    });
    assert.equal(url, 'https://cdn.example.com/warframe-bot/img/a.png');
  });

  it('cosKeyForFile / cosKeyFromSourceUrl', () => {
    assert.equal(cosKeyForFile('Void_Fissure.png'), `${COS_IMG_PREFIX}Void_Fissure.png`);
    const src = wikiImage('Void_Fissure.png');
    assert.equal(cosKeyFromSourceUrl(src), `${COS_IMG_PREFIX}Void_Fissure.png`);
  });

  it('disabled when bucket/region/secrets unset', () => {
    assert.equal(isCosEnabled(), false);
    const cfg = resolveCosConfig();
    assert.equal(cfg.enabled, false);
  });

  it('resolveLocalAssetPath finds bundled theme PNGs', () => {
    const p = resolveLocalAssetPath(THEME_FILES.grineer);
    assert.ok(p);
    assert.match(p!, /Grineer\.png$/);
  });

  it('hostImageUrl / hostImages return null/[] when COS disabled (no Fandom leak)', async () => {
    const src = wikiImage(THEME_FILES.grineer);
    assert.equal(await hostImageUrl(src), null);
    assert.deepEqual(await hostImages([src]), []);
  });

  it('enabled when env has id/key/bucket/region', () => {
    process.env.COS_SECRET_ID = 'testid';
    process.env.COS_SECRET_KEY = 'testkey';
    process.env.COS_BUCKET = 'wf-1311711592';
    process.env.COS_REGION = 'ap-shanghai';
    resetConfigCache();
    resetCosState();
    assert.equal(isCosEnabled(), true);
    const cfg = resolveCosConfig();
    assert.equal(cfg.bucket, 'wf-1311711592');
    assert.equal(cfg.region, 'ap-shanghai');
    // must not leak secrets into assertions beyond presence
    assert.ok(cfg.secretId.length > 0);
    assert.ok(cfg.secretKey.length > 0);
    assert.equal(
      isCosPublicUrl(
        'https://wf-1311711592.cos.ap-shanghai.myqcloud.com/warframe-bot/img/x.png',
        cfg,
      ),
      true,
    );
  });

  it('listBundledThemeFiles / syncBundledThemeAssets dry path (COS off)', async () => {
    const listed = listBundledThemeFiles();
    assert.ok(listed.length >= Object.keys(THEME_FILES).length);
    for (const file of Object.values(THEME_FILES)) {
      assert.ok(listed.includes(file), `missing listed ${file}`);
      assert.ok(resolveLocalAssetPath(file), `resolveLocalAssetPath ${file}`);
    }
    const summary = await syncBundledThemeAssets();
    assert.equal(summary.total, listed.length);
    assert.equal(summary.uploaded, 0);
    assert.equal(summary.skipped, 0);
    assert.equal(summary.failed, 0);
  });

});
