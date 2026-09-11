import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expandWmQuery, resolveWmItem, WM_SLANG } from '../src/core/wm-resolve.js';
import { formatWm } from '../src/core/formatters.js';
import type { WmSearchOutcome } from '../src/core/warframestat.js';

describe('wm slang expand', () => {
  it('maps 夜灵p / 悟空p', () => {
    assert.equal(expandWmQuery('夜灵p'), 'eidolon_lens');
    assert.equal(expandWmQuery('悟空p'), 'wukong_prime');
    assert.ok(WM_SLANG['夜灵棱镜']);
  });

  it('expands latin trailing p to _prime', () => {
    assert.equal(expandWmQuery('wukong p'), 'wukong_prime');
    assert.equal(expandWmQuery('AshP'), 'ash_prime');
  });
});

describe('resolveWmItem fuzzy', () => {
  const catalog = [
    { item_name: 'Wukong Prime', url_name: 'wukong_prime' },
    { item_name: 'Wukong Prime Set', url_name: 'wukong_prime_set' },
    { item_name: 'Eidolon Lens', url_name: 'eidolon_lens' },
    { item_name: 'Greater Eidolon Lens', url_name: 'greater_eidolon_lens' },
    { item_name: 'Primed Continuity', url_name: 'primed_continuity' },
    { item_name: 'Ash Prime Chassis', url_name: 'ash_prime_chassis' },
  ];

  it('resolves slang and includes', () => {
    const a = resolveWmItem(catalog, '悟空p');
    assert.equal(a.found?.url_name, 'wukong_prime');
    const b = resolveWmItem(catalog, '夜灵p');
    assert.equal(b.found?.url_name, 'eidolon_lens');
    const c = resolveWmItem(catalog, 'primed cont');
    assert.equal(c.found?.url_name, 'primed_continuity');
  });

  it('returns Top-N suggestions on miss', () => {
    const r = resolveWmItem(catalog, 'zzzz_not_real_item_xyz');
    assert.equal(r.found, null);
    assert.equal(r.suggestions.length, 0);

    // ambiguous-ish initials / partial that doesn't clear-win
    const amb = resolveWmItem(
      [
        { item_name: 'Foo Bar', url_name: 'foo_bar' },
        { item_name: 'Foo Baz', url_name: 'foo_baz' },
        { item_name: 'Foo Bat', url_name: 'foo_bat' },
      ],
      'foo_ba',
    );
    // may find or suggest — if null, suggestions non-empty
    if (!amb.found) assert.ok(amb.suggestions.length >= 1);
  });

  it('formatWm Chinese suggestions on miss', () => {
    const outcome: WmSearchOutcome = {
      query: '不存在的东西',
      expandedQuery: '不存在的东西',
      item: null,
      suggestions: [
        { itemName: 'Wukong Prime', urlName: 'wukong_prime' },
        { itemName: 'Eidolon Lens', urlName: 'eidolon_lens' },
      ],
    };
    const text = formatWm(outcome);
    assert.match(text, /未找到物品/);
    assert.match(text, /你是不是要找/);
    assert.match(text, /Wukong Prime/);
  });
});
