import {
  fetchWorldState,
  isVoidTraderActive,
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
} from '../core/formatters.js';
import { logger } from '../core/logger.js';
import { getSubscribers, purgeOldDedupe, tryMarkPushed, type PushTopic } from './db.js';

const log = logger.child({ module: 'poller' });

export type SendFn = (
  platform: 'onebot' | 'kook' | 'qqofficial',
  chatId: string,
  text: string,
  chatType?: 'group' | 'private',
) => Promise<void>;

async function broadcast(topic: PushTopic, itemKey: string, text: string, send: SendFn): Promise<void> {
  if (!tryMarkPushed(topic, itemKey)) {
    log.debug({ topic, itemKey }, 'dedupe skip');
    return;
  }
  const subs = getSubscribers(topic);
  if (!subs.length) {
    log.debug({ topic }, 'no subscribers');
    return;
  }
  log.info({ topic, itemKey, count: subs.length }, 'push');
  for (const s of subs) {
    try {
      await send(s.platform, s.chatId, text, s.chatType);
    } catch (err) {
      log.error({ err, platform: s.platform, chatId: s.chatId, chatType: s.chatType }, 'send failed');
    }
  }
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

  // Arbitration
  try {
    const arb = ws.arbitration;
    if (arb?.node) {
      const key = `arb:${arb.node}:${arb.type}:${arb.expiry ?? ''}`;
      await broadcast('arbitration', key, `📢 仲裁刷新\n${formatArbitration(arb)}`, send);
    }
  } catch (err) {
    log.warn({ err }, 'arbitration format/push failed');
  }

  // Fissures — push when a new hard/storm/normal set id appears (use first few ids hash)
  try {
    const fissures = ws.fissures || [];
    const active = filterFissures(fissures);
    if (active.length) {
      const key = `fis:${active
        .map((f) => f.id)
        .sort()
        .join(',')
        .slice(0, 200)}`;
      await broadcast('fissures', key, `📢 裂缝更新\n${formatFissures(active)}`, send);
    }
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
