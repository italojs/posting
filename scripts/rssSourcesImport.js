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
*  --no-fetch-title   Não busca o feed para extrair título/metadados (usa valores fornecidos ou a própria URL)
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
// Informe apenas as URLs; o script busca título, categorias e metadados direto do XML.
// =============================
const RSS_SOURCES = [
  'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
  'https://feeds.arstechnica.com/arstechnica/index',
  'https://feeds.feedburner.com/TechCrunch/',
  'https://www.theverge.com/rss/index.xml',
  'https://www.wired.com/feed/category/business/latest/rss',
  'https://www.wired.com/feed/category/science/latest/rss',
  'https://feeds.bbci.co.uk/news/world/rss.xml',
  'https://feeds.bbci.co.uk/news/technology/rss.xml',
  'https://www.reutersagency.com/feed/?best-topics=technology',
  'https://www.reutersagency.com/feed/?best-topics=business-finance',
  'https://www.sciencedaily.com/rss/top/science.xml',
  'https://www.npr.org/rss/rss.php?id=1001',
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
const DEFAULT_CATEGORY = 'general';

// =============================
// Utilidades
// =============================
function chunkArray(arr, size) {
  const out = []; let i = 0;
  while (i < arr.length) out.push(arr.slice(i, i += size));
  return out;
}

function cleanText(value) {
  if (value == null) return '';
  return String(value).trim();
}

function optionalText(value) {
  const text = cleanText(value);
  return text || undefined;
}

function uniqueStrings(values) {
  const set = new Set();
  const out = [];
  for (const val of values || []) {
    const text = cleanText(val);
    if (!text) continue;
    const key = text.toLowerCase();
    if (!set.has(key)) {
      set.add(key);
      out.push(text);
    }
  }
  return out;
}

function flattenCategoryEntry(entry) {
  if (!entry) return [];
  if (Array.isArray(entry)) return entry.flatMap(flattenCategoryEntry);
  if (typeof entry === 'string') return [entry];
  if (typeof entry === 'object') {
    const { name, text, _ } = entry;
    const values = [name, text, _];
    if (entry.$ && typeof entry.$ === 'object') {
      values.push(entry.$.text, entry.$.label);
    }
    if (Array.isArray(entry.categories)) {
      values.push(...entry.categories.flatMap(flattenCategoryEntry));
    }
    if (Array.isArray(entry.subcategories)) {
      values.push(...entry.subcategories.flatMap(flattenCategoryEntry));
    }
    return values.filter(Boolean).map(cleanText);
  }
  return [];
}

function extractCategoriesFromFeed(feed) {
  const collected = [];
  if (Array.isArray(feed?.categories)) collected.push(...feed.categories);
  if (feed?.category) collected.push(feed.category);
  if (feed?.itunes?.category) collected.push(feed.itunes.category);
  if (feed?.itunes?.categories) collected.push(...flattenCategoryEntry(feed.itunes.categories));
  if (Array.isArray(feed?.items)) {
    for (const item of feed.items.slice(0, 5)) {
      if (Array.isArray(item?.categories)) collected.push(...item.categories);
    }
  }
  return uniqueStrings(collected);
}

function finalizeSource(source) {
  const categories = Array.isArray(source?.categories) ? uniqueStrings(source.categories) : [];
  const primaryCategory = cleanText(source?.category) || categories[0] || DEFAULT_CATEGORY;
  const name = optionalText(source?.name) || (() => {
    try { return new URL(source.url).hostname; } catch { return source.url; }
  })();
  return {
    ...source,
    name,
    category: primaryCategory || DEFAULT_CATEGORY,
    categories: categories.length ? categories : undefined,
    description: optionalText(source?.description),
    siteUrl: optionalText(source?.siteUrl),
    imageUrl: optionalText(source?.imageUrl),
    language: optionalText(source?.language),
    generator: optionalText(source?.generator),
    copyright: optionalText(source?.copyright),
  };
}

function normalizeSource(raw) {
  const rawEntry = typeof raw === 'string' ? { url: raw } : raw || {};
  const url = cleanText(rawEntry.url);
  if (!url) throw new Error('Fonte sem URL');
  const manualCategories = [];
  if (Array.isArray(rawEntry.categories)) manualCategories.push(...rawEntry.categories);
  if (rawEntry.category) manualCategories.push(rawEntry.category);
  const categories = uniqueStrings(manualCategories);
  const primaryCategory = categories[0] || DEFAULT_CATEGORY;
  return finalizeSource({
    url,
    name: optionalText(rawEntry.name),
    category: cleanText(primaryCategory) || DEFAULT_CATEGORY,
    categories: categories.length ? categories : undefined,
    description: optionalText(rawEntry.description),
    siteUrl: optionalText(rawEntry.siteUrl),
    imageUrl: optionalText(rawEntry.imageUrl),
    language: optionalText(rawEntry.language),
    generator: optionalText(rawEntry.generator),
    copyright: optionalText(rawEntry.copyright),
    enabled: rawEntry.enabled === false ? false : true,
  });
}

async function enrichSourceWithFeed(source) {
  if (!FETCH_TITLE) return finalizeSource(source);
  try {
    const feed = await parser.parseURL(source.url);
    const feedCategories = extractCategoriesFromFeed(feed);
    const mergedCategories = uniqueStrings([...(source.categories || []), ...feedCategories]);
    const siteUrl = optionalText(feed?.link) || source.siteUrl;
    const description = optionalText(feed?.description) || source.description;
    const language = optionalText(feed?.language) || source.language;
    const generator = optionalText(feed?.generator) || source.generator;
    const copyright = optionalText(feed?.copyright) || source.copyright;
    const imageUrl = optionalText(feed?.image?.url || feed?.itunes?.image) || source.imageUrl;
    const resolvedCategory = source.category && source.category !== DEFAULT_CATEGORY
      ? source.category
      : mergedCategories[0] || DEFAULT_CATEGORY;
    return finalizeSource({
      ...source,
      name: optionalText(feed?.title) || source.name,
      category: resolvedCategory,
      categories: mergedCategories.length ? mergedCategories : undefined,
      description,
      siteUrl,
      language,
      generator,
      copyright,
      imageUrl,
    });
  } catch (e) {
    console.warn(`[WARN] Falha ao obter metadados de ${source.url}: ${e.message}`);
    return finalizeSource(source);
  }
}

// =============================
// Lógica principal de upsert
// =============================
async function upsertSources(db, sources) {
  const col = db.collection(COLLECTION_NAME);
  let inserted = 0, updated = 0, errors = 0;
  for (const s of sources) {
    try {
      const now = new Date();
      const existing = await col.findOne({ url: s.url });
      const docBase = {
        name: s.name || s.url,
        url: s.url,
        category: s.category,
        categories: s.categories,
        description: s.description,
        siteUrl: s.siteUrl,
        imageUrl: s.imageUrl,
        language: s.language,
        generator: s.generator,
        copyright: s.copyright,
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
  return { inserted, updated, errors };
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
  // 3. Enriquecimento com metadados do feed
  if (!FETCH_TITLE) {
    return unique.map(finalizeSource);
  }
  const enriched = [];
  const chunks = chunkArray(unique, CONCURRENCY);
  for (const c of chunks) {
    const results = await Promise.all(c.map(enrichSourceWithFeed));
    enriched.push(...results);
  }
  return enriched.map(finalizeSource);
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
