/**
 * falcon.svelte.ts
 *
 * Global singleton for the Foundry JS SDK. Uses $state runes at module scope
 * for reactivity -- requires .svelte.ts extension.
 *
 * Import { getFalcon, ready, falconError, initFalcon } anywhere in the app.
 */

import FalconApi from '@crowdstrike/foundry-js';

export const falcon = $state({
    ready: false,
    error: null as string | null,
    api: null as FalconApi | null,
});

export async function initFalcon(): Promise<void> {
    try {
        falcon.api = new FalconApi();
        const connected = await falcon.api.connect();
        if(!connected) throw new Error('Failed to connect to Falcon');
        falcon.ready = true;
    } catch (e) {
        falcon.error = e instanceof Error ? e.message : String(e);
        console.error('[falcon] init failed:', e);
    }
}