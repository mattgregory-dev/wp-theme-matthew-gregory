# Design handoff

How a mockup becomes theme tokens. The short version: **the mockup adapts to the
token contract, not the other way round.**

## The contract is the slugs, not the values

The palette, type ladder and spacing scale carry **role names inherited from
starter-blocks** — `base`, `contrast`, `contrast-2`, `muted`, `surface-1..3`,
`surface-dark`, `border`, `brand`, `link`. Reseeding a project means changing
their **values**. It does not mean renaming them.

Three reasons this holds even when the mockup's own names are better prose:

- **Portability.** A block or pattern built here can be promoted back into
  starter-blocks unchanged. Rename the slugs and every promotion becomes a
  rewrite — which is exactly how fj-blocks and starter-blocks drifted apart.
- **A reseed should be values-only.** Changing hex codes is a dozen lines.
  Renaming slugs is a sweep across SCSS, patterns, template parts and block
  attributes, with `has-border-color` — WordPress's generic marker class, not
  the `border` slug — waiting to be clobbered by a careless find-and-replace.
- **Role names survive a redesign.** A slug named for a hue is a lie the day the
  hue changes. `brand` is still true when navy becomes green.

**Additions are fine, renames are not.** The contract is append-only, so a
design that needs more than the base set gets more slugs: this theme added
`brand-deep`, `brand-bright`, `brand-light`, `brand-wash`, `border-soft`,
`border-tint`, `surface-dark-2`, `warm-gray`, and the `dark-*` band set.

## What a good handoff looks like

Ask the design tool for tokens **already expressed as `theme.json`** — a
`settings.color.palette`, `settings.typography.fontSizes` and
`settings.spacing.spacingSizes` using the slugs above. Then seeding the theme is
a paste, and no conversion step exists to get wrong.

When that isn't possible and the mockup arrives with its own `:root` names, the
conversion is mechanical, and the mapping used for this build is the reference:

| Mockup | Slug | |
|---|---|---|
| `--white` | `base` | |
| `--canvas` | `surface-1` | page canvas |
| `--tint` | `surface-2` | |
| `--line-strong` | `surface-3` | |
| `--dark-bg` / `--dark-bg-2` | `surface-dark` / `surface-dark-2` | |
| `--ink` | `contrast` | |
| `--ink-3` | `contrast-2` | |
| `--ink-2` | `muted` | |
| `--line` | `border` | |
| `--navy` | `brand` *and* `link` | one value, two roles |
| `--navy-deep` | `brand-deep` *and* `link-hover` | |

`brand` and `link` holding the same value is deliberate, not duplication: they
are separate roles that happen to coincide in this design, and either can move
without dragging the other with it.

## Type and spacing

Font sizes keep the CSS keyword ladder (`xx-small` … `xx-large`, `huge`), with
**`display` appended** above `huge` — display type in this design has four
tiers and the keyword ladder tops out at three. Spacing uses the same keyword
names on WordPress's numeric slugs (`20`–`80`), so one vocabulary covers both
scales.

Those names deviate from core, which labels the spacing steps `1`–`7`. That is
deliberate: `defaultSpacingSizes` is `false` and every value is the mockup's,
so core's labels would be describing values core never chose. **Every other
scale here already leaves core's defaults behind** — palette, font sizes,
shadows, gradients — and spacing was the last one still wearing them.

**Where the mockup supplies its own `clamp()`, keep its shape but convert px to
rem.** The curve is a design decision and WordPress's fluid calculator would
re-derive a different one from the max, so the preset carries the mockup's own
clamp with `"fluid": false`. The px→rem conversion is not cosmetic: with px
bounds, a visitor browsing at a 20px root gets larger text against unchanged
padding, and the rhythm collapses for exactly the people who adjusted it. At a
16px root the two are identical, so it costs nothing.

**Clamp what the mockup clamps, and nothing else.** In this design not one
`gap` or `margin` is fluid — all of its clamps are band padding, the gutter,
and type. So spacing `20`–`70` are fixed rem and only `80`, the band step,
breathes. Component rhythm holding still while the outer frame flexes is the
design; making the middle steps fluid to match another theme would quietly
undo it.

**Headings size by level**, never by class — `styles.elements.h1..h6` own the
scale, so patterns carry no font-size class and the ladder can be retuned in one
place.

## One value, one token

When the mockup names something an existing token already covers, use the
existing token. Its eyebrow is the mono face at a smaller size — that is
`mono`, not a new `eyebrow` family, and the treatment around it (uppercase,
tracking, the accent rule) is a **block style**, which is where a repeated
*role* belongs. A second slug rendering the same file is an ambiguity in the
picker and a coin-flip at every call site.

Where two names are genuinely wanted, make one reference the other rather than
repeating the literal. `--wp--custom--pad--band` is
`var(--wp--preset--spacing--80)`: the preset is the editor-selectable step, the
custom name lets a section stylesheet read alongside its eight `--pad--*`
siblings, and retuning the band rhythm stays a one-line edit.

`brand` / `link` is the deliberate exception — same value, two roles that can
move independently.

## What does not become a token

Values that are one component's business — a card's internal gap, a fixed media
dimension — stay in that component's SCSS. The test is whether a second
component would ever legitimately reference it. Band rhythm, measure caps, radii
and easing did meet that test and live in `settings.custom`
(`--wp--custom--pad--*`, `--wp--custom--measure--*`).

See [ARCHITECTURE.md](ARCHITECTURE.md#units-spacing-preset-vs-rem-vs-px) for
which unit a given value should be expressed in.
