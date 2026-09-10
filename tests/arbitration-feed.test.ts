import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterEfficientArbitrations,
  isStubArbitration,
  pickCurrentArbitration,
  type Arbitration,
} from '../src/core/warframestat.js';
import {
  formatArbitration,
  formatArbitrationSchedule,
  formatEfficientArbitrations,
} from '../src/core/formatters.js';

describe('arbitration helpers', () => {
  it('detects stubs', () => {
    assert.equal(isStubArbitration(undefined), true);
    assert.equal(isStubArbitration({ node: 'SolNode000', type: 'Unknown' }), true);
    assert.equal(isStubArbitration({ node: 'Helene (土星)', type: '防御' }), false);
  });

  it('picks current by activation/expiry window', () => {
    const now = Date.parse('2026-09-10T16:30:00.000Z');
    const list: Arbitration[] = [
      {
        node: 'Past',
        type: '生存',
        activation: '2026-09-10T15:00:00.000Z',
        expiry: '2026-09-10T16:00:00.000Z',
      },
      {
        node: 'NowNode',
        type: '防御',
        enemy: 'Grineer',
        activation: '2026-09-10T16:00:00.000Z',
        expiry: '2026-09-10T17:00:00.000Z',
      },
      {
        node: 'Future',
        type: '歼灭',
        activation: '2026-09-10T17:00:00.000Z',
        expiry: '2026-09-10T18:00:00.000Z',
      },
    ];
    const cur = pickCurrentArbitration(list, now);
    assert.equal(cur?.node, 'NowNode');
  });

  it('filters efficient by bounds', () => {
    const list: Arbitration[] = [
      { node: 'A', type: '生存', bounds: { resourceBonus: 0.25, xpBonus: 0.18 } },
      { node: 'B', type: '防御' },
    ];
    assert.equal(filterEfficientArbitrations(list).length, 1);
    assert.match(formatEfficientArbitrations(list), /高效仲裁/);
    assert.match(formatEfficientArbitrations(list), /资源\+25%/);
  });

  it('format empty states are Chinese-friendly', () => {
    assert.match(formatArbitration({ node: 'SolNode000', type: 'Unknown' }), /暂无|无仲裁/);
    assert.match(formatArbitrationSchedule([]), /暂无/);
    assert.match(formatEfficientArbitrations([]), /暂无/);
  });
});
