/**
 * English → 简体中文 glosses.
 * Hand-maintained OVERRIDES always win over locale-zh.generated.ts.
 */
import { GENERATED_ZH } from './locale-zh.generated.js';

/** Hand-maintained overrides (missions, factions, modifiers, cycles, key nodes). */
const OVERRIDES: Record<string, string> = {
  Assassination: '刺杀',
  Exterminate: '歼灭',
  Extermination: '歼灭',
  'Extermination (Archwing)': '歼灭（Archwing）',
  Survival: '生存',
  Defense: '防御',
  'Mirror Defense': '镜像防御',
  MobileDefense: '机动防御',
  'Mobile Defense': '机动防御',
  'Mobile Defense (Archwing)': '机动防御（Archwing）',
  Rescue: '救援',
  Spy: '间谍',
  Sabotage: '破坏',
  'Sabotage (Archwing)': '破坏（Archwing）',
  'Hive Sabotage': '清巢',
  'Orokin Sabotage': 'Orokin 破坏',
  Capture: '捕获',
  Interception: '拦截',
  'Interception (Archwing)': '拦截（Archwing）',
  Excavation: '挖掘',
  Disruption: '扰乱',
  Hijack: '劫持',
  Defection: '叛逃',
  InfestedSalvage: '异融打捞',
  'Infested Salvage': '异融打捞',
  Assault: '突击',
  Alchemy: '炼金',
  Ascension: '登升',
  Orphix: 'Orphix',
  'Orphix Venom': 'Orphix',
  VoidCascade: '虚空洪流',
  'Void Cascade': '虚空洪流',
  VoidFlood: '虚空洪潮',
  'Void Flood': '虚空洪潮',
  VoidArmageddon: '虚空末日',
  'Void Armageddon': '虚空末日',
  Hive: '清巢',
  Arena: '竞技场',
  Rathuum: '拉特昂',
  'Free Roam': '自由漫游',
  Skirmish: '前哨战',
  Volatile: '爆发',
  Netracells: '衰减室',
  Pursuit: '追击',
  'Pursuit (Archwing)': '追击（Archwing）',
  Rush: '疾驰',
  'Rush (Archwing)': '疾驰（Archwing）',
  Conclave: '武形密仪',
  Relay: '中继站',
  'Ancient Retribution': '远古惩戒',
  'Dark Sector Defense': '黑暗地带防御',
  'Dark Sector Survival': '黑暗地带生存',
  'Dark Sector Excavation': '黑暗地带挖掘',
  'Dark Sector Defection': '黑暗地带叛逃',
  'Dark Sector Disruption': '黑暗地带扰乱',
  'Steel Path': '钢铁之路',
  'The Steel Path': '钢铁之路',
  Grineer: '格里尼尔',
  Corpus: 'Corpus',
  Infested: '感染者',
  Orokin: '奥罗金',
  Sentient: '感触者',
  'Man in the Wall': '墙中人',
  'The Indifference': '冷漠者',
  Crossfire: '交火',
  'The Murmur': '细语者',
  Murmur: '细语者',
  Narmer: '纳默',
  Tenno: 'Tenno',
  Syndicates: '集团',
  Wild: '野生',
  'Corrupted': '被腐化者',
  Demolyst: '爆破者',
  'Thrax Centurion': 'Thrax 百夫长',
  'Thrax Legatus': 'Thrax 使节',
  'Energy Reduction': '能量削减',
  'Enhanced Enemy Shields': '敌人护盾增强',
  'Enhanced Enemy Armor': '敌人护甲增强',
  'Augmented Enemy Armor': '敌人护甲强化',
  'Augmented Enemy Shields': '敌人护盾强化',
  'Eximus Stronghold': '卓越者据点',
  'Enemy Elemental Damage': '敌人元素伤害',
  'Enemy Physical Enhancement': '敌人物理强化',
  'Enemy Physical Enhancement: Impact': '敌人物理强化：冲击',
  'Enemy Physical Enhancement: Slash': '敌人物理强化：切割',
  'Enemy Physical Enhancement: Puncture': '敌人物理强化：穿刺',
  'Enemy Elemental Enhancement': '敌人元素强化',
  'Enemy Elemental Enhancement: Heat': '敌人元素强化：火焰',
  'Enemy Elemental Enhancement: Cold': '敌人元素强化：冰冻',
  'Enemy Elemental Enhancement: Electricity': '敌人元素强化：电击',
  'Enemy Elemental Enhancement: Toxin': '敌人元素强化：毒素',
  'Enemy Elemental Enhancement: Blast': '敌人元素强化：爆炸',
  'Enemy Elemental Enhancement: Radiation': '敌人元素强化：辐射',
  'Enemy Elemental Enhancement: Gas': '敌人元素强化：毒气',
  'Enemy Elemental Enhancement: Magnetic': '敌人元素强化：磁力',
  'Enemy Elemental Enhancement: Viral': '敌人元素强化：病毒',
  'Enemy Elemental Enhancement: Corrosive': '敌人元素强化：腐蚀',
  'Environmental Hazard: Fire': '环境危害：火焰',
  'Environmental Hazard: Cold': '环境危害：寒冷',
  'Environmental Hazard: Fog': '环境危害：迷雾',
  'Environmental Hazard: Electromagnetic Anomalies': '环境危害：电磁异常',
  'Environmental Hazard: Radiation Pockets': '环境危害：辐射区',
  'Hazard: Dense Fog': '危害：浓雾',
  'Hazard: Cryogenic Leakage': '危害：低温泄漏',
  'Hazard: Magnetic Anomaly': '危害：磁力异常',
  'Hazard: Fire': '危害：火焰',
  'Hazard: Ice': '危害：冰冻',
  'Hazard: Radiation': '危害：辐射',
  'Weapon Restriction: Assault Rifle Only': '武器限制：仅突击步枪',
  'Weapon Restriction: Shotgun Only': '武器限制：仅霰弹枪',
  'Weapon Restriction: Sniper Only': '武器限制：仅狙击枪',
  'Weapon Restriction: Bow Only': '武器限制：仅弓',
  'Weapon Restriction: Melee Only': '武器限制：仅近战',
  'Weapon Restriction: Secondary Only': '武器限制：仅副武器',
  'Infection: Viral': '感染：病毒',
  'Extreme Cold': '极寒',
  'Extreme Heat': '极热',
  'Low Gravity': '低重力',
  'Hypercharge': '超载',
  Day: '白天',
  Night: '夜晚',
  Warm: '温暖',
  Cold: '寒冷',
  Fass: '法斯',
  Vome: '沃姆',
  Cetus: '希图斯',
  Fortuna: '福尔图娜',
  'Orb Vallis': '奥布山谷',
  'Plains of Eidolon': '夜灵平野',
  'Cambion Drift': '魔胎之穴',
  Deimos: '火卫二',
  Zariman: '扎里曼',
  Duviri: '双衍王境',
  'The Holdfasts': '坚居者',
  Entrati: '恩特拉蒂',
  Ostron: '欧斯特凡',
  Solaris: '索拉里斯联盟',
  'Necralisk': '死灵之塔',
  'Sanctum Anatomica': '解剖圣所',
  Höllvania: '霍尔瓦尼亚',
  '1999': '1999',
  Mercury: '水星',
  Venus: '金星',
  Earth: '地球',
  Mars: '火星',
  Phobos: '火卫一',
  Ceres: '谷神星',
  Jupiter: '木星',
  Europa: '欧罗巴',
  Saturn: '土星',
  Uranus: '天王星',
  Neptune: '海王星',
  Pluto: '冥王星',
  Eris: '阋神星',
  Sedna: '赛德娜',
  Lua: '月球',
  Void: '虚空',
  'Kuva Fortress': '赤毒要塞',
  Veil: '面纱星云',
  'Venus Proxima': '金星比邻星域',
  'Earth Proxima': '地球比邻星域',
  'Saturn Proxima': '土星比邻星域',
  'Neptune Proxima': '海王星比邻星域',
  'Pluto Proxima': '冥王星比邻星域',
  'Veil Proxima': '面纱比邻星域',
  Lith: '古纪（Lith）',
  Meso: '前纪（Meso）',
  Neo: '中纪（Neo）',
  Axi: '后纪（Axi）',
  Requiem: '安魂（Requiem）',
  Omnia: '万象（Omnia）',
  Gaia: '盖亚',
  Apollodorus: '阿波罗多洛斯',
  Tessera: '泰塞拉',
  Aphrodite: '阿佛洛狄忒',
  Cytherean: '赛西瑞恩',
  EGate: 'E门',
  'E Gate': 'E门',
  Venera: '维内拉',
  Linea: '利尼亚',
  Unda: '温达',
  Malva: '马尔瓦',
  VPrime: 'V Prim',
  Ishtar: '伊什塔尔',
  Kiliken: '基利肯',
  Fossa: '福萨',
  Romula: '罗慕路斯',
  Mariana: '马里亚纳',
  Cervantes: '塞万提斯',
  Pacific: '太平洋',
  Cambria: '坎布里亚',
  Everest: '珠穆朗玛',
  Oro: '奥罗',
  Mantle: '地幔',
  EPrime: 'E Prim',
  Spear: '长矛',
  Ara: '阿拉',
  Martialis: '马提亚利斯',
  Augustus: '奥古斯都',
  Hellas: '赫拉斯',
  Alator: '阿拉托',
  Arval: '阿尔瓦尔',
  Speyer: '施派尔',
  Gradivus: '格拉迪乌斯',
  Quirinus: '奎里努斯',
  Ultor: '乌尔托',
  Olympus: '奥林巴斯',
  Vallis: '山谷',
  Ares: '阿瑞斯',
  Syrtis: '叙尔提斯',
  Wahiba: '瓦希巴',
  Tharsis: '塔尔西斯',
  Auk: '奥克',
  Stickney: '斯蒂克尼',
  Roche: '洛希',
  Sharpless: '沙普利斯',
  Skyresh: '斯凯雷什',
  Kepler: '开普勒',
  Monolith: '独石',
  Drunya: '德鲁尼亚',
  Gantulyst: '甘图利斯特',
  Iliad: '伊利亚特',
  Memovore: '记忆吞噬者',
  Zeugma: 'zeugma',
  Shklovsky: '什克洛夫斯基',
  Todd: '托德',
  Flimnap: '弗林纳普',
  Ker: '克尔',
  Cyath: '赛亚斯',
  Casta: '卡斯特',
  Lex: '莱克斯',
  Ludi: '卢迪',
  Exta: '埃克斯塔',
  Draco: '德拉科',
  Nuovo: '诺沃',
  Cerium: '铈',
  Hapke: '哈普克',
  Bode: '波德',
  Pallas: '帕拉斯',
  Thon: '索恩',
  Albedo: '反照率',
  Varro: '瓦罗',
  Gabii: '加比伊',
  Seimeni: '塞梅尼',
  Orovin: '奥罗温',
  Thebe: '忒贝',
  Amalthea: '阿马尔提亚',
  Io: '艾奥',
  Metis: '墨提斯',
  Callisto: '卡利斯托',
  Adrastea: '阿德剌斯忒亚',
  Carpo: '卡尔波',
  Themisto: '特米斯托',
  Ananke: '阿南刻',
  Elara: '厄拉若',
  Carme: '卡尔墨',
  Sinope: '西诺珀',
  Abaddon: '阿巴顿',
  Armaros: '阿玛洛斯',
  Morax: '摩拉斯',
  Orias: '奥里亚斯',
  Valefor: '瓦利弗',
  Paimon: '派蒙',
  Baal: '巴力',
  Shodruk: '肖德鲁克',
  Cholistan: '乔利斯坦',
  Larzac: '拉尔扎克',
  Ose: '奥斯',
  Zagan: '扎甘',
  Kokabiel: '科卡比尔',
  Mena: '梅纳',
  Naga: '纳迦',
  Hydron: '海德隆',
  Helene: '海伦',
  Rhea: '瑞亚',
  Titan: '泰坦',
  Dione: '狄俄涅',
  Janus: '雅努斯',
  Enceladus: '恩克拉多斯',
  Epimetheus: '厄毗米修斯',
  Telesto: '泰勒斯托',
  Calypso: '卡吕普索',
  Cassini: '卡西尼',
  Anthe: '安忒',
  Numa: '努马',
  Keeler: '基勒',
  Pandora: '潘多拉',
  Aegaeon: '艾盖翁',
  Phoebe: '福柏',
  Pallene: '帕勒涅',
  Tethys: '忒堤斯',
  Caliban: '卡利班',
  Umbriel: '乌姆布莱尔',
  Desdemona: '苔丝狄蒙娜',
  Prospero: '普洛斯彼罗',
  Stephano: '斯特凡诺',
  Miranda: '米兰达',
  Ophelia: '奥菲莉娅',
  Trinculo: '特林库罗',
  Mab: '马布',
  Bianca: '比安卡',
  Puck: '帕克',
  Rosalind: '罗莎琳德',
  Setebos: '塞特伯斯',
  Cordelia: '科迪莉亚',
  Cressida: '克瑞西达',
  Titania: '提泰妮娅',
  Oberon: '奥布朗',
  Sycorax: '西考拉克斯',
  Galatea: '加拉蒂亚',
  Despina: '德斯皮娜',
  Proteus: '普罗透斯',
  Larissa: '拉里萨',
  Naiad: '奈阿德',
  Thalassa: '萨拉萨',
  Neso: '涅索',
  Sao: '萨奥',
  Halimede: '哈利墨德',
  Laomedeia: '拉俄墨狄亚',
  Psamathe: '普萨玛忒',
  Triton: '特里同',
  Nereid: '涅瑞伊德',
  Yursa: '尤尔萨',
  Kelpie: '凯尔派',
  Oseidon: '奥塞冬',
  Acheron: '阿克戎',
  Nix: '尼克斯',
  Hydra: '许德拉',
  Charon: '卡戎',
  Cypress: '丝柏',
  OuterTerminus: '外端点',
  'Outer Terminus': '外端点',
  Hieracon: '希拉孔',
  Oceanum: '大洋',
  Regna: '雷尼亚',
  Hades: '哈迪斯',
  Cerberus: '刻耳柏洛斯',
  Palus: '帕鲁斯',
  Minthe: '明忒',
  Narcissus: '那喀索斯',
  Sechura: '塞丘拉',
  Xini: '西尼',
  Isos: '伊索斯',
  Brugia: '布鲁吉亚',
  Zabala: '扎巴拉',
  Naamah: '娜玛',
  Nimus: '尼姆斯',
  Akkad: '阿卡德',
  Sol: '索尔',
  Kala: '卡拉',
  Oestrus: '发情期',
  Acanth: '阿坎斯',
  Pseudocranis: '伪头骨',
  Assur: '阿舒尔',
  Cosis: '科西斯',
  Ixodes: '硬蜱',
  Medea: '美狄亚',
  Adaro: '阿达罗',
  Merrow: '梅洛',
  Rusalka: '鲁萨尔卡',
  Berehynia: '贝雷希尼亚',
  Selkie: '塞尔基',
  Charybdis: '卡律布狄斯',
  Yam: '雅姆',
  Yemaja: '耶玛雅',
  Vodyanoi: '沃佳诺伊',
  Kappa: '河童',
  Marid: '马里德',
  Amarna: '阿玛尔纳',
  Sangeru: '桑格鲁',
  Tycho: '第谷',
  Copernicus: '哥白尼',
  Plato: '柏拉图',
  Grimaldi: '格里马尔迪',
  Zeipel: '蔡佩尔',
  Pavlov: '巴甫洛夫',
  Apollo: '阿波罗',
  Yuvarium: '尤瓦里姆',
  Stöfler: '斯托夫勒',
  Stofler: '斯托夫勒',
  Ani: '阿尼',
  Teshub: '特舒布',
  Hepit: '赫皮特',
  Ukko: '乌科',
  Oxomoco: '奥克索莫科',
  Belenus: '贝勒努斯',
  Mot: '莫特',
  Aten: '阿顿',
  Marduk: '马尔杜克',
  Mithra: '密特拉',
  Cameria: '卡梅里亚',
  Stribog: '斯特里博格',
  Bebbin: '贝宾',
  Dakata: '达卡塔',
  Garus: '加鲁斯',
  Pago: '帕戈',
  Koro: '科罗',
  Nabuk: '纳布克',
  Taveuni: '塔韦乌尼',
  Tamu: '塔穆',
  Rotuma: '罗图马',
  Lakshmi: '拉克希米',

  // --- Archimedea deviations / risks / personal modifiers (keys + EN display names) ---
  UnpoweredCapsules: '寄生高塔',
  'Parasitic Towers': '寄生高塔',
  Quicksand: '牵连',
  Entanglement: '牵连',
  PointBlank: '短视弹药',
  'Myopic Munitions': '短视弹药',
  FragileNodes: '统一目标',
  'Unified Purpose': '统一目标',
  EMPBlackHole: '诱人奥康尼德',
  'Alluring Arcocanids': '诱人奥康尼德',
  Voidburst: '亡后涌浪',
  'Postmortal Surges': '亡后涌浪',
  Reinforcements: '协同前线',
  'Coordinated Front': '协同前线',
  AntiMaterialWeapons: '指挥型重型炮兵',
  'Commanding Culverins': '指挥型重型炮兵',
  Deflectors: '强化之敌',
  'Fortified Foes': '强化之敌',
  OverSensitive: '过度敏感',
  Hypersensitive: '过度敏感',
  Armorless: '破损护甲',
  'Fractured Armor': '破损护甲',
  Knifestep: '刀步综合症',
  'Knifestep Syndrome': '刀步综合症',
  Withering: '无法治疗',
  Untreatable: '无法治疗',
  ContaminationZone: '屏住呼吸',
  'Hold Your Breath': '屏住呼吸',
  ExplosiveSummer: '过量爆炸物',
  'Excessive Explosives': '过量爆炸物',
  EfervonFog: '浓雾',
  'Dense Fog': '浓雾',
  HighScalingLegacyte: '生长激素',
  'Growth Hormones': '生长激素',
  AcceleratedEnemies: '大胆冒险',
  'Bold Venture': '大胆冒险',
  TankReinforcements: '增援',
  MiasmiteHive: '瘴气螨群',
  'Miasmite Swarm': '瘴气螨群',
  ContactDamage: '次级创伤',
  'Secondary Wounds': '次级创伤',
  Starvation: '弹药亏空',
  'Ammo Deficit': '弹药亏空',
  Framecurse: '战甲诅咒综合症',
  'Framecurse syndrome': '战甲诅咒综合症',
  AbilityLockout: '无力',
  Powerless: '无力',
  AlchemicalShields: '炼金无敌',
  'Alchemical Invulnerability': '炼金无敌',
  AntiGuard: '掉落护卫',
  'Dropped Guard': '掉落护卫',
  ArcadeAutomata: '街机自动机',
  'Arcade Automate': '街机自动机',
  ArtilleryBeacons: '炮兵信标',
  BalloonFest: '气球盛宴',
  Balloonfest: '气球盛宴',
  ChemicalNoise: '噪音抑制',
  'Noise Suppression': '噪音抑制',
  CompetitionSpillover: '竞争连胜',
  'Competitive Streak': '竞争连胜',
  DecayingFlesh: '永久伤害',
  'Permanent Injury': '永久伤害',
  DisruptiveSounds: '吸血鬼摇滚',
  'Vampire Rock': '吸血鬼摇滚',
  DoubleTrouble: '双重麻烦',
  DoubleTroubleLegacyte: '有丝分裂',
  Mitosis: '有丝分裂',
  DrainingResiduals: '恶魔契约',
  "Devil's Bargain": '恶魔契约',
  DullBlades: '钝刃',
  EnergyStarved: '能量枯竭',
  Exhaustion: '能量枯竭',
  'Energy Exhaustion': '能量枯竭',
  EscalateImmediately: '补给崩溃',
  'Cache Crash': '补给崩溃',
  EximusGrenadiers: '卓越者元素瓶',
  'Eximus Amphors': '卓越者元素瓶',
  ExplosiveCrawlers: '爆炸潜能',
  'Explosive Potential': '爆炸潜能',
  ExplosiveEnergy: '瘴气捣碎',
  'Miasmite Mash': '瘴气捣碎',
  FallFog: '浓雾坠落',
  'Foggy Fall': '浓雾坠落',
  FortifiedFoes: '密封护甲',
  'Sealed Armor': '密封护甲',
  Gearless: '装备禁运',
  'Gear Embargo': '装备禁运',
  GestatingTumors: '孢子发生',
  Sporogenesis: '孢子发生',
  GrowingIncursion: '裂隙连锁',
  'Fissure Cascade': '裂隙连锁',
  HarshWords: '带刺钥符',
  'Barbed Glyphs': '带刺钥符',
  HeavyWarfare: '重型战争',
  HostileOvergrowth: '它还活着',
  "It's Alive": '它还活着',
  HostileSecurity: '侵蚀感官',
  'Eroding Senses': '侵蚀感官',
  InfectedTechrot: '腐化血肉',
  'Corrupted Flesh': '腐化血肉',
  InfiniteTide: '无情浪潮',
  'Relentless Tide': '无情浪潮',
  JadeSpring: 'Jade 精灵',
  'Jade Spirits': 'Jade 精灵',
  LostInTranslation: '钥符膨胀',
  'Glyph Inflation': '钥符膨胀',
  MurmurIncursion: '墙之外',
  'Beyond The Wall': '墙之外',
  MutatedEnemies: '平行进化',
  'Parallel Evolution': '平行进化',
  NecramechActivation: '殁世机甲涌入',
  'Necramech Influx': '殁世机甲涌入',
  OperatorLockout: '转生失真',
  'Transference Distortion': '转生失真',
  RegeneratingEnemies: '敌军复生',
  'Hostile Regeneration': '敌军复生',
  ShieldDelay: '迟钝护盾',
  'Lethargic Shields': '迟钝护盾',
  ShieldedFoes: '强化好战',
  'Bolstered Belligerents': '强化好战',
  StickyFingers: '暴食贪囤',
  'Engorged Gruzzlings': '暴食贪囤',
  TankStrongArmor: '热离子镀层',
  'Thermian Plating': '热离子镀层',
  TankSuperToxic: '毒素坦克',
  'Toxic Tank': '毒素坦克',
  TechrotConjunction: '堆叠',
  'Pile-On': '堆叠',
  TimeDilation: '缩短技能',
  'Abbreviated Abilities': '缩短技能',
  Undersupplied: '补给不足',
  VoidAberration: '吸血利米努斯',
  'Vampyric Liminus': '吸血利米努斯',
  VoidEnergyOverload: '技能过载',
  'Ability Overload': '技能过载',
  VolatileGrenades: '危险货物',
  'Hazardous Goods': '危险货物',
  WinterFrost: '厚冰',
  'Thick Ice': '厚冰',
  'Life Support Towers only activate after 20 enemies have been killed within a 15m radius of them.':
    '只有在半径15米内击杀20名敌人后，维生装置塔才会激活。',
  'Allies within 4m of slain enemies endure reduced Movement Speed and Parkour Velocity.':
    '被击杀敌人4米范围内的友军移动速度与跑酷速度降低。',
  'Enemies will only take damage if a player is within 15m of them.':
    '玩家需在敌人15米内才能对其造成伤害。',
  'Enemies can target and destroy Conduits.': '敌人可以瞄准并摧毁导管。',
  'As Rogue Arcocanids charge attacks, they pull Warframes towards them.':
    '失控奥康尼德蓄力攻击时会把战甲拉向自身。',
  'Slain enemies burts with Void energy.': '被击杀的敌人会爆发虚空能量。',
  'Eximus units support The Fragmented Tide and its final form.':
    '卓越者单位会支援碎片浪潮及其最终形态。',
  'Rogue Culverins equip weapons that deal 5x Damage to Overguard and Necramechs.':
    '失控重型炮兵的武器对超宏防护与殁世机甲造成5倍伤害。',
  'Guardian Eximus units may be encountered, including Guardian Eximus Necramechs.':
    '可能遭遇守护者卓越者，包括守护者卓越者殁世机甲。',
  'Duration of negative Status Effects is tripled': '负面状态效果持续时间变为三倍',
  'Casting an ability reduces armor by 10% for 10s.': '施放技能会使护甲降低10%，持续10秒。',
  'Lose 2 Health when moving. Jumping pauses the effect.': '移动时每秒失去2点生命值；跳跃可暂停该效果。',
  'Pickups do not heal, and Health Orbs cannot be picked up.': '拾取物无法治疗，且无法拾取生命球。',
  'The entire region deals Toxin damage over time, increasing the longer players remain.':
    '整个区域持续造成毒素伤害，停留越久伤害越高。',
  'All supply crates are replaced with explosive barrels.': '所有补给箱被替换为爆炸桶。',
  'Efervon gas blankets the level. Enemies may drop filters that can provide a temporary reprieve.':
    '艾弗温毒气笼罩关卡；敌人可能掉落可暂时缓解的过滤器。',
  'Legacytes are more powerful with each generation but take longer to escape.':
    '遗产体每一代都更强，但逃离耗时更长。',
  'Enemies deal -15% Damage and take +15% Damage but gain +15% Movement Speed, Attack Speed, and Fire Rate.':
    '敌人造成-15%伤害、受到+15%伤害，但移动/攻击/射速+15%。',
  'Reinforcements will arrive during the fight.': '战斗期间将有增援抵达。',
  'Techrot Miasmites swarm out of the shadows throught the mission.':
    '整场任务中科技腐化物瘴气螨会从阴影中涌出。',
  'Gain 1 Puncture Status Effect every time you take damage.': '每次受到伤害获得1层穿刺状态。',
  'Ammo restored by drops and gear is reduced 75%.': '通过掉落与道具恢复的弹药减少75%。',
  'Activating an Ability inflicts 50 damage upon you.': '激活技能会对自身造成50点伤害。',

  // --- Nightwave challenge samples ---
  Reactor: '反应堆',
  'Kill 150 Enemies with a Radiation Damage': '使用辐射伤害击杀150名敌人',

};

