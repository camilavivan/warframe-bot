/**
 * Curated offline farm locations for common resources.
 * Prefer this over api.warframestat.us/drops (Cloudflare-blocked on many CN VPS).
 * Tips are community/wiki oriented — not live drop tables.
 */

export interface ResourceFarmEntry {
  /** Canonical Chinese name */
  nameZh: string;
  /** English name */
  nameEn: string;
  /** Search aliases (zh/en/abbrev) */
  aliases: string[];
  /** Where / how to farm (Chinese) */
  locations: string[];
  /** Optional short tip */
  tip?: string;
}

export const RESOURCE_FARM_DATA: ResourceFarmEntry[] = [
  {
    nameZh: '氩结晶',
    nameEn: 'Argon Crystal',
    aliases: ['氩晶', '氩', 'argon', 'argon crystal', 'argoncrystal'],
    locations: [
      '虚空（Void）任意任务：歼灭 / 捕获 / 破坏较快',
      '虚空生存、防御也可刷，但效率通常不如短任务',
      '奥罗金船舰（虚空）容器与敌人都会掉',
    ],
    tip: '氩结晶会随时间衰变，建议按需刷、尽快用。',
  },
  {
    nameZh: '氧化氖',
    nameEn: 'Oxium',
    aliases: ['oxium', '氧', '氧化'],
    locations: [
      '击杀 Oxium Osprey（Corpus）：金星、欧罗巴、海王星、冥王星等',
      '推荐：金星·Kiliken（歼灭）附近清鸟',
      'Railjack 部分 Corpus 节点也有 Oxium Osprey',
    ],
    tip: '优先清 Oxium Osprey；范围伤害 + 磁吸可加快拾取。',
  },
  {
    nameZh: '冷冻残骸',
    nameEn: 'Cryotic',
    aliases: ['cryotic', '冷冻', '冰冻残骸'],
    locations: [
      '挖掘（Excavation）任务：主产出冷冻残骸',
      '常见：欧罗巴、虚空等挖掘节点',
      '开放世界挖矿不是主来源',
    ],
    tip: '保护挖掘机，尽量多完成几轮再撤离。',
  },
  {
    nameZh: '生物质',
    nameEn: 'Plastids',
    aliases: ['plastids', 'plastid', '生化质'],
    locations: [
      '感染者星球：埃里斯、天王星、土星部分节点',
      '推荐：埃里斯·Hieracon（挖掘）/ 天王星·Ophelia（生存）',
      '希图斯 / 福尔图娜赏金与容器也有少量',
    ],
  },
  {
    nameZh: '奥罗金电池',
    nameEn: 'Orokin Cell',
    aliases: ['orokin cell', 'orokincell', '电池', 'orokin电池', '奥罗金细胞'],
    locations: [
      '土星·Helene（防御）经典挂机点',
      'Boss：土星 Tyl Regor 等 Grineer 头目图',
      '德莫斯 / 火卫二部分任务与遗迹容器',
    ],
    tip: '资源加成（Smeeta、资源爆发、资源匣）收益明显。',
  },
  {
    nameZh: '神经传感器',
    nameEn: 'Neural Sensors',
    aliases: ['neural sensors', 'neuralsensors', '神经', '传感器'],
    locations: [
      '木星：Boss Alad V（Themisto）与木星防御 / 生存',
      '古战场部分节点也掉神经传感器',
      '推荐短刷：木星歼灭 / 捕获清图后重开',
    ],
  },
  {
    nameZh: '镓',
    nameEn: 'Gallium',
    aliases: ['gallium'],
    locations: [
      '火星、天王星常见',
      'Boss：火星 Sergeant（War）附近任务与容器',
      '推荐火星或天王星短任务反复刷',
    ],
  },
  {
    nameZh: '变形纤维',
    nameEn: 'Morphics',
    aliases: ['morphics', 'morphic', '纤维'],
    locations: [
      '水星、火星、火卫一、欧罗巴等',
      'Boss：水星 Captain Vor 相关节点',
      '推荐水星或火星歼灭/捕获速刷',
    ],
  },
  {
    nameZh: '控制模块',
    nameEn: 'Control Module',
    aliases: ['control module', 'controlmodule', '控制模组', '模块'],
    locations: [
      '海王星、欧罗巴、虚空常见',
      '推荐：海王星·Lara（移动防御）/ 虚空短任务',
    ],
  },
  {
    nameZh: '电路板',
    nameEn: 'Circuits',
    aliases: ['circuits', 'circuit', '电路'],
    locations: [
      '金星、谷神星大量掉落',
      '推荐：金星或谷神星防御 / 歼灭',
      '福尔图娜挖矿与赏金也可补',
    ],
  },
  {
    nameZh: '铁氧体',
    nameEn: 'Ferrite',
    aliases: ['ferrite'],
    locations: [
      '地球、水星、海王星等基础资源',
      '地球平原挖矿 / 普通任务容器即可',
    ],
  },
  {
    nameZh: '纳米孢子',
    nameEn: 'Nano Spores',
    aliases: ['nano spores', 'nanospore', '孢子', '纳米'],
    locations: [
      '土星、埃里斯、火卫二等',
      '推荐土星或埃里斯生存挂机',
    ],
  },
  {
    nameZh: '聚合物束',
    nameEn: 'Polymer Bundle',
    aliases: ['polymer bundle', 'polymer', '聚合物', '聚合物捆'],
    locations: [
      '水星、金星、天王星',
      '推荐：天王星·Ophelia（生存）或水星短任务',
    ],
  },
  {
    nameZh: '红化晶体',
    nameEn: 'Rubedo',
    aliases: ['rubedo', '红化'],
    locations: [
      '地球、幻影、赛德娜、普拉托等',
      '虚空与冰原图也常见；平原挖矿可补',
    ],
  },
  {
    nameZh: '合金板',
    nameEn: 'Alloy Plate',
    aliases: ['alloy plate', 'alloyplate', '合金'],
    locations: [
      '金星、幻影、谷神星、火卫一等 Corpus / 船舰图',
    ],
  },
  {
    nameZh: '碲',
    nameEn: 'Tellurium',
    aliases: ['tellurium', '碲元素'],
    locations: [
      'Archwing 任务与海底（乌拉努斯潜艇图）敌人',
      '推荐：天王星·Ophelia（生存，含潜艇段）或 Archwing 拦截/歼灭',
      'Railjack 部分节点也有',
    ],
    tip: '掉率偏低，建议开资源加成后刷。',
  },
  {
    nameZh: '神经脉冲',
    nameEn: 'Neurodes',
    aliases: ['neurodes', 'neurode', '神经脉冲索', '脉冲'],
    locations: [
      '地球、德莫斯（火卫二）、埃里斯',
      '地球·Everest（挖掘）或德莫斯任务常见',
    ],
  },
  {
    nameZh: '库娃',
    nameEn: 'Kuva',
    aliases: ['kuva', '酷娃'],
    locations: [
      'Kuva Siphon / Kuva Flood（星图标记的库娃风暴）',
      '仲裁（Arbitration）轮次奖励',
      '钢铁之路与部分活动也可能产出',
    ],
    tip: '日常优先 Siphon；Flood 产量更高但更难。',
  },
  {
    nameZh: '内融核心',
    nameEn: 'Endo',
    aliases: ['endo', '内融'],
    locations: [
      '仲裁、钢铁之路、夜波、虚空遗物开核',
      '赏金与防御/生存轮次奖励',
      '阿耶拉雕像（Ayatan）合成可换 Endo',
    ],
  },
  {
    nameZh: '希图斯之息',
    nameEn: 'Cetus Wisp',
    aliases: ['之息', 'wisp', 'cetus wisp', 'wisps', '平原之息'],
    locations: [
      '地球平原（希图斯）夜间：水域附近漂浮的发光之息',
      'Eidolons 夜晚也可顺路收',
    ],
    tip: '可订阅推送「平原夜」赶上夜晚窗口。',
  },
  {
    nameZh: '储存能量',
    nameEn: 'Detonite Ampule',
    aliases: ['detonite', 'detonite ampule', '炸药瓶', '爆破药瓶'],
    locations: [
      'Grineer 星球任务掉落（地球、火星、土星等）',
      '用于合成 Detonite Injector（氏族科研）',
    ],
  },
  {
    nameZh: '力场线圈样本',
    nameEn: 'Fieldron Sample',
    aliases: ['fieldron', 'fieldron sample', '力场线圈', '力场样本'],
    locations: [
      'Corpus 星球任务（金星、欧罗巴、海王星、冥王星）',
      '用于合成 Fieldron（氏族科研）',
    ],
  },
  {
    nameZh: '突变原样本',
    nameEn: 'Mutagen Sample',
    aliases: ['mutagen', 'mutagen sample', '突变原', '诱变样本'],
    locations: [
      '感染者图：埃里斯、德莫斯（火卫二）等',
      '用于合成 Mutagen Mass（氏族科研）',
    ],
  },
  {
    nameZh: '虚空精华',
    nameEn: 'Void Traces',
    aliases: ['虚空结晶', 'void trace', 'void traces', 'traces', '精华'],
    locations: [
      '开启虚空遗物的裂隙任务结束时结算虚空精华',
      '多捡反应物（reactant）、提高遗物反应品质有助于效率',
    ],
  },
];

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function entryHaystack(e: ResourceFarmEntry): string[] {
  return [e.nameZh, e.nameEn, ...e.aliases].map(norm).filter(Boolean);
}

