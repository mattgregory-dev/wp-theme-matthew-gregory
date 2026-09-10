# Architecture

How this theme is put together, and the reasoning behind the layering. It is a
**Full Site Editing theme built native-first**: core blocks and patterns on a
tokenized `theme.json`, cloned from starter-blocks (see
[PIPELINE.md](PIPELINE.md), Stage 0) and reseeded for this design.

**There is no custom block layer.** The starter's six section blocks were
removed: their value is authoring guardrails for a client, and this site's only
author is its developer. What they cost — markup written twice (`render.php` and
`edit.js`), a webpack build between every edit, and block-validation failures —
is real on any size of site. Core blocks plus patterns express the same
sections. If something ever genuinely needs a block, the starter's are the
reference implementation.

## The styling model (read this first)

The theme has a strict priority order. Always reach for the **highest** layer
that can do the job; drop to a lower one only when the layer above genuinely
can't express it.

1. **`theme.json`** — colors, fluid type scale, spacing rhythm, shadows,
   `styles.elements` (headings, links, buttons, captions) and `styles.blocks`
   (per-block-type defaults). This is ~90% of the design and the single source
   of truth; it emits `--wp--preset--*` custom properties consumed everywhere
   else.
2. **Block markup and patterns** — per-instance layout and styling, set as
   block attributes. These serialize to inline styles, which is canonical FSE
   (the editor writes the same markup) — not a code smell. See `patterns/`.
3. **Block style variations** (`register_block_style`) — reusable custom looks
   applied via an `is-style-*` class (e.g. `is-style-checklist`,
   `is-style-secondary`). Registered in `inc/block-styles.php`.
4. **`src/style.scss`** — an escape hatch **only**: pseudo-elements, `:has()`,
   keyframe animations, and styling tied to JS-added state classes. It always
   references `var(--wp--preset--*)` and never redefines a design token.

### `theme.json` `styles.css` vs. `src/style.scss`

`theme.json` exposes a `styles.css` string (used here for a base `img` reset and
a `border-style` default for `.has-border-color`). The rule of thumb for where a
raw CSS rule belongs:

- **Foundational resets that must also apply inside the editor canvas →
  `theme.json` `styles.css`.** That string is injected into both the front end
  *and* the editor automatically, alongside the `--wp--preset--*` variables (so
  it sits at the correct cascade position), with no build step and no separate
  editor enqueue.
- **Anything with real CSS logic** (pseudo-elements, `:has()`, keyframes,
  state) **→ `src/style.scss`.** It only loads where enqueued and only after a
  build.

`styles.css` is raw CSS inside JSON — no nesting, not covered by stylelint. Once
it grows past a handful of one-liners, that's the signal to move it into the
SCSS layer with an editor enqueue instead.

## The design-token contract

The palette is **role-based, not descriptive**: slugs name what a color *does*,
not what it *is* (`base`, `contrast`, `contrast-2`, `surface-1/2/3`,
`surface-dark`, `border`, `muted`, `link`, `link-hover`, `error`). A cloned
project reseeds the *values* in `theme.json` and every pattern, block, and style
partial that referenced the slug follows automatically — no markup churn.

Two rules keep this stable across projects and are treated as permanent:

- **Append-only.** Never rename or repurpose an existing slug; only add new
  ones. A rename silently breaks every downstream reference in patterns and SCSS.
- **Surfaces are luminance-ordered, lightest first** (`surface-1` is the
  lightest neutral, `surface-3` the darkest of the light set; `surface-dark` is
  the dark surface). New surfaces slot into that order.

The block namespace (`starter-blocks/*`), the generated class prefix
(`wp-block-starter-blocks-*`), the PHP prefix (`sb_*`), and the text domain
(`starter-blocks`) are likewise permanent and shared across every cloned
project. See the repo-root `CLAUDE.md` for the full conventions index.

### Translucent variants: `color-mix`, not new tokens

Tokens are solid colors. When you need one at reduced opacity — a hairline
border, muted fine print, a subtle overlay — **don't add a semi-transparent token
and don't hardcode `rgba()`**. Derive the alpha from the existing token with
`color-mix()` in the SCSS layer, so a reseeded token value still ripples through:

