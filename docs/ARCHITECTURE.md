# Architecture

## Principles

1. **A tool page is the product.** Most users arrive from a search engine wanting
   one answer. Every tool is its own statically rendered page that works with no
   account, no onboarding and no JavaScript framework boot before first paint.
   The workspace layer (favourites, palette, dashboard) sits on top of that, not
   in front of it.
2. **Correctness is enforced, not promised.** Every tool ships with a citation
   and tests against known reference values. `registry.test.ts` fails CI if a
   tool is uncited or mis-linked.
3. **Computation stays in the browser.** Unpublished sequences and constructs
   must not be uploaded to a third party. Client-only compute is a privacy
   guarantee, and it also makes hosting nearly free and offline support cheap.
4. **Data is declared once.** The catalog, search index, command palette,
   sitemap and page metadata all derive from the tool registry.

## Stack

| Concern    | Choice                       | Why                                                                            |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------ |
| Framework  | Next.js (App Router)         | Static export today; grows into accounts and AI features without a rewrite.    |
| Language   | TypeScript (strict)          | Scientific inputs are exactly where silent type coercion causes wrong answers. |
| Styling    | Tailwind CSS v4              | CSS-first tokens; no config drift between design system and components.        |
| Components | shadcn/ui (from Milestone 2) | Owned source, not a dependency we cannot restyle.                              |
| Tests      | Vitest                       | Fast, runs the pure compute layer with no DOM.                                 |
| Hosting    | Cloudflare Pages             | Static output, global edge, zero runtime cost.                                 |

Next.js is marginally heavier than Astro for a static tool site today. It was
chosen anyway because the roadmap ends in accounts, saved projects and an AI
assistant — migrating a framework later is more expensive than the extra weight
now.

## Layout

```
src/
  app/                 routes, layouts, metadata
  lib/tools/           the registry: types, categories, lookup helpers
  tools/<tool-id>/
    meta.ts            registry entry: identity, keywords, citations
    compute.ts         pure functions, no React, no DOM
    compute.test.ts    tests against published reference values
    ui.tsx             the form and result view (added per tool)
docs/                  architecture and contributor documentation
```

The `compute.ts` / `ui.tsx` split is load-bearing. Keeping computation free of
React means it can move to a Web Worker, compile to WASM, or be exposed through
a public API with no change. ESLint enforces the boundary.

## Adding a tool

1. `mkdir src/tools/<tool-id>`
2. Write `compute.ts` — pure functions, canonical SI-ish units (grams, litres,
   mol/L). Unit parsing happens at the UI edge.
3. Write `compute.test.ts` — at least one case checked against a published
   value or an established tool (NEB, IDT, ExPASy). Note the source in a comment.
4. Write `meta.ts` — include the abbreviations and phrasings people actually
   type, not just the formal name.
5. Register it in `src/lib/tools/registry.ts`.
6. `npm run verify`.

## Open questions

- Restriction enzyme data (REBASE) and some codon usage tables carry usage
  terms that need checking before those tools are built.
- BLAST cannot be self-hosted at reasonable cost; it would be a proxy to NCBI
  with their rate limits. Deferred until the catalog is strong enough to justify
  owning that support burden.

## URL scheme

| Path                   | Page                      |
| ---------------------- | ------------------------- |
| `/`                    | Landing                   |
| `/tools`               | Full catalog              |
| `/tools/<tool-id>`     | A single tool             |
| `/categories/<cat-id>` | Tools within one category |

All internal links are built through `src/lib/routes.ts` rather than written as
string literals, so the scheme can change in one place. Tool ids are permanent
once shipped — they are the URL, and a broken tool URL is a broken bookmark in
someone's lab notebook.

Every route is statically generated from the registry via
`generateStaticParams`, and `sitemap.ts` derives from the same source, so a new
tool becomes a built page and an indexed URL with no extra wiring.

## The tool pattern

A tool folder contains four files:

