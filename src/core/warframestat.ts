import { readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { fetch, ProxyAgent, type Dispatcher } from 'undici';
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
  attackerReward?: { asString?: string; thumbnail?: string };
  defenderReward?: { asString?: string; thumbnail?: string };
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

export interface ArbitrationBounds {
  resourceBonus?: number;
  xpBonus?: number;
  weaponXpBonusFor?: string;
  weaponXpBonusVal?: number;
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
  /** Efficient-farm bonuses from external schedule feeds */
  bounds?: ArbitrationBounds;
}

/** True when arbitration is missing or a known DE/warframestat stub. */
export function isStubArbitration(a: Arbitration | null | undefined): boolean {
  if (!a || !a.node) return true;
  if (a.node === 'SolNode000' || a.type === 'Unknown') return true;
  return false;
}

export interface ExternalArbitrationItem {
  id?: string;
  activation?: string;
  expiry?: string;
  node?: string;
  missionType?: string;
  type?: string;
  enemy?: string;
  eta?: string;
  archwing?: boolean;
  sharkwing?: boolean;
  bounds?: ArbitrationBounds;
  /** 10o.io-style nested payload (usually stale; kept for mapping) */
  solnodedata?: {
    name?: string;
    enemy?: string;
    type?: string;
    archwing?: boolean;
    sharkwing?: boolean;
  };
  start?: string;
  end?: string;
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

/** Map of WorldState field → subpath (used when field missing from cached worldstate). */
export const WORLDSTATE_FIELD_PATHS = {
  sortie: '/sortie',
  arbitration: '/arbitration',
  fissures: '/fissures',
  invasions: '/invasions',
  voidTrader: '/voidTrader',
  dailyDeals: '/dailyDeals',
  alerts: '/alerts',
  news: '/news',
  events: '/events',
  nightwave: '/nightwave',
  archonHunt: '/archonHunt',
  constructionProgress: '/constructionProgress',
  syndicateMissions: '/syndicateMissions',
  cetusCycle: '/cetusCycle',
  earthCycle: '/earthCycle',
  vallisCycle: '/vallisCycle',
  cambionCycle: '/cambionCycle',
  zarimanCycle: '/zarimanCycle',
  calendar: '/calendar',
  archimedeas: '/archimedeas',
  duviriCycle: '/duviriCycle',
} as const;

export type WorldStateField = keyof typeof WORLDSTATE_FIELD_PATHS;

/** Read a typed field from a WorldState object (for tests / poller). */
export function pickWorldStateField<K extends WorldStateField>(
  ws: WorldState,
  field: K,
): WorldState[K] | undefined {
  const v = ws[field];
  if (v === undefined || v === null) return undefined;
  return v as WorldState[K];
}

/** Mock fixture cache (mtime + periodic reload). */
let mockLogged = false;
let mockCache: { path: string; mtimeMs: number; loadedAt: number; data: WorldState } | null = null;

export function resetMockFixtureCache(): void {
  mockCache = null;
  mockLogged = false;
}

function resolveMockFixturePath(): string {
  const cfg = loadConfig();
  const p = cfg.api.mockFixturePath || './fixtures/worldstate-pc-zh.json';
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}

function loadMockWorldState(): WorldState {
  const cfg = loadConfig();
  const path = resolveMockFixturePath();
  if (!mockLogged) {
    log.info({ fixture: path }, 'warframestat mock mode enabled');
    mockLogged = true;
  }
  if (!existsSync(path)) {
    throw new Error(`warframestat mock fixture not found: ${path}`);
  }
  const st = statSync(path);
  const now = Date.now();
  const reloadMs = cfg.api.mockReloadMs ?? 300_000;
  if (
    mockCache &&
    mockCache.path === path &&
    mockCache.mtimeMs === st.mtimeMs &&
    now - mockCache.loadedAt < reloadMs
  ) {
    return mockCache.data;
  }
  const data = JSON.parse(readFileSync(path, 'utf8')) as WorldState;
  mockCache = { path, mtimeMs: st.mtimeMs, loadedAt: now, data };
  log.debug({ fixture: path, mtimeMs: st.mtimeMs }, 'loaded mock worldstate fixture');
  return data;
}

function fieldFromMockPath(path: string): unknown {
  const ws = loadMockWorldState();
  const clean = path.replace(/^\//, '').split('?')[0];
  if (!clean) return ws;
  // Map known subpaths → WorldState fields
  for (const [field, sub] of Object.entries(WORLDSTATE_FIELD_PATHS)) {
    if (sub === `/${clean}` || sub === path.split('?')[0]) {
      return ws[field as WorldStateField];
    }
  }
  // Direct property lookup (e.g. "sortie")
  if (clean in ws) return ws[clean];
  return undefined;
}

let proxyAgent: ProxyAgent | null = null;
let proxyAgentUri: string | null = null;

function resolveProxyUri(): string | undefined {
  const cfg = loadConfig();
  return (
    cfg.api.proxyUrl ||
    process.env.WARFRAMESTAT_PROXY ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy ||
    undefined
  );
}

/** Shared with DE CDN client — HTTP(S) proxy via undici ProxyAgent. */
export function getApiDispatcher(): Dispatcher | undefined {
  const uri = resolveProxyUri();
  if (!uri) return undefined;
  if (!proxyAgent || proxyAgentUri !== uri) {
    proxyAgent?.close().catch(() => undefined);
    proxyAgent = new ProxyAgent(uri);
    proxyAgentUri = uri;
    log.info({ proxy: uri.replace(/\/\/[^@]+@/, '//***@') }, 'using HTTP proxy');
  }
  return proxyAgent;
}

function getDispatcher(): Dispatcher | undefined {
  return getApiDispatcher();
}

function apiUrlForBase(baseUrl: string, path: string): string {
  const cfg = loadConfig();
  const base = baseUrl.replace(/\/$/, '');
  const platform = cfg.api.platform;
  const lang = cfg.api.language;
  const sep = path.includes('?') ? '&' : '?';
  return `${base}/${platform}${path}${sep}language=${lang}`;
}

function apiUrl(path: string): string {
  return apiUrlForBase(loadConfig().api.baseUrl, path);
}

/** Shared request headers (UA + Accept-Language). */
export function getApiRequestHeaders(): Record<string, string> {
  const cfg = loadConfig();
  return {
    Accept: 'application/json',
    'Accept-Language': cfg.api.language,
    'User-Agent': cfg.api.userAgent,
  };
}

function requestHeaders(): Record<string, string> {
  return getApiRequestHeaders();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldRetryStatus(status: number): boolean {
  return status === 403 || status === 429 || status >= 500;
}

async function readBodySnippet(res: { text(): Promise<string> }): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 200).replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

async function fetchOnce(url: string): Promise<{ ok: true; data: unknown } | { ok: false; status: number; snippet: string }> {
  const dispatcher = getDispatcher();
  const opts: Parameters<typeof fetch>[1] = {
    headers: requestHeaders(),
    ...(dispatcher ? { dispatcher } : {}),
  };
  log.debug({ url }, 'fetch');
  const res = await fetch(url, opts);
  if (res.ok) {
    const data = await res.json();
    return { ok: true, data };
  }
  const snippet = await readBodySnippet(res);
  return { ok: false, status: res.status, snippet };
}

async function fetchWithRetry(url: string): Promise<unknown> {
  let lastStatus = 0;
  let lastSnippet = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await fetchOnce(url);
    if (result.ok) return result.data;
    lastStatus = result.status;
    lastSnippet = result.snippet;
    if (attempt === 0 && shouldRetryStatus(result.status)) {
      const delay = result.status === 429 ? 1500 : 400;
      log.warn({ url, status: result.status, attempt }, 'retry after short delay');
      await sleep(delay);
      continue;
    }
    break;
  }
  const snip = lastSnippet ? ` body=${JSON.stringify(lastSnippet)}` : '';
  throw new Error(`HTTP ${lastStatus} for ${url}${snip}`);
}

async function getJsonAbsolute<T>(url: string, ttlMs: number): Promise<T> {
  const cached = globalCache.get<T>(url);
  if (cached !== undefined) return cached;
  const data = (await fetchWithRetry(url)) as T;
  globalCache.set(url, data, ttlMs);
  return data;
}

async function getJsonRelative<T>(path: string, ttlMs: number): Promise<T> {
  const cfg = loadConfig();
  if (cfg.api.mock) {
    const data = fieldFromMockPath(path);
    if (data === undefined) {
      throw new Error(`mock fixture missing path ${path}`);
    }
    return data as T;
  }
  const cacheKey = `wsrel:${cfg.api.platform}:${cfg.api.language}:${path}`;
  const cached = globalCache.get<T>(cacheKey);
  if (cached !== undefined) return cached;

  const bases = [cfg.api.baseUrl, ...(cfg.api.fallbackBaseUrls || [])];
  let lastErr: unknown;
  for (let i = 0; i < bases.length; i++) {
    const url = apiUrlForBase(bases[i], path);
    try {
      const data = (await fetchWithRetry(url)) as T;
      globalCache.set(cacheKey, data, ttlMs);
      // also cache under URL for debug parity
      globalCache.set(url, data, ttlMs);
      if (i > 0) log.info({ base: bases[i], path }, 'fallback baseUrl succeeded');
      return data;
    } catch (err) {
      lastErr = err;
      log.warn({ err, base: bases[i], path, index: i }, 'baseUrl attempt failed');
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function getJson<T>(pathOrUrl: string, ttlMs?: number, absolute = false): Promise<T> {
  const cfg = loadConfig();
  const ttl = ttlMs ?? cfg.api.cacheTtlMs;
  if (absolute) return getJsonAbsolute<T>(pathOrUrl, ttl);
  return getJsonRelative<T>(pathOrUrl, ttl);
}

/**
 * Prefer a field from the cached full worldstate; only hit the subpath if missing.
 */
async function fromWorldState<K extends WorldStateField>(field: K): Promise<NonNullable<WorldState[K]>> {
  const path = WORLDSTATE_FIELD_PATHS[field];
  const cfg = loadConfig();
  try {
    const ws = await fetchWorldState();
    const v = pickWorldStateField(ws, field);
    if (v !== undefined) return v as NonNullable<WorldState[K]>;
    log.debug({ field }, 'worldstate field missing, using subpath');
  } catch (err) {
    log.debug({ err, field }, 'worldstate unavailable, using subpath');
  }
  // DE source: do not hit Cloudflare warframestat (CN 403).
  // Missing optional fields soft-fail (arbitration needs external kuva feed).
  if (!cfg.api.mock && cfg.api.source === 'de') {
    if (field === 'arbitration') {
      return { node: 'SolNode000', type: 'Unknown' } as unknown as NonNullable<WorldState[K]>;
    }
    const emptyArrays = new Set([
      'fissures',
      'invasions',
      'alerts',
      'news',
      'events',
      'dailyDeals',
      'syndicateMissions',
      'archimedeas',
      'voidTraders',
    ]);
    if (emptyArrays.has(field)) {
      return [] as unknown as NonNullable<WorldState[K]>;
    }
    throw new Error(`DE worldstate missing field: ${field}`);
  }
  return getJson(path);
}

export async function fetchWorldState(): Promise<WorldState> {
  const cfg = loadConfig();
  if (cfg.api.mock) {
    return loadMockWorldState();
  }
  if (cfg.api.source === 'de') {
    const { fetchDeWorldState } = await import('./de-worldstate.js');
    return fetchDeWorldState();
  }
  return getJson<WorldState>('');
}

export async function fetchSortie(): Promise<Sortie> {
  return fromWorldState('sortie');
}

function mapExternalArbItem(item: ExternalArbitrationItem): Arbitration {
  const nested = item.solnodedata;
  const node = item.node || nested?.name || '';
  const type = item.missionType || item.type || nested?.type || '';
  const enemy = item.enemy || nested?.enemy || '';
  return {
    id: item.id,
    activation: item.activation || item.start,
    expiry: item.expiry || item.end,
    node,
    type,
    enemy,
    eta: item.eta,
    archwing: item.archwing ?? nested?.archwing,
    sharkwing: item.sharkwing ?? nested?.sharkwing,
    bounds: item.bounds,
  };
}

function normalizeArbitrationFeed(data: unknown): ExternalArbitrationItem[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as ExternalArbitrationItem[];
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const key of ['data', 'arbitrations', 'arbys', 'payload', 'list']) {
      if (Array.isArray(o[key])) return o[key] as ExternalArbitrationItem[];
    }
  }
  return [];
}

function arbStartMs(a: { activation?: string; start?: string }): number {
  const s = a.activation || a.start;
  if (!s) return NaN;
  return new Date(s).getTime();
}

function arbEndMs(a: { expiry?: string; end?: string }): number {
  const s = a.expiry || a.end;
  if (!s) return NaN;
  return new Date(s).getTime();
}

/** Fetch + cache external kuva arbitration schedule (never warframestat.us). */
export async function fetchArbitrationSchedule(): Promise<Arbitration[]> {
  const cfg = loadConfig();
  const url = (cfg.api.arbitrationUrl || '').trim();
  if (!url) return [];
  if (/warframestat\.us/i.test(url)) {
    log.warn({ url }, 'arbitrationUrl points at warframestat.us — ignored');
    return [];
  }
  const ttl = cfg.api.arbitrationCacheTtlMs ?? 600_000;
  const cacheKey = `arb-ext:${url}`;
  const cached = globalCache.get<Arbitration[]>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const raw = await getJsonAbsolute<unknown>(url, ttl);
    const mapped = normalizeArbitrationFeed(raw)
      .map(mapExternalArbItem)
      .filter((a) => a.node && a.node !== 'SolNode000');
    mapped.sort((a, b) => arbStartMs(a) - arbStartMs(b));
    globalCache.set(cacheKey, mapped, ttl);
    return mapped;
  } catch (err) {
    log.warn({ err, url }, 'external arbitration feed failed');
    return [];
  }
}

/** Currently active arbitration from schedule (activation ≤ now < expiry). */
export function pickCurrentArbitration(list: Arbitration[], now = Date.now()): Arbitration | undefined {
  for (const a of list) {
    const start = arbStartMs(a);
    const end = arbEndMs(a);
    if (!Number.isNaN(start) && !Number.isNaN(end) && start <= now && now < end) return a;
    if (Number.isNaN(start) && !Number.isNaN(end) && now < end) return a;
  }
  return undefined;
}

/** Items with efficient-farm bounds (资源/经验加成). */
export function filterEfficientArbitrations(list: Arbitration[]): Arbitration[] {
  return (list || []).filter((a) => a.bounds && (a.bounds.resourceBonus != null || a.bounds.xpBonus != null));
}

/**
 * Current arbitration: prefer DE/worldstate field; if stub/missing, use external feed.
 * Soft-fails to SolNode000 stub (Chinese empty message via formatArbitration).
 * Never calls api.warframestat.us for this.
 */
export async function fetchArbitration(): Promise<Arbitration> {
  const cfg = loadConfig();
  try {
    const ws = await fetchWorldState();
    const v = pickWorldStateField(ws, 'arbitration');
    if (v && !isStubArbitration(v)) return v;
  } catch (err) {
    log.debug({ err }, 'worldstate arbitration unavailable');
  }

  // warframestat source may still expose /arbitration subpath — only when not de/mock
  if (!cfg.api.mock && cfg.api.source === 'warframestat') {
    try {
      const v = await getJson<Arbitration>(WORLDSTATE_FIELD_PATHS.arbitration);
      if (v && !isStubArbitration(v)) return v;
    } catch (err) {
      log.debug({ err }, 'warframestat arbitration subpath failed');
    }
  }

  const schedule = await fetchArbitrationSchedule();
  const current = pickCurrentArbitration(schedule);
  if (current) return current;

  return { node: 'SolNode000', type: 'Unknown' };
}

export async function fetchFissures(): Promise<Fissure[]> {
  return fromWorldState('fissures');
}

export async function fetchInvasions(): Promise<Invasion[]> {
  return fromWorldState('invasions');
}

export async function fetchVoidTrader(): Promise<VoidTrader> {
  return fromWorldState('voidTrader');
}

export async function fetchDailyDeals(): Promise<DailyDeal[]> {
  return fromWorldState('dailyDeals');
}

export async function fetchAlerts(): Promise<AlertItem[]> {
  return fromWorldState('alerts');
}

export async function fetchNews(): Promise<NewsItem[]> {
  return fromWorldState('news');
}

export async function fetchEvents(): Promise<EventItem[]> {
  return fromWorldState('events');
}

export async function fetchNightwave(): Promise<Nightwave> {
  return fromWorldState('nightwave');
}

export async function fetchArchonHunt(): Promise<ArchonHunt> {
  return fromWorldState('archonHunt');
}

export async function fetchConstruction(): Promise<ConstructionProgress> {
  return fromWorldState('constructionProgress');
}

export async function fetchSyndicateMissions(): Promise<SyndicateMission[]> {
  return fromWorldState('syndicateMissions');
}

export async function fetchCetusCycle(): Promise<Cycle> {
  return fromWorldState('cetusCycle');
}

export async function fetchEarthCycle(): Promise<Cycle> {
  return fromWorldState('earthCycle');
}

export async function fetchVallisCycle(): Promise<Cycle> {
  return fromWorldState('vallisCycle');
}

export async function fetchCambionCycle(): Promise<Cycle> {
  return fromWorldState('cambionCycle');
}

export async function fetchZarimanCycle(): Promise<Cycle> {
  return fromWorldState('zarimanCycle');
}

export async function fetchCalendar(): Promise<Calendar1999> {
  return fromWorldState('calendar');
}

export async function fetchArchimedeas(): Promise<Archimedea[]> {
  return fromWorldState('archimedeas');
}

export async function fetchDuviriCycle(): Promise<DuviriCycle> {
  return fromWorldState('duviriCycle');
}

/** Warframe.market item orders (language-agnostic url_name) */
export async function searchWmOrders(query: string): Promise<WmItemResult | null> {
  const cfg = loadConfig();
  if (cfg.api.mock) {
    const name = query.trim() || 'mock_item';
    const urlName = name.toLowerCase().replace(/\s+/g, '_');
    return {
      itemName: `[模拟] ${name}`,
      urlName,
      sell: [
        { order_type: 'sell', platinum: 10, quantity: 1, user: { ingame_name: 'MockSeller', status: 'ingame' } },
      ],
      buy: [
        { order_type: 'buy', platinum: 8, quantity: 1, user: { ingame_name: 'MockBuyer', status: 'online' } },
      ],
    };
  }
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
  if (cfg.api.mock) {
    return [`[模拟模式] 翻译不可用（无外网）: ${kw.trim()}`];
  }
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
