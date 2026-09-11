import {
  fetchArbitrationSchedule,
  fetchWorldState,
  isStubArbitration,
  isVoidTraderActive,
  pickCurrentArbitration,
  type Fissure,
  type WorldState,
} from '../core/warframestat.js';
import {
  filterFissures,
  formatArbitration,
  formatArchonHunt,
  formatCalendar,
  formatDailyDeals,
  formatFissures,
  formatInvasions,
  formatPushEvent,
  formatPushCetusNight,
  formatPushSortie,
  formatVoidTrader,
  type FissureFilter,
} from '../core/formatters.js';
import { logger } from '../core/logger.js';
import {
  getSubscribers,
  matchesArbitrationFilter,
  purgeOldDedupe,
  tryMarkPushed,
  WORLDSTATE_CHILD_TOPICS,
  type PushTopic,
  type Subscriber,
  type SubscriptionFilter,
} from './db.js';

const log = logger.child({ module: 'poller' });

/** In-memory fissure id snapshot for denoise (net-new only). */
let prevFissureIds: Set<string> | null = null;

/** Test helper — clear fissure denoise snapshot. */
export function resetFissurePushSnapshotForTests(): void {
  prevFissureIds = null;
}

function fissureId(f: Fissure): string | undefined {
  return f.id || undefined;
}

export type SendFn = (
  platform: 'onebot' | 'kook' | 'qqofficial',
  chatId: string,
  text: string,
  chatType?: 'group' | 'private',
) => Promise<void>;

const WORLDSTATE_FANOUT = new Set<string>(WORLDSTATE_CHILD_TOPICS);

/**
 * Push to topic subscribers; when topic is a worldstate child, also fan out to
 * umbrella `worldstate` subscribers. Dedupe is per topic+itemKey. Chats with no
 * matching subscription never receive a push. A chat subscribed to both the
 * child topic and `worldstate` gets a single delivery (recipient merge).
 */
/**
 * Broadcast to topic (+ optional worldstate umbrella) subscribers.
 * `adaptText` may return null to skip a recipient (e.g. filter mismatch).
 */
async function broadcast(
  topic: PushTopic,
  itemKey: string,
  text: string,
  send: SendFn,
  adaptText?: (sub: Subscriber, baseText: string) => string | null,
): Promise<void> {
  const deliverTopic = tryMarkPushed(topic, itemKey);
  const deliverUmbrella =
    WORLDSTATE_FANOUT.has(topic) && tryMarkPushed('worldstate', itemKey);

  if (!deliverTopic && !deliverUmbrella) {
    log.debug({ topic, itemKey }, 'dedupe skip');
    return;
  }

  const recipients = new Map<string, Subscriber>();
  if (deliverTopic) {
    for (const s of getSubscribers(topic)) {
      recipients.set(`${s.platform}:${s.chatId}`, s);
    }
  }
  if (deliverUmbrella) {
    for (const s of getSubscribers('worldstate')) {
      recipients.set(`${s.platform}:${s.chatId}`, s);
    }
  }

  if (!recipients.size) {
    log.debug({ topic, deliverTopic, deliverUmbrella }, 'no subscribers');
    return;
  }

  log.info(
    { topic, itemKey, count: recipients.size, deliverTopic, deliverUmbrella },
    'push',
  );
  for (const s of recipients.values()) {
    try {
      const payload = adaptText ? adaptText(s, text) : text;
      if (payload == null || payload === '') continue;
      await send(s.platform, s.chatId, payload, s.chatType);
    } catch (err) {
      log.error({ err, platform: s.platform, chatId: s.chatId, chatType: s.chatType }, 'send failed');
    }
  }
}

function toFissureFilter(filter: SubscriptionFilter | null | undefined): FissureFilter {
  if (!filter) return {};
  const out: FissureFilter = {};
  if (filter.hard !== undefined) out.hard = filter.hard;
  if (filter.storm !== undefined) out.storm = filter.storm;
  if (filter.tier !== undefined) out.tier = filter.tier;
  if (filter.tierNum !== undefined) out.tierNum = filter.tierNum;
  if (filter.fast !== undefined) out.fast = filter.fast;
  return out;
}

