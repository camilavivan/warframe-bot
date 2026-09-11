/**
 * Lightweight Warframe.market query expand + fuzzy resolve.
 * No PinyinSharp — slang map, includes, url initials, simple subsequence.
 */

export type WmCatalogItem = { item_name: string; url_name: string };

/** Common CN community slang / shorthand → WFM url_name (or searchable English). */
export const WM_SLANG: Record<string, string> = {
  // lenses / eidolon
  夜灵p: 'eidolon_lens',
  '夜灵p镜': 'eidolon_lens',
  夜灵棱镜: 'eidolon_lens',
  大夜灵棱镜: 'greater_eidolon_lens',
  大夜灵p: 'greater_eidolon_lens',
  // primes (p = prime)
  悟空p: 'wukong_prime',
  喜美p: 'xaku_prime',
  喜美: 'xaku',
  奶妈p: 'trinity_prime',
  磁妹p: 'mag_prime',
  电男p: 'volt_prime',
  伏特p: 'volt_prime',
  洛基p: 'loki_prime',
  诺基p: 'nova_prime',
  诺娃p: 'nova_prime',
  霓虹p: 'nova_prime',
  吸吸p: 'nekros_prime',
  吸吸: 'nekros',
  死灵p: 'nekros_prime',
  加拉p: 'garuda_prime',
  加鲁达p: 'garuda_prime',
  提妹p: 'titania_prime',
  提泰妮娅p: 'titania_prime',
  牛牛p: 'atlas_prime',
  阿特p: 'atlas_prime',
  飞机p: 'gauss_prime',
  高斯p: 'gauss_prime',
  男枪p: 'baruuk_prime',
  巴鲁p: 'baruuk_prime',
  棺材p: 'sevagoth_prime',
  赛华p: 'sevagoth_prime',
  // commons
  紫卡: 'riven_mod',
  赋能: 'arcane',
  狗蛋: 'kubrow_egg',
  阿贡: 'argon_crystal',
  氩金: 'argon_crystal',
};

function normQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, '_');
}

/** Expand slang / trailing 「p」prime shorthand. */
export function expandWmQuery(query: string): string {
  const raw = query.trim();
  if (!raw) return raw;
  if (WM_SLANG[raw]) return WM_SLANG[raw];
  const lower = raw.toLowerCase();
  if (WM_SLANG[lower]) return WM_SLANG[lower];

  // 「某某p」 / 「某某 p」 → try slang without spaces; else append _prime if base known
  const pMatch = raw.match(/^(.+?)\s*[pPｐ]$/);
  if (pMatch) {
    const base = pMatch[1].trim();
    const viaSlang = WM_SLANG[base] || WM_SLANG[`${base}p`];
    if (viaSlang) {
      if (viaSlang.endsWith('_prime') || viaSlang.includes('lens')) return viaSlang;
      return viaSlang.endsWith('_prime') ? viaSlang : `${viaSlang}_prime`;
    }
    // latin base → base_prime
    if (/^[a-zA-Z][a-zA-Z0-9_\-\s]*$/.test(base)) {
      return `${base.toLowerCase().replace(/\s+/g, '_')}_prime`;
    }
  }
  return raw;
}

function urlInitials(urlName: string): string {
  return urlName
    .split(/_+/)
    .filter(Boolean)
    .map((p) => p[0] || '')
    .join('')
    .toLowerCase();
}

/** True if all chars of needle appear in order in haystack. */
function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (const ch of haystack) {
    if (ch === needle[i]) i += 1;
    if (i >= needle.length) return true;
  }
  return needle.length === 0;
}

function scoreItem(item: WmCatalogItem, qRaw: string, qExpanded: string): number {
  const url = item.url_name.toLowerCase();
  const name = item.item_name.toLowerCase();
  const q = normQuery(qRaw);
  const ex = normQuery(qExpanded);
  const qSpace = qRaw.trim().toLowerCase();
  const exSpace = qExpanded.trim().toLowerCase().replace(/_/g, ' ');

  if (url === q || url === ex) return 1000;
  if (name === qSpace || name === exSpace) return 950;
  if (url.startsWith(ex) || url.startsWith(q)) return 800;
  if (name.startsWith(exSpace) || name.startsWith(qSpace)) return 780;
  if (url.includes(ex) || url.includes(q)) return 600 + Math.min(ex.length, 40);
  if (name.includes(exSpace) || name.includes(qSpace)) return 580 + Math.min(exSpace.length, 40);

  const initials = urlInitials(url);
  if (q.length >= 2 && initials === q) return 520;
  if (ex.length >= 2 && initials === ex.replace(/_/g, '')) return 510;
  if (q.length >= 2 && initials.startsWith(q)) return 400;

  if (q.length >= 3 && isSubsequence(q.replace(/_/g, ''), url.replace(/_/g, ''))) return 300;
  if (ex.length >= 3 && isSubsequence(ex.replace(/_/g, ''), url.replace(/_/g, ''))) return 290;

  return 0;
}

export type WmResolveResult = {
  found: WmCatalogItem | null;
  suggestions: WmCatalogItem[];
  expandedQuery: string;
};

/**
 * Resolve catalog item for a user query. On ambiguous/miss, suggestions are Top-N by score.
 */
export function resolveWmItem(
  items: WmCatalogItem[],
  query: string,
  topN = 5,
): WmResolveResult {
  const expandedQuery = expandWmQuery(query);
  const scored = items
    .map((item) => ({ item, score: scoreItem(item, query, expandedQuery) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.item.url_name.localeCompare(b.item.url_name));

  if (!scored.length) {
    return { found: null, suggestions: [], expandedQuery };
  }

  const best = scored[0];
  // Accept best if clearly ahead or exact-ish
  const second = scored[1];
  const clearWinner =
    best.score >= 580 || !second || best.score - second.score >= 80 || best.score >= 800;

  if (clearWinner) {
    return {
      found: best.item,
      suggestions: scored.slice(1, topN + 1).map((s) => s.item),
      expandedQuery,
    };
  }

  return {
    found: null,
    suggestions: scored.slice(0, topN).map((s) => s.item),
    expandedQuery,
  };
}
