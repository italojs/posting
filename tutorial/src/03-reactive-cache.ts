import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createDDPClient, closeDDP } from './ddpClient.js';

const CACHE_DIR = path.resolve('.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'rss.json');

function keyOf(item: any): string {
  return (
    item?.id || item?.guid || item?.link || item?.url || `${item?.title ?? ''}|${item?.pubDate ?? item?.date ?? ''}`
  );
}

function indexByKey(items: any[]): Map<string, any> {
  const m = new Map<string, any>();
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

async function loadCache(): Promise<any[]> {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e: any) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function saveCache(items: any[]) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(items, null, 2));
}

async function main() {
  const endpoint = process.env.METEOR_WS || 'ws://localhost:8080/websocket';
  console.log('[demo-03] Connecting to', endpoint);
  const client = createDDPClient(endpoint);
  await client.connect();
  console.log('[demo-03] Connected');

  // 1) Load previous cache
  const previous = await loadCache();
  const prevIndex = indexByKey(previous);
  console.log(`[demo-03] Loaded cache with ${previous.length} items`);

  // 2) Fetch fresh items from server (public method)
  const urls = [
    'https://hnrss.org/frontpage',
    // add more feeds if desired
  ];
  let fresh: any[] = [];
  try {
    const result = await client.call('get.contents.fetchRss', { urls });
    fresh = (result as any)?.items ?? [];
  } catch (err) {
    console.error('[demo-03] fetchRss failed:', err);
  }
  console.log(`[demo-03] Fresh items: ${fresh.length}`);

  // 3) Compute delta
  const freshIndex = indexByKey(fresh);
  const added: any[] = [];
  const changed: any[] = [];
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

  console.log(
    `[demo-03] Delta -> added: ${added.length}, changed: ${changed.length}, removed: ${removed.length}`,
  );
  if (added.length) console.log('[demo-03] sample added:', added.slice(0, 3).map((x) => x.title || keyOf(x)));
  if (changed.length) console.log('[demo-03] sample changed:', changed.slice(0, 3).map((x) => x.title || keyOf(x)));
  if (removed.length) console.log('[demo-03] sample removed keys:', removed.slice(0, 3));

  // 4) Save new cache
  await saveCache(fresh);
  console.log('[demo-03] Cache updated at', CACHE_FILE);

  await closeDDP(client as any);
  console.log('[demo-03] Closed');
}

main().catch((err) => {
  console.error('[demo-03] Failed:', err);
  process.exitCode = 1;
});
