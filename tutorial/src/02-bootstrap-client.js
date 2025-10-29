import 'dotenv/config';
import { createDDPClient, closeDDP } from './ddpClient.js';
async function main() {
    const endpoint = process.env.METEOR_WS || 'ws://localhost:8080/websocket';
    console.log('[bootstrap] Connecting to', endpoint);
    const client = createDDPClient(endpoint);
    await client.connect();
    console.log('[bootstrap] Connected');
    // Call a public method to validate round-trip without auth
    try {
        const result = await client.call('get.contents.fetchRss', { urls: ['https://hnrss.org/frontpage'] });
        const items = result?.items ?? [];
        console.log(`[bootstrap] fetchRss returned ${Array.isArray(items) ? items.length : 0} items`);
    }
    catch (err) {
        console.error('[bootstrap] Method call failed:', err);
    }
    await closeDDP(client);
    console.log('[bootstrap] Closed');
}
main().catch((err) => {
    console.error('[bootstrap] Failed:', err);
    process.exitCode = 1;
});
