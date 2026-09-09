#!/usr/bin/env node
/**
 * Fetch / refresh Chinese lexicon fragments and write src/core/locale-zh.generated.ts
 *
 * Sources (public HTTP, no huge git clones):
 * 1. https://api.warframestat.us/solNodes (+ ?language=zh) — node & mission type pairs
 * 2. Optional: Richasy WFA_Lexicon WF_Dict.json when FETCH_WFA=1
 *    (community dict; no SPDX license — opt-in only)
 *
 * Hand-maintained overrides in locale-zh.ts always win at runtime.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/core/locale-zh.generated.ts');

/** Minimal Traditional → Simplified for Warframe zh API strings */
const T2S = {
  獲: '获', 動: '动', 禦: '御', 殲: '歼', 滅: '灭', 間: '间', 諜: '谍',
  破: '破', 壞: '坏', 攔: '拦', 截: '截', 刺: '刺', 殺: '杀', 競: '竞',
  技: '技', 場: '场', 強: '强', 襲: '袭', 追: '追', 擊: '击', 儀: '仪',
  帶: '带', 斷: '断', 奧: '奥', 菲: '菲', 斯: '斯', 穀: '谷', 神: '神',
  星: '星', 鬩: '阋', 賽: '赛', 德: '德', 娜: '娜', 歐: '欧', 羅: '罗',
  巴: '巴', 衛: '卫', 據: '据', 點: '点', 節: '节', 點: '点', 轉: '转',
  換: '换', 湧: '涌', 復: '复', 資源: '资源', 類: '类', 餘: '余',
  餘: '余', 餘: '余', 體: '体', 關: '关', 門: '门', 開: '开', 閉: '闭',
  與: '与', 為: '为', 這: '这', 還: '还', 來: '来', 時: '时', 間: '间',
  個: '个', 們: '们', 說: '说', 對: '对', 會: '会', 後: '后', 從: '从',
  國: '国', 東: '东', 車: '车', 電: '电', 語: '语', 請: '请', 謝: '谢',
  麼: '么', 嗎: '吗', 裡: '里', 無: '无', 長: '长', 務: '务', 實: '实',
  現: '现', 發: '发', 經: '经', 總: '总', 産: '产', 業: '业', 區: '区',
  報: '报', 應: '应', 當: '当', 機: '机', 構: '构', 標: '标', 準: '准',
  處: '处', 號: '号', 網: '网', 頁: '页', 訊: '讯', 態: '态', 勢: '势',
  傳: '传', 統: '统', 際: '际', 壓: '压', 縮: '缩', 擴: '扩', 戰: '战',
  鬥: '斗', 傷: '伤', 害: '害', 護: '护', 裝: '装', 備: '备', 槍: '枪',
  彈: '弹', 劍: '剑', 銳: '锐', 鋒: '锋', 險: '险', 難: '难', 層: '层',
  級: '级', 異: '异', 變: '变', 態: '态', 環: '环', 境: '境', 危: '危',
  害: '害', 霧: '雾', 濃: '浓', 凍: '冻', 結: '结', 輻: '辐', 射: '射',
  磁: '磁', 力: '力', 異: '异', 常: '常', 強: '强', 化: '化', 減: '减',
  少: '少', 削: '削', 弱: '弱', 敵: '敌', 人: '人', 元: '元', 素: '素',
  傷: '伤', 害: '害', 優: '优', 卓: '卓', 越: '越', 者: '者',
};