```scss
// Solid fallback first (engines without color-mix), color-mix override second.
border-top: 1px solid var(--wp--preset--color--surface-3);
border-top: 1px solid color-mix(in srgb, var(--wp--preset--color--surface-3) 18%, transparent);
```

The first declaration is a solid fallback for engines that don't support
`color-mix`; the second wins everywhere it's supported. Always mix `in srgb`; the
percentage is the token's opacity and the remainder is `transparent`. This keeps
the palette append-only (no `surface-3-15`-style opacity variants) and the token
the single source of truth. Lives in `src/style.scss` partials only — it's real
CSS logic, not a `theme.json` `styles.css` candidate.

## Units: spacing preset vs. rem vs. px

CSS values are chosen by what the value *is*, not by whichever number the mockup
happened to use. The rule of thumb, highest-preference first:

**Spacing — padding, margin, gap. Never raw px.**

- **Spacing preset** — `var(--wp--preset--spacing--NN)` — is the default for
  *structural* spacing: section padding, band rhythm, the vertical gaps between
  components, anything that should ride the theme's spacing scale. The larger
  steps are fluid `clamp()`s, so they scale with the viewport, and every value
  reseeds from `theme.json` — that's why layout-level spacing goes through them.
- **rem** — for *component-internal* spacing (a gap inside a card, a small pad on
  a pill) and for any value that falls between preset steps. It scales with the
  root font-size and user zoom, which px does not. Match an existing preset when
  the value is close to one; reach for rem only when it genuinely sits off-scale.

**Fixed graphical constants — px.** These are meant to stay a constant device
size and deliberately do *not* ride the fluid/relative scale:

- border widths (`1px`, `2px`) and border-radius (`6px`, `8px`, `12px`),
- `box-shadow` offsets and blur (`0 6px 16px …`) and `transform` offsets
  (`translateY(-2px)`),
- fixed media and layout dimensions — a thumbnail's `120px` grid column, a hero
  photo's `300px` height, a `520px` max-width cap.

**Proportions — `%` / `fr` / `flex-basis`** for column splits and grid tracks.

**Type — font-size presets** (`var(--wp--preset--font-size--*)`) for the scale,
rem for the occasional off-scale size. **Color — tokens + `color-mix`** (above).

The test for any value: *is it spacing?* → preset (structural) or rem
(component). *A fixed graphical constant* (border, radius, shadow, transform,
fixed media size)? → px. *A proportion?* → `%`/`fr`. *Type?* → preset/rem.

## Project structure

```
starter-blocks/
├── style.css            # Theme header (required by WordPress)
├── theme.json           # Design source of truth (v3): role-based tokens
├── functions.php        # Loads the inc/ modules
├── templates/           # Block templates: index, home, archive, single, page,
│                        #   search, 404
├── parts/               # header, footer, sidebar (template parts)
├── patterns/            # Section patterns (one "Starter Blocks" category)
├── inc/                 # Self-contained PHP modules (sb_*-prefixed)
├── src/                 # Front-end source (compiled by Vite → dist/)
│   ├── main.js          #   JS entry — imports behavior modules from scripts/
│   ├── style.scss       #   SCSS entry (escape-hatch layer) — imports styles/
│   ├── scripts/         #   JS behavior modules (e.g. scroll-top.js)
│   └── styles/          #   SCSS partials (_buttons, _lists, _layout, …)
├── scripts/             # Node build tooling (block-audit.js) — not shipped
├── dist/                # Compiled theme CSS/JS (git-ignored; build output)
└── assets/images/       # Placeholder images (seed to the media library per env)
```

Pages are delivered as **content in the database, rendered through a shared
template.** A page's sections are authored in the editor — from core blocks and
the patterns in `patterns/` — and stored in `post_content`. `templates/page.html` renders that content inside the
header/footer chrome via `wp:post-content`. The starters in `patterns/` are
reusable *starting points* an author inserts and edits, **not** page definitions
composed by templates. The blog index (`home.html` / `archive.html`) is the
exception that composes structure directly, including the `sidebar` template part.

### Navigation and the logo are content, not template markup

