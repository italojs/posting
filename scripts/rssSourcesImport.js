#!/usr/bin/env node
/**
 * Standalone script to register/update RSS sources in the `rss_sources` collection.
 * - Does not depend on Meteor.
 * - Maintains the same upsert logic used in the internal service (upsert by URL).
 * - Everything in a single file, including the RSS list.
 *
 * Usage:
 *  1. Install dependencies (once):
 *     npm install mongodb rss-parser
 *  2. Set the MONGO_URL environment variable (if needed):
 *     export MONGO_URL="mongodb://localhost:27017/meteor"
 *  3. Run:
 *     node scripts/rssSourcesImport.js
 *
 * Optional flags/variables:
 *  --no-fetch-title   Don't try to fetch the feed to discover title (uses provided "name" or the URL itself)
 *  CONCURRENCY=5      Adjusts how many simultaneous feed requests (default 4)
 *  DRY_RUN=1          Only shows what it would do, without saving to database
 *  ENABLE_ALL=0       If you want to keep enabled=false when specified (by default forces enabled=true unless explicitly false in the list)
 *
 * Output: summary of how many were inserted, updated, ignored, errors.
 */

const { MongoClient } = require('mongodb');
const Parser = require('rss-parser');
const parser = new Parser();

// =============================
// RSS LIST (edit as needed)
// category: use existing values in your system (e.g.: technology, business, science, sports, entertainment, general)
// enabled: if you want to disable any, set to false
// name can be omitted; if omitted and title fetching is enabled, will try to use the feed title
// =============================
const RSS_SOURCES = [
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', name: 'NYTimes Technology', category: 'technology' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', name: 'Ars Technica', category: 'technology' },
  { url: 'https://feeds.feedburner.com/TechCrunch/', name: 'TechCrunch', category: 'technology' },
  { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', category: 'technology' },
  { url: 'https://www.wired.com/feed/category/business/latest/rss', name: 'Wired Business', category: 'business' },
  { url: 'https://www.wired.com/feed/category/science/latest/rss', name: 'Wired Science', category: 'science' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World', category: 'general' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', name: 'BBC Technology', category: 'technology' },
  { url: 'https://www.reutersagency.com/feed/?best-topics=technology', name: 'Reuters Technology', category: 'technology' },
  { url: 'https://www.reutersagency.com/feed/?best-topics=business-finance', name: 'Reuters Business', category: 'business' },
  // Example with omitted name (will be fetched from feed):
  { url: 'https://www.sciencedaily.com/rss/top/science.xml', category: 'science' },
  
  // New suggested feeds:
  { url: 'https://feeds.feedburner.com/Mashable', name: 'Mashable', category: 'technology' },
  { url: 'https://www.bleepingcomputer.com/feed/', name: 'Bleeping Computers', category: 'technology' },
  { url: 'https://hacker-news.firebaseio.com/topstories.json', name: 'Hacker News (Top)', category: 'technology' },
  { url: 'https://feeds.hbr.org/harvardbusiness', name: 'Harvard Business Review', category: 'business' },
  { url: 'https://www.economist.com/latest/rss.xml', name: 'The Economist', category: 'business' },
  { url: 'https://www.forbes.com/business/feed/', name: 'Forbes Business', category: 'business' },
  { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', name: 'NASA Breaking News', category: 'science' },
  { url: 'https://www.nature.com/nature.rss', name: 'Nature', category: 'science' },
  { url: 'https://www.scientificamerican.com/feed/', name: 'Scientific American', category: 'science' },
  { url: 'https://feeds.npr.org/1001/rss.xml', name: 'NPR News', category: 'general' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera (Global)', category: 'general' },

  // Brazilian feeds
  { url: 'https://tecnoblog.net/feed', name: 'Tecnoblog', category: 'technology' },
  { url: 'https://canaltech.com.br/rss/', name: 'Canaltech', category: 'technology' },
  { url: 'https://tudocelular.com/feed', name: 'Tudo Celular', category: 'technology' },
  { url: 'https://macmagazine.com.br/feed/', name: 'MacMagazine', category: 'technology' },
  { url: 'https://www.infomoney.com.br/feed/rss/', name: 'InfoMoney', category: 'business' },
  { url: 'https://www.inovacaotecnologica.com.br/boletim/rss.xml', name: 'Inovação Tecnológica', category: 'science' },

  // Spanish feeds
  { url: 'https://www.elpais.com/rss/tags/ultimas-noticias.xml', name: 'El País (Espanha)', category: 'general' },
  { url: 'https://www.clarin.com/rss/tecnologia/', name: 'Clarín Tech (Argentina)', category: 'technology' },
  { url: 'https://www.eleconomista.es/rss/rss_ultima.php', name: 'El Economista (Espanha)', category: 'business' },
  { url: 'https://www.bbc.com/mundo/index.xml', name: 'BBC Mundo', category: 'general' },
  { url: 'https://www.xataka.com/index.xml', name: 'Xataka (Espanha)', category: 'technology' },
  { url: 'https://www.microsiervos.com/feed/', name: 'Microsiervos', category: 'science' }, 
  { url: 'https://www.muyinteresante.es/rss', name: 'Muy Interesante', category: 'science' },
];

// =============================
// Config
// =============================
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:3001/meteor';
const DB_NAME_FROM_URL = (() => {
  try {
    const dbName = new URL(MONGO_URL.replace('mongodb://', 'http://')).pathname.replace(/\//g, '') || 'meteor';
    return dbName;
  } catch { return 'meteor'; }
})();
const COLLECTION_NAME = 'rss_sources';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '4', 10);
const DRY_RUN = /^1|true$/i.test(process.env.DRY_RUN || '');
const ENABLE_ALL = !/^0|false$/i.test(process.env.ENABLE_ALL || '');
const FETCH_TITLE = !process.argv.includes('--no-fetch-title');

// =============================
// Utilities
// =============================
function chunkArray(arr, size) {
  const out = []; let i = 0;
  while (i < arr.length) out.push(arr.slice(i, i += size));
  return out;
}

async function fetchTitleIfNeeded(source) {
  if (!FETCH_TITLE) return source;
  if (source.name && source.name.trim()) return source; // already has name
  try {
    const feed = await parser.parseURL(source.url);
    if (feed?.title) {
      return { ...source, name: feed.title.trim() };
    }
  } catch (e) {
    console.warn(`[WARN] Failed to get title from ${source.url}: ${e.message}`);
  }
  return { ...source, name: source.name || source.url };
}

function normalizeSource(raw) {
  const url = (raw.url || '').trim();
  if (!url) throw new Error('Source without URL');
  return {
    url,
    name: raw.name ? String(raw.name).trim() : '',
    category: raw.category || 'general',
    enabled: raw.enabled === false ? false : true,
  };
}

// =============================
// Main upsert logic
// =============================
async function upsertSources(db, sources) {
  const col = db.collection(COLLECTION_NAME);
  let inserted = 0, updated = 0, skipped = 0, errors = 0;
  for (const s of sources) {
    try {
      const now = new Date();
      const existing = await col.findOne({ url: s.url });
      const docBase = {
        name: s.name || s.url,
        url: s.url,
        category: s.category,
        enabled: s.enabled !== false && ENABLE_ALL ? true : s.enabled !== false,
        updatedAt: now,
      };
      if (existing && existing._id) {
        if (DRY_RUN) {
          console.log(`[DRY] Update -> ${s.url}`);
        } else {
          await col.updateOne({ _id: existing._id }, { $set: docBase });
        }
        updated++;
      } else {
        if (DRY_RUN) {
          console.log(`[DRY] Insert -> ${s.url}`);
        } else {
          await col.insertOne({ ...docBase, createdAt: now });
        }
        inserted++;
      }
    } catch (e) {
      errors++;
      console.error(`[ERROR] ${s.url}:`, e.message);
    }
  }
  return { inserted, updated, skipped, errors };
}

async function processSources(rawList) {
  // 1. Normalize
  const normalized = rawList.map(normalizeSource);
  // 2. Remove duplicates by URL keeping the first one
  const seen = new Set();
  const unique = [];
  for (const s of normalized) {
    if (!seen.has(s.url)) { seen.add(s.url); unique.push(s); }
  }
  // 3. Fetch titles in batches with concurrency limit
  const withTitles = [];
  const chunks = chunkArray(unique, CONCURRENCY);
  for (const c of chunks) {
    const results = await Promise.all(c.map(fetchTitleIfNeeded));
    withTitles.push(...results);
  }
  return withTitles;
}

async function main() {
  console.log('=== RSS Sources Import ===');
  console.log('Mongo URL:', MONGO_URL);
  console.log('Database:', DB_NAME_FROM_URL);
  console.log('Collection:', COLLECTION_NAME);
  console.log('Total sources (input):', RSS_SOURCES.length);
  console.log('DRY_RUN mode:', DRY_RUN);
  console.log('Fetch feed titles:', FETCH_TITLE);
  console.log('Force enabled=true:', ENABLE_ALL);

  let client;
  try {
    const processed = await processSources(RSS_SOURCES);
    console.log('Total sources (processed unique):', processed.length);

    client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });
    const dbName = DB_NAME_FROM_URL;
    const db = client.db(dbName);

    const result = await upsertSources(db, processed);

    console.log('\nSummary:');
    console.log(' Inserted :', result.inserted);
    console.log(' Updated  :', result.updated);
    console.log(' Errors   :', result.errors);
    if (DRY_RUN) console.log(' (No changes saved due to DRY_RUN)');
  } catch (e) {
    console.error('General failure:', e);
    process.exitCode = 1;
  } finally {
    if (client) await client.close().catch(() => {});
  }
}

if (require.main === module) {
  main();
}
