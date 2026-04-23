<script lang="ts">
    import './app.css';
    import { onMount } from 'svelte';
    import { beforeNavigate } from '$app/navigation';
    import { initFalcon, falcon } from '$lib/falcon.svelte';

    const { children } = $props();
    const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

    beforeNavigate(({ to, cancel, willUnload, type }) => {
        if (isDev || type === 'popstate' || !falcon.ready) return;

        cancel();

        if (willUnload || !to) return;

        const isInternal = to.url.origin === location.origin;

        if (isInternal) {
            falcon.api?.navigation.navigateTo({
                path: to.url.hash.replace('#', '') || '/',
                type: 'internal',
            });
        } else {
            falcon.api?.navigation.navigateTo({
                path: to.url.href,
                target: '_blank',
            });
        }
    });

    onMount(async () => {
        if (isDev) return;
        await initFalcon();
    });
</script>

<div class="theme-dark root">
    {#if !isDev && falcon.error}
        <div class="splash">
            <img src="./loading.gif" alt="App logo" class="splash-image" />
            <p class="splash-error">{falcon.error}</p>
        </div>
    {:else if !isDev && !falcon.ready}
        <div class="splash">
            <img src="./loading.gif" alt="App logo" class="splash-image" />
            <p class="splash-label">Loading Foundry App<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></p>
        </div>
    {:else}
        {@render children()}
    {/if}
</div>

<style>
    :global(html, body) {
        height: 100%;
        margin: 0;
    }

    .root {
        height: 100%;
        background-color: #343337;
        color: var(--text-and-icons);
        font-family: Calibre, sans-serif;
    }

    .splash {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.5rem;
        min-height: 100%;
        background-color: #343337;
        position: relative;
        z-index: 100;
    }

    .splash-image {
        width: 150px;
        height: auto;
    }

    .splash-label,
    .splash-error {
        font-size: 1rem;
        font-family: Monaco, monospace;
        font-weight: bold;
    }

    .splash-label {
        color: var(--body-and-labels);
    }

    .splash-error {
        color: var(--critical);
    }

    .dot {
        animation: blink 1.4s infinite;
        animation-fill-mode: both;
    }

    .dot:nth-child(2) {
        animation-delay: 0.2s;
    }

    .dot:nth-child(3) {
        animation-delay: 0.4s;
    }

    @keyframes blink {
        0%   { opacity: 0.2; }
        20%  { opacity: 1;   }
        100% { opacity: 0.2; }
    }
</style>