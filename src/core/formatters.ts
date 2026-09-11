import type {
  AlertItem,
  Arbitration,
  Archimedea,
  ArchonHunt,
  Calendar1999,
  ConstructionProgress,
  Cycle,
  DailyDeal,
  DuviriCycle,
  EventItem,
  Fissure,
  Invasion,
  NewsItem,
  Nightwave,
  Sortie,
  SyndicateMission,
  VoidTrader,
  WmItemResult,
  WmSearchOutcome,
} from './warframestat.js';
import {
  isDeepArchimedea,
  isTemporalArchimedea,
  isVoidTraderActive,
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

function formatArbBounds(a: Arbitration): string | null {
  const b = a.bounds;
  if (!b) return null;
  const parts: string[] = [];
  if (b.resourceBonus != null) parts.push(`资源+${Math.round(b.resourceBonus * 100)}%`);
  if (b.xpBonus != null) parts.push(`经验+${Math.round(b.xpBonus * 100)}%`);
  if (b.weaponXpBonusFor && b.weaponXpBonusVal != null) {
    parts.push(`${b.weaponXpBonusFor}武器经验+${Math.round(b.weaponXpBonusVal * 100)}%`);
  }
  return parts.length ? `加成：${parts.join(' · ')}` : null;
}

function formatArbLine(a: Arbitration, withBounds = true): string {
  const flags = [a.archwing ? 'Archwing' : '', a.sharkwing ? 'Sharkwing' : ''].filter(Boolean).join('/');
  const when = a.activation
    ? `${new Date(a.activation).toLocaleString('zh-CN', { timeZone: 'Asia/Hong_Kong', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    : '';
  const core = `· ${zhNode(a.node)} | ${zh(a.type) || a.type || '?'} | ${zh(a.enemy) || a.enemy || '?'}${flags ? ` [${flags}]` : ''}`;
  const eta = `剩余 ${formatEta(a.eta, a.expiry)}`;
  const bound = withBounds ? formatArbBounds(a) : null;
  return [when ? `${core} @ ${when}` : core, eta, bound].filter(Boolean).join(' · ');
}

export function formatArbitration(a: Arbitration | null | undefined): string {
  if (!a || !a.node) return '当前无仲裁（外部 kuva 源暂不可用）。';
  // warframestat / DE stub when arbitration is unavailable
  if (a.node === 'SolNode000' || a.type === 'Unknown') {
    return '当前无仲裁（外部 kuva 源暂无有效节点）。';
  }
  const flags = [a.archwing ? 'Archwing' : '', a.sharkwing ? 'Sharkwing' : ''].filter(Boolean).join('/');
  return [
    '【仲裁】',
    `节点：${zhNode(a.node)}`,
    `任务：${zh(a.type) || '?'} · 敌人：${zh(a.enemy) || '?'}`,
    flags ? `特殊：${flags}` : null,
    formatArbBounds(a),
    `剩余：${formatEta(a.eta, a.expiry)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Today's (Asia/Hong_Kong) arbitration schedule from external feed. */
export function formatArbitrationSchedule(list: Arbitration[], title = '今日仲裁'): string {
  const items = list || [];
  if (!items.length) return `暂无${title}日程（外部源无数据或未配置）。`;
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const today = fmt.format(new Date());
  const todays = items.filter((a) => {
    if (!a.activation && !a.expiry) return false;
    const day = fmt.format(new Date(a.activation || a.expiry || ''));
    return day === today;
  });
  const shown = (todays.length ? todays : items.slice(0, 12)).slice(0, 16);
  const lines = [
    `【${title}】共 ${shown.length} 场${todays.length ? '' : '（今日无条目，展示近期）'}`,
  ];
  for (const a of shown) lines.push(formatArbLine(a, true));
  if ((todays.length || items.length) > shown.length) {
    lines.push(`…另有更多，可查「高效仲裁」`);
  }
  return lines.join('\n');
}

export function formatEfficientArbitrations(list: Arbitration[]): string {
  const items = (list || []).filter(
    (a) => a.bounds && (a.bounds.resourceBonus != null || a.bounds.xpBonus != null),
  );
  if (!items.length) return '近期暂无标注高效加成的仲裁（或外部源未提供 bounds）。';
  const upcoming = items.filter((a) => {
    if (!a.expiry) return true;
    const t = new Date(a.expiry).getTime();
    return Number.isNaN(t) || t > Date.now();
  }).slice(0, 12);
  if (!upcoming.length) return '近期暂无未结束的高效仲裁。';
  const lines = [`【高效仲裁】共 ${upcoming.length} 场（含资源/经验加成）`];
  for (const a of upcoming) lines.push(formatArbLine(a, true));
  return lines.join('\n');
}

export type FissureFilter = {
  hard?: boolean; // 钢铁裂缝
  storm?: boolean; // 虚空风暴
  tier?: string;
  tierNum?: number;
  /** Capture / Exterminate / Rescue heuristic */
  fast?: boolean;
};

const FISSURE_TIER_ALIASES: Record<string, { tier: string; tierNum: number }> = {
  t1: { tier: 'Lith', tierNum: 1 },
  lith: { tier: 'Lith', tierNum: 1 },
  古纪: { tier: 'Lith', tierNum: 1 },
  t2: { tier: 'Meso', tierNum: 2 },
  meso: { tier: 'Meso', tierNum: 2 },
  前纪: { tier: 'Meso', tierNum: 2 },
  t3: { tier: 'Neo', tierNum: 3 },
  neo: { tier: 'Neo', tierNum: 3 },
  中纪: { tier: 'Neo', tierNum: 3 },
  t4: { tier: 'Axi', tierNum: 4 },
  axi: { tier: 'Axi', tierNum: 4 },
  后纪: { tier: 'Axi', tierNum: 4 },
  t5: { tier: 'Requiem', tierNum: 5 },
  requiem: { tier: 'Requiem', tierNum: 5 },
  安魂: { tier: 'Requiem', tierNum: 5 },
  t6: { tier: 'Omnia', tierNum: 6 },
  omnia: { tier: 'Omnia', tierNum: 6 },
  万用: { tier: 'Omnia', tierNum: 6 },
};

const FAST_MISSION_KEYS = ['capture', 'exterminate', 'extermination', 'rescue', '捕获', '歼灭', '救援'];

/** True for short fissure missions (捕获/歼灭/救援). */
export function isFastFissureMission(missionType?: string): boolean {
  const m = (missionType || '').trim().toLowerCase();
  if (!m) return false;
  return FAST_MISSION_KEYS.some((k) => m === k.toLowerCase() || m.includes(k.toLowerCase()));
}

/**
 * Parse `裂缝` args: 钢铁|风暴|t1-t5|速刷 (and common EN/zh aliases).
 * No args → normal (non-hard, non-storm). `速刷` alone defaults to non-hard.
 */
export function parseFissureArgs(args: string): { filter: FissureFilter; title: string } {
  const tokens = args
    .trim()
    .split(/[\s,，、|/]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (!tokens.length) {
    return { filter: { hard: false, storm: false }, title: '裂缝' };
  }

  const filter: FissureFilter = {};
  const titleParts: string[] = [];
  let sawFast = false;

  for (const raw of tokens) {
    const t = raw.toLowerCase();
    if (t === '钢铁' || t === 'hard' || t === 'sp' || t === 'steel' || t === 'steelpath') {
      filter.hard = true;
      if (!titleParts.includes('钢铁')) titleParts.push('钢铁');
      continue;
    }
    if (t === '风暴' || t === 'storm' || t === '虚空风暴') {
      filter.storm = true;
      if (!titleParts.includes('风暴')) titleParts.push('风暴');
      continue;
    }
    if (t === '速刷' || t === 'fast' || t === 'quick' || t === 'speed') {
      filter.fast = true;
      sawFast = true;
      if (!titleParts.includes('速刷')) titleParts.push('速刷');
      continue;
    }
    if (t === '普通' || t === 'normal') {
      filter.hard = false;
      filter.storm = false;
      continue;
    }
    const mapped = FISSURE_TIER_ALIASES[t];
    if (mapped) {
      filter.tier = mapped.tier;
      filter.tierNum = mapped.tierNum;
      if (!titleParts.includes(mapped.tier)) titleParts.push(mapped.tier);
      continue;
    }
  }

  // 速刷默认排除钢铁之路（显式「钢铁」时保留）
  if (sawFast && filter.hard === undefined) {
    filter.hard = false;
  }

  const title = titleParts.length ? `${titleParts.join('·')}裂缝` : '裂缝';
  return { filter, title };
}

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
    .filter((f) => (filter.tierNum !== undefined ? f.tierNum === filter.tierNum : true))
    .filter((f) =>
      filter.tierNum !== undefined || !filter.tier
        ? true
        : (f.tier || '').toLowerCase().includes(filter.tier.toLowerCase()),
    )
    .filter((f) => (filter.fast ? isFastFissureMission(f.missionType) : true))
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
    const af = zh(i.attackingFaction) || i.attackingFaction || '?';
    const df = zh(i.defendingFaction) || i.defendingFaction || '?';
    lines.push(
      `· ${i.node ?? '?'} (${Math.round(i.completion ?? 0)}%)`,
      `  ${af} [${ar}] vs ${df} [${dr}]`,
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
  if (isVoidTraderActive(v)) {
    const lines = [
      `【奸商】${v.character ?? 'Baro'} 已抵达 ${v.location ?? '?'}`,
      `离开倒计时：${formatEta(v.endString, v.expiry)}`,
    ];
    const inv = v.inventory || [];
    if (!inv.length) {
      lines.push('· （库存暂未公布或为空）');
    } else {
      for (const item of inv.slice(0, 30)) {
        lines.push(`· ${item.item ?? '?'} — ${item.ducats ?? 0} 杜卡币 / ${item.credits ?? 0} 现金`);
      }
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

/** Lightly localize API durations like `2h 13m 54s` / `-2h 27m`. */
function localizeDuration(s: string): string {
  return s
    .replace(/(\d+)\s*d\b/gi, '$1天')
    .replace(/(\d+)\s*h\b/gi, '$1时')
    .replace(/(\d+)\s*m\b/gi, '$1分')
    .replace(/(\d+)\s*s\b/gi, '$1秒')
    .replace(/\s+/g, '')
    .trim();
}

function looksEnglishDuration(s?: string): boolean {
  if (!s) return false;
  return /\d\s*[dhms]\b/i.test(s) || /\bto\b/i.test(s);
}

function formatCycleRemaining(c: Cycle): string {
  if (c.expiry) {
    const fromExpiry = formatEta(undefined, c.expiry);
    if (!c.timeLeft || looksEnglishDuration(c.timeLeft)) return fromExpiry;
  }
  if (c.timeLeft) {
    return looksEnglishDuration(c.timeLeft) ? localizeDuration(c.timeLeft) || c.timeLeft : c.timeLeft;
  }
  return '未知';
}

export function formatCycle(c: Cycle | null | undefined, name: string): string {
  if (!c) return `无${name}周期信息。`;
  let state = '';
  if (c.isCorpus === true) state = 'Corpus';
  else if (c.isCorpus === false) state = 'Grineer';
  else if (c.isDay !== undefined) state = c.isDay ? '白天' : '夜晚';
  else if (c.isWarm !== undefined) state = c.isWarm ? '温暖' : '寒冷';
  else if (c.isVome !== undefined) state = c.isVome ? 'Vome' : 'Fass';
  else if (c.state) state = c.state;
  else if (c.shortString) state = c.shortString;
  const stateZh = zh(state) || state || '?';
  return [`【${name}】`, `状态：${stateZh}`, `剩余：${formatCycleRemaining(c)}`].join('\n');
}

export function formatNightwave(nw: Nightwave | null | undefined): string {
  if (!nw) return '当前无电波信息。';
  const lines = [
    `【电波】第${nw.season ?? '?'}季 · 阶段 ${nw.phase ?? '?'}`,
    `剩余：${formatEta(undefined, nw.expiry)}`,
  ];
  for (const ch of nw.activeChallenges || []) {
    const tag = ch.isElite ? '精英' : ch.isDaily ? '日常' : '周常';
    const title = zh(ch.title) || ch.title || '?';
    lines.push(`· [${tag}] ${title} (+${ch.reputation ?? 0})`);
    if (ch.desc) lines.push(`  ${zh(ch.desc) || ch.desc}`);
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

export function formatWm(outcome: WmSearchOutcome | WmItemResult | null, query?: string): string {
  // Back-compat: bare WmItemResult
  if (outcome && 'sell' in outcome && 'itemName' in outcome && !('item' in outcome)) {
    const result = outcome as WmItemResult;
    const lines = [`【WFM】${result.itemName}`, `https://warframe.market/items/${result.urlName}`];
    lines.push('卖单（在线/游戏内 最低）：');
    if (!result.sell.length) lines.push('  （无）');
    else for (const o of result.sell) lines.push(`  ${o.platinum}p ×${o.quantity} — ${o.user.ingame_name} [${o.user.status}]`);
    lines.push('买单（在线/游戏内 最高）：');
    if (!result.buy.length) lines.push('  （无）');
    else for (const o of result.buy) lines.push(`  ${o.platinum}p ×${o.quantity} — ${o.user.ingame_name} [${o.user.status}]`);
    return lines.join('\n');
  }

  const search = outcome as WmSearchOutcome | null;
  const q = query ?? search?.query ?? '';
  if (!search?.item) {
    const lines = [`未找到物品：${q}`];
    if (search?.expandedQuery && search.expandedQuery !== q) {
      lines.push(`（已尝试：${search.expandedQuery}）`);
    }
    if (search?.suggestions?.length) {
      lines.push('你是不是要找：');
      for (const s of search.suggestions.slice(0, 5)) {
        lines.push(`· ${s.itemName}（${s.urlName}）`);
      }
    } else {
      lines.push('提示：可用英文名 / url_name，或常见黑话如「悟空p」「夜灵棱镜」。');
    }
    return lines.join('\n');
  }
  const result = search.item;
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
    '  突击 / 仲裁 / 今日仲裁 / 高效仲裁',
    '  裂缝 [钢铁|风暴|t1-t5|速刷] / 钢铁裂缝 / 虚空风暴',
    '  入侵 / 警报 / 奸商 / 特惠 / 活动 / 新闻',
    '  资源 「名称」 / 哪里刷 「名称」 — 常见资源掉落地',
    '  电波 / 舰队 / 猎杀',
    '  日历 / 1999 / hex日历 — 1999 Hex 日历',
    '  深层 / deep / archimedea — 深层/时空研习',
    '  双衍王境 / duviri / circuit — 情绪与回路',
    '',
    '赏金：赏金 地球|金星|火卫二',
    '周期：平原 / 地球 / 金星 / 火卫二 / 扎里曼',
    '',
    '市场：wm 「物品名」（支持黑话如 悟空p；未命中给建议）',
    '翻译：翻译 「关键词」',
    '',
    '推送：订阅列表 / 订阅 「主题」[筛选] / 取消订阅 「主题」',
    '推送主题（中英均可订阅）：',
    '  世界状态 — 全部世界状态变更',
    '  特殊事件 / 突击 / 仲裁',
    '  裂缝 [钢铁|风暴|速刷|t1-t5] / 仲裁 [生存|防御…] / 平原夜 / 入侵',
    '  奸商 / 特惠 / 猎杀 / 日历',
  ].join('\n');
}


const SEASON_ZH: Record<string, string> = {
  Spring: '春季',
  Summer: '夏季',
  Autumn: '秋季',
  Fall: '秋季',
  Winter: '冬季',
  CST_SPRING: '春季',
  CST_SUMMER: '夏季',
  CST_AUTUMN: '秋季',
  CST_FALL: '秋季',
  CST_WINTER: '冬季',
};

const EVENT_TYPE_ZH: Record<string, string> = {
  'To Do': '待办',
  'Big Prize!': '大奖',
  Override: '覆盖',
  CET_CHALLENGE: '待办',
  CET_REWARD: '大奖',
  CET_UPGRADE: '覆盖',
};

const DUVIRI_STATE_ZH: Record<string, string> = {
  joy: '喜悦',
  anger: '愤怒',
  envy: '嫉妒',
  sorrow: '悲伤',
  fear: '恐惧',
};

function formatCalendarDate(iso?: string): string {
  if (!iso) return '?';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `1999-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatCalendar(cal: Calendar1999 | null | undefined, opts: { nearDays?: number } = {}): string {
  if (!cal) return '当前无 1999 / Hex 日历信息。';
  const season = SEASON_ZH[cal.season || ''] || cal.season || '?';
  const lines = [
    `【1999 日历 · Hex】`,
    `季节：${season} · 循环年份：${cal.yearIteration ?? '?'}`,
    `本周窗口剩余：${formatEta(undefined, cal.expiry)}`,
  ];

  const days = [...(cal.days || [])].filter((d) => (d.events || []).length > 0);
  // Prefer near-term: sort by date ascending and take nearDays (default 8)
  days.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
  const limit = opts.nearDays ?? 8;
  const shown = days.slice(0, limit);

  if (!shown.length) {
    lines.push('（近期无日程条目）');
    return lines.join('\n');
  }

  for (const day of shown) {
    lines.push(`· ${formatCalendarDate(day.date)}`);
    for (const ev of day.events || []) {
      const kind = EVENT_TYPE_ZH[ev.type || ''] || ev.type || '事件';
      if (ev.challenge) {
        lines.push(`  [${kind}] ${ev.challenge.title ?? '?'}`);
        if (ev.challenge.description) lines.push(`    ${ev.challenge.description}`);
      } else if (ev.reward) {
        lines.push(`  [${kind}] ${ev.reward}`);
      } else if (ev.upgrade) {
        lines.push(`  [${kind}] ${ev.upgrade.title ?? '?'}`);
        if (ev.upgrade.description) lines.push(`    ${ev.upgrade.description}`);
      } else {
        lines.push(`  [${kind}]`);
      }
    }
  }
  if (days.length > shown.length) {
    lines.push(`…另有 ${days.length - shown.length} 天有日程`);
  }
  return lines.join('\n');
}

function formatOneArchimedea(a: Archimedea, title: string): string {
  const lines = [
    `【${title}】`,
    `剩余：${formatEta(undefined, a.expiry)}`,
  ];
  (a.missions || []).forEach((m, i) => {
    lines.push(`${i + 1}. ${zh(m.missionType) || m.missionType || '?'} · ${zh(m.faction) || m.faction || '?'}`);
    if (m.deviation?.name || m.deviation?.key) {
      const name = zh(m.deviation.key) || zh(m.deviation.name) || m.deviation.name || m.deviation.key || '?';
      const desc = m.deviation.description
        ? zh(m.deviation.description) || m.deviation.description
        : '';
      lines.push(`   偏差：${name}${desc ? ` — ${desc}` : ''}`);
    }
    for (const r of m.risks || []) {
      const hard = r.isHard ? ' [钢]' : '';
      const name = zh(r.key) || zh(r.name) || r.name || r.key || '?';
      const desc = r.description ? zh(r.description) || r.description : '';
      lines.push(`   风险${hard}：${name}${desc ? ` — ${desc}` : ''}`);
    }
  });
  if (a.personalModifiers?.length) {
    lines.push('个人修正：');
    for (const pm of a.personalModifiers) {
      const name = zh(pm.key) || zh(pm.name) || pm.name || pm.key || '?';
      const desc = pm.description ? zh(pm.description) || pm.description : '';
      lines.push(`· ${name}${desc ? ` — ${desc}` : ''}`);
    }
  }
  return lines.join('\n');
}

export function formatArchimedeas(list: Archimedea[] | null | undefined): string {
  if (!list?.length) return '当前无深层研习 / 时空研习信息。';
  const deep = list.find(isDeepArchimedea);
  const temporal = list.find(isTemporalArchimedea);
  const parts: string[] = [];
  if (deep) parts.push(formatOneArchimedea(deep, '深层研习'));
  if (temporal) parts.push(formatOneArchimedea(temporal, '时空研习'));
  // Fallback: show unnamed entries
  for (const a of list) {
    if (a === deep || a === temporal) continue;
    parts.push(formatOneArchimedea(a, `研习`));
  }
  return parts.join('\n\n') || '当前无研习信息。';
}

export function formatDuviri(d: DuviriCycle | null | undefined): string {
  if (!d) return '当前无双衍王境周期信息。';
  const emotion = DUVIRI_STATE_ZH[d.state || ''] || d.state || '?';
  const lines = [
    '【双衍王境 / 回路】',
    `情绪：${emotion}`,
    `剩余：${formatEta(undefined, d.expiry)}`,
  ];
  for (const g of d.choices || []) {
    const cat =
      g.categoryKey === 'EXC_HARD' || (g.category || '').toLowerCase() === 'hard'
        ? '钢铁回路'
        : g.categoryKey === 'EXC_NORMAL' || (g.category || '').toLowerCase() === 'normal'
          ? '普通回路'
          : g.category || g.categoryKey || '选项';
    const picks = (g.choices || []).map((c) => zh(c) || c).join('、') || '—';
    lines.push(`· ${cat}：${picks}`);
  }
  return lines.join('\n');
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

export function formatPushEvent(e: EventItem): string {
  const title = e.description ?? e.tooltip ?? '特殊事件';
  const lines = [`📢 特殊事件`, `· ${title}${e.node ? ` @ ${e.node}` : ''}`];
  if (e.health != null) lines.push(`  进度/血量：${e.health}%`);
  if (e.rewards?.length) {
    const r = e.rewards.map((x) => x.asString).filter(Boolean).join('、');
    if (r) lines.push(`  奖励：${r}`);
  }
  lines.push(`  剩余：${formatEta(undefined, e.expiry)}`);
  return lines.join('\n');
}

export function formatPushEvents(list: EventItem[]): string {
  const active = (list || []).filter((e) => {
    if (!e.expiry) return true;
    const t = new Date(e.expiry).getTime();
    return Number.isNaN(t) || t > Date.now();
  });
  if (!active.length) return '📢 特殊事件\n当前无进行中的活动。';
  return `📢 特殊事件\n${formatEvents(active)}`;
}
