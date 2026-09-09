# Architecture

How Starter Blocks is put together, and the reasoning behind the layering. This
is a **Full Site Editing starter theme** — a catalog of proven custom blocks and
starter patterns on a tokenized `theme.json`, meant to be cloned and seeded per
project (see [PIPELINE.md](PIPELINE.md), Stage 0). The decisions below are the
conventions a cloned project inherits and should keep.

## The styling model (read this first)

The theme has a strict priority order. Always reach for the **highest** layer
that can do the job; drop to a lower one only when the layer above genuinely
can't express it.

1. **`theme.json`** — colors, fluid type scale, spacing rhythm, shadows,
   `styles.elements` (headings, links, buttons, captions) and `styles.blocks`
   (per-block-type defaults). This is ~90% of the design and the single source
   of truth; it emits `--wp--preset--*` custom properties consumed everywhere
   else.
2. **Block markup / patterns / custom blocks** — per-instance layout and styling,
   set as block attributes. These serialize to inline styles, which is canonical
   FSE (the editor writes the same markup) — not a code smell. See `patterns/`
   and the custom section blocks in `blocks/`.
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

## Project structure

```
starter-blocks/
├── style.css            # Theme header (required by WordPress)
├── theme.json           # Design source of truth (v3): role-based tokens
├── functions.php        # Loads the inc/ modules
├── templates/           # Block templates: index, home, archive, single, page,
│                        #   search, 404
├── parts/               # header, footer, sidebar (template parts)
├── patterns/            # Section starters + core-block starters (one
│                        #   "Starter Blocks" category)
├── blocks/              # Custom block source (edit.js/index.js/render.php/
│                        #   block.json); each compiled by @wordpress/scripts → build/
├── build/               # Compiled blocks (git-ignored; what WordPress registers)
├── inc/                 # Self-contained PHP modules (sb_*-prefixed)
├── src/                 # Front-end source (compiled by Vite → dist/)
│   ├── main.js          #   JS entry — imports behavior modules from scripts/
│   ├── style.scss       #   SCSS entry (escape-hatch layer) — imports styles/
│   ├── scripts/         #   JS behavior modules (e.g. scroll-top.js)
│   └── styles/          #   SCSS partials (_buttons, _lists, _faq, blocks/, …)
├── scripts/             # Node build tooling (block-audit.js) — not shipped
├── dist/                # Compiled theme CSS/JS (git-ignored; build output)
└── assets/images/       # Placeholder images (seed to the media library per env)
```

Pages are delivered as **content in the database, rendered through a shared
template.** A page's sections are authored in the editor — from the custom blocks
in `blocks/` and the starter patterns in `patterns/` — and stored in
`post_content`. `templates/page.html` renders that content inside the
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

## Custom blocks

Six section-level blocks live in `blocks/` — `hero`, `spotlight`, `bio`,
`intro-section`, `cta-band`, and `checklist-section`. They exist so a section's
*structure* stays in git while its *content* lives in the database: each is a
**dynamic block** where `edit.js` provides the editor UI, `render.php` emits the
front-end markup from block attributes, and inner blocks hold the freeform body
(paragraphs, buttons, lists).

- **Source → build.** `@wordpress/scripts` compiles `blocks/<name>/` (block.json,
  edit.js, index.js, render.php) into `build/<name>/`. WordPress registers each
  block from `build/` in `inc/blocks.php`, **not** from the source — so an edit
  under `blocks/` (including `render.php`, which is *copied* into `build/`) has no
  effect until the block build runs. See [BUILD.md](BUILD.md#custom-blocks-buildblocks)
  and [GOTCHAS.md](GOTCHAS.md#5-editing-blocks-does-nothing-until-you-rebuild).
- **Attributes in the DB, markup in git.** Typed fields (eyebrow, heading, image
  ID, overlay color, …) serialize into the block comment; `render.php` reads them
  and never trusts raw input in an attribute context — e.g. the hero overlay
  color is validated against a hex/rgb pattern before it reaches a `style`.
- **Empty attributes render nothing.** A field left blank emits no markup, so a
  block degrades cleanly rather than printing empty wrappers.
- **Editor parity.** `edit.js` mirrors `render.php`'s classes and markup, so the
  canvas — with the compiled bundle loaded via `add_editor_style` — previews the
  same as the front end. Per-block styling lives in `src/styles/blocks/`.

When to add a *seventh* block vs. a new pattern is a deliberate call — see the
block-creation bar in [PIPELINE.md](PIPELINE.md) (Stage 4): propagation, logic,
or controls justify a block; breakable structure alone is a pattern.

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
  elements (block `tagName`), and the Navigation block outputs a labelled
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
