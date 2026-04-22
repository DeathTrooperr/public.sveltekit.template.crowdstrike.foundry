# adapter-falcon

A [SvelteKit adapter](https://svelte.dev/docs/kit/adapters) for [CrowdStrike Foundry](https://www.crowdstrike.com/platform/next-gen-siem/foundry/) that prerenders your app as static files and rewrites asset paths so they resolve correctly inside Foundry's sandboxed iframe environment.

## Why this exists

SvelteKit's static adapter emits absolute asset paths in generated HTML and JS, for example:

```html
<script src="/_app/immutable/entry/start.abc123.js"></script>
```

Inside Foundry's iframe, your app is served from a UUID-prefixed URL:

```
https://falcon.crowdstrike.com/foundry/apps/<uuid>/index.html
```

An absolute `/_app/...` path resolves against the root of the Foundry domain instead of your app bundle directory, so every asset 404s. This adapter post-processes the build output to rewrite every `/_app/` reference to `./_app/`, which resolves correctly relative to wherever `index.html` is served from.

## Installation

```bash
npm install --save-dev adapter-falcon
# or
pnpm add -D adapter-falcon
```

## Usage

```js
// svelte.config.js
import adapter from 'adapter-falcon';

export default {
  kit: {
    // Zero-config for Foundry — nothing else required.
    // The fallback page is generated automatically when router.type is 'hash'.
    // SSR and prerender do not need to be configured.
    adapter: adapter(),
    router: { type: 'hash' },
  },
};
```

All options are optional. The only reason to pass options is if you need a non-default output directory, compression, or are using pathname routing instead of hash routing.

```js
// svelte.config.js — explicit options shown for reference
import adapter from 'adapter-falcon';

export default {
  kit: {
    adapter: adapter({
      pages:       'build',
      assets:      'build',       // defaults to the value of pages
      fallback:    'index.html',  // auto-set when router.type is 'hash'
      precompress: false,
      strict:      true,
    }),
    router: { type: 'hash' },
  },
};
```

## Options

All options are optional.

| Option | Type | Default | Description |
|---|---|---|---|
| `pages` | `string` | `'build'` | Directory to write prerendered pages to |
| `assets` | `string` | value of `pages` | Directory to write client-side assets to |
| `fallback` | `string` | `'index.html'` when hash routing, otherwise unset | Filename of the SPA fallback page. Auto-set when `router.type` is `'hash'` |
| `precompress` | `boolean` | `false` | Generate `.gz` and `.br` compressed asset files |
| `strict` | `boolean` | `true` | Throw if any routes are not fully prerenderable. Ignored in hash-router mode |

## How the path rewriting works

After the standard static build pipeline runs, the adapter walks all `.html` and `.js` files in the output directory and applies three regex substitutions:

| Pattern | Example input | Example output |
|---|---|---|
| HTML attribute values | `src="/_app/..."` | `src="./_app/..."` |
| JS / JSON string literals | `"/_app/..."` | `"./_app/..."` |
| Bare ES module specifiers | `import("/_app/...")` | `import("./_app/...")` |

Each substitution is anchored to a preceding delimiter (quote character, whitespace, or open punctuation) to avoid false positives on unrelated content.

## Relationship to `@sveltejs/adapter-static`

This adapter is a thin post-processing wrapper around the same build pipeline that `@sveltejs/adapter-static` uses. It supports the same `AdapterOptions` interface and performs identical validation. The only additional step is the `/_app/` path rewriting pass that runs after the build completes.

## Development

```bash
# Install dependencies
npm install

# Type-check
npm run check

# Run tests
npm test

# Build (compiles TypeScript to dist/)
npm run build
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT](./LICENSE) — Mullaney Strategic Systems LLC

---

*CrowdStrike and Falcon are trademarks or registered trademarks of CrowdStrike, Inc. in the United States and other countries. This project is not affiliated with, sponsored by, or endorsed by CrowdStrike, Inc.*
