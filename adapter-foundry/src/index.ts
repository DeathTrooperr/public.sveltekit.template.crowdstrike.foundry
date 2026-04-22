/**
 * adapter-falcon
 *
 * A SvelteKit adapter for CrowdStrike Foundry that prerenders your app as
 * static files and post-processes the output to rewrite absolute `/_app/`
 * asset paths to relative `./_app/` paths.
 *
 * ─── Why this exists ─────────────────────────────────────────────────────────
 *
 * SvelteKit's static adapter always emits absolute asset paths in generated
 * HTML and JS (e.g. `src="/_app/immutable/..."`). In Foundry's sandboxed
 * iframe environment, your app is served from a UUID-prefixed URL:
 *
 *   https://falcon.crowdstrike.com/foundry/apps/<uuid>/index.html
 *
 * An absolute `/_app/...` path resolves against the root of the Foundry
 * domain rather than your app bundle, so every asset 404s. Rewriting to
 * `./_app/...` makes paths resolve correctly relative to wherever
 * `index.html` is served from, regardless of the UUID prefix.
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 * ```js
 * // svelte.config.js
 * import adapter from 'adapter-falcon';
 *
 * export default {
 *   kit: {
 *     // Minimal zero-config setup for Foundry — no extra options needed.
 *     // The fallback is generated automatically when router.type is 'hash'.
 *     // SSR and prerender do not need to be configured.
 *     adapter: adapter(),
 *     router: { type: 'hash' },
 *   },
 * };
 * ```
 *
 * ─── Based on ────────────────────────────────────────────────────────────────
 *
 * @sveltejs/adapter-static 3.x
 * https://github.com/sveltejs/kit/tree/main/packages/adapter-static
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import type { Adapter, Builder } from '@sveltejs/kit';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface AdapterOptions {
  /**
   * The directory to write prerendered pages to.
   * @default 'build'
   */
  pages?: string;

  /**
   * The directory to write static client assets to.
   * When omitted, defaults to the same value as `pages`.
   */
  assets?: string;

  /**
   * The filename of a fallback page to generate for unmatched routes.
   *
   * When `router.type` is set to `'hash'` in your SvelteKit config (the
   * recommended Foundry mode), this defaults to `'index.html'` automatically
   * and does not need to be set.
   *
   * Only set this explicitly when using pathname routing with a custom
   * fallback filename.
   *
   * See https://svelte.dev/docs/kit/single-page-apps
   */
  fallback?: string;

  /**
   * Whether to generate Brotli- and Gzip-compressed versions of assets.
   * Useful if your static file server can serve pre-compressed files.
   * @default false
   */
  precompress?: boolean;

  /**
   * When `true`, the adapter will throw if any routes are not fully
   * prerenderable. Set to `false` if you are intentionally using a fallback
   * page to handle dynamic client-side routes.
   * @default true
   */
  strict?: boolean;
}

// ─── Adapter factory ──────────────────────────────────────────────────────────

