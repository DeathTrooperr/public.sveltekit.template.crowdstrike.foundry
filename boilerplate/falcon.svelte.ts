/**
 * falcon.svelte.ts
 *
 * Global singleton for the Foundry JS SDK. Uses $state runes at module scope
 * for reactivity -- requires .svelte.ts extension.
 *
 * Import { getFalcon, ready, falconError, initFalcon } anywhere in the app.
 */

import FalconApi from '@crowdstrike/foundry-js';

export let ready = $state(false);
export let falconError = $state<string | null>(null);

let _client: FalconApi | null = null;

export async function initFalcon(): Promise<void> {
    try {
        _client = new FalconApi();
        await _client.connect();
        ready = true;
    } catch (e) {
        falconError = e instanceof Error ? e.message : String(e);
        console.error('[falcon] init failed:', e);
    }
}

export function getFalcon(): FalconApi {
    if (!_client) throw new Error('[falcon] getFalcon() called before initFalcon() resolved');
    return _client;
}