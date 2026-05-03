<script lang="ts">
    import './app.css';
    import { onMount, tick } from 'svelte';
    import { fade } from 'svelte/transition';
    import { beforeNavigate, goto } from '$app/navigation';
    import { initFalcon, falcon } from '$lib/falcon.svelte';

    const { children } = $props();
    const isSandboxed = window.self !== window.top;

    let ready = $state(!isSandboxed);

    beforeNavigate(({ to, cancel }) => {
        if (!to) return;

        const path = to.url.pathname;

        if (!isSandboxed) {
            if (path.startsWith('/falcon/')) {
                cancel();
                console.warn('Falcon navigation not supported in local dev:', path);
            }
            if (path.startsWith('/internal/')) {
                cancel();
                // eslint-disable-next-line svelte/no-navigation-without-resolve
                goto('/#' + path.replace('/internal', ''));
            }
            return;
        }

        cancel();

        if (!falcon.ready) {
            console.warn('Navigation attempted before Falcon ready:', path);
            return;
        }

        if (path.startsWith('/falcon/')) {
            falcon.api?.navigation.navigateTo({
                path: path.replace('/falcon', ''),
                type: 'falcon',
            });
        } else if (path.startsWith('/internal/')) {
            falcon.api?.navigation.navigateTo({
                path: path.replace('/internal', ''),
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
        if (!isSandboxed) return;
        await initFalcon();
    });

    $effect(() => {
        if (ready) return;
        if (!isSandboxed) return;
        if (!falcon.ready) return;
        let cancelled = false;
        (async () => {
            await tick();
            await new Promise<void>(r => requestAnimationFrame(() => r()));
            if (!cancelled) ready = true;
        })();
        return () => { cancelled = true; };
    });
</script>

<div class="{falcon.data?.theme ?? 'theme-dark'} root">
    {#if isSandboxed && falcon.error}
        <div class="splash">
            <img src="./loading.gif" alt="App logo" class="splash-image" />
            <p class="splash-error">{falcon.error}</p>
        </div>
    {:else}
        {#if !isSandboxed || falcon.ready}
            {@render children()}
        {/if}

        {#if !ready}
            <div class="splash splash-overlay" out:fade={{ duration: 300 }}>
                <img src="./loading.gif" alt="App logo" class="splash-image" />
                <p class="splash-label">Loading Foundry App<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></p>
            </div>
        {/if}
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

    .splash-overlay {
        position: fixed;
        inset: 0;
        min-height: 100vh;
        z-index: 1000;
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
