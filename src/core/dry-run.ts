/**
 * Dry-run: fetch live API and print Chinese summaries (no adapters).
 */
import { loadConfig } from '../config.js';
import {
  fetchArbitration,
  fetchCetusCycle,
  fetchEarthCycle,
  fetchFissures,
  fetchSortie,
  fetchVallisCycle,
  fetchCambionCycle,
  fetchZarimanCycle,
} from './warframestat.js';
import { filterFissures, formatArbitration, formatCycle, formatFissures, formatSortie } from './formatters.js';

async function main(): Promise<void> {
  loadConfig();
  console.log('=== Warframe Bot Dry-Run（实时 API）===\n');

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

  console.log('\n=== Dry-Run 完成 ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
