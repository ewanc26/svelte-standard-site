# AGENTS.md

Guidance for the historical standalone copy of `@ewanc26/svelte-standard-site`. The maintained package is `pkgs/packages/svelte-standard-site`; route fixes, releases, and API development there unless the user explicitly requests archival repair or synchronization here. This copy is older (`0.1.0`) and lacks newer native-comment, ordered-list, action, and verification work present in the monorepo.

## Package surface

- `src/lib/index.ts` and the subpaths in `package.json` are the public API: Svelte components, `SiteStandardClient`, `StandardSitePublisher`, theme store, schemas/types, content/comments/verification utilities, and CSS. `src/routes/` is only the demo application.
- `client.ts` resolves the configured DID to its PDS, paginates `site.standard.publication` and `site.standard.document`, converts blob refs, and uses a process-wide in-memory cache. It often converts upstream failures to `null`/empty arrays; preserve the distinction deliberately when changing error behavior.
- `publisher.ts` authenticates with an app password and creates/updates records. Record keys must be valid 13-character AT Protocol TIDs, published collection/type values must match the Standard.site contracts, and updates need concurrency semantics rather than blind overwrite.
- `components/document/` renders remote Markdown and Leaflet-style block unions, including images, websites, Bluesky posts, and iframes. Unknown blocks are displayed with their JSON for forward compatibility.
- `utils/comments.ts` recursively refetches Bluesky thread nodes and can search URL mentions; it is Bluesky-AppView federation, not native Standard.site comments. `utils/verification.ts` generates and fetches public ownership signals but does not itself establish that fetched record content matches a site.

## Security and compatibility

- Treat DID documents, PDS endpoints, records, Markdown/HTML, themes, blob/image URLs, iframe/website/button URLs, Bluesky posts, comments, and pagination cursors as untrusted. Enforce safe schemes, sanitize rendered markup, sandbox/allowlist embeds, bound recursion/pages/payloads, and keep remote JSON out of executable HTML.
- DIDs identify repositories; handles are mutable. Resolve the PDS for the authenticated DID and do not silently send credentials or writes to the public Bluesky API/fallback. Never expose `ATPROTO_APP_PASSWORD`, sessions, or server-only environment values to browser bundles.
- The cache is shared by all client instances and its default TTL is mutated in each constructor. Cache keys and invalidation must remain DID/rkey-aware and must not leak data across SSR requests or retain stale identity/PDS mappings indefinitely.
- Preserve Svelte 5 SSR/hydration safety, peer ranges, component prop/event contracts, exported types/subpaths, CSS side effects, semantic theme variables, and ESM packaging. Do not deep-import or hand-edit `dist/`.
- Content transforms are regex-based rather than a full Markdown/HTML parser. Test nested markup, Unicode, code, parentheses/relative URLs, unsafe schemes, and malformed open unions rather than assuming regex cleanup is sanitization.

## Working and validation

- If explicitly syncing from `pkgs`, compare the complete source, manifest, docs, dependencies, exports, tests, and version; document the direction. Do not manually cherry-pick a few files and claim parity.
- Use pnpm and preserve the standalone lockfile. Run `pnpm check`, `pnpm test`, `pnpm lint`, and `pnpm build`; the build packages `src/lib` and runs `publint`. Inspect a package tarball and test root/subpath/CSS imports in SSR and browser consumers.
- Manually cover PDS resolution and pagination, malformed/unknown records, cache separation, publication/document create/update, TID ordering, Markdown and every block renderer, iframe/link safety, comments depth/failure, verification redirects, theme persistence, and hydration.
- `scripts/test-publisher.js` performs live writes. Run it only with explicit authorization and a disposable account. Do not publish this archived copy or commit `.env`, app passwords/tokens, fetched content, `.svelte-kit/`, `dist/`, or test output.
