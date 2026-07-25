# Attributions and licences

Biology 101 integrates open-source tools and public data rather than rebuilding
them. Every such dependency is recorded here and in the `attribution` field of
the tool's registry entry, so the tool page can display it.

## Application

MIT. See `LICENSE`.

## Upstream dependencies

_None yet._

| Component | Licence | Source | Notes |
| --------- | ------- | ------ | ----- |

## Images

Photographic assets come from the NIGMS Image and Video Gallery, licensed
**CC BY-NC-SA 3.0**. Creator, collection, licence and a `commercialUse` flag are
recorded per image in `src/lib/images.ts`, and rendered at `/credits`.

Two constraints ride along with that licence and are recorded in data rather
than in someone's memory:

- **NonCommercial** — fine while the site is free and carries no advertising.
  Blocking the day it isn't.
- **ShareAlike** — the banners crop and overlay the originals, which is an
  adaptation, so those derived banners inherit the same licence.

If the project ever needs commercially usable imagery, the sources to look at
are NCI Visuals Online items explicitly marked _Public Domain_, works by U.S.
federal employees, and CC BY or CC0 material on Wikimedia Commons. Note that the
general NIH Flickr gallery is **not** a blanket public-domain source — images
submitted by grantees can remain under the researcher's copyright.

Run `npm run images` to fetch and optimise the assets listed in the manifest.

## Rules

- Check the licence **before** adopting a dependency, not before launch.
- Copyleft (GPL/AGPL) code is acceptable in the application but must be flagged
  here, since it constrains a future plugin marketplace.
- Data sources often carry stricter terms than code. Non-commercial or
  attribution-locked datasets must be recorded with their restriction.
