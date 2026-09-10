import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATIC_IMAGES,
  factionImage,
  imagesForArchonHunt,
  imagesForCycle,
  imagesForDailyDeals,
  imagesForFissures,
  imagesForInvasions,
  imagesForSortie,
  imagesForVoidTrader,
  itemImageFromName,
  resolveRewardImage,
  wikiImage,
} from '../src/core/images.js';
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

  it('maps factions and archon bosses', () => {
    assert.equal(factionImage('Grineer'), STATIC_IMAGES.grineer);
    assert.equal(factionImage('Corpus'), STATIC_IMAGES.corpus);
    assert.equal(factionImage('Infestation'), STATIC_IMAGES.infested);
    const amar = imagesForArchonHunt({ boss: 'Archon Amar', faction: 'Narmer' });
    assert.ok(amar.includes(STATIC_IMAGES.archonAmar));
    const nira = imagesForArchonHunt({ boss: 'Archon Nira' });
    assert.ok(nira.includes(STATIC_IMAGES.archonNira));
  });

  it('sortie / fissure / trader / darvo / cycle thematic images', () => {
    assert.ok(imagesForSortie({ faction: 'Grineer', variants: [{ node: 'a' }] }).length >= 1);
    assert.deepEqual(imagesForFissures(), [STATIC_IMAGES.voidFissure]);
    assert.deepEqual(imagesForVoidTrader(null), [STATIC_IMAGES.voidTrader]);
    const deals = imagesForDailyDeals([{ item: 'Orokin Catalyst' }]);
    assert.ok(deals.length >= 1);
    assert.ok(deals.every((u) => u.startsWith('https://')));
    assert.deepEqual(imagesForCycle('cetus'), [STATIC_IMAGES.plains]);
    assert.deepEqual(imagesForCycle('vallis'), [STATIC_IMAGES.vallis]);
    assert.deepEqual(imagesForCycle('zariman'), [STATIC_IMAGES.voidFissure]);
  });

  it('invasion rewards prefer mapped wiki over broken warframestat img CDN', () => {
    const imgs = imagesForInvasions([
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
    assert.ok(imgs.length >= 1);
    assert.ok(imgs.every((u) => u.startsWith('https://')));
    assert.ok(!imgs.some((u) => /cdn\.warframestat\.us\/img\//.test(u)));
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
