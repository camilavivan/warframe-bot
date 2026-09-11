/**
 * Public HTTPS image URLs for enriched command replies (QQ official / OneBot CQ).
 * Theme PNGs are bundled under assets/img/ (see THEME_FILES). When Tencent COS is
 * enabled, upload from local assets and return COS HTTPS URLs — never fetch Fandom
 * from the runtime VPS (CN egress often gets 403). When COS is off or upload fails,
 * return no image URLs (text-only) so QQ does not hit 850027 on Fandom.
 */
import type {
  ArchonHunt,
  Cycle,
  DailyDeal,
  Invasion,
  Sortie,
  VoidTrader,
} from './warframestat.js';
import { hostImages, hostThemeFile, isCosEnabled } from './cos.js';

/** Stable public wiki file URL (reference / sync fallback; not sent to QQ). */
export function wikiImage(fileName: string): string {
  return `https://warframe.fandom.com/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
}

/** Theme file names under COS prefix warframe-bot/img/ and assets/img/ */
export const THEME_FILES = {
  voidFissure: 'Void_Fissure.png',
  voidTrader: 'VoidTrader.png',
  darvo: 'Darvo.png',
  invasion: 'Invasion.png',
  grineer: 'Grineer.png',
  corpus: 'Corpus.png',
  infested: 'Infested.png',
  archonAmar: 'ArchonAmar.png',
  archonNira: 'ArchonNira.png',
  archonBoreal: 'ArchonBoreal.png',
  cetus: 'Cetus.png',
  plains: 'Plains_of_Eidolon.png',
  earth: 'Earth.png',
  vallis: 'Orb_Vallis.png',
  cambion: 'Cambion_Drift.png',
  catalyst: 'OrokinCatalyst.png',
} as const;

export type ThemeKey = keyof typeof THEME_FILES;

/** Thematic static assets — Fandom source URLs (COS hosting applied in imagesFor*). */
export const STATIC_IMAGES = {
  voidFissure: wikiImage(THEME_FILES.voidFissure),
  voidTrader: wikiImage(THEME_FILES.voidTrader),
  darvo: wikiImage(THEME_FILES.darvo),
  invasion: wikiImage(THEME_FILES.invasion),
  grineer: wikiImage(THEME_FILES.grineer),
  corpus: wikiImage(THEME_FILES.corpus),
  infested: wikiImage(THEME_FILES.infested),
  archonAmar: wikiImage(THEME_FILES.archonAmar),
  archonNira: wikiImage(THEME_FILES.archonNira),
  archonBoreal: wikiImage(THEME_FILES.archonBoreal),
  cetus: wikiImage(THEME_FILES.cetus),
  plains: wikiImage(THEME_FILES.plains),
  earth: wikiImage(THEME_FILES.earth),
  vallis: wikiImage(THEME_FILES.vallis),
  cambion: wikiImage(THEME_FILES.cambion),
  catalyst: wikiImage(THEME_FILES.catalyst),
} as const;

const FACTION_FILE: Record<string, string> = {
  grineer: THEME_FILES.grineer,
  corpus: THEME_FILES.corpus,
  infestation: THEME_FILES.infested,
  infested: THEME_FILES.infested,
  orokin: THEME_FILES.corpus,
  narmer: THEME_FILES.archonAmar,
};

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

export function factionThemeFile(faction?: string): string | undefined {
  if (!faction) return undefined;
  return FACTION_FILE[normKey(faction)] ?? FACTION_FILE[faction.toLowerCase()];
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

function uniqFiles(files: Array<string | undefined>, max = 3): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const f of files) {
    if (!f || seen.has(f)) continue;
    seen.add(f);
    out.push(f);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Publish theme file names via local assets → COS.
 * When COS disabled or upload fails: [] (no Fandom to QQ).
 */
async function publishThemeFiles(files: string[]): Promise<string[]> {
  if (!files.length || !isCosEnabled()) return [];
  const urls = await Promise.all(files.map((f) => hostThemeFile(f)));
  return urls.filter((u): u is string => Boolean(u && /^https:\/\//i.test(u)));
}

/**
 * Publish mixed HTTPS source URLs (theme wiki + item maps) via hostImages.
 * Prefers bundled assets; never returns Fandom on failure / COS off.
 */
async function publish(urls: string[]): Promise<string[]> {
  if (!urls.length || !isCosEnabled()) return [];
  return hostImages(urls);
}

export async function imagesForSortie(s: Sortie | null | undefined): Promise<string[]> {
  if (!s) return [];
  return publishThemeFiles(
    uniqFiles([factionThemeFile(s.faction), THEME_FILES.grineer]),
  );
}

export async function imagesForArchonHunt(h: ArchonHunt | null | undefined): Promise<string[]> {
  if (!h) return [];
  const boss = (h.boss || '').toLowerCase();
  let icon: string = THEME_FILES.archonAmar;
  if (boss.includes('nira')) icon = THEME_FILES.archonNira;
  else if (boss.includes('boreal')) icon = THEME_FILES.archonBoreal;
  else if (boss.includes('amar')) icon = THEME_FILES.archonAmar;
  return publishThemeFiles(uniqFiles([icon, factionThemeFile(h.faction)]));
}

export async function imagesForVoidTrader(_v?: VoidTrader | null): Promise<string[]> {
  return publishThemeFiles([THEME_FILES.voidTrader]);
}

export async function imagesForDailyDeals(deals: DailyDeal[]): Promise<string[]> {
  const fromItems = (deals || []).map((d) => itemImageFromName(d.item));
  return publish(uniqHttps([...fromItems, STATIC_IMAGES.darvo], 2));
}

export async function imagesForFissures(): Promise<string[]> {
  return publishThemeFiles([THEME_FILES.voidFissure]);
}

export async function imagesForInvasions(list: Invasion[]): Promise<string[]> {
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
  return publish(uniqHttps([...rewardImgs, ...factionImgs, STATIC_IMAGES.invasion], 3));
}

export type CycleKind = 'cetus' | 'earth' | 'vallis' | 'cambion' | 'zariman';

export async function imagesForCycle(kind: CycleKind, c?: Cycle | null): Promise<string[]> {
  switch (kind) {
    case 'cetus':
      return publishThemeFiles([THEME_FILES.plains]);
    case 'earth':
      return publishThemeFiles([THEME_FILES.earth]);
    case 'vallis':
      return publishThemeFiles([THEME_FILES.vallis]);
    case 'cambion':
      // Vome/Fass wiki files are broken (tiny); use location art
      return publishThemeFiles([THEME_FILES.cambion]);
    case 'zariman':
      return publishThemeFiles([THEME_FILES.voidFissure]);
    default:
      return c ? publishThemeFiles([THEME_FILES.earth]) : [];
  }
}

/** All known theme source URLs (for sync script / pre-warm). */
export function listThemeSourceUrls(): Array<{ key: ThemeKey; file: string; sourceUrl: string }> {
  return (Object.keys(THEME_FILES) as ThemeKey[]).map((key) => ({
    key,
    file: THEME_FILES[key],
    sourceUrl: STATIC_IMAGES[key],
  }));
}
