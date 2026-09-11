import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  lexiconStats,
  lookupBidirectional,
  zh,
  zhNode,
} from '../src/core/locale-zh.js';
import { toSimplified } from '../src/core/zh-simplify.js';

describe('locale zh()', () => {
  it('translates mission types (exact + case-insensitive)', () => {
    assert.equal(zh('Extermination'), '歼灭');
    assert.equal(zh('extermination'), '歼灭');
    assert.equal(zh('Mobile Defense'), '机动防御');
    assert.equal(zh('Survival'), '生存');
    assert.equal(zh('Void Cascade'), '虚空洪流');
    assert.equal(zh('Alchemy'), '炼金');
  });

  it('translates sortie modifiers', () => {
    assert.equal(zh('Energy Reduction'), '能量削减');
    assert.equal(zh('Eximus Stronghold'), '卓越者据点');
  });

  it('translates factions / cycles', () => {
    assert.equal(zh('The Murmur'), '细语者');
    assert.equal(zh('Day'), '白天');
    assert.equal(zh('Fass'), '法斯');
    assert.equal(zh('Vome'), '沃姆');
    assert.equal(zh('Grineer'), '格里尼尔');
    assert.equal(zh('Corpus'), 'Corpus');
    assert.equal(zh('Infested'), '感染者');
    assert.equal(zh('Orokin'), '奥罗金');
    assert.equal(zh('Sentient'), '感触者');
    assert.equal(zh('Parasitic Towers'), '寄生高塔');
    assert.equal(zh('Hypersensitive'), '过度敏感');
  });

  it('returns original when unknown', () => {
    assert.equal(zh('DefinitelyNotARealMissionXYZ'), 'DefinitelyNotARealMissionXYZ');
    assert.equal(zh(''), '');
    assert.equal(zh(null), '');
  });
});

describe('locale zhNode()', () => {
  it('translates known proper names + planets', () => {
    assert.equal(zhNode('Gaia (Earth)'), '盖亚（地球）');
    assert.match(zhNode('Hydron (Sedna)'), /海德隆/);
    assert.match(zhNode('Hydron (Sedna)'), /赛德娜/);
  });

  it('uses generated solNodes planet translation', () => {
    const n = zhNode('Galatea (Neptune)');
    assert.match(n, /海王星/);
  });

  it('handles empty', () => {
    assert.equal(zhNode(''), '?');
    assert.equal(zhNode(undefined), '?');
  });
});

describe('lookupBidirectional', () => {
  it('en→zh and zh→en', () => {
    const a = lookupBidirectional('Extermination');
    assert.ok(a.some((l) => l.includes('歼灭')));
    const b = lookupBidirectional('歼灭');
    assert.ok(b.some((l) => /Exterminat/i.test(l)));
  });
});

describe('lexicon size', () => {
  it('is substantially expanded', () => {
    const s = lexiconStats();
    assert.ok(s.overrides >= 200, `overrides ${s.overrides}`);
    assert.ok(s.generated >= 400, `generated ${s.generated}`);
    assert.ok(s.merged >= 600, `merged ${s.merged}`);
  });
});

describe('toSimplified', () => {
  it('converts Traditional Sedna to Simplified', () => {
    assert.equal(toSimplified('賽德娜'), '赛德娜');
  });

  it('no-ops empty / already simplified', () => {
    assert.equal(toSimplified(''), '');
    assert.equal(toSimplified('赛德娜'), '赛德娜');
  });
});
