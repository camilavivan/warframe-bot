import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterFissures,
  formatArbitration,
  formatEta,
  formatSortie,
  formatFissures,
  chunkMessage,
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


describe('formatFissures full list', () => {
  it('includes all items when >20 (no …另有 cap)', () => {
    const list: Fissure[] = Array.from({ length: 25 }, (_, i) => ({
      id: `f${i}`,
      tier: 'Lith',
      tierNum: 1,
      node: `Node${i}`,
      missionType: '捕获',
      enemy: 'Grineer',
      isHard: false,
      isStorm: false,
      expiry: new Date(Date.now() + 3600_000).toISOString(),
    }));
    const text = formatFissures(list, '裂缝');
    assert.match(text, /共 25 个/);
    assert.doesNotMatch(text, /另有/);
    for (let i = 0; i < 25; i++) {
      assert.match(text, new RegExp(`Node${i}`));
    }
    const bodyLines = text.split('\n').slice(1);
    assert.equal(bodyLines.length, 25);
  });
});

describe('chunkMessage', () => {
  it('returns single chunk when short', () => {
    const text = ['【裂缝】共 3 个', '· a', '· b', '· c'].join('\n');
    const parts = chunkMessage(text, { maxLines: 17 });
    assert.equal(parts.length, 1);
    assert.equal(parts[0], text);
    assert.doesNotMatch(parts[0], /（\d+\/\d+）/);
  });

  it('paginates with header （i/n） and default ~17 body lines', () => {
    const body = Array.from({ length: 40 }, (_, i) => `· item${i}`);
    const text = ['【裂缝】共 40 个', ...body].join('\n');
    const parts = chunkMessage(text); // default maxLines 17
    assert.equal(parts.length, 3); // 17+17+6
    assert.match(parts[0], /^【裂缝】共 40 个（1\/3）/);
    assert.match(parts[1], /^【裂缝】共 40 个（2\/3）/);
    assert.match(parts[2], /^【裂缝】共 40 个（3\/3）/);
    assert.match(parts[0], /item0/);
    assert.match(parts[0], /item16/);
    assert.doesNotMatch(parts[0], /item17/);
    assert.match(parts[1], /item17/);
    assert.match(parts[2], /item39/);
    // each part: header + <=17 body
    for (const p of parts) {
      assert.ok(p.split('\n').length <= 18);
    }
  });

  it('respects custom maxLines', () => {
    const body = Array.from({ length: 10 }, (_, i) => `· x${i}`);
    const text = ['HDR', ...body].join('\n');
    const parts = chunkMessage(text, { maxLines: 4 });
    assert.equal(parts.length, 3); // 4+4+2
    assert.match(parts[0], /^HDR（1\/3）/);
    assert.equal(parts[0].split('\n').length, 5);
  });
});
