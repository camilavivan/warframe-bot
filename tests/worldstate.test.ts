import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  pickWorldStateField,
  WORLDSTATE_FIELD_PATHS,
  isVoidTraderActive,
  type WorldState,
} from '../src/core/warframestat.js';
import {
  filterFissures,
  formatArbitration,
  formatArchonHunt,
  formatCalendar,
  formatDailyDeals,
  formatPushSortie,
  formatVoidTrader,
} from '../src/core/formatters.js';
import { pollFromWorldState } from '../src/push/poller.js';
import { closeDb, resetDbForTests, subscribe } from '../src/push/db.js';

const dir = dirname(fileURLToPath(import.meta.url));
const load = <T>(name: string): T => JSON.parse(readFileSync(join(dir, 'fixtures', name), 'utf8')) as T;

describe('pickWorldStateField', () => {
  const ws = load<WorldState>('worldstate-slim.json');

  it('extracts known fields from fixture worldstate', () => {
    for (const field of Object.keys(WORLDSTATE_FIELD_PATHS) as (keyof typeof WORLDSTATE_FIELD_PATHS)[]) {
      const v = pickWorldStateField(ws, field);
      assert.notEqual(v, undefined, `missing field ${field}`);
    }
  });

  it('formatters still work on extracted fields', () => {
    const sortie = pickWorldStateField(ws, 'sortie');
    assert.ok(sortie);
    assert.match(formatPushSortie(sortie), /突击|刷新|Boss|执政官|敌人/i);

    const arb = pickWorldStateField(ws, 'arbitration');
    if (arb?.node) {
      assert.match(formatArbitration(arb), /仲裁/);
    }

    const fissures = pickWorldStateField(ws, 'fissures') || [];
    assert.ok(Array.isArray(filterFissures(fissures)));

    const vt = pickWorldStateField(ws, 'voidTrader');
    assert.ok(vt);
    assert.match(formatVoidTrader(vt), /./);
    assert.equal(typeof isVoidTraderActive(vt), 'boolean');

    const deals = pickWorldStateField(ws, 'dailyDeals') || [];
    if (deals.length) {
      assert.match(formatDailyDeals(deals), /./);
    }

    const hunt = pickWorldStateField(ws, 'archonHunt');
    if (hunt) {
      assert.match(formatArchonHunt(hunt), /./);
    }

    const cal = pickWorldStateField(ws, 'calendar');
    if (cal) {
      assert.match(formatCalendar(cal), /1999|日历/);
    }
  });

  it('returns undefined for missing field', () => {
    assert.equal(pickWorldStateField({} as WorldState, 'sortie'), undefined);
  });
});

describe('pollFromWorldState single fetch', () => {
  let tmp: string;

  before(() => {
    tmp = mkdtempSync(join(tmpdir(), 'wfbot-ws-'));
    resetDbForTests(join(tmp, 'test.db'));
    subscribe('onebot', '10001', 'sortie', 'group');
    subscribe('onebot', '10001', 'darvo', 'group');
  });

  after(() => {
    closeDb();
    rmSync(tmp, { recursive: true, force: true });
  });

  it('pushes from fixture worldstate without calling HTTP', async () => {
    const ws = load<WorldState>('worldstate-slim.json');
    const sent: Array<{ topicHint: string; text: string }> = [];
    await pollFromWorldState(ws, async (_platform, _chatId, text) => {
      sent.push({ topicHint: text.slice(0, 40), text });
    });
    // At least sortie or darvo should fire when subscribed
    assert.ok(sent.length >= 1, `expected pushes, got ${sent.length}`);
    assert.ok(sent.some((s) => /突击|特惠|Darvo|刷新/i.test(s.text)));
  });
});
