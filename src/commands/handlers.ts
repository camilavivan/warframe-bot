import { registerCommand } from './registry.js';
import { loadConfig } from '../config.js';
import {
  fetchAlerts,
  fetchArbitration,
  fetchArchimedeas,
  fetchArchonHunt,
  fetchCalendar,
  fetchCambionCycle,
  fetchCetusCycle,
  fetchConstruction,
  fetchDailyDeals,
  fetchDuviriCycle,
  fetchEarthCycle,
  fetchEvents,
  fetchFissures,
  fetchInvasions,
  fetchNews,
  fetchNightwave,
  fetchSortie,
  fetchSyndicateMissions,
  fetchVallisCycle,
  fetchVoidTrader,
  fetchZarimanCycle,
  searchWmOrders,
  translateKeyword,
} from '../core/warframestat.js';
import {
  filterFissures,
  formatAlerts,
  formatArbitration,
  formatArchimedeas,
  formatArchonHunt,
  formatBounties,
  formatCalendar,
  formatConstruction,
  formatCycle,
  formatDailyDeals,
  formatDuviri,
  formatEvents,
  formatFissures,
  formatInvasions,
  formatMenu,
  formatNews,
  formatNightwave,
  formatSortie,
  formatVoidTrader,
  formatWm,
} from '../core/formatters.js';
import {
  formatPushTopicsHelp,
  listSubscriptions,
  PUSH_TOPIC_LABELS,
  resolvePushTopic,
  subscribe,
  unsubscribe,
  type Platform,
  type PushTopic,
} from '../push/db.js';
import { lookupBidirectional } from '../core/locale-zh.js';
import {
  imagesForArchonHunt,
  imagesForCycle,
  imagesForDailyDeals,
  imagesForFissures,
  imagesForInvasions,
  imagesForSortie,
  imagesForVoidTrader,
} from '../core/images.js';

function safePlatform(p: string): Platform {
  if (p === 'kook') return 'kook';
  if (p === 'qqofficial') return 'qqofficial';
  return 'onebot';
}

