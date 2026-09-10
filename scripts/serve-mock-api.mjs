#!/usr/bin/env node
/**
 * Tiny HTTP server that serves fixtures/worldstate-pc-zh.json as a fake
 * warframestat API. Useful when you want integration without code-level mock:
 *
 *   node scripts/serve-mock-api.mjs
 *   # then set api.baseUrl: http://host.docker.internal:3099
 *
 * Routes (platform prefix optional):
 *   GET /pc?language=zh   → full worldstate
 *   GET /pc/sortie        → worldstate.sortie
 *   GET /                 → full worldstate
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const port = Number(process.env.MOCK_API_PORT || 3099);
const fixturePath =
  process.env.WARFRAMESTAT_MOCK_FIXTURE ||
  resolve(process.cwd(), 'fixtures/worldstate-pc-zh.json');

if (!existsSync(fixturePath)) {
  console.error(`fixture not found: ${fixturePath}`);
  process.exit(1);
}

function load() {
  return JSON.parse(readFileSync(fixturePath, 'utf8'));
}

function pick(ws, pathname) {
  const parts = pathname.replace(/\/+/g, '/').split('/').filter(Boolean);
  // strip platform segment (pc|ps4|xb1|swi)
  if (parts[0] && /^(pc|ps4|xb1|swi)$/i.test(parts[0])) parts.shift();
  if (parts.length === 0) return ws;
  let cur = ws;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return cur;
}

const server = createServer((req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    const data = pick(load(), url.pathname);
    if (data === undefined) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found', path: url.pathname }));
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(data));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`mock warframestat API on http://0.0.0.0:${port}`);
  console.log(`fixture: ${fixturePath}`);
  console.log(`try: curl -sS "http://127.0.0.1:${port}/pc?language=zh" | head`);
});
