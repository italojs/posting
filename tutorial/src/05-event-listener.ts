import 'dotenv/config';
import { createDDPClient, closeDDP } from './ddpClient.ts';

// Lightweight event listener demo using periodic fetch + diffing
// Emits 'added', 'changed', 'removed' for RSS items from get.contents.fetchRss

type Item = Record<string, any> & { title?: string; link?: string; url?: string; pubDate?: string | number; date?: string | number; guid?: string; id?: string };

type Delta = { added: Item[]; changed: Item[]; removed: string[] };

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
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

function computeDelta(previous: Item[], fresh: Item[]): Delta {
  const prevIndex = indexByKey(previous);
  const freshIndex = indexByKey(fresh);
  const added: Item[] = [];
  const changed: Item[] = [];
  const removed: string[] = [];

  for (const [k, v] of freshIndex) {
    const prev = prevIndex.get(k);
    if (!prev) added.push(v);
    else if (!shallowEqual(prev, v)) changed.push(v);
  }
  for (const [k] of prevIndex) if (!freshIndex.has(k)) removed.push(k);
  return { added, changed, removed };
}

function prettyItem(it: Item) {
  return it.title || it.link || it.url || keyOf(it);
}

async function main() {
  const endpoint = process.env.METEOR_WS || 'ws://localhost:8080/websocket';
  console.log('[demo-05] Connecting to', endpoint);
  const client = createDDPClient(endpoint);
  await client.connect();
  console.log('[demo-05] Connected');

  const urls = ['https://hnrss.org/frontpage'];
  let previous: Item[] = [];
  let cycles = 0;
  const maxCycles = Number(process.env.DEMO_CYCLES || 5); // default 5 iterations
  const periodMs = Number(process.env.DEMO_PERIOD_MS || 5000); // default 5s

  let stop = false;
  const onExit = async () => {
    if (stop) return;
    stop = true;
    console.log('\n[demo-05] Shutting down...');
    await closeDDP(client);
    console.log('[demo-05] Closed');
    process.exit(0);
  };
  process.on('SIGINT', onExit);
  process.on('SIGTERM', onExit);

  while (!stop && cycles < maxCycles) {
    cycles += 1;
    try {
      const result = await client.call<[
        { urls: string[] }
      ], { items?: Item[] }>('get.contents.fetchRss', { urls });
      const fresh: Item[] = Array.isArray(result?.items) ? result.items : [];
      const delta = computeDelta(previous, fresh);

      // Emit events
      for (const it of delta.added) {
        console.log('[demo-05][added]', prettyItem(it));
        // example: notify if title mentions AI
        if ((it.title || '').toLowerCase().includes('ai')) {
          console.log('  -> [notify] High-interest item (AI)');
        }
      }
      for (const it of delta.changed) console.log('[demo-05][changed]', prettyItem(it));
      for (const k of delta.removed) console.log('[demo-05][removed]', k);

      console.log(
        `[demo-05] cycle ${cycles}/${maxCycles} -> added:${delta.added.length} changed:${delta.changed.length} removed:${delta.removed.length}`,
      );

      previous = fresh;
    } catch (err) {
      console.error('[demo-05] fetchRss failed:', err);
    }

    if (cycles >= maxCycles) break;
    await new Promise((r) => setTimeout(r, periodMs));
  }

  await onExit();
}

main().catch((err) => {
  console.error('[demo-05] Failed:', err);
  process.exitCode = 1;
});