export function registerAllCommands(): void {
  registerCommand({
    name: '菜单',
    aliases: ['menu', 'help', '帮助'],
    description: '显示帮助菜单',
    async handle(ctx) {
      const prefix = loadConfig().prefix[0] ?? 'wf ';
      await ctx.reply(formatMenu(prefix));
    },
  });

  registerCommand({
    name: '突击',
    aliases: ['sortie'],
    description: '今日突击',
    async handle(ctx) {
      const data = await fetchSortie();
      await ctx.reply({ text: formatSortie(data), images: imagesForSortie(data) });
    },
  });

  registerCommand({
    name: '仲裁',
    aliases: ['arbitration'],
    description: '当前仲裁',
    async handle(ctx) {
      await ctx.reply(formatArbitration(await fetchArbitration()));
    },
  });

  registerCommand({
    name: '裂缝',
    aliases: ['fissure', 'fissures'],
    description: '虚空裂缝',
    async handle(ctx) {
      const all = await fetchFissures();
      const normal = filterFissures(all, { hard: false, storm: false });
      await ctx.reply({ text: formatFissures(normal, '裂缝'), images: imagesForFissures() });
    },
  });

  registerCommand({
    name: '钢铁裂缝',
    aliases: ['钢铁', 'hardfissure'],
    description: '钢铁之路裂缝',
    async handle(ctx) {
      const all = await fetchFissures();
      const hard = filterFissures(all, { hard: true });
      await ctx.reply({ text: formatFissures(hard, '钢铁裂缝'), images: imagesForFissures() });
    },
  });

  registerCommand({
    name: '虚空风暴',
    aliases: ['风暴', 'storm'],
    description: '虚空风暴裂缝',
    async handle(ctx) {
      const all = await fetchFissures();
      const storm = filterFissures(all, { storm: true });
      await ctx.reply({ text: formatFissures(storm, '虚空风暴'), images: imagesForFissures() });
    },
  });

  registerCommand({
    name: '入侵',
    aliases: ['invasion', 'invasions'],
    description: '入侵',
    async handle(ctx) {
      const data = await fetchInvasions();
      await ctx.reply({ text: formatInvasions(data), images: imagesForInvasions(data) });
    },
  });

  registerCommand({
    name: '警报',
    aliases: ['alert', 'alerts'],
    description: '警报',
    async handle(ctx) {
      await ctx.reply(formatAlerts(await fetchAlerts()));
    },
  });

  registerCommand({
    name: '奸商',
    aliases: ['baro', 'voidtrader'],
    description: '虚空商人',
    async handle(ctx) {
      const data = await fetchVoidTrader();
      await ctx.reply({ text: formatVoidTrader(data), images: imagesForVoidTrader(data) });
    },
  });

  registerCommand({
    name: '特惠',
    aliases: ['darvo', 'deal', 'deals'],
    description: 'Darvo 每日特惠',
    async handle(ctx) {
      const data = await fetchDailyDeals();
      await ctx.reply({ text: formatDailyDeals(data), images: imagesForDailyDeals(data) });
    },
  });

  registerCommand({
    name: '赏金',
    aliases: ['bounty', 'bounties'],
    description: '赏金 地球/金星/火卫二',
    async handle(ctx) {
      const where = ctx.args.trim() || '地球';
      const missions = await fetchSyndicateMissions();
      await ctx.reply(formatBounties(missions, where));
    },
  });

  registerCommand({
    name: '平原',
    aliases: ['希图斯', 'cetus'],
    description: '希图斯昼夜',
    async handle(ctx) {
      const data = await fetchCetusCycle();
      await ctx.reply({
        text: formatCycle(data, '平原（希图斯）'),
        images: imagesForCycle('cetus', data),
      });
    },
  });

  registerCommand({
    name: '地球',
    aliases: ['earth'],
    description: '地球昼夜',
    async handle(ctx) {
      const data = await fetchEarthCycle();
      await ctx.reply({ text: formatCycle(data, '地球'), images: imagesForCycle('earth', data) });
    },
  });

  registerCommand({
    name: '金星',
    aliases: ['vallis', '奥布山谷'],
    description: '金星（奥布山谷）冷暖',
    async handle(ctx) {
      const data = await fetchVallisCycle();
      await ctx.reply({
        text: formatCycle(data, '金星（奥布山谷）'),
        images: imagesForCycle('vallis', data),
      });
    },
  });

  registerCommand({
    name: '火卫二',
    aliases: ['cambion', '德imos', '德莫斯'],
    description: '火卫二（魔胎之穴）',
    async handle(ctx) {
      const data = await fetchCambionCycle();
      await ctx.reply({
        text: formatCycle(data, '火卫二（魔胎之穴）'),
        images: imagesForCycle('cambion', data),
      });
    },
  });

  registerCommand({
    name: '扎里曼',
    aliases: ['zariman'],
    description: '扎里曼周期',
    async handle(ctx) {
      const data = await fetchZarimanCycle();
      await ctx.reply({
        text: formatCycle(data, '扎里曼'),
        images: imagesForCycle('zariman', data),
      });
    },
  });

  registerCommand({
    name: '电波',
    aliases: ['nightwave', 'nw'],
    description: '夜灵电波',
    async handle(ctx) {
      await ctx.reply(formatNightwave(await fetchNightwave()));
    },
  });

  registerCommand({
    name: '新闻',
    aliases: ['news'],
    description: '游戏新闻',
    async handle(ctx) {
      await ctx.reply(formatNews(await fetchNews()));
    },
  });

  registerCommand({
    name: '活动',
    aliases: ['event', 'events'],
    description: '活动',
    async handle(ctx) {
      await ctx.reply(formatEvents(await fetchEvents()));
    },
  });

  registerCommand({
    name: '舰队',
    aliases: ['construction', 'fomorian', 'razorback'],
    description: '舰队建造进度',
    async handle(ctx) {
      await ctx.reply(formatConstruction(await fetchConstruction()));
    },
  });

  registerCommand({
    name: '猎杀',
    aliases: ['archon', 'archonhunt'],
    description: '执刑官猎杀',
    async handle(ctx) {
      const data = await fetchArchonHunt();
      await ctx.reply({ text: formatArchonHunt(data), images: imagesForArchonHunt(data) });
    },
  });

  registerCommand({
    name: '日历',
    aliases: ['1999', 'hex日历', 'hexcalendar', 'calendar'],
    description: '1999 Hex 日历',
    async handle(ctx) {
      await ctx.reply(formatCalendar(await fetchCalendar()));
    },
  });

  registerCommand({
    name: '深层',
    aliases: ['deep', 'archimedea', '研习', '时空研习'],
    description: '深层研习 / 时空研习 Archimedea',
    async handle(ctx) {
      await ctx.reply(formatArchimedeas(await fetchArchimedeas()));
    },
  });

  registerCommand({
    name: '双衍王境',
    aliases: ['duviri', 'circuit', '回路', '王境'],
    description: '双衍王境情绪与回路选项',
    async handle(ctx) {
      await ctx.reply(formatDuviri(await fetchDuviriCycle()));
    },
  });

  registerCommand({
    name: 'wm',
    aliases: ['市场', 'wfm'],
    description: 'Warframe.market 价格',
    async handle(ctx) {
      if (!ctx.args.trim()) {
        await ctx.reply('用法：wm 「物品名」\n例如：wm primed continuity');
        return;
      }
      const result = await searchWmOrders(ctx.args.trim());
      await ctx.reply(formatWm(result, ctx.args.trim()));
    },
  });

  registerCommand({
    name: '翻译',
    aliases: ['translate', 'tr'],
    description: '物品名/术语中英互译与搜索',
    async handle(ctx) {
      if (!ctx.args.trim()) {
        await ctx.reply('用法：翻译 「关键词」');
        return;
      }
      const kw = ctx.args.trim();
      const local = lookupBidirectional(kw);
      const results = await translateKeyword(kw);
      const lines: string[] = [];
      if (local.length) {
        lines.push('【词典】');
        for (const r of local.slice(0, 8)) lines.push(`· ${r}`);
      }
      if (results.length) {
        lines.push('【物品搜索】');
        for (const r of results) lines.push(`· ${r}`);
      }
      if (!lines.length) {
        await ctx.reply(`未找到与「${kw}」相关的条目。`);
        return;
      }
      await ctx.reply(`【翻译/搜索】${kw}\n` + lines.join('\n'));
    },
  });

  // Push admin
  registerCommand({
    name: '订阅列表',
    aliases: ['subs', 'subscriptions'],
    description: '查看本群/私聊订阅',
    async handle(ctx) {
      if (ctx.platform === 'cli') {
        await ctx.reply('CLI 模式无订阅。');
        return;
      }
      const topics = listSubscriptions(safePlatform(ctx.platform), ctx.chatId);
      const where = ctx.chatType === 'private' ? '私聊' : '本群';
      if (!topics.length) {
        await ctx.reply(`${where}暂无订阅。\n可用主题：\n${formatPushTopicsHelp()}`);
        return;
      }
      const lines = topics.map((t: PushTopic) => {
        const zh = PUSH_TOPIC_LABELS[t] ?? t;
        return `· ${zh} 「${t}」`;
      });
      await ctx.reply(`【订阅列表·${where}】\n${lines.join('\n')}`);
    },
  });

  registerCommand({
    name: '订阅',
    aliases: ['subscribe', 'sub'],
    description: '订阅推送主题',
    async handle(ctx) {
      if (ctx.platform === 'cli') {
        await ctx.reply('CLI 模式无法订阅。');
        return;
      }
      const topic = resolvePushTopic(ctx.args);
      if (!topic) {
        await ctx.reply(`用法：订阅 「主题」\n可用：\n${formatPushTopicsHelp()}`);
        return;
      }
      const ok = subscribe(safePlatform(ctx.platform), ctx.chatId, topic, ctx.chatType);
      const label = `${PUSH_TOPIC_LABELS[topic]} 「${topic}」`;
      await ctx.reply(ok ? `已订阅：${label}` : `已订阅过：${label}`);
    },
  });

  registerCommand({
    name: '取消订阅',
    aliases: ['unsubscribe', 'unsub'],
    description: '取消推送主题',
    async handle(ctx) {
      if (ctx.platform === 'cli') {
        await ctx.reply('CLI 模式无法取消订阅。');
        return;
      }
      const topic = resolvePushTopic(ctx.args);
      if (!topic) {
        await ctx.reply(`用法：取消订阅 「主题」\n可用：\n${formatPushTopicsHelp()}`);
        return;
      }
      const ok = unsubscribe(safePlatform(ctx.platform), ctx.chatId, topic);
      const label = `${PUSH_TOPIC_LABELS[topic]} 「${topic}」`;
      await ctx.reply(ok ? `已取消：${label}` : `未订阅：${label}`);
    },
  });
}
