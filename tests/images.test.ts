import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  STATIC_IMAGES,
  THEME_FILES,
  factionImage,
  imagesForArchonHunt,
  imagesForCycle,
  imagesForDailyDeals,
  imagesForFissures,
  imagesForInvasions,
  imagesForSortie,
  imagesForVoidTrader,
  itemImageFromName,
  listThemeSourceUrls,
  resolveRewardImage,
  wikiImage,
} from '../src/core/images.js';
import { resolveLocalAssetPath } from '../src/core/cos.js';
import { replyImages, replyText, toOneBotMessage } from '../src/commands/types.js';
import { formatPushEvent } from '../src/core/formatters.js';
import { PUSH_TOPICS, isPushTopic } from '../src/push/db.js';

describe('images helper', () => {
  it('wikiImage builds HTTPS Special:FilePath URLs', () => {
    const u = wikiImage('Void_Fissure.png');
    assert.match(u, /^https:\/\//);
    assert.match(u, /Special:FilePath/);
    assert.match(u, /Void_Fissure/);
  });

  it('bundles THEME_FILES under assets/img as valid PNGs', () => {
    for (const file of Object.values(THEME_FILES)) {
      const p = resolveLocalAssetPath(file);
      assert.ok(p, `missing asset for ${file}`);
      assert.ok(existsSync(p!), p);
      // Also reachable via cwd-relative path used in Docker
      assert.ok(existsSync(join(process.cwd(), 'assets', 'img', file)));
    }
    const themes = listThemeSourceUrls();
    assert.equal(themes.length, Object.keys(THEME_FILES).length);
  });

  it('maps factions and archon bosses (COS off → no remote Fandom URLs)', async () => {
    assert.equal(factionImage('Grineer'), STATIC_IMAGES.grineer);
    assert.equal(factionImage('Corpus'), STATIC_IMAGES.corpus);
    assert.equal(factionImage('Infestation'), STATIC_IMAGES.infested);
    // Without COS credentials, imagesFor* must not hand Fandom URLs to QQ
    assert.deepEqual(await imagesForArchonHunt({ boss: 'Archon Amar', faction: 'Narmer' }), []);
    assert.deepEqual(await imagesForArchonHunt({ boss: 'Archon Nira' }), []);
  });

  it('sortie / fissure / trader / darvo / cycle return [] when COS disabled', async () => {
    assert.deepEqual(await imagesForSortie({ faction: 'Grineer', variants: [{ node: 'a' }] }), []);
    assert.deepEqual(await imagesForFissures(), []);
    assert.deepEqual(await imagesForVoidTrader(null), []);
    assert.deepEqual(await imagesForDailyDeals([{ item: 'Orokin Catalyst' }]), []);
    assert.deepEqual(await imagesForCycle('cetus'), []);
    assert.deepEqual(await imagesForCycle('vallis'), []);
    assert.deepEqual(await imagesForCycle('zariman'), []);
  });

  it('invasion rewards prefer mapped wiki over broken warframestat img CDN (COS off → [])', async () => {
    const imgs = await imagesForInvasions([
      {
        completed: false,
        attackingFaction: 'Corpus',
        defendingFaction: 'Grineer',
        attackerReward: {
          asString: '电磁力场装置×3',
          thumbnail: 'https://cdn.warframestat.us/img/fieldron.png',
        },
        defenderReward: {
          asString: 'Detonite Injector×3',
          thumbnail: 'https://cdn.warframestat.us/img/detonite-injector.png',
        },
      },
    ]);
    assert.deepEqual(imgs, []);
    // Mapping helpers still resolve to wiki (for COS key / sync), not warframestat CDN
    const mapped = resolveRewardImage({
      asString: '电磁力场装置×3',
      thumbnail: 'https://cdn.warframestat.us/img/fieldron.png',
    });
    assert.ok(mapped);
    assert.ok(!/cdn\.warframestat\.us\/img\//.test(mapped!));
  });

  it('resolveRewardImage / itemImageFromName', () => {
    assert.ok(itemImageFromName('Fieldron'));
    assert.ok(resolveRewardImage({ asString: 'Fieldron×3' }));
    assert.equal(
      resolveRewardImage({ thumbnail: 'https://example.com/ok.png' }),
      'https://example.com/ok.png',
    );
  });
});

describe('ReplyPayload helpers', () => {
  it('toOneBotMessage prefixes CQ image codes', () => {
    const msg = toOneBotMessage({
      text: 'hello',
      images: ['https://example.com/a.png', 'https://example.com/b.png'],
    });
    assert.match(msg, /^\[CQ:image,url=https:\/\/example.com\/a\.png\]/);
    assert.match(msg, /hello$/);
    assert.equal(replyText('plain'), 'plain');
    assert.deepEqual(replyImages('plain'), []);
  });
});

describe('events push', () => {
  it('PUSH_TOPICS includes events and worldstate', () => {
    assert.ok(isPushTopic('events'));
    assert.ok(isPushTopic('worldstate'));
    assert.ok(PUSH_TOPICS.includes('events'));
    assert.ok(PUSH_TOPICS.includes('worldstate'));
  });

  it('formatPushEvent Chinese summary', () => {
    const text = formatPushEvent({
      id: 'e1',
      description: 'Dog Days',
      node: 'Earth',
      health: 42,
      expiry: new Date(Date.now() + 3600_000).toISOString(),
    });
    assert.match(text, /特殊事件/);
    assert.match(text, /Dog Days/);
    assert.match(text, /42%/);
    assert.doesNotMatch(text, /<[^>]+>/);
  });
});
