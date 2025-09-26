#!/usr/bin/env node
/**
 * Script standalone para cadastrar/atualizar fontes RSS na collection `rss_sources`.
 * - Não depende de Meteor.
 * - Mantém a mesma lógica de upsert usada no serviço interno (upsert por URL).
 * - Tudo em um único arquivo, incluindo a lista de RSS.
 *
 * Uso:
 *  1. Instale dependências (uma vez):
 *     npm install mongodb rss-parser
 *  2. Defina a variável de ambiente MONGO_URL (se necessário):
 *     export MONGO_URL="mongodb://localhost:27017/meteor"
 *  3. Rode:
 *     node scripts/rssSourcesImport.js
 *
 * Flags/Variáveis opcionais:
 *  --no-fetch-title   Não tenta buscar o feed para descobrir título (usa "name" fornecido ou a própria URL)
 *  CONCURRENCY=5      Ajusta quantas requisições de feed simultâneas (default 4)
 *  DRY_RUN=1          Apenas mostra o que faria, sem gravar no banco
 *  ENABLE_ALL=0       Se quiser manter enabled=false quando especificado (por padrão força enabled=true a menos que explicitamente false na lista)
 *
 * Saída: resumo de quantos foram inseridos, atualizados, ignorados, erros.
 */

const { MongoClient } = require('mongodb');
const Parser = require('rss-parser');
const parser = new Parser();

// =============================
// LISTA DE RSS (edite à vontade)
// category: use valores existentes no seu sistema (ex: technology, business, science, sports, entertainment, general)
// enabled: se quiser desabilitar algum, coloque false
// name pode ser omitido; se omitido e fetch de título estiver habilitado, tentará usar o título do feed
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
  // Exemplo com nome omitido (será buscado do feed):
  { url: 'https://www.sciencedaily.com/rss/top/science.xml', category: 'science' },
];

// =============================
// Config
// =============================
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/meteor';
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
// Utilidades
// =============================
function chunkArray(arr, size) {
  const out = []; let i = 0;
  while (i < arr.length) out.push(arr.slice(i, i += size));
  return out;
}

async function fetchTitleIfNeeded(source) {
  if (!FETCH_TITLE) return source;
  if (source.name && source.name.trim()) return source; // já tem nome
  try {
    const feed = await parser.parseURL(source.url);
    if (feed?.title) {
      return { ...source, name: feed.title.trim() };
    }
  } catch (e) {
    console.warn(`[WARN] Falha ao obter título de ${source.url}: ${e.message}`);
  }
  return { ...source, name: source.name || source.url };
}

function normalizeSource(raw) {
  const url = (raw.url || '').trim();
  if (!url) throw new Error('Fonte sem URL');
  return {
    url,
    name: raw.name ? String(raw.name).trim() : '',
    category: raw.category || 'general',
    enabled: raw.enabled === false ? false : true,
  };
}

// =============================
// Lógica principal de upsert
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
  // 1. Normaliza
  const normalized = rawList.map(normalizeSource);
  // 2. Remove duplicadas por URL mantendo a primeira
  const seen = new Set();
  const unique = [];
  for (const s of normalized) {
    if (!seen.has(s.url)) { seen.add(s.url); unique.push(s); }
  }
  // 3. Busca títulos em lotes com limite de concorrência
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
  console.log('Total fontes (entrada):', RSS_SOURCES.length);
  console.log('Modo DRY_RUN:', DRY_RUN);
  console.log('Fetch título de feeds:', FETCH_TITLE);
  console.log('Forçar enabled=true:', ENABLE_ALL);

  let client;
  try {
    const processed = await processSources(RSS_SOURCES);
    console.log('Total fontes (processadas únicas):', processed.length);

    client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });
    const dbName = DB_NAME_FROM_URL;
    const db = client.db(dbName);

    const result = await upsertSources(db, processed);

    console.log('\nResumo:');
    console.log(' Inseridos :', result.inserted);
    console.log(' Atualizados:', result.updated);
    console.log(' Erros     :', result.errors);
    if (DRY_RUN) console.log(' (Nenhuma alteração gravada por DRY_RUN)');
  } catch (e) {
    console.error('Falha geral:', e);
    process.exitCode = 1;
  } finally {
    if (client) await client.close().catch(() => {});
  }
}

if (require.main === module) {
  main();
}
