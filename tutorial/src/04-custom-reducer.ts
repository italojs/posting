import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createDDPClient, closeDDP } from './ddpClient.ts';

const CACHE_DIR = path.resolve('.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'rss.json');
const STATS_FILE = path.join(CACHE_DIR, 'rss.stats.json');

type Item = Record<string, any> & { title?: string; link?: string; url?: string; pubDate?: string | number; date?: string | number; guid?: string; id?: string };

type Delta = { added: Item[]; changed: Item[]; removed: string[] };

type Stats = {
  total: number;
  latest: string | null;
  byDomain: Record<string, number>;
  counts: { added: number; changed: number; removed: number };
};

function keyOf(item: Item): string {
  return (
    item?.id || item?.guid || item?.link || item?.url || `${item?.title ?? ''}|${item?.pubDate ?? item?.date ?? ''}`
  );
}

function indexByKey(items: Item[]): Map<string, Item> {
  const m = new Map<string, Item>();
  for (const it of items || []) {
    const k = keyOf(it);
    if (k) m.set(k, it);
  }
  return m;
}

function shallowEqual(a: any, b: any): boolean {
  if (!a || !b) return a === b;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

async function loadCache(): Promise<Item[]> {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e: any) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function saveStats(stats: Stats) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(STATS_FILE, JSON.stringify(stats, null, 2));
}

function computeDelta(previous: Item[], fresh: Item[]): Delta {
  const prevIndex = indexByKey(previous);
  const freshIndex = indexByKey(fresh);
  const added: Item[] = [];
  const changed: Item[] = [];
  const removed: string[] = [];

  for (const [k, v] of freshIndex) {
    const prev = prevIndex.get(k);
    if (!prev) {
      added.push(v);
    } else if (!shallowEqual(prev, v)) {
      changed.push(v);
    }
  }
  for (const [k] of prevIndex) {
    if (!freshIndex.has(k)) removed.push(k);
  }
  return { added, changed, removed };
}

function domainOf(item: Item): string | null {
  const url = item.link || item.url;
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function deriveStats(fromItems: Item[], delta: Delta): Stats {
  const byDomain: Record<string, number> = {};
  let latest: number | null = null;

  for (const it of fromItems) {
    const d = domainOf(it);
    if (d) byDomain[d] = (byDomain[d] || 0) + 1;
    const ts = Date.parse((it.pubDate as any) ?? (it.date as any) ?? '') || null;
    if (typeof ts === 'number') {
      if (latest == null || ts > latest) latest = ts;
    }
  }

  return {
    total: fromItems.length,
    latest: latest ? new Date(latest).toISOString() : null,
    byDomain,
    counts: {
      added: delta.added.length,
      changed: delta.changed.length,
      removed: delta.removed.length,
    },
  };
}

async function main() {
  const endpoint = process.env.METEOR_WS || 'ws://localhost:8080/websocket';
  console.log('[demo-04] Connecting to', endpoint);
  const client = createDDPClient(endpoint);
  await client.connect();
  console.log('[demo-04] Connected');

  // Load previous snapshot
  const previous = await loadCache();
  console.log(`[demo-04] Previous cache items: ${previous.length}`);

  // Fetch fresh items
  const urls = [ 'https://hnrss.org/frontpage' ];
  let fresh: Item[] = [];
  try {
    const result = await client.call('get.contents.fetchRss', { urls });
    fresh = (result as any)?.items ?? [];
  } catch (err) {
    console.error('[demo-04] fetchRss failed:', err);
  }
  console.log(`[demo-04] Fresh items: ${fresh.length}`);

  // Compute delta and derive stats
  const delta = computeDelta(previous, fresh);
  console.log(
    `[demo-04] Delta -> added: ${delta.added.length}, changed: ${delta.changed.length}, removed: ${delta.removed.length}`,
  );

  const stats = deriveStats(fresh, delta);
  console.log('[demo-04] Stats summary:', {
    total: stats.total,
    latest: stats.latest,
    domains: Object.keys(stats.byDomain).slice(0, 5),
    counts: stats.counts,
  });

  await saveStats(stats);
  console.log('[demo-04] Stats saved at', STATS_FILE);

  await closeDDP(client as any);
  console.log('[demo-04] Closed');
}

main().catch((err) => {
  console.error('[demo-04] Failed:', err);
  process.exitCode = 1;
});
