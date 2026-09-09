import {
  fetchArbitration,
  fetchArchonHunt,
  fetchCalendar,
  fetchCetusCycle,
  fetchDailyDeals,
  fetchFissures,
  fetchInvasions,
  fetchSortie,
  fetchVoidTrader,
  isVoidTraderActive,
} from '../core/warframestat.js';
import {
  filterFissures,
  formatArbitration,
  formatArchonHunt,
  formatCalendar,
  formatCycle,
  formatDailyDeals,
  formatFissures,
  formatInvasions,
  formatPushCetusNight,
  formatPushSortie,
  formatVoidTrader,
} from '../core/formatters.js';
import { logger } from '../core/logger.js';
import { getSubscribers, purgeOldDedupe, tryMarkPushed, type PushTopic } from './db.js';

const log = logger.child({ module: 'poller' });

export type SendFn = (
  platform: 'onebot' | 'kook',
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

export async function pollOnce(send: SendFn): Promise<void> {
  // Sortie
  try {
    const sortie = await fetchSortie();
    if (sortie?.id) {
      await broadcast('sortie', `sortie:${sortie.id}`, formatPushSortie(sortie), send);
    }
  } catch (err) {
    log.warn({ err }, 'sortie poll failed');
  }

  // Arbitration
  try {
    const arb = await fetchArbitration();
    if (arb?.node) {
      const key = `arb:${arb.node}:${arb.type}:${arb.expiry ?? ''}`;
      await broadcast('arbitration', key, `📢 仲裁刷新\n${formatArbitration(arb)}`, send);
    }
  } catch (err) {
    log.warn({ err }, 'arbitration poll failed');
  }

  // Fissures — push when a new hard/storm/normal set id appears (use first few ids hash)
  try {
    const fissures = await fetchFissures();
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
    log.warn({ err }, 'fissures poll failed');
  }

  // Cetus night
  try {
    const cetus = await fetchCetusCycle();
    if (cetus && cetus.isDay === false) {
      const key = `cetus-night:${cetus.expiry ?? cetus.id ?? ''}`;
      await broadcast('cetus-night', key, formatPushCetusNight(cetus), send);
    }
  } catch (err) {
    log.warn({ err }, 'cetus poll failed');
  }

  // Invasions — per invasion id
  try {
    const invasions = await fetchInvasions();
    for (const inv of (invasions || []).filter((i) => !i.completed)) {
      if (!inv.id) continue;
      await broadcast(
        'invasions',
        `inv:${inv.id}`,
        `📢 新入侵\n${formatInvasions([inv])}`,
        send,
      );
    }
  } catch (err) {
    log.warn({ err }, 'invasions poll failed');
  }

  // Void trader arrival / inventory change
  try {
    const vt = await fetchVoidTrader();
    if (vt) {
      const key = isVoidTraderActive(vt)
        ? `vt-active:${vt.id ?? vt.location}:${vt.inventory?.length ?? 0}`
        : `vt-wait:${vt.activation ?? ''}:${vt.location ?? ''}`;
      await broadcast('voidtrader', key, `📢 奸商动态\n${formatVoidTrader(vt)}`, send);
    }
  } catch (err) {
    log.warn({ err }, 'voidtrader poll failed');
  }

  // Darvo
  try {
    const deals = await fetchDailyDeals();
    for (const d of deals || []) {
      const key = `darvo:${d.item}:${d.expiry ?? ''}`;
      await broadcast('darvo', key, `📢 特惠更新\n${formatDailyDeals([d])}`, send);
    }
  } catch (err) {
    log.warn({ err }, 'darvo poll failed');
  }

  // Archon
  try {
    const hunt = await fetchArchonHunt();
    if (hunt?.id) {
      await broadcast('archon', `archon:${hunt.id}`, `📢 猎杀刷新\n${formatArchonHunt(hunt)}`, send);
    }
  } catch (err) {
    log.warn({ err }, 'archon poll failed');
  }

  // 1999 Hex calendar — season change or weekly window refresh
  try {
    const cal = await fetchCalendar();
    if (cal) {
      const key = `calendar:${cal.season ?? ''}:${cal.yearIteration ?? ''}:${cal.activation ?? ''}:${cal.expiry ?? ''}`;
      await broadcast('calendar', key, `📢 1999 日历更新\n${formatCalendar(cal)}`, send);
    }
  } catch (err) {
    log.warn({ err }, 'calendar poll failed');
  }

  try {
    purgeOldDedupe();
  } catch {
    /* ignore */
  }
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