The header/footer ship a bare `<!-- wp:navigation /-->` — **no inline
`navigation-link` blocks**. The menu is a `wp_navigation` post in the database,
edited by the client through Editor → Navigation, and the block resolves to it at
render. Likewise the logo is the `site_logo` option (set via the Site Logo block's
Replace control), not an image baked into the part.

**Never hardcode `navigation-link` blocks into a template or part.** Menu links are
client-editable content; inlining them moves that content into the theme file, so
every menu change becomes a code edit and redeploy — and the file silently diverges
from the DB menu the Navigation block actually renders. If a project needs a
default menu shipped with the theme, seed it once (an install step or a one-time
import), don't inline it. Same principle as pages living in `post_content`:
structure in the theme, content in the database.

### Full-width bands and the flush-to-footer system

Section blocks and starters that span the viewport carry an `sb-band` class. The
last band on a page needs to sit flush against the footer with no trailing gap,
which `_layout.scss` handles:

```scss
.wp-block-post-content > .sb-band:last-child {
  margin-block-end: calc(-1 * var(--sb-main-pad-end));
}
```

The pull is gated on `--sb-main-pad-end`, which is defined **only** on
`.page-main` (the `page.html` main wrapper). So the flush behavior applies on
content pages that opt in and is inert everywhere else — no band pulls into a
footer on a template that didn't ask for it.

## Sections are core blocks

A section is a `core/group` carrying an `sb-band` class, holding core blocks —
headings, paragraphs, buttons, images, columns — with its look owned by
`theme.json` tokens and one SCSS partial. Repeated sections become **patterns**:
starting points an author inserts and edits, not definitions a template
composes.

The bar for reaching past that is high, and it is not "this section repeats".
See the block-creation bar in [PIPELINE.md](PIPELINE.md) (Stage 4): propagation,
logic, or bespoke controls justify a block; breakable structure alone is a
pattern. Nothing in this design has cleared it.

## The component vocabulary

Every class a page composes against. Check this before adding a component — most
new sections are these parts rearranged.

| Class | What it is |
|---|---|
| `sb-band` + `--tall` `--hero` `--banner` `--tight` `--cta` `--cta-tight` `--ink` | Full-width section, its vertical rhythm, and the dark variant |
| `sb-section-head` + `--center` | Eyebrow / heading / framing copy that opens a band |
| `sb-hero` / `__media` | The home page's split hero: copy beside the portrait |
| `sb-claim-grid` / `sb-claim` | Numbered panels with an accent cap |
| `sb-cards` / `sb-card` / `__body` `__cat` `__title` | Image-over-body cards, whole card clickable |
| `sb-spotlight` + `--media-right` / `__copy` / `sb-mat` + `--portrait` | Case copy beside a framed screenshot, or a portrait. **`--media-right` takes the mat FIRST in the markup** — see the rule below |
| `sb-specs` + `--soft` `--wide` `--lead` / `__strong` | Key/value rows. `--lead` opens a section, `--soft` supports one |
| `sb-case-grid` / `sb-case` | The subgrid pair for long-run engagements |
| `sb-stats` / `sb-stat` / `__num` `__label` | Headline figures |
| `sb-pattern` / `__item` `__num` `__setup` `__result` | The ramp-up row with escalation arrows |
| `sb-quotes` / `sb-quote` + `--lead` / `__by` `__name` `__role` | Testimonial panels |
| `sb-pullquote` | A quiet attributed aside inside a case |
| `sb-longform` | A narrow reading column, broken up by eyebrow sub-heads |
| `sb-steps` / `sb-step` / `__num` | Ordered stages, each under its own rule |
| `sb-feature-list` / `sb-feature-group` | Capability groups: a ruled mono title over a dashed list |
| `sb-contact-split` | The details list beside the form card |
| `sb-form` / `__intro` | The form card. Its insides are Forminator's markup |
| `sb-callout` | A tinted row: one line of copy and the link answering it |
| `sb-actions` / `sb-link-arrow` | A button row, and the text link beside it |
| `sb-cap` + `--title` `--section` `--body` `--cta` | Line-length caps, in `ch` |
| `sb-subhead` `sb-prose` `sb-framing` `sb-closing` `sb-muted` `sb-accent` `sb-mono-label` | Text roles |
| `is-style-eyebrow` (+ `sb-eyebrow--plain`) `is-style-secondary` `is-style-light` `is-style-checklist` | Registered block styles. The eyebrow is registered on both paragraph and heading |

