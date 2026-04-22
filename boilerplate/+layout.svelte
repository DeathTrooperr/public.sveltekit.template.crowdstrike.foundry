<script lang="ts">
    import { onMount } from 'svelte';
    import { beforeNavigate } from '$app/navigation';
    import { initFalcon, getFalcon, ready, falconError } from '$lib/falcon.svelte';

    const { children } = $props();

    beforeNavigate(({ to, cancel, willUnload, type }) => {
        if (type === 'popstate' || !ready) return;

        cancel();

        if (willUnload || !to) return;

        const falcon = getFalcon();
        const isInternal = to.url.origin === location.origin;

        if (isInternal) {
            falcon.navigation.navigateTo({
                path: to.url.hash.replace('#', '') || '/',
                type: 'internal',
            });
        } else {
            falcon.navigation.navigateTo({
                path: to.url.href,
                target: '_blank',
            });
        }
    });

    onMount(async () => {
        await initFalcon();
    });
</script>

<div class="theme-dark root">
    {#if falconError}
        <div class="splash">
            <img src="splash-image" alt="App logo" class="splash-image" />
            <p class="splash-error">{falconError}</p>
        </div>
    {:else if !ready}
        <div class="splash">
            <img src="./loading.gif" alt="App logo" class="splash-image" />
            <p class="splash-label">Loading Foundry App</p>
            <div class="splash-spinner" aria-label="Loading...">
                <div class="spinner-ring"></div>
            </div>
        </div>
    {:else}
        {@render children()}
    {/if}
</div>

<style>
    .root {
        min-height: 100vh;
        background-color: var(--surface-base);
        color: var(--text-and-icons);
        font-family: Calibre, sans-serif;
    }

    .splash {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.5rem;
        min-height: 100vh;
        background-color: var(--surface-base);
    }

    .splash-image {
        width: 200px;
        height: auto;
    }

    .splash-label {
        font-size: 1rem;
        font-weight: 500;
        color: var(--body-and-labels);
        letter-spacing: 0.02em;
    }

    .splash-error {
        font-size: 0.875rem;
        color: var(--critical);
        font-family: Monaco, monospace;
    }

    .splash-spinner {
        width: 2rem;
        height: 2rem;
    }

    .spinner-ring {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid var(--border-reg);
        border-top-color: var(--brand);
        animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>