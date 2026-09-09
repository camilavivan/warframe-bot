import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterFissures,
  formatArbitration,
  formatEta,
  formatSortie,
  formatFissures,
} from '../src/core/formatters.js';
import type { Fissure, Sortie } from '../src/core/warframestat.js';

describe('formatEta', () => {
  it('returns eta string when provided', () => {
    assert.equal(formatEta('1h 2m'), '1h 2m');
  });

  it('computes from expiry', () => {
    const expiry = new Date(Date.now() + 90 * 60_000).toISOString();
    const s = formatEta(undefined, expiry);
    assert.match(s, /1时|90分|1时30/);
  });

  it('handles past expiry', () => {
    const expiry = new Date(Date.now() - 1000).toISOString();
    assert.equal(formatEta(undefined, expiry), '已结束');
  });
});

describe('formatSortie', () => {
  it('formats Chinese summary', () => {
    const s: Sortie = {
      boss: 'Tyl Regor',
      faction: 'Grineer',
      eta: '2h',
      variants: [
        { node: '地球·盖亚', missionType: '歼灭', modifier: '能量削减' },
        { node: '火星·奥林巴斯', missionType: '防御', modifier: '敌人护甲增强' },
        { node: '赛德娜·海德隆', missionType: '生存', modifier: '敌人护盾增强' },
      ],
    };
    const text = formatSortie(s);
    assert.match(text, /突击/);
    assert.match(text, /Tyl Regor/);
    assert.match(text, /盖亚/);
    assert.match(text, /2h/);
  });

  it('empty sortie', () => {
    assert.match(formatSortie(null), /无突击/);
  });
});

describe('formatArbitration', () => {
  it('formats node info', () => {
    const text = formatArbitration({
      node: '谷神星·奥克塔维亚',
      type: '生存',
      enemy: 'Corpus',
      eta: '55m',
    });
    assert.match(text, /仲裁/);
    assert.match(text, /奥克塔维亚/);
    assert.match(text, /生存/);
  });
});

describe('filterFissures', () => {
  const sample: Fissure[] = [
    { id: '1', tier: 'Lith', tierNum: 1, isHard: false, isStorm: false, node: 'A', missionType: '捕获' },
    { id: '2', tier: 'Meso', tierNum: 2, isHard: true, isStorm: false, node: 'B', missionType: '歼灭' },
    { id: '3', tier: 'Neo', tierNum: 3, isHard: false, isStorm: true, node: 'C', missionType: '生存' },
    { id: '4', tier: 'Axi', tierNum: 4, isHard: true, isStorm: true, node: 'D', missionType: '防御', expired: true },
  ];

  it('filters hard only', () => {
    const r = filterFissures(sample, { hard: true });
    assert.equal(r.length, 1);
    assert.equal(r[0].id, '2');
  });

  it('filters storm only', () => {
    const r = filterFissures(sample, { storm: true });
    assert.equal(r.length, 1);
    assert.equal(r[0].id, '3');
  });

  it('filters normal (not hard not storm)', () => {
    const r = filterFissures(sample, { hard: false, storm: false });
    assert.equal(r.length, 1);
    assert.equal(r[0].id, '1');
  });

  it('excludes expired', () => {
    const r = filterFissures(sample);
    assert.ok(!r.some((f) => f.id === '4'));
  });

  it('formatFissures includes title', () => {
    const text = formatFissures(filterFissures(sample, { hard: true }), '钢铁裂缝');
    assert.match(text, /钢铁裂缝/);
    assert.match(text, /Meso/);
  });
});
