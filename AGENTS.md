# AGENTS.md

Guidance for agents working on `@ewanc26/svelte-standard-site`. The README identifies `pkgs/packages/svelte-standard-site` as the canonical maintained source; treat this standalone repository as historical unless explicitly asked to update it.

## Package contracts

- `src/lib/` is the published Svelte package; public exports and component props are API contracts.
- `src/routes/` is the development/demo app, not package runtime.
- `docs/` and `API.md` describe consuming applications; `scripts/` supports packaging/publishing.
- AT Protocol readers, publishers, comments, verification, facets, and open-union content must interoperate across implementations.

## Rules

- Prefer fixes in the canonical `pkgs` package. If synchronizing here, record the direction and avoid divergent implementations.
- Use pnpm, preserve peer dependency ranges, and keep Svelte 5/SvelteKit SSR compatibility.
- Never expose signing credentials or tokens to client bundles.
- Do not hand-edit generated package output under `dist/`.

## Validation

Run `pnpm check`, `pnpm test`, `pnpm lint`, and `pnpm build` (which includes packaging and `publint`). Exercise SSR, browser hydration, record parsing/publishing, comments, and package imports. Do not publish from this archived copy without explicit direction.
