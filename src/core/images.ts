/**
 * Public HTTPS image URLs for enriched command replies (QQ official / OneBot CQ).
 * Prefer Fandom Special:FilePath (stable aliases) and reward thumbnails when HTTPS.
 * Do not rely on local VPS files for v1.
 */
import type {
  ArchonHunt,
  Cycle,
  DailyDeal,
  Invasion,
  Sortie,
  VoidTrader,
} from './warframestat.js';

/** Stable public wiki file URL (QQ Open Platform needs reachable HTTPS). */
export function wikiImage(fileName: string): string {
  return `https://warframe.fandom.com/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
}

/** Thematic static assets — verified public HTTPS. */
export const STATIC_IMAGES = {
  voidFissure: wikiImage('Void_Fissure.png'),
  voidTrader: wikiImage('VoidTrader.png'),
  darvo: wikiImage('Darvo.png'),
  invasion: wikiImage('Invasion.png'),
  grineer: wikiImage('Grineer.png'),
  corpus: wikiImage('Corpus.png'),
  infested: wikiImage('Infested.png'),
  archonAmar: wikiImage('ArchonAmar.png'),
  archonNira: wikiImage('ArchonNira.png'),
  archonBoreal: wikiImage('ArchonBoreal.png'),
  cetus: wikiImage('Cetus.png'),
  plains: wikiImage('Plains_of_Eidolon.png'),
  earth: wikiImage('Earth.png'),
  vallis: wikiImage('Orb_Vallis.png'),
  cambion: wikiImage('Cambion_Drift.png'),
  catalyst: wikiImage('OrokinCatalyst.png'),
} as const;

const FACTION_IMAGE: Record<string, string> = {
  grineer: STATIC_IMAGES.grineer,
  corpus: STATIC_IMAGES.corpus,
  infestation: STATIC_IMAGES.infested,
  infested: STATIC_IMAGES.infested,
  orokin: STATIC_IMAGES.corpus,
  narmer: STATIC_IMAGES.archonAmar,
};

/** Known reward / item name → wiki file (cdn.warframestat.us/img often 404). */
const ITEM_FILE: Record<string, string> = {
  fieldron: 'Fieldron.png',
  电磁力场装置: 'Fieldron.png',
  detoniteinjector: 'DetoniteInjector.png',
  detonite: 'DetoniteInjector.png',
  爆燃喷射器: 'DetoniteInjector.png',
  mutagenmass: 'MutagenMass.png',
  诱变剂团: 'MutagenMass.png',
  orokincatalyst: 'OrokinCatalyst.png',
  orokinreactor: 'OrokinReactor.png',
  forma: 'Forma.png',
  exilusadapter: 'ExilusWarframeAdapter.png',
  kubrowegg: 'KubrowEgg.png',
};

function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '');
}

export function factionImage(faction?: string): string | undefined {
  if (!faction) return undefined;
  return FACTION_IMAGE[normKey(faction)] ?? FACTION_IMAGE[faction.toLowerCase()];
}

export function itemImageFromName(name?: string): string | undefined {
  if (!name?.trim()) return undefined;
  const key = normKey(name);
  for (const [k, file] of Object.entries(ITEM_FILE)) {
    if (key.includes(normKey(k)) || normKey(k).includes(key)) {
      return wikiImage(file);
    }
  }
  // Try PascalCase wiki file from English-ish name
  const pascal = name
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  if (/^[A-Za-z][A-Za-z0-9]+$/.test(pascal)) {
    return wikiImage(`${pascal}.png`);
  }
  return undefined;
}

/** Prefer non-broken HTTPS thumbnail; fall back to item-name wiki map. */
export function resolveRewardImage(opts: {
  thumbnail?: string;
  asString?: string;
}): string | undefined {
  const thumb = opts.thumbnail?.trim();
  if (thumb && /^https:\/\//i.test(thumb) && !/cdn\.warframestat\.us\/img\//i.test(thumb)) {
    return thumb;
  }
  // warframestat img CDN is often 404 — map from asString / slug in thumbnail path
  if (thumb) {
    const m = thumb.match(/\/img\/([^/?#]+)\.(?:png|jpg|webp)/i);
    if (m) {
      const mapped = itemImageFromName(m[1].replace(/-/g, ' '));
      if (mapped) return mapped;
    }
  }
  if (opts.asString) {
    // "电磁力场装置×3" / "Fieldron x3" → first token
    const first = opts.asString.split(/[、,x×]/i)[0]?.trim();
    return itemImageFromName(first) ?? itemImageFromName(opts.asString);
  }
  return undefined;
}

function uniqHttps(urls: Array<string | undefined>, max = 3): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of urls) {
    if (!u || !/^https:\/\//i.test(u) || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= max) break;
  }
  return out;
}

export function imagesForSortie(s: Sortie | null | undefined): string[] {
  if (!s) return [];
  return uniqHttps([factionImage(s.faction), STATIC_IMAGES.grineer]);
}

export function imagesForArchonHunt(h: ArchonHunt | null | undefined): string[] {
  if (!h) return [];
  const boss = (h.boss || '').toLowerCase();
  let icon = STATIC_IMAGES.archonAmar;
  if (boss.includes('nira')) icon = STATIC_IMAGES.archonNira;
  else if (boss.includes('boreal')) icon = STATIC_IMAGES.archonBoreal;
  else if (boss.includes('amar')) icon = STATIC_IMAGES.archonAmar;
  return uniqHttps([icon, factionImage(h.faction)]);
}

export function imagesForVoidTrader(_v?: VoidTrader | null): string[] {
  return [STATIC_IMAGES.voidTrader];
}

export function imagesForDailyDeals(deals: DailyDeal[]): string[] {
  const fromItems = (deals || []).map((d) => itemImageFromName(d.item));
  return uniqHttps([...fromItems, STATIC_IMAGES.darvo], 2);
}

export function imagesForFissures(): string[] {
  return [STATIC_IMAGES.voidFissure];
}

export function imagesForInvasions(list: Invasion[]): string[] {
  const active = (list || []).filter((i) => !i.completed);
  const rewardImgs = active.flatMap((i) => [
    resolveRewardImage({
      thumbnail: i.attackerReward?.thumbnail,
      asString: i.attackerReward?.asString,
    }),
    resolveRewardImage({
      thumbnail: i.defenderReward?.thumbnail,
      asString: i.defenderReward?.asString,
    }),
  ]);
  const factionImgs = active.flatMap((i) => [
    factionImage(i.attackingFaction),
    factionImage(i.defendingFaction),
  ]);
  return uniqHttps([...rewardImgs, ...factionImgs, STATIC_IMAGES.invasion], 3);
}

export type CycleKind = 'cetus' | 'earth' | 'vallis' | 'cambion' | 'zariman';

export function imagesForCycle(kind: CycleKind, c?: Cycle | null): string[] {
  switch (kind) {
    case 'cetus':
      return [STATIC_IMAGES.plains];
    case 'earth':
      return [STATIC_IMAGES.earth];
    case 'vallis':
      return [STATIC_IMAGES.vallis];
    case 'cambion':
      // Vome/Fass wiki files are broken (tiny); use location art
      return [STATIC_IMAGES.cambion];
    case 'zariman':
      return [STATIC_IMAGES.voidFissure];
    default:
      return c ? [STATIC_IMAGES.earth] : [];
  }
}
