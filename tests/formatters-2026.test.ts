import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  filterFissures,
  formatArchimedeas,
  formatCalendar,
  formatCycle,
  formatDuviri,
  formatFissures,
  formatVoidTrader,
} from '../src/core/formatters.js';
import {
  isDeepArchimedea,
  isTemporalArchimedea,
  isVoidTraderActive,
  type Archimedea,
  type Calendar1999,
  type DuviriCycle,
  type Fissure,
  type VoidTrader,
} from '../src/core/warframestat.js';

const dir = dirname(fileURLToPath(import.meta.url));
const load = <T>(name: string): T => JSON.parse(readFileSync(join(dir, 'fixtures', name), 'utf8')) as T;

describe('formatCalendar', () => {
  const cal = load<Calendar1999>('calendar.json');

  it('shows season and yearIteration in Chinese', () => {
    const text = formatCalendar(cal);
    assert.match(text, /1999 日历/);
    assert.match(text, /夏季/);
    assert.match(text, /循环年份：22/);
  });

  it('lists near-term days with challenges/rewards', () => {
    const text = formatCalendar(cal, { nearDays: 3 });
    assert.match(text, /待办|大奖|覆盖/);
    assert.match(text, /1999-07/);
  });

  it('empty calendar', () => {
    assert.match(formatCalendar(null), /无.*日历/);
  });
});

describe('formatArchimedeas', () => {
  const list = load<Archimedea[]>('archimedeas.json');

  it('detects deep vs temporal by typeKey', () => {
    assert.equal(list.filter(isDeepArchimedea).length, 1);
    assert.equal(list.filter(isTemporalArchimedea).length, 1);
  });

  it('formats missions, deviations, risks, personal modifiers', () => {
    const text = formatArchimedeas(list);
    assert.match(text, /深层研习/);
    assert.match(text, /时空研习/);
    assert.doesNotMatch(text, /Deep Archimedea|Temporal Archimedea/);
    assert.match(text, /偏差/);
    assert.match(text, /个人修正/);
  });

  it('translates EN deviation/risk/modifier names via zh()', () => {
    const text = formatArchimedeas(list);
    // fixture has English Parasitic Towers / Hypersensitive etc.
    assert.match(text, /寄生高塔/);
    assert.match(text, /过度敏感|牵连|短视弹药/);
    assert.doesNotMatch(text, /Parasitic Towers/);
    assert.doesNotMatch(text, /Hypersensitive/);
  });
});

describe('formatDuviri', () => {
  const d = load<DuviriCycle>('duviriCycle.json');

  it('translates emotion and circuit choices', () => {
    const text = formatDuviri(d);
    assert.match(text, /双衍王境/);
    assert.match(text, /喜悦/);
    assert.match(text, /普通回路|钢铁回路/);
  });
});

describe('fissures steel path + storms', () => {
  const sample = load<Fissure[]>('fissures-sample.json');

  it('separates hard and storm with latest fields', () => {
    const hard = filterFissures(sample, { hard: true });
    const storm = filterFissures(sample, { storm: true });
    assert.ok(hard.every((f) => f.isHard));
    assert.ok(storm.every((f) => f.isStorm));
    const text = formatFissures(hard, '钢铁裂缝');
    assert.match(text, /钢铁/);
  });
});

describe('voidTrader without active field', () => {
  it('derives inactive from future activation', () => {
    const v: VoidTrader = {
      character: "Baro Ki'Teer",
      location: 'Larunda Relay (Mercury)',
      activation: new Date(Date.now() + 86400_000).toISOString(),
      expiry: new Date(Date.now() + 2 * 86400_000).toISOString(),
      inventory: [],
    };
    assert.equal(isVoidTraderActive(v), false);
    const text = formatVoidTrader(v);
    assert.match(text, /未抵达/);
  });

  it('derives active from window', () => {
    const v: VoidTrader = {
      character: "Baro Ki'Teer",
      location: 'Larunda Relay (Mercury)',
      activation: new Date(Date.now() - 3600_000).toISOString(),
      expiry: new Date(Date.now() + 3600_000).toISOString(),
      inventory: [{ item: 'Primed Mod', ducats: 100, credits: 100000 }],
    };
    assert.equal(isVoidTraderActive(v), true);
    assert.match(formatVoidTrader(v), /已抵达/);
  });
});

describe('formatCycle zariman', () => {
  it('shows Corpus side in Chinese when isCorpus===true', () => {
    const text = formatCycle(
      {
        isCorpus: true,
        state: 'corpus',
        timeLeft: '2h 27m',
        expiry: new Date(Date.now() + 2.5 * 3600_000).toISOString(),
      },
      '扎里曼',
    );
    assert.match(text, /扎里曼/);
    assert.match(text, /状态：Corpus/);
    assert.doesNotMatch(text, /状态：corpus/);
    assert.doesNotMatch(text, /\d+h\s*\d+m/);
  });

  it('shows Grineer side in Chinese when isCorpus===false', () => {
    const text = formatCycle(
      {
        isCorpus: false,
        state: 'grineer',
        timeLeft: '-2h 27m',
        expiry: new Date(Date.now() + 90 * 60_000).toISOString(),
      },
      '扎里曼',
    );
    assert.match(text, /状态：格里尼尔/);
    assert.doesNotMatch(text, /状态：grineer/i);
  });

  it('translates Vome/Fass via zh()', () => {
    const vome = formatCycle({ isVome: true, expiry: new Date(Date.now() + 600_000).toISOString() }, '火卫二');
    const fass = formatCycle({ isVome: false, expiry: new Date(Date.now() + 600_000).toISOString() }, '火卫二');
    assert.match(vome, /沃姆/);
    assert.match(fass, /法斯/);
  });
});
