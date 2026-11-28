# Contributing to @ewanc26/svelte-standard-site

A SvelteKit library for reading and writing AT Protocol longform content via `site.standard.*` records: design system, publisher, federated Bluesky comments and verification helpers.

## Where to contribute

**This repository is historical context.** The canonical source lives in the [`@ewanc26/pkgs`](https://github.com/ewanc26/pkgs) monorepo under [`packages/svelte-standard-site`](https://github.com/ewanc26/pkgs/tree/main/packages/svelte-standard-site). Please open issues and pull requests there, not here.

See [pkgs' CONTRIBUTING.md](https://github.com/ewanc26/pkgs/blob/main/CONTRIBUTING.md) for the monorepo workflow and checks.

## Quick reference (from the monorepo)

Local commands, run from `packages/svelte-standard-site`:

```bash
pnpm build       # svelte-package → dist/
pnpm check       # svelte-check
pnpm test        # vitest run
```

Requires Svelte 5 and SvelteKit 2 (peer dependencies); `zod` alongside the package. Type-safe (Zod validation throughout), SSR-ready via SvelteKit's `fetch`.

## Licence

AGPL-3.0 (see [LICENSE](LICENSE)). Contributions are accepted under the same terms.
