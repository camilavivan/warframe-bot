import { fetch } from 'undici';
import { loadConfig } from '../config.js';
import { globalCache } from './cache.js';
import { logger } from './logger.js';

export interface WorldState {
  timestamp?: string;
  news?: NewsItem[];
  events?: EventItem[];
  alerts?: AlertItem[];
  sortie?: Sortie;
  syndicateMissions?: SyndicateMission[];
  fissures?: Fissure[];
  invasions?: Invasion[];
  voidTrader?: VoidTrader;
  dailyDeals?: DailyDeal[];
  simaris?: { target?: string; isTargetActive?: boolean };
  conclaveChallenges?: unknown[];
  flashSales?: unknown[];
  darkSectors?: unknown[];
  constructionProgress?: ConstructionProgress;
  vallisCycle?: Cycle;
  cetusCycle?: Cycle;
  earthCycle?: Cycle;
  cambionCycle?: Cycle;
  zarimanCycle?: Cycle;
  arbitration?: Arbitration;
  nightwave?: Nightwave;
  archonHunt?: ArchonHunt;
  steelPath?: { currentReward?: { name?: string }; remaining?: number; activation?: string; expiry?: string };
  kuva?: unknown[];
  /** 1999 Hex calendar */
  calendar?: Calendar1999;
  /** Deep / Temporal Archimedea (API field name is plural) */
  archimedeas?: Archimedea[];
  duviriCycle?: DuviriCycle;
  vaultTrader?: VoidTrader;
  voidTraders?: VoidTrader[];
  [key: string]: unknown;
}

export interface NewsItem {
  id?: string;
  message?: string;
  link?: string;
  date?: string;
  eta?: string;
  asString?: string;
}

export interface EventItem {
  id?: string;
  description?: string;
  tooltip?: string;
  node?: string;
  expiry?: string;
  activation?: string;
  ethereal?: boolean;
  rewards?: Array<{ asString?: string }>;
  maximumScore?: number;
  currentScore?: number;
  health?: number;
}

export interface AlertItem {
  id?: string;
  activation?: string;
  expiry?: string;
  mission?: {
    node?: string;
    type?: string;
    faction?: string;
    reward?: { asString?: string };
    minEnemyLevel?: number;
    maxEnemyLevel?: number;
  };
  eta?: string;
}

export interface Sortie {
  id?: string;
  activation?: string;
  expiry?: string;
  rewardPool?: string;
  variants?: Array<{
    node?: string;
    missionType?: string;
    modifier?: string;
    modifierDescription?: string;
  }>;
  boss?: string;
  faction?: string;
  eta?: string;
}

export interface Fissure {
  id?: string;
  activation?: string;
  expiry?: string;
  node?: string;
  missionType?: string;
  enemy?: string;
  tier?: string;
  tierNum?: number;
  isStorm?: boolean;
  isHard?: boolean;
  eta?: string;
  expired?: boolean;
}

export interface Invasion {
  id?: string;
  node?: string;
  desc?: string;
  attackingFaction?: string;
  defendingFaction?: string;
  attackerReward?: { asString?: string };
  defenderReward?: { asString?: string };
  completion?: number;
  completed?: boolean;
  eta?: string;
  vsInfestation?: boolean;
}

export interface VoidTrader {
  id?: string;
  character?: string;
  location?: string;
  activation?: string;
  expiry?: string;
  /** Some API builds omit this — derive from activation/expiry when missing */
  active?: boolean;
  inventory?: Array<{ item?: string; ducats?: number; credits?: number }>;
  startString?: string;
  endString?: string;
  schedule?: unknown[];
}

/** True when Baro is currently at a relay (handles missing `active` field). */
export function isVoidTraderActive(v: VoidTrader | null | undefined): boolean {
  if (!v) return false;
  if (typeof v.active === 'boolean') return v.active;
  const now = Date.now();
  const start = v.activation ? new Date(v.activation).getTime() : NaN;
  const end = v.expiry ? new Date(v.expiry).getTime() : NaN;
  if (!Number.isNaN(start) && !Number.isNaN(end)) {
    return now >= start && now < end;
  }
  return Array.isArray(v.inventory) && v.inventory.length > 0;
}

export interface CalendarChallenge {
  title?: string;
  description?: string;
}

export interface CalendarUpgrade {
  title?: string;
  description?: string;
}

export interface CalendarEvent {
  type?: string;
  challenge?: CalendarChallenge;
  reward?: string;
  upgrade?: CalendarUpgrade;
}

export interface CalendarDay {
  /** In-game 1999 date ISO string */
  date?: string;
  events?: CalendarEvent[];
}

export interface Calendar1999 {
  id?: string;
  activation?: string;
  expiry?: string;
  season?: string;
  yearIteration?: number;
  version?: number;
  days?: CalendarDay[];
  requirements?: string[];
}