export default function adapterFalcon(options: AdapterOptions = {}): Adapter {
  return {
    name: 'adapter-falcon',

    async adapt(builder: Builder): Promise<void> {
      const {
        pages = 'build',
        assets = pages,
        precompress = false,
        strict = true,
      } = options;

      const isHashRouter = builder.config.kit.router?.type === 'hash';

      // When using hash-based routing (the recommended Foundry mode), the
      // entire app is a client-side SPA. SvelteKit never runs on the server,
      // so SSR and prerender settings are irrelevant — every route is handled
      // by the client after the single index.html shell loads. The fallback
      // is unconditionally required in this mode and always named index.html,
      // so we set it automatically rather than making the user spell it out.
      //
      // For pathname routing we preserve the explicit fallback option so the
      // user can supply whatever filename their static host expects.
      const fallback = options.fallback ?? (isHashRouter ? 'index.html' : undefined);

      // ── 1. Validate prerenderable routes ─────────────────────────────────
      //
      // Hash-router mode is a pure SPA — prerender and SSR have no bearing on
      // the build, so we skip this check entirely. For pathname routing we
      // mirror the check adapter-static performs so users get a clear error
      // instead of a silently broken build when dynamic routes exist without
      // a fallback configured.

      if (!isHashRouter && !fallback) {
        const dynamicRoutes = builder.routes.filter(
          (route) => route.prerender !== true,
        );

        if (dynamicRoutes.length > 0 && strict) {
          const routesDir = relative('.', builder.config.kit.files.routes);
          const hasParamRoutes = builder.routes.some((r) =>
            r.id.includes('['),
          );

          const configHint =
            hasParamRoutes ||
            JSON.stringify(builder.config.kit.prerender.entries) !== '"*"'
              ? `  - adjust the \`prerender.entries\` config option` +
                (hasParamRoutes
                  ? ' (routes with parameters are not entry points by default)'
                  : '') +
                ' — see https://svelte.dev/docs/kit/configuration#prerender'
              : '';

          builder.log.error(
            `adapter-falcon: all routes must be fully prerenderable, but found the following dynamic routes:\n` +
              dynamicRoutes
                .map((r) => `  - ${join(routesDir, r.id)}`)
                .join('\n') +
              '\n\n' +
              'You have the following options:\n' +
              "  - use hash-based routing: set `router: { type: 'hash' }` in svelte.config (recommended for Foundry)\n" +
              "  - set the `fallback` option for SPA / pathname-router mode — see https://svelte.dev/docs/kit/single-page-apps\n" +
              "  - add `export const prerender = true` to your root `+layout.js/.ts` or `+layout.server.js/.ts`\n" +
              "  - add `export const prerender = true` to any `+server.js/.ts` files not fetched by page load functions\n" +
              (configHint ? configHint + '\n' : '') +
              "  - pass `strict: false` to suppress this error (only if you are sure those routes are not needed)",
          );

          throw new Error('adapter-falcon: encountered dynamic routes');
        }
      }

      // ── 2. Clean output directories ───────────────────────────────────────

      builder.rimraf(assets);
      builder.rimraf(pages);

      // ── 3. Write the static build output ─────────────────────────────────
      //
      // generateEnvModule() must be called before writeClient() so the env
      // shim ($env/static/public, etc.) is available in the client bundle.

      builder.generateEnvModule();
      builder.writeClient(assets);
      builder.writePrerendered(pages);

      if (fallback) {
        await builder.generateFallback(join(pages, fallback));
      }

      // ── 4. Optional compression ───────────────────────────────────────────

      if (precompress) {
        builder.log.minor('adapter-falcon: compressing assets...');
        if (pages === assets) {
          await builder.compress(assets);
        } else {
          await Promise.all([
            builder.compress(assets),
            builder.compress(pages),
          ]);
        }
      }

      // ── 5. Rewrite absolute /_app/ paths to relative ./_app/ ─────────────
      //
      // This is the core purpose of adapter-falcon. SvelteKit's static adapter
      // always emits absolute /_app/ paths. Foundry's iframe sandbox serves
      // the app from a UUID-prefixed path, so absolute paths 404. Relative
      // paths resolve correctly regardless of the URL prefix.

      builder.log.minor(
        'adapter-falcon: rewriting asset paths for Foundry sandbox...',
      );

      let patchCount = rewriteDirectory(pages, builder);
      if (assets !== pages) {
        patchCount += rewriteDirectory(assets, builder);
      }

      builder.log.minor(
        `adapter-falcon: rewrote paths in ${patchCount} file(s)`,
      );

      // ── 6. Done ───────────────────────────────────────────────────────────

      if (pages === assets) {
        builder.log(`adapter-falcon: wrote site to "${pages}"`);
      } else {
        builder.log(
          `adapter-falcon: wrote pages to "${pages}" and assets to "${assets}"`,
        );
      }
    },
  };
}

// ─── Path rewriting ───────────────────────────────────────────────────────────

/**
 * Recursively walk `dir` and rewrite `/_app/` to `./_app/` in every `.html`
 * and `.js` file found. Returns the number of files that were modified.
 */
function rewriteDirectory(dir: string, builder: Builder): number {
  let count = 0;

  function walk(current: string): void {
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(current, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
        continue;
      }

      const ext = extname(entry).toLowerCase();
      if (ext !== '.html' && ext !== '.js') continue;

      const original = readFileSync(fullPath, 'utf-8');
      const patched = rewritePaths(original);

      if (patched !== original) {
        writeFileSync(fullPath, patched, 'utf-8');
        builder.log.minor(`  patched: ${fullPath}`);
        count++;
      }
    }
  }

  walk(dir);
  return count;
}

/**
 * Rewrite all occurrences of the absolute `/_app/` path prefix to the
 * relative `./_app/` prefix within a single file's content string.
 *
 * SvelteKit emits `/_app/` references in several contexts:
 *
 * HTML attribute values
 *   `src="/_app/..."` `href="/_app/..."` `content="/_app/..."`
 *
 * JS / JSON string literals (module preload manifests, dynamic imports)
 *   `"/_app/..."` `'/_app/...'` `` `/_app/...` ``
 *
 * ES module specifiers (static and dynamic imports in the JS bundle)
 *   `from "/_app/..."` `import("/_app/...")`
 *
 * Each pattern is anchored to a preceding delimiter so we never accidentally
 * touch substrings embedded in unrelated content (e.g. a comment that
 * happens to contain `/_app/`).
 */
export function rewritePaths(content: string): string {
  return (
    content
      // HTML attribute values: src="/_app/  href="/_app/  content="/_app/  etc.
      .replace(
        /((?:src|href|content|action|data-[^=]*)=["'])(\/_app\/)/g,
        '$1./_app/',
      )
      // JS / JSON string literals: "/_app/  '/_app/  `/_app/
      .replace(/(['"`])(\/_app\/)/g, '$1./_app/')
      // Bare specifiers after whitespace or open punctuation:
      // covers `from /_app/`, `import(/_app/`, `, /_app/`
      .replace(/([\s(,])(\/_app\/)/g, '$1./_app/')
  );
}
