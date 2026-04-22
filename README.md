# CrowdStrike Foundry SvelteKit Template

This repository provides a SvelteKit 2 / Svelte 5 template for building UI extensions inside CrowdStrike Falcon Foundry. It handles asset path resolution, hash routing, and SDK initialization for the Foundry sandboxed iframe environment.

## Implementation Guide

Follow these steps to integrate the Foundry template into your project.

### 1. Initialize your Project
If you don't have a SvelteKit project yet, create one using the Skeleton template:
```bash
npm create svelte@latest my-foundry-app
# Choose: Skeleton project, TypeScript, Svelte 5
cd my-foundry-app
```

### 2. Install the Foundry Adapter
Copy the `adapter-foundry/` directory from this repo to your project root, then install it as a development dependency:
```bash
# Copy the adapter-foundry folder to your project
npm install --save-dev ./adapter-foundry
```
*Note: The adapter is named `adapter-falcon` in `package.json` for consistent importing.*

### 3. Install the Foundry SDK
The template requires the official CrowdStrike Foundry JS SDK:
```bash
npm install @crowdstrike/foundry-js
```

### 4. Configure `svelte.config.js`
Replace your `svelte.config.js` with the one from the `boilerplate/` folder. It enables two critical settings:
- **Hash Routing**: Uses `#` for navigation because Foundry controls the URL pathname.
- **Foundry Adapter**: Automatically rewrites absolute `/_app/` paths to relative `./_app/` paths so assets load correctly in the Foundry iframe.

### 5. Add the Global SDK Handler
Copy `boilerplate/falcon.svelte.ts` to `src/lib/falcon.svelte.ts`. 

This module creates a reactive global singleton using Svelte 5 `$state` runes. It manages the connection state (`ready`) and provides access to the `FalconApi` instance via `getFalcon()`.

### 6. Setup the Root Layout
Copy `boilerplate/+layout.svelte` to `src/routes/+layout.svelte`.

The layout performs three vital roles:
1.  **Initialization**: Calls `initFalcon()` on mount to establish the handshake with the Foundry parent frame.
2.  **Navigation Interception**: Intercepts all SvelteKit navigation and routes it through `falcon.navigation.navigateTo()`. This keeps the Foundry shell and your app's router in sync.
3.  **Render Gating**: Prevents your pages from rendering until the SDK connection is established, ensuring `getFalcon()` is safe to use in any child component.

---

## Key Components: The "What" and the "Why"

### 1. Foundry Adapter (`adapter-falcon`)
- **What**: A custom adapter that post-processes the standard SvelteKit static build.
- **Why**: Standard SvelteKit static adapters produce absolute paths (e.g., `src="/_app/..."`). In Foundry's sandboxed environment, your app is served from a unique UUID-prefixed path like `/foundry/apps/<uuid>/`. Absolute paths resolve to the Foundry domain root (`falcon.crowdstrike.com/_app/...`) and result in 404s. This adapter rewrites every `/_app/` reference to `./_app/` so that assets always resolve relative to your app's index page.

### 2. Hash-Based Routing (`svelte.config.js`)
- **What**: Configures SvelteKit to use the URL hash (`#`) for its internal router.
- **Why**: Your app lives inside an iframe where the parent (Foundry) controls the URL pathname. SvelteKit cannot reliably manipulate the pathname without conflicting with the parent shell or causing full page reloads. Using hash routing allows SvelteKit to own the `#fragment` while leaving the pathname to Foundry, which is the required architecture for Foundry UI extensions.

### 3. Global SDK Singleton (`falcon.svelte.ts`)
- **What**: A centralized handler for the `@crowdstrike/foundry-js` SDK using Svelte 5 `$state` runes.
- **Why**: The SDK connection is a global resource. By placing it in a `.svelte.ts` file, we create a reactive singleton. Any component can import `ready` or `getFalcon()` and automatically re-render when the connection status changes. This avoids the need for complex context providers and ensures the SDK is available even in non-component logic like SvelteKit `load` functions.

### 4. Navigation Synchronization (`+layout.svelte`)
- **What**: Uses the `beforeNavigate` hook to intercept all internal link clicks.
- **Why**: Because Foundry wraps your app, standard browser navigation is broken. We must explicitly communicate every navigation event to the Foundry parent frame using `falcon.navigation.navigateTo()`.
- **The Navigation Loop**: 
    1. User clicks a link in your app.
    2. `beforeNavigate` catches it, cancels the default SvelteKit navigation, and calls the Foundry SDK.
    3. Foundry updates the top-level browser URL hash.
    4. Foundry propagates that hash change back down to the iframe.
    5. A `popstate` event fires inside your app.
    6. Our `beforeNavigate` code sees the `type === 'popstate'` and **ignores it**, allowing SvelteKit's router to finally render the new page. This guard is critical to prevent infinite navigation loops.

### 5. Render Gating (`+layout.svelte`)
- **What**: A conditional `{#if ready}` block in the root layout.
- **Why**: The Foundry SDK must perform an asynchronous handshake with the parent frame before it can be used. By gating the entire application render until `ready` is true, we guarantee that any child component can call `getFalcon()` immediately in its initialization logic without checking for `null` or handling "unconnected" states.

---

## Deployment

1.  **Build the project**:
    ```bash
    npm run build
    ```
2.  **Upload**: The build output will be in the `/build` directory. Zip the contents of this folder and upload it as your UI bundle in the CrowdStrike Falcon console.

## License

[MIT](./LICENSE) — Mullaney Strategic Systems LLC

---

*CrowdStrike and Falcon are trademarks or registered trademarks of CrowdStrike, Inc. in the United States and other countries. This project is not affiliated with, sponsored by, or endorsed by CrowdStrike, Inc.*