Three rules the vocabulary depends on:

- **Every grid group that sets `--sb-grid-min` must appear in the selector list
  in `_grids.scss`,** or it gains a trailing empty column.
- **A group declared `flow` in markup but styled as a grid or flex in CSS needs
  its children's margins zeroed** — core still applies the flow block gap. See
  [GOTCHAS.md](GOTCHAS.md), #10.
- **Whatever leads the STACKED layout is written first in the markup.** `order`
  moves the box and leaves the tab sequence where it was, so a screenshot
  reordered into the lead on mobile still hands focus to the copy first. Source
  order is the mobile order; `order` then does the side-by-side arrangement,
  where both columns are on screen and the mismatch is harmless. This is what
  `sb-spotlight--media-right` does, and it looks correct either way — the bug is
  only reachable with a keyboard.

## Images: portable, deploy-safe references

Attachment IDs are assigned per WordPress install, so the same file has a
different ID on dev vs. production. Hardcoding IDs in patterns therefore breaks
the moment the theme is deployed to a site where that file uploaded under a
different ID.

Instead, patterns reference images **by filename** and resolve the local ID at
render time via two helpers in `inc/images.php`:

- `sb_attachment_id_by_filename( $filename )` — resolves the current install's
  attachment ID from the base filename (cached per request).
- `sb_image_block( $filename, $alt, $link_url = '' )` — renders the full
  `core/image` block, writing the resolved ID into the block comment, the
  `src`, and the `wp-image-<id>` class **together**, so the markup stays
  internally consistent and portable — and because a real ID is emitted,
  WordPress still adds responsive `srcset`/`sizes`.

```php
<?php echo sb_image_block( 'placeholder-horizontal.webp', 'Descriptive alt text' ); ?>
```

If the file isn't in that install's media library, the image renders empty
rather than pointing at a dead ID — it self-heals the moment the file is
uploaded. The shipped placeholders must be seeded once per environment; see
[GOTCHAS.md](GOTCHAS.md#6-image-starters-render-empty-until-the-placeholders-are-seeded).

## Fonts

The theme uses **system font stacks** defined in `theme.json`
`settings.typography.fontFamilies` — a sans-serif body stack and a serif heading
stack (Georgia-first). No self-hosted files, no `fontFace` entries, no JS font
loaders or CDN calls, so a fresh clone renders correctly with zero font setup.

To switch to a brand typeface per project, either add a `fontFace` entry with a
self-hosted woff2 under `assets/fonts/` (WordPress then loads it on the front
end, in the editor canvas, and in the Font Library), or swap the stack values.
The heading/body split is a role, like the color tokens — reseed the values,
keep the roles.

## Accessibility

Baseline accessibility is built in using block-theme-native mechanisms rather
than hand-rolled markup.

**Handled by the theme / core:**

- **Skip link** — WordPress adds a "Skip to content" link automatically in
  block themes; the theme styles it to the palette and guarantees it reveals on
  focus (`src/styles/_accessibility.scss`).
- **Landmarks** — templates render real `<header>`, `<main>`, `<footer>`
  elements (block `tagName`), and the Navigation block outputs a labeled
  `<nav>`.
- **Visible focus** — a consistent `:focus-visible` outline on all interactive
  elements; mouse users are unaffected.
- **Reduced motion** — `prefers-reduced-motion` neutralizes animation,
  transition, and smooth-scroll.
- **Screen-reader utility** — `.screen-reader-text` is available for visually
  hidden labels.
- **Heading order** — one `<h1>` per page, with `<h2>`/`<h3>` for sections.

**Depends on content / editor discipline:**

- Meaningful **alt text** on images (empty alt for purely decorative).
- Logical **heading order** — use the font-size control for size, don't skip
  levels.
- **Descriptive link text** ("View pricing", not "click here").
- Label any custom **forms**, and re-check **color contrast** when the palette
  values are reseeded for a project.

These utilities live in the escape-hatch SCSS layer, compiled by Vite into
`dist/assets/main.css` and loaded on both the front end and the editor.