export interface ArchimedeaRisk {
  key?: string;
  name?: string;
  description?: string;
  isHard?: boolean;
}

export interface ArchimedeaDeviation {
  key?: string;
  name?: string;
  description?: string;
}

export interface ArchimedeaMission {
  faction?: string;
  factionKey?: string;
  missionType?: string;
  missionTypeKey?: string;
  deviation?: ArchimedeaDeviation;
  risks?: ArchimedeaRisk[];
}

export interface ArchimedeaModifier {
  key?: string;
  name?: string;
  description?: string;
}

export interface Archimedea {
  id?: string;
  activation?: string;
  expiry?: string;
  /** Often spaced like "C T_ L A B" — normalize by stripping spaces */
  type?: string;
  typeKey?: string;
  missions?: ArchimedeaMission[];
  personalModifiers?: ArchimedeaModifier[];
}

export interface DuviriChoiceGroup {
  category?: string;
  categoryKey?: string;
  choices?: string[];
}

export interface DuviriCycle {
  id?: string;
  activation?: string;
  expiry?: string;
  state?: string;
  choices?: DuviriChoiceGroup[];
}

/** Normalize archimedea typeKey: "C T_ L A B" → "CT_LAB" */
export function normalizeArchimedeaType(typeOrKey?: string): string {
  return (typeOrKey || '').replace(/\s+/g, '').toUpperCase();
}

export function isDeepArchimedea(a: Archimedea): boolean {
  const t = normalizeArchimedeaType(a.typeKey || a.type);
  return t === 'CT_LAB' || t.includes('LAB');
}

export function isTemporalArchimedea(a: Archimedea): boolean {
  const t = normalizeArchimedeaType(a.typeKey || a.type);
  return t === 'CT_HEX' || (t.includes('HEX') && !t.includes('LAB'));
}

export interface DailyDeal {
  item?: string;
  expiry?: string;
  originalPrice?: number;
  salePrice?: number;
  total?: number;
  sold?: number;
  discount?: number;
  eta?: string;
}

export interface Cycle {
  id?: string;
  expiry?: string;
  activation?: string;
  isDay?: boolean;
  isWarm?: boolean;
  isVome?: boolean;
  state?: string;
  timeLeft?: string;
  shortString?: string;
}

export interface Arbitration {
  id?: string;
  activation?: string;
  expiry?: string;
  enemy?: string;
  type?: string;
  node?: string;
  archwing?: boolean;
  sharkwing?: boolean;
  eta?: string;
}

export interface Nightwave {
  id?: string;
  activation?: string;
  expiry?: string;
  season?: number;
  tag?: string;
  phase?: number;
  activeChallenges?: Array<{
    id?: string;
    title?: string;
    desc?: string;
    reputation?: number;
    isDaily?: boolean;
    isElite?: boolean;
  }>;
}

export interface ArchonHunt {
  id?: string;
  activation?: string;
  expiry?: string;
  boss?: string;
  faction?: string;
  missions?: Array<{ node?: string; type?: string; modifier?: string }>;
  rewardPool?: string;
  eta?: string;
}

export interface ConstructionProgress {
  id?: string;
  fomorianProgress?: string | number;
  razorbackProgress?: string | number;
}

export interface SyndicateMission {
  id?: string;
  syndicate?: string;
  nodes?: string[];
  jobs?: Array<{
    type?: string;
    enemyLevels?: number[];
    standingStages?: number[];
    rewardPool?: string[];
  }>;
  eta?: string;
}

export interface WmOrder {
  order_type: string;
  platinum: number;
  quantity: number;
  user: { ingame_name: string; status: string };
}

export interface WmItemResult {
  itemName: string;
  urlName: string;
  sell: WmOrder[];
  buy: WmOrder[];
}

const log = logger.child({ module: 'warframestat' });

function apiUrl(path: string): string {
  const cfg = loadConfig();
  const base = cfg.api.baseUrl.replace(/\/$/, '');
  const platform = cfg.api.platform;
  const lang = cfg.api.language;
  const sep = path.includes('?') ? '&' : '?';
  return `${base}/${platform}${path}${sep}language=${lang}`;
}

async function getJson<T>(pathOrUrl: string, ttlMs?: number, absolute = false): Promise<T> {
  const cfg = loadConfig();
  const ttl = ttlMs ?? cfg.api.cacheTtlMs;
  const url = absolute ? pathOrUrl : apiUrl(pathOrUrl);
  const cached = globalCache.get<T>(url);
  if (cached !== undefined) return cached;

  log.debug({ url }, 'fetch');
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'Accept-Language': cfg.api.language },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const data = (await res.json()) as T;
  globalCache.set(url, data, ttl);
  return data;
}

export async function fetchWorldState(): Promise<WorldState> {
  return getJson<WorldState>('');
}

