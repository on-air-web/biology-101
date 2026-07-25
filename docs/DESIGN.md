# Design language

## Thesis

Biology 101 competes on trust, not on looks. The visual system exists to make a
result feel checkable. Everything below serves that.

## Colour

Sourced from laboratory materials, not abstract brand colour.

| Token       | Origin                            | Use                              |
| ----------- | --------------------------------- | -------------------------------- |
| `coomassie` | Stain-blue of a dyed protein gel  | Primary: actions, links, focus   |
| `phenol`    | Culture media acidifying to amber | Attention, beta status, warnings |
| `rose-lab`  | Healthy media at physiological pH | Saved/favourite state only       |
| `slate-lab` | Destained gel background          | Surfaces, rules, secondary text  |

Amber is not a decorative choice. Every cell biologist reads yellowing media as
"check this", so the warning colour is already learned by the audience.

Rose is deliberately restricted to a single meaning. A second accent used
freely becomes a second primary, and the palette stops meaning anything.

Components reference the **semantic** tokens (`surface`, `ink`, `line`,
`brand`) and never raw palette values. Dark mode is therefore one block of
variable overrides rather than a variant on every component.

## Type

| Role    | Face          | Why                                                            |
| ------- | ------------- | -------------------------------------------------------------- |
| Display | Archivo       | Variable width axis, set expanded — instrument-panel lettering |
| Body    | IBM Plex Sans | Technical humanist, highly legible at small sizes              |
| Data    | IBM Plex Mono | Units, results, sequences                                      |

Headings are set at `wdth 112` with tight tracking. The width axis is where
this product's typographic personality lives, which means one variable font
file rather than a second family.

Monospace for sequences is functional, not stylistic: base positions must align
vertically to be countable. All numeric output uses tabular figures so a result
does not jitter as the user types.

## The Ladder

The signature element. A gel ladder is the reference lane every other lane is
read against; this is the same idea in an interface.

Under every computed result sits a tick-marked hairline followed by the formula
evaluated, the model chosen where one exists, the citation, and whether the
computation left the browser.

Rules:

- It is never collapsed behind a disclosure. Provenance that hides gets ignored.
- It renders for every tool without exception. A tool that cannot fill it in is
  a tool that is not ready to ship.
- It is quiet. Small type, muted colour, no border. It should read as a
  footnote, not a banner.

Everything else in the interface stays restrained so this one element carries
the identity.

## Quality floor

Not features, not negotiable: 44px minimum touch targets (this product is used
one-handed, on a phone, sometimes gloved), visible keyboard focus, reduced
motion respected, and a layout that works from 320px up.
