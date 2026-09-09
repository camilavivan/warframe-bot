import type {
  AlertItem,
  Arbitration,
  ArchonHunt,
  ConstructionProgress,
  Cycle,
  DailyDeal,
  EventItem,
  Fissure,
  Invasion,
  NewsItem,
  Nightwave,
  Sortie,
  SyndicateMission,
  VoidTrader,
  WmItemResult,
} from './warframestat.js';
import { zh, zhNode } from './locale-zh.js';

export function formatEta(eta?: string, expiry?: string): string {
  if (eta) return eta;
  if (!expiry) return '未知';
  const ms = new Date(expiry).getTime() - Date.now();
  if (Number.isNaN(ms)) return expiry;
  if (ms <= 0) return '已结束';
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  if (h > 48) return `${Math.floor(h / 24)}天${h % 24}时`;
  if (h > 0) return `${h}时${m}分`;
  return `${m}分`;
}

export function formatSortie(s: Sortie | null | undefined): string {
  if (!s || !s.variants?.length) return '当前无突击信息。';
  const lines = [
    `【突击】${s.boss ?? ''} · ${s.faction ?? ''}`,
    `剩余：${formatEta(s.eta, s.expiry)}`,
  ];
  s.variants.forEach((v, i) => {
    lines.push(`${i + 1}. ${zhNode(v.node)} | ${zh(v.missionType)} | ${zh(v.modifier)}`);
  });
  return lines.join('\n');
}

