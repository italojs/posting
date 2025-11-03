import SimpleDDP from 'simpleddp';
import type { SimpleDDPOptions } from 'simpleddp';
import ws from 'isomorphic-ws';

export function createDDPClient(endpoint: string, extra?: Partial<SimpleDDPOptions>) {
  const opts: SimpleDDPOptions = {
    endpoint,
    SocketConstructor: ws as any,
    reconnectInterval: 2000,
    maxQueueLength: 1000,
    autoReconnect: true,
    ...extra,
  } as any;
  const client = new SimpleDDP(opts);
  return client;
}

export async function closeDDP(client: SimpleDDP) {
  try {
    await client.stopChangeTracker();
  } catch {}
  try {
    await client.disconnect();
  } catch {}
}