/** Derive all push topics from one WorldState (no extra HTTP). */
export async function pollFromWorldState(ws: WorldState, send: SendFn): Promise<void> {
  // Sortie
  try {
    const sortie = ws.sortie;
    if (sortie?.id) {
      await broadcast('sortie', `sortie:${sortie.id}`, formatPushSortie(sortie), send);
    }
  } catch (err) {
    log.warn({ err }, 'sortie format/push failed');
  }

  // Arbitration — prefer worldstate; fall back to external kuva feed when stub/missing
  try {
    let arb = ws.arbitration;
    if (isStubArbitration(arb)) {
      try {
        arb = pickCurrentArbitration(await fetchArbitrationSchedule());
      } catch (err) {
        log.debug({ err }, 'external arbitration for push failed');
        arb = undefined;
      }
    }
    if (arb && !isStubArbitration(arb)) {
      const key = `arb:${arb.node}:${arb.type}:${arb.expiry ?? ''}`;
      const body = `📢 仲裁刷新\n${formatArbitration(arb)}`;
      await broadcast('arbitration', key, body, send, (sub) =>
        matchesArbitrationFilter(arb.type, sub.filter) ? body : null,
      );
    }
  } catch (err) {
    log.warn({ err }, 'arbitration format/push failed');
  }

  // Fissures — denoise: only push when net-new ids appear (or full list on first run).
  // Per-subscriber filter_json narrows the list (null filter = all).
  try {
    const fissures = ws.fissures || [];
    const active = filterFissures(fissures);
    const currentIds = new Set(
      active.map(fissureId).filter((id): id is string => Boolean(id)),
    );
    if (active.length) {
      if (prevFissureIds === null) {
        const key = `fis:init:${[...currentIds].sort().join(',').slice(0, 180)}`;
        await broadcast('fissures', key, '', send, (sub) => {
          const filtered = filterFissures(active, toFissureFilter(sub.filter));
          if (!filtered.length) return null;
          return `📢 裂缝更新\n${formatFissures(filtered)}`;
        });
      } else {
        const newcomers = active.filter((f) => {
          const id = fissureId(f);
          return id ? !prevFissureIds!.has(id) : false;
        });
        if (newcomers.length) {
          const newIds = newcomers
            .map(fissureId)
            .filter((id): id is string => Boolean(id))
            .sort();
          const key = `fis:new:${newIds.join(',').slice(0, 180)}`;
          await broadcast('fissures', key, '', send, (sub) => {
            const filtered = filterFissures(newcomers, toFissureFilter(sub.filter));
            if (!filtered.length) return null;
            return `📢 新增裂缝\n${formatFissures(filtered, '新增裂缝')}`;
          });
        }
      }
    }
    prevFissureIds = currentIds;
  } catch (err) {
    log.warn({ err }, 'fissures format/push failed');
  }

  // Cetus night
  try {
    const cetus = ws.cetusCycle;
    if (cetus && cetus.isDay === false) {
      const key = `cetus-night:${cetus.expiry ?? cetus.id ?? ''}`;
      await broadcast('cetus-night', key, formatPushCetusNight(cetus), send);
    }
  } catch (err) {
    log.warn({ err }, 'cetus format/push failed');
  }

  // Invasions — per invasion id
  try {
    const invasions = ws.invasions || [];
    for (const inv of invasions.filter((i) => !i.completed)) {
      if (!inv.id) continue;
      await broadcast(
        'invasions',
        `inv:${inv.id}`,
        `📢 新入侵\n${formatInvasions([inv])}`,
        send,
      );
    }
  } catch (err) {
    log.warn({ err }, 'invasions format/push failed');
  }

  // Void trader arrival / inventory change
  try {
    const vt = ws.voidTrader;
    if (vt) {
      const key = isVoidTraderActive(vt)
        ? `vt-active:${vt.id ?? vt.location}:${vt.inventory?.length ?? 0}`
        : `vt-wait:${vt.activation ?? ''}:${vt.location ?? ''}`;
      await broadcast('voidtrader', key, `📢 奸商动态\n${formatVoidTrader(vt)}`, send);
    }
  } catch (err) {
    log.warn({ err }, 'voidtrader format/push failed');
  }

  // Darvo
  try {
    const deals = ws.dailyDeals || [];
    for (const d of deals) {
      const key = `darvo:${d.item}:${d.expiry ?? ''}`;
      await broadcast('darvo', key, `📢 特惠更新\n${formatDailyDeals([d])}`, send);
    }
  } catch (err) {
    log.warn({ err }, 'darvo format/push failed');
  }

  // Archon
  try {
    const hunt = ws.archonHunt;
    if (hunt?.id) {
      await broadcast('archon', `archon:${hunt.id}`, `📢 猎杀刷新\n${formatArchonHunt(hunt)}`, send);
    }
  } catch (err) {
    log.warn({ err }, 'archon format/push failed');
  }


  // Special / worldstate events
  try {
    const events = ws.events || [];
    for (const ev of events) {
      if (!ev?.id && !ev?.description && !ev?.tooltip) continue;
      if (ev.expiry) {
        const t = new Date(ev.expiry).getTime();
        if (!Number.isNaN(t) && t <= Date.now()) continue;
      }
      const key = `event:${ev.id ?? ''}:${ev.description ?? ev.tooltip ?? ''}:${ev.expiry ?? ''}`;
      await broadcast('events', key, formatPushEvent(ev), send);
    }
  } catch (err) {
    log.warn({ err }, 'events format/push failed');
  }

  // 1999 Hex calendar — season change or weekly window refresh
  try {
    const cal = ws.calendar;
    if (cal) {
      const key = `calendar:${cal.season ?? ''}:${cal.yearIteration ?? ''}:${cal.activation ?? ''}:${cal.expiry ?? ''}`;
      await broadcast('calendar', key, `📢 1999 日历更新\n${formatCalendar(cal)}`, send);
    }
  } catch (err) {
    log.warn({ err }, 'calendar format/push failed');
  }

  try {
    purgeOldDedupe();
  } catch {
    /* ignore */
  }
}

export async function pollOnce(send: SendFn): Promise<void> {
  let ws: WorldState;
  try {
    ws = await fetchWorldState();
  } catch (err) {
    log.warn({ err }, 'worldstate poll failed');
    return;
  }
  await pollFromWorldState(ws, send);
}

export function startPoller(intervalMs: number, send: SendFn): NodeJS.Timeout {
  log.info({ intervalMs }, 'poller start');
  // immediate first tick after short delay
  setTimeout(() => {
    pollOnce(send).catch((err) => log.error({ err }, 'poll error'));
  }, 3000);
  return setInterval(() => {
    pollOnce(send).catch((err) => log.error({ err }, 'poll error'));
  }, intervalMs);
}
