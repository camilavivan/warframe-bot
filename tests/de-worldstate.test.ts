import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resetConfigCache } from '../src/config.js';
import { parseDeWorldStateJson } from '../src/core/de-worldstate.js';
import {
  formatPushSortie,
  formatFissures,
  filterFissures,
  formatVoidTrader,
  formatCalendar,
  formatArchimedeas,
  formatDuviri,
  formatCycle,
  formatArchonHunt,
} from '../src/core/formatters.js';

const dir = dirname(fileURLToPath(import.meta.url));
const rawSlim = readFileSync(join(dir, 'fixtures/de-worldstate-raw-slim.json'), 'utf8');

describe('parseDeWorldStateJson', () => {
  const prevSource = process.env.WARFRAMESTAT_SOURCE;

  before(() => {
    process.env.WARFRAMESTAT_SOURCE = 'de';
    resetConfigCache();
  });

  after(() => {
    if (prevSource === undefined) delete process.env.WARFRAMESTAT_SOURCE;
    else process.env.WARFRAMESTAT_SOURCE = prevSource;
    resetConfigCache();
  });

  it('parses truncated DE JSON into WorldState fields', async () => {
    const ws = await parseDeWorldStateJson(rawSlim, 'zh');
    assert.ok(ws.sortie?.boss || (ws.sortie?.variants && ws.sortie.variants.length > 0), 'sortie');
    assert.ok(Array.isArray(ws.fissures) && ws.fissures.length >= 1, 'fissures');
    assert.ok(ws.voidTrader?.character || ws.voidTrader?.location, 'voidTrader');
    assert.ok(ws.cetusCycle?.expiry, 'cetusCycle');
    assert.ok(ws.archonHunt, 'archonHunt');
    assert.ok(ws.calendar?.days, 'calendar');
    assert.ok(Array.isArray(ws.archimedeas) && ws.archimedeas.length >= 1, 'archimedeas');
    assert.ok(ws.duviriCycle?.state, 'duviriCycle');
    assert.ok(Array.isArray(ws.invasions), 'invasions');
    assert.ok(Array.isArray(ws.dailyDeals), 'dailyDeals');
    // stub arbitration should be stripped
    assert.equal(ws.arbitration, undefined);
  });


  it('normalizes Traditional zh node names to Simplified (Selkie/Marid)', async () => {
    const ws = await parseDeWorldStateJson(rawSlim, 'zh');
    const blob = JSON.stringify(ws);
    assert.equal(blob.includes('賽德娜'), false, 'must not keep Traditional 賽德娜');
    assert.ok(blob.includes('赛德娜'), 'must use Simplified 赛德娜');
    const invNodes = (ws.invasions ?? []).map((i: { node?: string }) => i.node ?? '');
    assert.ok(
      invNodes.some((n) => n.includes('Selkie') && n.includes('赛德娜')),
      `Selkie node: ${invNodes.join(' | ')}`,
    );
    assert.ok(
      invNodes.some((n) => n.includes('Marid') && n.includes('赛德娜')),
      `Marid node: ${invNodes.join(' | ')}`,
    );
  });

  it('formatters accept DE-mapped shapes', async () => {
    const ws = await parseDeWorldStateJson(rawSlim, 'zh');
    assert.match(formatPushSortie(ws.sortie!), /突击|刷新|Boss|执政官|敌人/i);
    assert.ok(formatFissures(filterFissures(ws.fissures || []), '裂缝').length > 0);
    assert.match(formatVoidTrader(ws.voidTrader!), /./);
    assert.match(formatCycle(ws.cetusCycle!, '平原'), /平原|昼|夜|日|剩余/);
    if (ws.archonHunt) assert.match(formatArchonHunt(ws.archonHunt), /./);
    if (ws.calendar) assert.match(formatCalendar(ws.calendar), /1999|日历/);
    if (ws.archimedeas?.length) assert.match(formatArchimedeas(ws.archimedeas), /./);
    if (ws.duviriCycle) assert.match(formatDuviri(ws.duviriCycle), /./);
  });
});
