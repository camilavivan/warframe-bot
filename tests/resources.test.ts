import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatResourceFarm,
  lookupResourceFarm,
} from '../src/core/resources.js';

describe('resource farm lookup', () => {
  it('finds argon by zh and en', () => {
    const zh = lookupResourceFarm('氩结晶');
    assert.ok(zh.length >= 1);
    assert.equal(zh[0].nameZh, '氩结晶');
    const en = lookupResourceFarm('argon');
    assert.ok(en.some((e) => e.nameZh === '氩结晶'));
  });

  it('formats Chinese guidance', () => {
    const text = formatResourceFarm('氩结晶');
    assert.match(text, /氩结晶/);
    assert.match(text, /虚空/);
  });

  it('empty query shows usage', () => {
    assert.match(formatResourceFarm(''), /用法/);
  });

  it('unknown resource soft message', () => {
    assert.match(formatResourceFarm('不存在的资源xyz'), /未找到/);
  });

  it('finds nitain / hexenon additions', () => {
    assert.ok(lookupResourceFarm('硝化提取物').some((e) => e.nameEn === 'Nitain Extract'));
    assert.ok(lookupResourceFarm('hexenon').some((e) => e.nameZh === '六氟化氙'));
  });
});