function toSimplified(s) {
  if (!s) return s;
  // phrase-level first
  let out = s
    .replace(/比邻星域/g, '')
    .replace(/捕獲/g, '捕获')
    .replace(/移動防禦/g, '机动防御')
    .replace(/移動/g, '移动')
    .replace(/防禦/g, '防御')
    .replace(/殲滅/g, '歼灭')
    .replace(/間諜/g, '间谍')
    .replace(/破壞/g, '破坏')
    .replace(/攔截/g, '拦截')
    .replace(/刺殺/g, '刺杀')
    .replace(/競技場/g, '竞技场')
    .replace(/強襲/g, '强袭')
    .replace(/追擊/g, '追击')
    .replace(/武形密儀/g, '武形密仪')
    .replace(/黑暗地帶/g, '黑暗地带')
    .replace(/中斷/g, '中断')
    .replace(/奧菲斯/g, '奥菲斯')
    .replace(/穀神星/g, '谷神星')
    .replace(/鬩神星/g, '阋神星')
    .replace(/賽德娜/g, '赛德娜')
    .replace(/歐羅巴/g, '欧罗巴')
    .replace(/火衛一/g, '火卫一')
    .replace(/據點/g, '据点')
    .replace(/虛空/g, '虚空')
    .replace(/資源/g, '资源')
    .replace(/轉換/g, '转换')
    .replace(/覆湧/g, '覆涌')
    .replace(/洪流/g, '洪流');
  out = [...out].map((ch) => T2S[ch] || ch).join('');
  return out.trim();
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

function put(map, en, zh) {
  if (!en || !zh || en === zh) return;
  const e = String(en).trim();
  const z = toSimplified(String(zh).trim());
  if (!e || !z || e === z) return;
  if (!map[e]) map[e] = z;
}

async function main() {
  const map = Object.create(null);
  let nodeCount = 0;
  let missionCount = 0;
  let wfaCount = 0;

  console.log('Fetching solNodes (en + zh)...');
  const [enNodes, zhNodes] = await Promise.all([
    fetchJson('https://api.warframestat.us/solNodes'),
    fetchJson('https://api.warframestat.us/solNodes?language=zh'),
  ]);

  for (const key of Object.keys(enNodes)) {
    const en = enNodes[key];
    const zh = zhNodes[key];
    if (!en || !zh) continue;
    if (en.value && zh.value && !String(en.value).startsWith('SolNode')) {
      const before = Object.keys(map).length;
      put(map, en.value, zh.value);
      if (Object.keys(map).length > before) nodeCount++;
      // bare node name + planet separately
      const m = String(en.value).match(/^(.+?)\s*\((.+)\)$/);
      const mz = String(zh.value).match(/^(.+?)\s*\((.+)\)$/);
      if (m && mz) {
        put(map, m[2], mz[2]); // planet
        // If node proper name got a Chinese form somehow
        if (m[1] !== mz[1]) put(map, m[1], mz[1]);
      }
    }
    if (en.type && zh.type) {
      const before = Object.keys(map).length;
      put(map, en.type, zh.type);
      if (Object.keys(map).length > before) missionCount++;
    }
    if (en.enemy && zh.enemy) put(map, en.enemy, zh.enemy);
  }

  if (process.env.FETCH_WFA === '1') {
    console.log('FETCH_WFA=1 — merging Richasy WFA_Lexicon (opt-in)...');
    try {
      const wfa = await fetchJson(
        'https://raw.githubusercontent.com/Richasy/WFA_Lexicon/WFA5/WF_Dict.json',
      );
      for (const row of wfa) {
        if (!row?.en || !row?.zh) continue;
        // Prefer short glossary-like entries
        if (String(row.en).length > 60 || String(row.zh).length > 40) continue;
        const before = map[row.en];
        put(map, row.en, row.zh);
        if (!before && map[row.en]) wfaCount++;
      }
    } catch (err) {
      console.warn('WFA fetch failed:', err.message || err);
    }
  }

  const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  const body = entries
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join('\n');

  const file = `/* eslint-disable */
/**
 * AUTO-GENERATED by scripts/fetch-zh-lexicon.mjs — do not edit by hand.
 * Re-run: npm run fetch-lexicon
 * Generated: ${new Date().toISOString()}
 * Entries: ${entries.length} (solNodes nodes≈${nodeCount}, missions≈${missionCount}, wfa≈${wfaCount})
 */
export const GENERATED_ZH: Record<string, string> = {
${body}
};
`;

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, file, 'utf8');
  console.log(`Wrote ${OUT} with ${entries.length} entries`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
