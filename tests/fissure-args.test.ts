import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterFissures,
  isFastFissureMission,
  parseFissureArgs,
} from '../src/core/formatters.js';
import type { Fissure } from '../src/core/warframestat.js';

describe('parseFissureArgs', () => {
  it('defaults to normal non-hard non-storm', () => {
    const { filter, title } = parseFissureArgs('');
    assert.deepEqual(filter, { hard: false, storm: false });
    assert.equal(title, '裂缝');
  });

  it('parses 钢铁 / 风暴 / tier / 速刷', () => {
    assert.equal(parseFissureArgs('钢铁').filter.hard, true);
    assert.equal(parseFissureArgs('风暴').filter.storm, true);
    assert.equal(parseFissureArgs('t3').filter.tierNum, 3);
    assert.equal(parseFissureArgs('t3').filter.tier, 'Neo');
    assert.equal(parseFissureArgs('古纪').filter.tierNum, 1);
    const fast = parseFissureArgs('速刷');
    assert.equal(fast.filter.fast, true);
    assert.equal(fast.filter.hard, false);
    assert.match(fast.title, /速刷/);
  });

  it('combines 钢铁 速刷 without forcing hard=false', () => {
    const { filter } = parseFissureArgs('钢铁 速刷');
    assert.equal(filter.hard, true);
    assert.equal(filter.fast, true);
  });
});

describe('fast fissure heuristic', () => {
  it('matches Capture/Exterminate/Rescue en+zh', () => {
    assert.equal(isFastFissureMission('Capture'), true);
    assert.equal(isFastFissureMission('Exterminate'), true);
    assert.equal(isFastFissureMission('Rescue'), true);
    assert.equal(isFastFissureMission('捕获'), true);
    assert.equal(isFastFissureMission('歼灭'), true);
    assert.equal(isFastFissureMission('救援'), true);
    assert.equal(isFastFissureMission('Survival'), false);
    assert.equal(isFastFissureMission('防御'), false);
  });

  it('filterFissures applies fast + tierNum', () => {
    const sample: Fissure[] = [
      { id: '1', tier: 'Lith', tierNum: 1, isHard: false, missionType: 'Capture' },
      { id: '2', tier: 'Lith', tierNum: 1, isHard: false, missionType: 'Survival' },
      { id: '3', tier: 'Meso', tierNum: 2, isHard: false, missionType: 'Exterminate' },
      { id: '4', tier: 'Lith', tierNum: 1, isHard: true, missionType: 'Rescue' },
    ];
    const { filter } = parseFissureArgs('速刷 t1');
    const r = filterFissures(sample, filter);
    assert.equal(r.length, 1);
    assert.equal(r[0].id, '1');
  });
});