| File              | Role                                                          |
| ----------------- | ------------------------------------------------------------- |
| `meta.ts`         | Registry entry: identity, keywords, citations                 |
| `compute.ts`      | Pure functions in canonical units. No React, no unit prefixes |
| `compute.test.ts` | Reference values from published sources                       |
| `ui.tsx`          | Client component: inputs, result, and its own Ladder          |

Two boundaries make this work and should not be crossed:

1. **Prefixes live only at the UI edge.** `compute.ts` receives grams, litres
   and mol/L. `src/lib/units.ts` is the sole translator. This is what prevents
   the classic calculator bug where a value is scaled twice on one code path
   and not at all on another.
2. **The tool owns its Ladder, not the page.** Formula and model change with
   what the user is solving for, so the page cannot render provenance
   correctly on the tool's behalf.

Register the component in `src/components/tools/tool-body.tsx` with a literal
`import()`.

That map has to live in a **Client Component**. All tools share one dynamic
route, and when the `next/dynamic` calls sit in a Server Component every
referenced client component is pulled into the shared route bundle and nothing
splits — measured at roughly 1.3 kB gzipped per tool, so ~100 kB by the time
the catalogue is full. Moving the boundary into a Client Component took the
route chunk from 9.0 kB to 2.1 kB and made it flat rather than linear in the
number of tools.

The forms still server-render: the static HTML for each tool page contains the
inputs and the Ladder, so the page is indexable and readable before hydration.

`npm run check:bundle` enforces this after a build and runs in CI. If the
budget is ever exceeded, the import map has almost certainly drifted back into
a Server Component.

## Search

`src/lib/search.ts` is hand-rolled rather than a fuzzy-search dependency. The
corpus is small and known at build time, and the ranking rules are
domain-specific: "mw" must reach the molecular weight calculator and "tm" the
melting temperature calculator. Generic edit-distance matchers get both wrong,
at a cost of roughly 15 kB.

Fuzzy matching is deliberately absent. "Dilution" and "dilation" are different
words in a laboratory, and quietly treating them as neighbours is worse than
returning nothing. Every query term must match, so adding a word always
narrows.

Search quality is a tested property, not a vibe — `search.test.ts` asserts the
abbreviations people actually type resolve to the right tool.

## Planned tools

`src/lib/tools/planned.ts` holds metadata-only entries for announced but
unbuilt tools. They appear in the catalog and in search results, render as
non-interactive cards, and are excluded from the sitemap, the routes and the
command palette. The palette is a launcher; offering something unlaunchable
would waste the fastest path in the product.

## Build notes

Two constraints that are easy to trip over and were only caught by a real
build:

- **`next/font` axes and weights are mutually exclusive.** Requesting a
  variable axis (`axes: ['wdth']` on Archivo) means taking the full variable
  weight range; adding a `weight` array fails the build.
- **Metadata routes need `export const dynamic = 'force-static'`** under
  `output: 'export'`. Without it `sitemap.ts` and `robots.ts` are treated as
  dynamic and the export fails.

ESLint is wired to `@next/eslint-plugin-next` directly rather than through
`eslint-config-next`, whose legacy entry pulls in `@rushstack/eslint-patch`.
That patch does not survive ESLint 9 flat config and breaks both `npm run lint`
and the lint step inside `next build`.

The build needs network access to Google Fonts, since `next/font` downloads and
self-hosts the files at build time. CI and local machines have it; sandboxes
often do not.

## Preferences

Local only, in `localStorage`, under a single versioned key. There are no
accounts, and favourites plus recent tools are not worth asking anyone to
create one.

`src/lib/preferences.ts` holds pure functions over the state; only two
functions touch storage, so the logic is tested without a DOM. Stored data that
does not match the current schema version is discarded rather than migrated —
this is convenience data, and a corrupt blob must cost someone their
favourites, never a crash on a page they opened to do a calculation.

Because pages are prerendered with no knowledge of any user, the
`usePreferences` hook exposes `ready` and callers render nothing personal until
it is true. Anything else is a hydration mismatch on every tool page.
