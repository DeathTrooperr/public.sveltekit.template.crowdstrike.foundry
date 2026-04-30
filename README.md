# CrowdStrike Foundry SvelteKit Template

**Note: This repository now contains boilerplate code. The custom adapter is available as an npm package: [adapter-foundry](https://www.npmjs.com/package/adapter-foundry).**

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

*Note: If using TypeScript, ensure your `tsconfig.json` sets `"moduleResolution": "bundler"` (or higher) to correctly resolve Svelte modules.*

### 2. Install the Foundry Adapter
The adapter is available as an npm package:

```bash
npm install --save-dev adapter-foundry
```

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
2.  **Navigation Interception**: Intercepts all SvelteKit navigation and routes it through `falcon.navigation.navigateTo()`. It uses `/falcon/` and `/internal/` path prefixes to distinguish between navigation types.
3.  **Render Gating**: Prevents your pages from rendering until the SDK connection is established, ensuring `getFalcon()` is safe to use in any child component.
4.  **Loading State**: Uses `static/loading.gif` to provide visual feedback while the SDK handshake is in progress.

### 7. Add Assets
Copy `static/loading.gif` to your project's `static/` folder. This image is required by the root layout to provide a loading state while the Foundry JS SDK initializes.

### 8. Add a Default Page (Optional)
Copy `boilerplate/+page.svelte` to `src/routes/+page.svelte`. 

This provides a functional example of a Foundry-style Query Editor with a sidebar for selection. It demonstrates Svelte 5 reactivity for handling UI state within a Foundry application.

---

## Key Components: The "What" and the "Why"

### 1. Foundry Adapter (`adapter-foundry`)
- **What**: A custom adapter that post-processes the standard SvelteKit static build.
- **Why**: Standard SvelteKit static adapters produce absolute paths (e.g., `src="/_app/..."`). In Foundry's sandboxed environment, your app is accessed via a URL pattern like `/foundry/page/<uuid>?path=<path>`. Absolute paths resolve to the Foundry domain root (`falcon.crowdstrike.com/_app/...`) and result in 404s. This adapter rewrites every `/_app/` reference to `./_app/` so that assets always resolve relative to your app's index page.

### 2. Hash-Based Routing (`svelte.config.js`)
- **What**: Configures SvelteKit to use the URL hash (`#`) for its internal router.
- **Why**: Your app lives inside an iframe where the parent (Foundry) controls the top-level URL (pathname and query parameters). SvelteKit cannot reliably manipulate the pathname without conflicting with the parent shell or causing full page reloads. Using hash routing allows SvelteKit to own the `#fragment` while leaving the rest of the URL to Foundry.
- **Initial Load Only**: While hash-based routing is enabled, it is primarily there to handle initial page loads (deep-linking). Beyond the initial load, all navigation must be routed through the Falcon Navigation API to keep the parent frame in sync.

### 3. Global SDK Singleton (`falcon.svelte.ts`)
- **What**: A centralized handler for the `@crowdstrike/foundry-js` SDK using Svelte 5 `$state` runes.
- **Why**: The SDK connection is a global resource. By placing it in a `.svelte.ts` file, we create a reactive singleton. Any component can import `ready` or `getFalcon()` and automatically re-render when the connection status changes. This avoids the need for complex context providers and ensures the SDK is available even in non-component logic like SvelteKit `load` functions.

### 4. Navigation Synchronization (`+layout.svelte`)
- **What**: Uses the `beforeNavigate` hook to intercept all internal link clicks and route them through the Falcon SDK.
- **Why**: Because Foundry wraps your app in a sandboxed iframe, standard browser navigation must be communicated to the parent frame to keep the URL in sync and prevent broken navigation. This ensures that while SvelteKit uses hash-routing for the initial load, the Falcon Navigation API remains the source of truth for all active navigation.
- **The Prefix System**:
    - **`/internal/*`**: Used for navigation within your application. In production, this calls `navigateTo` with `type: 'internal'`. In local dev, it is automatically converted to hash-based routing (`/#/*`).
    - **`/falcon/*`**: Used for navigation to other areas of the Falcon console. In production, this calls `navigateTo` with `type: 'falcon'`.
    - **External Links**: Any other link (e.g., `https://google.com`) is automatically intercepted and opened in a new tab via the Falcon SDK (using `target: '_blank'` internally).

### 5. Render Gating (`+layout.svelte`)
- **What**: A conditional `{#if ready}` block in the root layout.
- **Why**: The Foundry SDK must perform an asynchronous handshake with the parent frame before it can be used. By gating the entire application render until `ready` is true, we guarantee that any child component can call `getFalcon()` immediately in its initialization logic without checking for `null` or handling "unconnected" states.

---

## Routing & Linking

To ensure navigation works correctly both in local development and within the Falcon console, follow these linking conventions. Note that while hash-based routing is enabled to handle initial page loads, all subsequent navigation must go through the Falcon Navigation API (via the prefix system below) to keep the browser URL in sync.

- **Internal Links**: Use the `/internal/` prefix for all links within your application.
  ```html
  <a href="/internal/my-page">Go to My Page</a>
  ```
- **Falcon Links**: Use the `/falcon/` prefix to navigate to other pages in the Falcon console.
  ```html
  <a href="/falcon/investigate/events">View Events</a>
  ```
- **External Links**: Standard external URLs will automatically open in a new tab via the Falcon SDK. **Do not use `target="_blank"` on these links.**
  ```html
  <a href="https://docs.crowdstrike.com">Documentation</a>
  ```

> [!IMPORTANT]  
> **Avoid `target="_blank"`**: Do not add `target="_blank"` to your links. The template's navigation handler automatically manages opening external links in new tabs using the Falcon SDK. Manually adding `target="_blank"` will bypass this handler and break external routing within the Falcon console.

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
