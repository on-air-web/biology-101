# Biology 101

Calculators, sequence tools and laboratory utilities for biology, in one place.

Biology tools are scattered across hundreds of sites, and many of them are
unsourced or subtly wrong. Biology 101 aims to be the one place that is both
comprehensive and trustworthy: every calculation cites the formula it uses, and
every tool is tested against published reference values.

Nothing you type is uploaded.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run verify   # typecheck, lint, format check, tests
```

## Project structure

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), which also documents how to
add a new tool.

## Status

Early development. The tool contract and repository foundation are in place;
the design system, catalog and tool pages are being built milestone by
milestone.

## Licence

MIT — see [LICENSE](LICENSE). Third-party attributions are recorded in
[docs/ATTRIBUTIONS.md](docs/ATTRIBUTIONS.md).

## Deployment

Cloudflare Pages, GitHub-connected. No server runtime — the build produces a
folder of static files.

| Setting          | Value                |
| ---------------- | -------------------- |
| Build command    | `npm run build`      |
| Output directory | `out`                |
| Node version     | `.node-version` (20) |

Set `NEXT_PUBLIC_SITE_URL` to the site's real origin. It is used for canonical
URLs, the sitemap and social metadata. The fallback assumes a Pages project
named `biology-101`.

The build requires network access: `next/font` downloads and self-hosts the
font files at build time.