/** Merged lookup: overrides win over generated. */
const MAP: Record<string, string> = { ...GENERATED_ZH, ...OVERRIDES };

/** Lowercase index for case-insensitive lookup */
const LOWER_INDEX = new Map<string, string>();
/** Reverse zh → en (first wins; overrides preferred via rebuild order) */
const REVERSE = new Map<string, string>();

function rebuildIndexes(): void {
  LOWER_INDEX.clear();
  REVERSE.clear();
  for (const [en, zh] of Object.entries(MAP)) {
    LOWER_INDEX.set(en.toLowerCase(), zh);
    if (!REVERSE.has(zh)) REVERSE.set(zh, en);
    const zhLower = zh.toLowerCase();
    if (!REVERSE.has(zhLower)) REVERSE.set(zhLower, en);
  }
}
rebuildIndexes();

function stripParens(s: string): string {
  return s.replace(/\s*[（(][^）)]*[）)]\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Translate an English (or mixed) label to 简体中文.
 * Lookup order: exact → case-insensitive → strip parentheticals → fuzzy contains (short keys).
 */
export function zh(text: string | undefined | null): string {
  if (!text) return '';
  const raw = text.trim();
  if (!raw) return '';

  if (MAP[raw]) return MAP[raw];
  const lower = raw.toLowerCase();
  if (LOWER_INDEX.has(lower)) return LOWER_INDEX.get(lower)!;

  const stripped = stripParens(raw);
  if (stripped && stripped !== raw) {
    if (MAP[stripped]) return MAP[stripped];
    const sl = stripped.toLowerCase();
    if (LOWER_INDEX.has(sl)) return LOWER_INDEX.get(sl)!;
  }

  // Fuzzy: if a short dictionary key is contained in the text (prefer longer keys)
  let bestKey = '';
  let bestZh = '';
  for (const [en, z] of Object.entries(OVERRIDES)) {
    if (en.length < 4) continue;
    if (en.length > bestKey.length && lower.includes(en.toLowerCase())) {
      bestKey = en;
      bestZh = z;
    }
  }
  if (bestZh) {
    // Replace the matched segment
    const re = new RegExp(bestKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return raw.replace(re, bestZh);
  }

  return raw;
}

/**
 * Translate a mission node label. Handles "Name (Planet)" forms.
 */
export function zhNode(node: string | undefined | null): string {
  if (!node) return '?';
  const raw = node.trim();
  if (!raw) return '?';

  // Prefer part-wise translation so proper-name overrides beat generated "Name (Planet)" rows
  const m = raw.match(/^(.+?)\s*[（(](.+)[）)]\s*$/);
  if (m) {
    const name = m[1].trim();
    const planet = m[2].trim();
    const zhName =
      MAP[name] || LOWER_INDEX.get(name.toLowerCase()) || name;
    const zhPlanet =
      MAP[planet] || LOWER_INDEX.get(planet.toLowerCase()) || planet;
    if (zhName !== name || zhPlanet !== planet) {
      return `${zhName}（${zhPlanet}）`;
    }
  }

  if (MAP[raw]) return MAP[raw];
  const lower = raw.toLowerCase();
  if (LOWER_INDEX.has(lower)) return LOWER_INDEX.get(lower)!;

  if (/^SolNode\d+$/i.test(raw)) return raw;

  return zh(raw) || raw;
}

/**
 * Bidirectional lexicon lookup for the 翻译 command.
 * Returns lines like "Extermination → 歼灭" or "歼灭 → Extermination".
 */
export function lookupBidirectional(keyword: string, limit = 12): string[] {
  const kw = keyword.trim();
  if (!kw) return [];
  const kwLower = kw.toLowerCase();
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (en: string, z: string, dir: string) => {
    const key = `${en}::${z}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(`${en} → ${z}${dir}`);
  };

  // Exact en→zh
  if (MAP[kw]) add(kw, MAP[kw], '');
  else if (LOWER_INDEX.has(kwLower)) {
    const z = LOWER_INDEX.get(kwLower)!;
    // recover original casing key if possible
    const orig = Object.keys(MAP).find((k) => k.toLowerCase() === kwLower) || kw;
    add(orig, z, '');
  }

  // Exact zh→en
  if (REVERSE.has(kw)) add(REVERSE.get(kw)!, kw, '（逆）');
  else if (REVERSE.has(kwLower)) add(REVERSE.get(kwLower)!, kw, '（逆）');

  // Partial contains
  for (const [en, z] of Object.entries(MAP)) {
    if (out.length >= limit) break;
    if (en.toLowerCase().includes(kwLower) || z.includes(kw)) {
      add(en, z, '');
    }
  }

  return out.slice(0, limit);
}

/** Approximate entry counts for diagnostics / tests */
export function lexiconStats(): { overrides: number; generated: number; merged: number } {
  return {
    overrides: Object.keys(OVERRIDES).length,
    generated: Object.keys(GENERATED_ZH).length,
    merged: Object.keys(MAP).length,
  };
}
