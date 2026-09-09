# Build & tooling

One build pipeline: **Vite + SCSS** compiles the theme's front-end bundle
(`src/` → `dist/`) — the escape-hatch stylesheet and JS behavior modules.

`dist/` is git-ignored, and a source change is not live until the build runs.
Design lives in `theme.json` tokens and block markup, not utility classes.

There is no block build. This theme is native-first — core blocks and patterns,
no bespoke block layer — so `@wordpress/scripts` and the `blocks/` → `build/`
step are gone. See [ARCHITECTURE.md](ARCHITECTURE.md#sections-are-core-blocks).

## First-run setup

On a fresh clone:

```bash
npm install          # JS/CSS toolchain (Vite, wp-scripts, eslint, stylelint)
composer install     # PHP dev tooling (phpcs + WordPress Coding Standards)
npm run build        # produce dist/ and build/ (both git-ignored)
```

Then, in WordPress: **activate the theme**, and **seed the placeholder images**
— upload `assets/images/placeholder-horizontal.webp` and
`placeholder-vertical.webp` to the media library (admin upload, or
`wp media import assets/images/placeholder-*.webp`). The image-bearing starters
resolve their images by filename at render, so until the files exist as
attachments they render empty. This is the one manual seeding step a clone needs;
see [GOTCHAS.md](GOTCHAS.md#6-image-starters-render-empty-until-the-placeholders-are-seeded).

## Commands

```bash
npm run dev          # Vite dev server on :5175 (HMR) for src/ assets
npm run build        # full build: vite build + src/style.scss → dist/
npm run build:css    # compile src/style.scss → dist/assets/main.css only
npm run preview      # preview the Vite build

npm run lint         # eslint + stylelint + phpcs + block-grammar audit
npm run lint:css     # stylelint on the SCSS layer  (:fix to autofix)
npm run lint:js      # eslint on src/              (:fix to autofix)
npm run lint:php     # phpcs (WordPress standards)  (:fix runs phpcbf)
npm run lint:blocks  # block-grammar audit (patterns/, templates/, parts/)
```

The theme loads its compiled bundle from `dist/`. For live development with
hot-module reload, add the following to `wp-config.php` and run `npm run dev`:

```php
define( 'CUSTOM_WP_VITE_DEV', true );
```

With that flag on, `inc/enqueue.php` loads assets from the Vite dev server
(`http://localhost:5175`) instead of `dist/`; with it off (production), it
enqueues the built files with a `filemtime()` cache-buster.

## The SCSS layer (`src/style.scss`)

`src/style.scss` is an entry file that `@use`s one partial per feature from
`src/styles/`. The convention: **a partial rides with the feature it styles.**
When a pattern or style variation lands, its stylesheet lands in the same change
and gets a matching `@use` line. There is no monolithic stylesheet to keep in
sync; the entry file's `@use` list *is* the manifest of what the escape-hatch
layer covers.

Keep every rule referencing `var(--wp--preset--*)` tokens — the SCSS layer styles
behavior and context that `theme.json` can't reach, but it never redefines a
design value. See [ARCHITECTURE.md](ARCHITECTURE.md#the-styling-model-read-this-first).

## Block-grammar audit (`lint:blocks`)

`scripts/block-audit.js` stack-parses every `<!-- wp:x -->` / `<!-- /wp:x -->`
comment across `patterns/`, `templates/`, and `parts/`, and exits non-zero on
any unclosed or mismatched block. Self-closing blocks (`… /-->`) are ignored.

**Why it exists:** a single missing block closer serializes as perfectly valid
HTML, so it's invisible until the editor loads the file and throws *"This block
contains unexpected or invalid content."* The audit surfaces it in the terminal
instead. It runs as part of `npm run lint` and is intentionally **not** a
pre-commit hook — it's run on demand.

A passing run reports, e.g.:

```
Audited 23 files — ALL BALANCED ✅
```

## Editor parity

`inc/enqueue.php` registers the compiled bundle as an editor style
(`add_editor_style`) so custom CSS (image radius, FAQ styling, button and list
variations) previews in the Site Editor the same as on the front end. See
[GOTCHAS.md](GOTCHAS.md#3-inline-svg-logos-and-the-custom-html-sandbox) for the
one context this deliberately does *not* reach (the Custom HTML block sandbox)
and how to work around it.
