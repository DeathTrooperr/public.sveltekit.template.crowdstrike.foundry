import { describe, it, expect } from 'vitest';
import { rewritePaths } from '../src/index.js';

// ─── rewritePaths ─────────────────────────────────────────────────────────────

describe('rewritePaths', () => {
  // ── HTML attribute values ──────────────────────────────────────────────────

  it('rewrites src="/_app/ in HTML', () => {
    expect(rewritePaths(`<script src="/_app/immutable/entry.js"></script>`)).toBe(
      `<script src="./_app/immutable/entry.js"></script>`,
    );
  });

  it('rewrites href="/_app/ in HTML', () => {
    expect(
      rewritePaths(`<link rel="stylesheet" href="/_app/immutable/style.css">`),
    ).toBe(`<link rel="stylesheet" href="./_app/immutable/style.css">`);
  });

  it('rewrites content="/_app/ in meta tags', () => {
    expect(rewritePaths(`<meta content="/_app/immutable/asset.png">`)).toBe(
      `<meta content="./_app/immutable/asset.png">`,
    );
  });

  it('rewrites data-* attributes', () => {
    expect(rewritePaths(`<div data-src="/_app/chunk.js">`)).toBe(
      `<div data-src="./_app/chunk.js">`,
    );
  });

  it('handles single-quoted HTML attributes', () => {
    expect(rewritePaths(`<script src='/_app/entry.js'></script>`)).toBe(
      `<script src='./_app/entry.js'></script>`,
    );
  });

  // ── JS string literals ─────────────────────────────────────────────────────

  it('rewrites double-quoted JS strings', () => {
    expect(rewritePaths(`const url = "/_app/immutable/chunk.js";`)).toBe(
      `const url = "./_app/immutable/chunk.js";`,
    );
  });

  it('rewrites single-quoted JS strings', () => {
    expect(rewritePaths(`const url = '/_app/immutable/chunk.js';`)).toBe(
      `const url = './_app/immutable/chunk.js';`,
    );
  });

  it('rewrites template-literal strings', () => {
    expect(rewritePaths('const url = `/_app/immutable/chunk.js`;')).toBe(
      'const url = `./_app/immutable/chunk.js`;',
    );
  });

  // ── ES module specifiers ───────────────────────────────────────────────────

  it('rewrites static import specifiers', () => {
    expect(rewritePaths(`import foo from "/_app/immutable/entry.js";`)).toBe(
      `import foo from "./_app/immutable/entry.js";`,
    );
  });

  it('rewrites dynamic import() calls', () => {
    expect(rewritePaths(`const mod = import("/_app/immutable/chunk.js");`)).toBe(
      `const mod = import("./_app/immutable/chunk.js");`,
    );
  });

  it('rewrites import specifiers after comma in import maps', () => {
    expect(rewritePaths(`{"imports": {"/_app/": "./_app/"}}`)).toBe(
      `{"imports": {"./_app/": "./_app/"}}`,
    );
  });

  // ── Multiple occurrences ───────────────────────────────────────────────────

  it('rewrites all occurrences in a single file', () => {
    const input = [
      `<script src="/_app/entry.js"></script>`,
      `<link href="/_app/style.css">`,
      `const a = "/_app/chunk.js";`,
    ].join('\n');

    const expected = [
      `<script src="./_app/entry.js"></script>`,
      `<link href="./_app/style.css">`,
      `const a = "./_app/chunk.js";`,
    ].join('\n');

    expect(rewritePaths(input)).toBe(expected);
  });

  // ── Non-matching cases ─────────────────────────────────────────────────────

  it('does not rewrite paths that are already relative', () => {
    const input = `<script src="./_app/entry.js"></script>`;
    expect(rewritePaths(input)).toBe(input);
  });

  it('does not rewrite _app paths without leading slash', () => {
    const input = `<script src="_app/entry.js"></script>`;
    expect(rewritePaths(input)).toBe(input);
  });

  it('does not rewrite paths where /_app/ is mid-string without a delimiter', () => {
    // e.g. a comment — no leading quote or whitespace directly before /_app/
    const input = `// see also: x/_app/foo for details`;
    expect(rewritePaths(input)).toBe(input);
  });

  it('returns unchanged content when there are no /_app/ references', () => {
    const input = `<html><body><p>Hello world</p></body></html>`;
    expect(rewritePaths(input)).toBe(input);
  });

  it('handles empty string', () => {
    expect(rewritePaths('')).toBe('');
  });

  // ── Realistic SvelteKit output ─────────────────────────────────────────────

  it('handles a realistic SvelteKit-generated index.html', () => {
    const input = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/_app/favicon.ico" />
    <meta name="viewport" content="width=device-width" />
    <link rel="modulepreload" href="/_app/immutable/entry/start.Bc7QIlFJ.js">
    <link rel="modulepreload" href="/_app/immutable/chunks/scheduler.BHQZB_KZ.js">
    <link rel="stylesheet" href="/_app/immutable/assets/app.Cb2XQNWT.css">
  </head>
  <body>
    <script type="module" src="/_app/immutable/entry/start.Bc7QIlFJ.js"></script>
  </body>
</html>`;

    const expected = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="./_app/favicon.ico" />
    <meta name="viewport" content="width=device-width" />
    <link rel="modulepreload" href="./_app/immutable/entry/start.Bc7QIlFJ.js">
    <link rel="modulepreload" href="./_app/immutable/chunks/scheduler.BHQZB_KZ.js">
    <link rel="stylesheet" href="./_app/immutable/assets/app.Cb2XQNWT.css">
  </head>
  <body>
    <script type="module" src="./_app/immutable/entry/start.Bc7QIlFJ.js"></script>
  </body>
</html>`;

    expect(rewritePaths(input)).toBe(expected);
  });

  it('handles a realistic SvelteKit-generated JS chunk with dynamic imports', () => {
    const input = `const c=()=>import("/_app/immutable/nodes/0.Bz1ABCDE.js"),d=()=>import("/_app/immutable/nodes/1.Cz2XYZAB.js");`;
    const expected = `const c=()=>import("./_app/immutable/nodes/0.Bz1ABCDE.js"),d=()=>import("./_app/immutable/nodes/1.Cz2XYZAB.js");`;
    expect(rewritePaths(input)).toBe(expected);
  });
});

// ─── Auto-fallback / hash-router logic ───────────────────────────────────────
//
// The adapt() function itself requires a live Builder from @sveltejs/kit and
// can't be unit-tested in isolation, but the fallback resolution logic is
// simple enough to verify with a small inline simulation.

describe('fallback resolution', () => {
  // Simulate the exact expression used inside adapt()
  function resolveFallback(
    explicitFallback: string | undefined,
    isHashRouter: boolean,
  ): string | undefined {
    return explicitFallback ?? (isHashRouter ? 'index.html' : undefined);
  }

  it('auto-sets fallback to index.html when hash routing and no explicit fallback', () => {
    expect(resolveFallback(undefined, true)).toBe('index.html');
  });

  it('respects an explicit fallback even when hash routing', () => {
    expect(resolveFallback('200.html', true)).toBe('200.html');
  });

  it('leaves fallback undefined for pathname routing with no explicit fallback', () => {
    expect(resolveFallback(undefined, false)).toBeUndefined();
  });

  it('uses explicit fallback for pathname routing', () => {
    expect(resolveFallback('404.html', false)).toBe('404.html');
  });
});
