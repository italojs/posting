/**
 * Demo 01: Basic Connection and Method Call (simpleddp)
 * - Connects to Meteor via DDP
 * - Optionally logs in using email/password if provided via env
 * - Calls a public method to validate round-trip
 */
import 'dotenv/config';
import { createDDPClient, closeDDP } from './ddpClient.js';
import crypto from 'node:crypto';
async function loginIfProvided(client) {
    const token = process.env.METEOR_TOKEN;
    const email = process.env.METEOR_EMAIL;
    const password = process.env.METEOR_PASSWORD;
    if (token) {
        console.log('[demo-01] Attempting token resume login...');
        try {
            const res = await client.call('login', { resume: token });
            console.log('[demo-01] Logged in with token:', Boolean(res && res.id));
            return true;
        }
        catch (e) {
            console.warn('[demo-01] Token login failed, will try other methods if available.');
        }
    }
    if (email && password) {
        console.log('[demo-01] Attempting email/password login...');
        const digest = crypto.createHash('sha256').update(password).digest('hex');
        try {
            const res = await client.call('login', {
                user: { email },
                password: { digest, algorithm: 'sha-256' },
            });
            console.log('[demo-01] Logged in with credentials:', Boolean(res && res.id));
            return true;
        }
        catch (e) {
            console.warn('[demo-01] Email/password login failed. Proceeding unauthenticated.');
        }
    }
    console.log('[demo-01] No credentials provided, continuing without auth.');
    return false;
}
async function main() {
    console.log('=== Demo 01: Basic Connection ===');
    const endpoint = process.env.METEOR_WS || 'ws://localhost:8080/websocket';
    const client = createDDPClient(endpoint);
    console.log('[demo-01] Connecting to', endpoint);
    await client.connect();
    console.log('[demo-01] Connected');
    await loginIfProvided(client);
    // Call a public method to validate E2E
    try {
        console.log('[demo-01] Calling get.contents.fetchRss...');
        const result = await client.call('get.contents.fetchRss', { urls: ['https://hnrss.org/frontpage'] });
        const items = result?.items ?? [];
        console.log(`[demo-01] fetchRss returned ${Array.isArray(items) ? items.length : 0} items`);
    }
    catch (error) {
        console.error('[demo-01] Method call failed:', error);
    }
    await closeDDP(client);
    console.log('[demo-01] Closed');
}
main().catch((err) => {
    console.error('[demo-01] Failed:', err);
    process.exitCode = 1;
});
