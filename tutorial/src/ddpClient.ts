import MeteorSDK from 'meteor-sdk/src/DDPClient.js';
import type { SimpleDDPConnectOptions } from 'meteor-sdk/src/DDPClient.ts';
import ws from 'isomorphic-ws';

type MeteorClient = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  stopChangeListeners?: () => void;
  call: <TArgs extends any[], TResult>(method: string, ...args: TArgs) => Promise<TResult>;
};

type MeteorSDKConstructor = new (options: SimpleDDPConnectOptions, plugins?: any[]) => MeteorClient;

const MeteorSDKModule = MeteorSDK as unknown as { default?: MeteorSDKConstructor } | MeteorSDKConstructor;
const MeteorSDKClient: MeteorSDKConstructor = (typeof (MeteorSDKModule as any).default === 'function'
  ? (MeteorSDKModule as { default: MeteorSDKConstructor }).default
  : (MeteorSDKModule as MeteorSDKConstructor));

export function createDDPClient(endpoint: string, extra?: Partial<SimpleDDPConnectOptions>): MeteorClient {
  const opts: SimpleDDPConnectOptions = {
    endpoint,
    SocketConstructor: ws as any,
    autoConnect: false,
    autoReconnect: true,
    reconnectInterval: 2000,
    ...extra,
  };
  return new MeteorSDKClient(opts);
}

export async function closeDDP(client: MeteorClient) {
  try {
    client.stopChangeListeners?.();
  } catch {}
  try {
    await client.disconnect();
  } catch {}
}

export type { MeteorClient };