/** Lookup curated farm info; supports partial alias match. */
export function lookupResourceFarm(query: string): ResourceFarmEntry[] {
  const q = norm(query);
  if (!q) return [];

  const exact: ResourceFarmEntry[] = [];
  const partial: ResourceFarmEntry[] = [];
  for (const e of RESOURCE_FARM_DATA) {
    if (!e.locations.length) continue;
    const keys = entryHaystack(e);
    if (keys.some((k) => k === q)) {
      exact.push(e);
      continue;
    }
    if (keys.some((k) => k.includes(q) || q.includes(k))) {
      partial.push(e);
    }
  }
  const out = exact.length ? exact : partial;
  // de-dupe by nameZh
  const seen = new Set<string>();
  return out.filter((e) => {
    if (seen.has(e.nameZh)) return false;
    seen.add(e.nameZh);
    return true;
  });
}

export function formatResourceFarm(query: string): string {
  const q = query.trim();
  if (!q) {
    return [
      '用法：资源 「名称」 或 哪里刷 「名称」',
      '例：资源 氩结晶 / 哪里刷 argon / farm oxium',
      `已收录常见资源 ${RESOURCE_FARM_DATA.filter((e) => e.locations.length).length} 种（离线词典，国内可用）。`,
    ].join('\n');
  }
  const hits = lookupResourceFarm(q);
  if (!hits.length) {
    return [
      `未找到「${q}」的刷取指引。`,
      '可试中英文名，如：氩结晶、氧化氖、奥罗金电池、neural sensors。',
      '（离线精简词典，不含全部掉落表。）',
    ].join('\n');
  }
  const blocks = hits.slice(0, 3).map((e) => {
    const lines = [
      `【${e.nameZh} / ${e.nameEn}】`,
      ...e.locations.map((l) => `· ${l}`),
    ];
    if (e.tip) lines.push(`提示：${e.tip}`);
    return lines.join('\n');
  });
  if (hits.length > 3) blocks.push(`…另有 ${hits.length - 3} 条匹配，请把关键词写得更具体`);
  return blocks.join('\n\n');
}

export function listResourceFarmNames(): string[] {
  return RESOURCE_FARM_DATA.filter((e) => e.locations.length).map((e) => e.nameZh);
}
