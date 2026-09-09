/** Common Warframe English → 简体中文 glosses (API language=zh is incomplete for many fields). */
const MAP: Record<string, string> = {
  // Mission types
  Assassination: '刺杀',
  Extermination: '歼灭',
  Survival: '生存',
  Defense: '防御',
  MobileDefense: '机动防御',
  'Mobile Defense': '机动防御',
  Rescue: '救援',
  Spy: '间谍',
  Sabotage: '破坏',
  Capture: '捕获',
  Interception: '拦截',
  Excavation: '挖掘',
  Disruption: '扰乱',
  Hijack: '劫持',
  Defection: '叛逃',
  InfestedSalvage: '异融salvage',
  'Infested Salvage': '异融打捞',
  Assault: '突击',
  'Orphix Venom': 'Orphix',
  Alchemy: '炼金',
  VoidCascade: '虚空洪流',
  'Void Cascade': '虚空洪流',
  VoidFlood: '虚空洪潮',
  'Void Flood': '虚空洪潮',
  VoidArmageddon: '虚空末日',
  'Void Armageddon': '虚空末日',
  Ascension: '登升',
  // Factions
  Grineer: 'Grineer',
  Corpus: 'Corpus',
  Infested: 'Infested',
  Orokin: 'Orokin',
  Crossfire: '交火',
  'The Murmur': '细语者',
  // Modifiers (sortie)
  'Energy Reduction': '能量削减',
  'Enhanced Enemy Shields': '敌人护盾增强',
  'Enhanced Enemy Armor': '敌人护甲增强',
  'Eximus Stronghold': '卓越者据点',
  'Enemy Elemental Damage': '敌人元素伤害',
  'Environmental Hazard: Fire': '环境危害：火焰',
  'Environmental Hazard: Cold': '环境危害：寒冷',
  'Environmental Hazard: Fog': '环境危害：迷雾',
  'Environmental Hazard: Electromagnetic Anomalies': '环境危害：电磁异常',
  'Environmental Hazard: Radiation Pockets': '环境危害：辐射区',
  'Hazard: Dense Fog': '危害：浓雾',
  'Hazard: Cryogenic Leakage': '危害：低温泄漏',
  'Hazard: Magnetic Anomaly': '危害：磁力异常',
  'Augmented Enemy Armor': '敌人护甲强化',
  'Augmented Enemy Shields': '敌人护盾强化',
};

export function zh(text: string | undefined | null): string {
  if (!text) return '';
  return MAP[text] ?? text;
}

export function zhNode(node: string | undefined | null): string {
  if (!node) return '?';
  // Keep planet names; many zh APIs still return English nodes
  return node;
}
