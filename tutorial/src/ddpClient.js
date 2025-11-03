import { createRequire } from 'module';
import ws from 'isomorphic-ws';
const require = createRequire(import.meta.url);
// Support both CJS/ESM shapes from meteor-sdk
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MeteorSDK = require('meteor-sdk');
const DDP = MeteorSDK?.default ?? MeteorSDK;
export function createDDPClient(endpoint, extra) {
    const opts = {
        endpoint,
        SocketConstructor: ws,
        reconnectInterval: 2000,
        autoReconnect: true,
        ...extra,
    };
    const client = new DDP(opts);
    return client;
}
export async function closeDDP(client) {
    try {
        if (typeof client.stopChangeTracker === 'function')
            await client.stopChangeTracker();
    }
    catch { }
    try {
        await client.disconnect();
    }
    catch { }
}
