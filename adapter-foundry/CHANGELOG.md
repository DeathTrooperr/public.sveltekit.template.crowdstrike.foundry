# Changelog

## 1.0.0 — Initial release

- Full SvelteKit adapter for CrowdStrike Foundry
- Post-processes static build output to rewrite absolute `/_app/` asset paths
  to relative `./_app/` paths, required for Foundry's sandboxed iframe
  environment
- Mirrors the `AdapterOptions` interface of `@sveltejs/adapter-static`:
  `pages`, `assets`, `fallback`, `precompress`, `strict`
- Correctly calls `builder.generateEnvModule()` before `builder.writeClient()`
- Deduplicates `precompress` calls when `pages === assets`
- Full TypeScript source with declaration maps
