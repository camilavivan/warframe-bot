/**
 * Dry-run: fetch live API and print Chinese summaries (no adapters).
 */
import { loadConfig } from '../config.js';
import {
  fetchArbitration,
  fetchArchimedeas,
  fetchArchonHunt,
  fetchCalendar,
  fetchCetusCycle,
  fetchEarthCycle,
  fetchFissures,
  fetchDuviriCycle,
  fetchNightwave,
  fetchSortie,
  fetchVallisCycle,
  fetchCambionCycle,
  fetchVoidTrader,
  fetchZarimanCycle,
} from './warframestat.js';
import {
  filterFissures,
  formatArbitration,
  formatArchimedeas,
  formatArchonHunt,
  formatCalendar,
  formatCycle,
  formatDuviri,
  formatFissures,
  formatNightwave,
  formatSortie,
  formatVoidTrader,
} from './formatters.js';

async function main(): Promise<void> {
  const cfg = loadConfig();
  const src = cfg.api.mock ? 'mock' : cfg.api.source;
  const hint =
    src === 'de'
      ? `DE CDN (${cfg.api.deWorldStateUrl})`
      : src === 'mock'
        ? 'mock fixture'
        : `warframestat (${cfg.api.baseUrl})`;
  console.log(`=== Warframe Bot Dry-Run（source=${src} · ${hint}）===\n`);

  const sortie = await fetchSortie();
  console.log(formatSortie(sortie));
  console.log('');

  try {
    const arb = await fetchArbitration();
    console.log(formatArbitration(arb));
  } catch (e) {
    console.log('【仲裁】获取失败：', (e as Error).message);
  }
  console.log('');

  const fissures = await fetchFissures();
  console.log(formatFissures(filterFissures(fissures, { hard: false, storm: false }), '裂缝'));
  console.log('');
  console.log(formatFissures(filterFissures(fissures, { hard: true }), '钢铁裂缝'));
  console.log('');
  console.log(formatFissures(filterFissures(fissures, { storm: true }), '虚空风暴'));
  console.log('');

  console.log(formatCycle(await fetchCetusCycle(), '平原（希图斯）'));
  console.log('');
  console.log(formatCycle(await fetchEarthCycle(), '地球'));
  console.log('');
  console.log(formatCycle(await fetchVallisCycle(), '金星（奥布山谷）'));
  console.log('');
  console.log(formatCycle(await fetchCambionCycle(), '火卫二（魔胎之穴）'));
  console.log('');
  try {
    console.log(formatCycle(await fetchZarimanCycle(), '扎里曼'));
  } catch (e) {
    console.log('【扎里曼】获取失败：', (e as Error).message);
  }
  console.log('');

  try {
    console.log(formatCalendar(await fetchCalendar()));
  } catch (e) {
    console.log('【日历】获取失败：', (e as Error).message);
  }
  console.log('');

  try {
    console.log(formatArchimedeas(await fetchArchimedeas()));
  } catch (e) {
    console.log('【深层研习】获取失败：', (e as Error).message);
  }
  console.log('');

  try {
    console.log(formatDuviri(await fetchDuviriCycle()));
  } catch (e) {
    console.log('【双衍王境】获取失败：', (e as Error).message);
  }
  console.log('');

  try {
    console.log(formatArchonHunt(await fetchArchonHunt()));
  } catch (e) {
    console.log('【猎杀】获取失败：', (e as Error).message);
  }
  console.log('');

  try {
    console.log(formatVoidTrader(await fetchVoidTrader()));
  } catch (e) {
    console.log('【奸商】获取失败：', (e as Error).message);
  }
  console.log('');

  try {
    console.log(formatNightwave(await fetchNightwave()));
  } catch (e) {
    console.log('【电波】获取失败：', (e as Error).message);
  }

  console.log('\n=== Dry-Run 完成 ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