export function formatArbitration(a: Arbitration | null | undefined): string {
  if (!a || !a.node) return '当前无仲裁信息（API 可能未提供）。';
  // warframestat often returns placeholder when arbitration is unavailable
  if (a.node === 'SolNode000' || a.type === 'Unknown') {
    return '当前无有效仲裁（API 返回占位数据）。';
  }
  const flags = [a.archwing ? 'Archwing' : '', a.sharkwing ? 'Sharkwing' : ''].filter(Boolean).join('/');
  return [
    '【仲裁】',
    `节点：${zhNode(a.node)}`,
    `任务：${zh(a.type) || '?'} · 敌人：${zh(a.enemy) || '?'}`,
    flags ? `特殊：${flags}` : null,
    `剩余：${formatEta(a.eta, a.expiry)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export type FissureFilter = {
  hard?: boolean; // 钢铁裂缝
  storm?: boolean; // 虚空风暴
  tier?: string;
};

function isFissureActive(f: Fissure): boolean {
  if (f.expired) return false;
  if (f.expiry) {
    const t = new Date(f.expiry).getTime();
    if (!Number.isNaN(t) && t <= Date.now()) return false;
  }
  return true;
}

export function filterFissures(list: Fissure[], filter: FissureFilter = {}): Fissure[] {
  return (list || [])
    .filter(isFissureActive)
    .filter((f) => (filter.hard === undefined ? true : !!f.isHard === filter.hard))
    .filter((f) => (filter.storm === undefined ? true : !!f.isStorm === filter.storm))
    .filter((f) => (filter.tier ? (f.tier || '').toLowerCase().includes(filter.tier.toLowerCase()) : true))
    .sort((a, b) => (a.tierNum ?? 0) - (b.tierNum ?? 0));
}

export function formatFissures(list: Fissure[], title = '裂缝'): string {
  const active = filterFissures(list);
  if (!active.length) return `当前无${title}。`;
  const lines = [`【${title}】共 ${active.length} 个`];
  for (const f of active.slice(0, 20)) {
    const tags = [f.isHard ? '钢铁' : '', f.isStorm ? '风暴' : ''].filter(Boolean).join('/');
    lines.push(
      `· ${f.tier ?? '?'} | ${zhNode(f.node)} | ${zh(f.missionType)} | ${zh(f.enemy)}${tags ? ` [${tags}]` : ''} · ${formatEta(f.eta, f.expiry)}`,
    );
  }
  if (active.length > 20) lines.push(`…另有 ${active.length - 20} 个`);
  return lines.join('\n');
}

export function formatInvasions(list: Invasion[]): string {
  const active = (list || []).filter((i) => !i.completed);
  if (!active.length) return '当前无进行中的入侵。';
  const lines = [`【入侵】共 ${active.length} 个`];
  for (const i of active.slice(0, 15)) {
    const ar = i.attackerReward?.asString || (i.vsInfestation ? '—' : '无');
    const dr = i.defenderReward?.asString || '无';
    lines.push(
      `· ${i.node ?? '?'} (${Math.round(i.completion ?? 0)}%)`,
      `  ${i.attackingFaction ?? '?'} [${ar}] vs ${i.defendingFaction ?? '?'} [${dr}]`,
    );
  }
  return lines.join('\n');
}

export function formatAlerts(list: AlertItem[]): string {
  if (!list?.length) return '当前无警报。';
  const lines = ['【警报】'];
  for (const a of list) {
    const m = a.mission;
    lines.push(
      `· ${zhNode(m?.node)} | ${zh(m?.type)} | ${zh(m?.faction)}`,
      `  奖励：${m?.reward?.asString ?? '无'} · 剩余 ${formatEta(a.eta, a.expiry)}`,
    );
  }
  return lines.join('\n');
}

export function formatVoidTrader(v: VoidTrader | null | undefined): string {
  if (!v) return '无奸商信息。';
  if (v.active) {
    const lines = [
      `【奸商】${v.character ?? 'Baro'} 已抵达 ${v.location ?? '?'}`,
      `离开倒计时：${formatEta(v.endString, v.expiry)}`,
    ];
    for (const item of (v.inventory || []).slice(0, 30)) {
      lines.push(`· ${item.item ?? '?'} — ${item.ducats ?? 0} 杜卡币 / ${item.credits ?? 0} 现金`);
    }
    return lines.join('\n');
  }
  return [
    `【奸商】${v.character ?? 'Baro'} 未抵达`,
    `下一站：${v.location ?? '?'}`,
    `抵达倒计时：${formatEta(v.startString, v.activation)}`,
  ].join('\n');
}

export function formatDailyDeals(deals: DailyDeal[]): string {
  if (!deals?.length) return '当前无每日特惠（Darvo）。';
  const lines = ['【特惠 / Darvo】'];
  for (const d of deals) {
    lines.push(
      `· ${d.item ?? '?'}`,
      `  ${d.salePrice ?? '?'} (原价 ${d.originalPrice ?? '?'}) 折扣 ${d.discount ?? 0}% · 库存 ${d.total != null && d.sold != null ? d.total - d.sold : '?'}/${d.total ?? '?'} · ${formatEta(d.eta, d.expiry)}`,
    );
  }
  return lines.join('\n');
}

export function formatBounties(missions: SyndicateMission[], syndicateHint: string): string {
  const synMap: Record<string, string[]> = {
    地球: ['Ostrons', 'Ostron'],
    金星: ['Solaris United', 'Solaris'],
    火卫二: ['Entrati'],
  };
  const hints = synMap[syndicateHint] || [syndicateHint];
  const matched = (missions || []).filter((m) =>
    hints.some((h) => (m.syndicate || '').toLowerCase().includes(h.toLowerCase())),
  );
  if (!matched.length) return `当前无「${syndicateHint}」赏金信息。`;
  const lines: string[] = [];
  for (const m of matched) {
    lines.push(`【赏金 · ${m.syndicate}】剩余 ${formatEta(m.eta)}`);
    for (const job of m.jobs || []) {
      const levels = job.enemyLevels?.join('-') ?? '?';
      const standing = job.standingStages?.join('/') ?? '?';
      const rewards = (job.rewardPool || []).slice(0, 4).join('、') || '—';
      lines.push(`· ${job.type ?? '任务'} Lv${levels} 声望[${standing}]`);
      lines.push(`  奖励池：${rewards}`);
    }
  }
  return lines.join('\n');
}

export function formatCycle(c: Cycle | null | undefined, name: string): string {
  if (!c) return `无${name}周期信息。`;
  let state = c.state ?? '';
  if (c.isDay !== undefined) state = c.isDay ? '白天' : '夜晚';
  if (c.isWarm !== undefined) state = c.isWarm ? '温暖' : '寒冷';
  if (c.isVome !== undefined) state = c.isVome ? 'Vome' : 'Fass';
  return [`【${name}】`, `状态：${state || c.shortString || '?'}`, `剩余：${c.timeLeft ?? formatEta(undefined, c.expiry)}`].join(
    '\n',
  );
}

export function formatNightwave(nw: Nightwave | null | undefined): string {
  if (!nw) return '当前无电波信息。';
  const lines = [
    `【电波】第 ${nw.season ?? '?'} 季 · 阶段 ${nw.phase ?? '?'}`,
    `剩余：${formatEta(undefined, nw.expiry)}`,
  ];
  for (const ch of nw.activeChallenges || []) {
    const tag = ch.isElite ? '精英' : ch.isDaily ? '日常' : '周常';
    lines.push(`· [${tag}] ${ch.title ?? '?'} (+${ch.reputation ?? 0})`);
    if (ch.desc) lines.push(`  ${ch.desc}`);
  }
  return lines.join('\n');
}

export function formatNews(list: NewsItem[]): string {
  if (!list?.length) return '暂无新闻。';
  const lines = ['【新闻】'];
  for (const n of list.slice(0, 8)) {
    lines.push(`· ${n.message ?? n.asString ?? '?'}${n.eta ? ` (${n.eta})` : ''}`);
    if (n.link) lines.push(`  ${n.link}`);
  }
  return lines.join('\n');
}

export function formatEvents(list: EventItem[]): string {
  if (!list?.length) return '当前无活动。';
  const lines = ['【活动】'];
  for (const e of list) {
    lines.push(`· ${e.description ?? e.tooltip ?? '?'}${e.node ? ` @ ${e.node}` : ''}`);
    if (e.health != null) lines.push(`  进度/血量：${e.health}%`);
    lines.push(`  剩余：${formatEta(undefined, e.expiry)}`);
  }
  return lines.join('\n');
}

export function formatConstruction(c: ConstructionProgress | null | undefined): string {
  if (!c) return '无舰队建造进度。';
  return [
    '【舰队建造】',
    `Fomorian（狼羊）：${c.fomorianProgress ?? '?'}%`,
    `Razorback（利刃）：${c.razorbackProgress ?? '?'}%`,
  ].join('\n');
}

export function formatArchonHunt(h: ArchonHunt | null | undefined): string {
  if (!h) return '当前无猎杀（Archon Hunt）信息。';
  const lines = [
    `【猎杀】${h.boss ?? '?'} · ${h.faction ?? ''}`,
    `剩余：${formatEta(h.eta, h.expiry)}`,
  ];
  (h.missions || []).forEach((m, i) => {
    lines.push(`${i + 1}. ${zhNode(m.node)} | ${zh(m.type)}${m.modifier ? ` | ${zh(m.modifier)}` : ''}`);
  });
  return lines.join('\n');
}

export function formatWm(result: WmItemResult | null, query: string): string {
  if (!result) return `未找到物品：${query}\n提示：使用英文物品名，如 "primed continuity" 或 url_name。`;
  const lines = [`【WFM】${result.itemName}`, `https://warframe.market/items/${result.urlName}`];
  lines.push('卖单（在线/游戏内 最低）：');
  if (!result.sell.length) lines.push('  （无）');
  else for (const o of result.sell) lines.push(`  ${o.platinum}p ×${o.quantity} — ${o.user.ingame_name} [${o.user.status}]`);
  lines.push('买单（在线/游戏内 最高）：');
  if (!result.buy.length) lines.push('  （无）');
  else for (const o of result.buy) lines.push(`  ${o.platinum}p ×${o.quantity} — ${o.user.ingame_name} [${o.user.status}]`);
  return lines.join('\n');
}

export function formatMenu(prefix: string): string {
  return [
    '【Warframe Bot 菜单】',
    `前缀：\`${prefix}\` 或 \`/\``,
    '',
    '世界状态：',
    '  突击 / 仲裁 / 裂缝 / 钢铁裂缝 / 虚空风暴',
    '  入侵 / 警报 / 奸商 / 特惠 / 活动 / 新闻',
    '  电波 / 舰队 / 猎杀',
    '',
    '赏金：赏金 地球|金星|火卫二',
    '周期：平原 / 地球 / 金星 / 火卫二 / 扎里曼',
    '',
    '市场：wm <物品名>',
    '翻译：翻译 <关键词>',
    '',
    '推送：订阅列表 / 订阅 <主题> / 取消订阅 <主题>',
    '主题：sortie arbitration fissures cetus-night invasions voidtrader darvo archon',
  ].join('\n');
}

/** Push message builders */
export function formatPushSortie(s: Sortie): string {
  return `📢 突击刷新\n${formatSortie(s)}`;
}

export function formatPushArbitration(a: Arbitration): string {
  return `📢 仲裁刷新\n${formatArbitration(a)}`;
}

export function formatPushCetusNight(c: Cycle): string {
  return `📢 希图斯进入夜晚\n${formatCycle(c, '平原（希图斯）')}`;
}
