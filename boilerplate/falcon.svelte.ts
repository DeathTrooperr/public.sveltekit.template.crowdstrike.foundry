/**
 * falcon.svelte.ts
 *
 * Global singleton for the Foundry JS SDK. Uses $state runes at module scope
 * for reactivity -- requires .svelte.ts extension.
 *
 * Import { getFalcon, ready, falconError, initFalcon } anywhere in the app.
 */

import FalconApi from '@crowdstrike/foundry-js';

export interface FalconData {
    app: { id: string };        // your app's Foundry ID — use this for navigation
    user: {
        uuid: string;
        username: string;
    };
    theme: 'theme-light' | 'theme-dark';
    cid: string;                // customer ID
    locale: string;             // e.g. 'en-us'
    timezone?: string;          // e.g. 'America/New_York'
    dateFormat?: string;        // moment.js format string
    permissions?: Record<string, boolean>; // custom app permissions you defined in manifest
}

export const falcon = $state({
    ready: false,
    error: null as string | null,
    api: null as FalconApi | null,
    data: null as FalconData | null,
});

export async function initFalcon(): Promise<void> {
    try {
        falcon.api = new FalconApi();
        falcon.api.events.on('data', (data) => falcon.data = data);
        const connected = await falcon.api.connect();
        if(!connected) throw new Error('Failed to connect to Falcon');
        falcon.ready = true;
    } catch (e) {
        falcon.error = e instanceof Error ? e.message : String(e);
        console.error('[falcon] init failed:', e);
    }
}