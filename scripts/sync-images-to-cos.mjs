#!/usr/bin/env node
/**
 * Pre-upload known theme images to Tencent COS.
 * Prefer local assets/img/* (bundled in the Docker image); fall back to Fandom
 * only when a local file is missing (build machine / non-CN network).
 *
 * Requires env (do not print secrets):
 *   COS_SECRET_ID / COS_SECRET_KEY (or TENCENT_SECRET_ID / TENCENT_SECRET_KEY)
 *   COS_BUCKET=wf-1311711592
 *   COS_REGION=ap-shanghai
 *   COS_PUBLIC_BASE=   (optional CDN)
 *
 * Bucket objects should be public-read (object ACL or policy for warframe-bot/img/*).
 *
 * Usage: node scripts/sync-images-to-cos.mjs
 *    or: npm run sync-images-to-cos
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import COS from 'cos-nodejs-sdk-v5';

const PREFIX = 'warframe-bot/img/';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS_IMG = join(ROOT, 'assets', 'img');

const THEME_FILES = [
  'Void_Fissure.png',
  'VoidTrader.png',
  'Darvo.png',
  'Invasion.png',
  'Grineer.png',
  'Corpus.png',
  'Infested.png',
  'ArchonAmar.png',
  'ArchonNira.png',
  'ArchonBoreal.png',
  'Cetus.png',
  'Plains_of_Eidolon.png',
  'Earth.png',
  'Orb_Vallis.png',
  'Cambion_Drift.png',
  'OrokinCatalyst.png',
];

function envFirst(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function wikiUrl(file) {
  return `https://warframe.fandom.com/wiki/Special:FilePath/${encodeURIComponent(file)}`;
}

function publicUrl(bucket, region, key, publicBase) {
  const clean = key.replace(/^\/+/, '');
  if (publicBase) return `${publicBase.replace(/\/+$/, '')}/${clean}`;
  return `https://${bucket}.cos.${region}.myqcloud.com/${clean}`;
}

async function headExists(cos, bucket, region, key) {
  try {
    await cos.headObject({ Bucket: bucket, Region: region, Key: key });
    return true;
  } catch (err) {
    if (err?.statusCode === 404) return false;
    throw err;
  }
}

async function loadBody(file) {
  const local = join(ASSETS_IMG, file);
  if (existsSync(local)) {
    const buf = readFileSync(local);
    if (!buf.length) throw new Error('local empty');
    return { buf, source: `local:${local}` };
  }
  const source = wikiUrl(file);
  const res = await fetch(source, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`download status=${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error('download empty');
  return { buf, source };
}

async function main() {
  const secretId = envFirst('COS_SECRET_ID', 'TENCENT_SECRET_ID');
  const secretKey = envFirst('COS_SECRET_KEY', 'TENCENT_SECRET_KEY');
  const bucket = envFirst('COS_BUCKET');
  const region = envFirst('COS_REGION') || 'ap-shanghai';
  const publicBase = envFirst('COS_PUBLIC_BASE');

  if (!secretId || !secretKey || !bucket) {
    console.error(
      'Missing COS_SECRET_ID/COS_SECRET_KEY (or TENCENT_*) and/or COS_BUCKET. COS_REGION defaults to ap-shanghai.',
    );
    process.exit(1);
  }

  // Never print secret values — only presence / lengths
  console.log(
    JSON.stringify({
      bucket,
      region,
      publicBase: publicBase || null,
      secretIdSet: true,
      secretKeySet: true,
      secretIdLen: secretId.length,
      secretKeyLen: secretKey.length,
      files: THEME_FILES.length,
      assetsImg: ASSETS_IMG,
    }),
  );

  const cos = new COS({ SecretId: secretId, SecretKey: secretKey });
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of THEME_FILES) {
    const key = `${PREFIX}${file}`;
    try {
      if (await headExists(cos, bucket, region, key)) {
        skipped += 1;
        console.log(`skip exists ${key}`);
        continue;
      }
      const { buf, source } = await loadBody(file);
      await cos.putObject({
        Bucket: bucket,
        Region: region,
        Key: key,
        Body: buf,
        ContentType: 'image/png',
        ACL: 'public-read',
      });
      uploaded += 1;
      console.log(`ok ${publicUrl(bucket, region, key, publicBase)} (${source})`);
    } catch (err) {
      failed += 1;
      console.error(`fail ${file}:`, err?.message || err);
    }
  }

  console.log(JSON.stringify({ uploaded, skipped, failed }));
  if (failed) process.exit(2);
}

main();
