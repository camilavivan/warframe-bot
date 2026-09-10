import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resetConfigCache } from '../src/config.js';
import {
  fetchWorldState,
  fetchSortie,
  fetchFissures,
  fetchCetusCycle,
  searchWmOrders,
  translateKeyword,
  resetMockFixtureCache,
} from '../src/core/warframestat.js';

const dir = dirname(fileURLToPath(import.meta.url));
const fixture = resolve(dir, '../fixtures/worldstate-pc-zh.json');

describe('warframestat mock mode', () => {
  const prevMock = process.env.WARFRAMESTAT_MOCK;
  const prevFixture = process.env.WARFRAMESTAT_MOCK_FIXTURE;

  before(() => {
    process.env.WARFRAMESTAT_MOCK = '1';
    process.env.WARFRAMESTAT_MOCK_FIXTURE = fixture;
    resetConfigCache();
    resetMockFixtureCache();
  });

  after(() => {
    if (prevMock === undefined) delete process.env.WARFRAMESTAT_MOCK;
    else process.env.WARFRAMESTAT_MOCK = prevMock;
    if (prevFixture === undefined) delete process.env.WARFRAMESTAT_MOCK_FIXTURE;
    else process.env.WARFRAMESTAT_MOCK_FIXTURE = prevFixture;
    resetConfigCache();
    resetMockFixtureCache();
  });

  beforeEach(() => {
    resetConfigCache();
    resetMockFixtureCache();
    process.env.WARFRAMESTAT_MOCK = '1';
    process.env.WARFRAMESTAT_MOCK_FIXTURE = fixture;
  });

  it('fetchWorldState returns fixture fields offline', async () => {
    const ws = await fetchWorldState();
    assert.ok(ws.sortie, 'sortie');
    assert.ok(ws.arbitration, 'arbitration');
    assert.ok(Array.isArray(ws.fissures) && ws.fissures.length >= 3, 'fissures');
    assert.ok(Array.isArray(ws.invasions), 'invasions');
    assert.ok(ws.voidTrader, 'voidTrader');
    assert.ok(Array.isArray(ws.dailyDeals), 'dailyDeals');
    assert.ok(ws.cetusCycle, 'cetusCycle');
    assert.equal(ws.cetusCycle?.isDay, false, 'cetus night for push test');
    assert.equal(ws.cetusCycle?.state, 'night');
    assert.ok(ws.archonHunt, 'archonHunt');
    assert.ok(ws.calendar, 'calendar');
    assert.ok(Array.isArray(ws.archimedeas), 'archimedeas');
    assert.ok(ws.duviriCycle, 'duviriCycle');
    assert.ok(ws.nightwave, 'nightwave');
    assert.ok(Array.isArray(ws.news), 'news');
    assert.ok(Array.isArray(ws.alerts), 'alerts');
    assert.ok(ws.earthCycle, 'earthCycle');
    assert.ok(ws.vallisCycle, 'vallisCycle');
    assert.ok(ws.cambionCycle, 'cambionCycle');
    assert.ok(ws.zarimanCycle, 'zarimanCycle');
  });

  it('sub-fetchers read from fixture (normal/hard/storm fissures)', async () => {
    const sortie = await fetchSortie();
    assert.ok(sortie?.boss || sortie?.variants?.length);

    const fissures = await fetchFissures();
    assert.ok(fissures.some((f) => !f.isHard && !f.isStorm), 'normal');
    assert.ok(fissures.some((f) => f.isHard), 'hard');
    assert.ok(fissures.some((f) => f.isStorm), 'storm');

    const cetus = await fetchCetusCycle();
    assert.equal(cetus.isDay, false);
  });

  it('wm / translate stubs do not crash in mock', async () => {
    const wm = await searchWmOrders('ash_prime_set');
    assert.ok(wm);
    assert.match(wm!.itemName, /模拟/);
    assert.ok(wm!.sell.length >= 1);

    const tr = await translateKeyword('Ash');
    assert.ok(tr.length >= 1);
    assert.match(tr[0], /模拟/);
  });
});