export async function fetchSortie(): Promise<Sortie> {
  return getJson('/sortie');
}

export async function fetchArbitration(): Promise<Arbitration> {
  return getJson('/arbitration');
}

export async function fetchFissures(): Promise<Fissure[]> {
  return getJson('/fissures');
}

export async function fetchInvasions(): Promise<Invasion[]> {
  return getJson('/invasions');
}

export async function fetchVoidTrader(): Promise<VoidTrader> {
  return getJson('/voidTrader');
}

export async function fetchDailyDeals(): Promise<DailyDeal[]> {
  return getJson('/dailyDeals');
}

export async function fetchAlerts(): Promise<AlertItem[]> {
  return getJson('/alerts');
}

export async function fetchNews(): Promise<NewsItem[]> {
  return getJson('/news');
}

export async function fetchEvents(): Promise<EventItem[]> {
  return getJson('/events');
}

export async function fetchNightwave(): Promise<Nightwave> {
  return getJson('/nightwave');
}

export async function fetchArchonHunt(): Promise<ArchonHunt> {
  return getJson('/archonHunt');
}

export async function fetchConstruction(): Promise<ConstructionProgress> {
  return getJson('/constructionProgress');
}

export async function fetchSyndicateMissions(): Promise<SyndicateMission[]> {
  return getJson('/syndicateMissions');
}

export async function fetchCetusCycle(): Promise<Cycle> {
  return getJson('/cetusCycle');
}

export async function fetchEarthCycle(): Promise<Cycle> {
  return getJson('/earthCycle');
}

export async function fetchVallisCycle(): Promise<Cycle> {
  return getJson('/vallisCycle');
}

export async function fetchCambionCycle(): Promise<Cycle> {
  return getJson('/cambionCycle');
}

export async function fetchZarimanCycle(): Promise<Cycle> {
  return getJson('/zarimanCycle');
}

export async function fetchCalendar(): Promise<Calendar1999> {
  return getJson('/calendar');
}

export async function fetchArchimedeas(): Promise<Archimedea[]> {
  return getJson('/archimedeas');
}

export async function fetchDuviriCycle(): Promise<DuviriCycle> {
  return getJson('/duviriCycle');
}

/** Warframe.market item orders (language-agnostic url_name) */
export async function searchWmOrders(query: string): Promise<WmItemResult | null> {
  const q = query.trim().toLowerCase().replace(/\s+/g, '_');
  // Resolve item via items list or direct
  const itemsUrl = 'https://api.warframe.market/v1/items';
  const items = await getJson<{ payload: { items: Array<{ item_name: string; url_name: string }> } }>(
    itemsUrl,
    3600_000,
    true,
  );
  const found =
    items.payload.items.find((i) => i.url_name === q) ||
    items.payload.items.find((i) => i.item_name.toLowerCase() === query.trim().toLowerCase()) ||
    items.payload.items.find((i) => i.url_name.includes(q) || i.item_name.toLowerCase().includes(query.trim().toLowerCase()));

  if (!found) return null;

  const ordersUrl = `https://api.warframe.market/v1/items/${found.url_name}/orders`;
  const orders = await getJson<{
    payload: { orders: Array<{ order_type: string; platinum: number; quantity: number; user: { ingame_name: string; status: string } }> };
  }>(ordersUrl, 60_000, true);

  const online = orders.payload.orders.filter((o) => o.user.status === 'ingame' || o.user.status === 'online');
  const sell = online
    .filter((o) => o.order_type === 'sell')
    .sort((a, b) => a.platinum - b.platinum)
    .slice(0, 5);
  const buy = online
    .filter((o) => o.order_type === 'buy')
    .sort((a, b) => b.platinum - a.platinum)
    .slice(0, 5);

  return { itemName: found.item_name, urlName: found.url_name, sell, buy };
}

/** Simple zh/en translation via warframestat drops / items search — use drops API for keyword */
export async function translateKeyword(kw: string): Promise<string[]> {
  const cfg = loadConfig();
  const url = `${cfg.api.baseUrl.replace(/\/$/, '')}/items/search/${encodeURIComponent(kw)}?language=${cfg.api.language}`;
  try {
    const data = await getJson<Array<{ name?: string; category?: string; description?: string }>>(url, 300_000, true);
    return (data || []).slice(0, 10).map((i) => {
      const parts = [i.name, i.category].filter(Boolean);
      return parts.join(' · ');
    });
  } catch {
    // fallback: try English search
    const urlEn = `${cfg.api.baseUrl.replace(/\/$/, '')}/items/search/${encodeURIComponent(kw)}`;
    try {
      const data = await getJson<Array<{ name?: string; category?: string }>>(urlEn, 300_000, true);
      return (data || []).slice(0, 10).map((i) => [i.name, i.category].filter(Boolean).join(' · '));
    } catch {
      return [];
    }
  }
}
