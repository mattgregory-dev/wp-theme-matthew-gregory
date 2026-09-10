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

Then, in WordPress: **activate the theme**. Everything else a clone needs lives
in the database rather than the repo — the pages, the menu, the site icon, and
the logo attachments the header and footer reference by ID. See
[Deploying to another server](#deploying-to-another-server).

## Deploying to another server

**The theme is not the site.** Activating it on a fresh install gives you
correct styling and nothing to look at: every page, the menu, the site icon and
all the media live in the database. Two ways across, and the first is far
safer.

### Move the database and uploads

```bash
# from the source, at the project root
docker compose run --rm -T wpcli wp db export - > mg.sql
tar -czf uploads.tar.gz -C wp/wp-content uploads

# on the target
wp db import mg.sql
wp search-replace 'http://localhost:8080' 'https://example.com' --all-tables
```

`search-replace` and not a find/replace in the SQL file: serialized values carry
their own byte lengths, and a text edit corrupts them silently. Extract the
uploads into `wp-content/` so filenames — and therefore attachment IDs — survive.

### Or rebuild by hand

Slower, and it needs the checklist below, because each item is a thing that is
correct here and absent there.

- [ ] **Pages** — Home, Work, About, Stack, Contact, and the privacy policy on
      WordPress's own page 3. Author them through `sb-pull`/`sb-push`, never a
      raw `wp post update` — see [WORKFLOW.md](WORKFLOW.md#page-content-lives-in-the-database).
- [ ] **Front page** — set Settings → Reading to the static Home page.
- [ ] **Menu** — a `wp_navigation` post; the header and footer render whatever
      it holds. The parts ship a bare Navigation block on purpose.
- [ ] **Site icon** — Settings → General; it is an option, not a theme file.
- [ ] **Logos** — upload both artworks, then **re-pick each image block** in the
      editor. `parts/header.html` and `parts/footer.html` carry attachment IDs
      that are correct on THIS install and will not be on another. The `src` is
      root-relative, so the images render either way; it is the block's ID that
      goes stale.
- [ ] **Forminator** — install, rebuild the contact form, set its design to
      **None** (`_contact.scss` styles the plugin's markup and assumes it), and
      put the new form ID into the Contact page's shortcode.
- [ ] **SMTP** — WordPress cannot send mail from a bare server. Nothing about
      the form is verified until a real submission arrives.
- [ ] **Permalinks** — flush once (`wp rewrite flush`), or pages 404.

### Smoke tests

Cheap, and each one covers something that has broken at least once here:

- [ ] Submit the contact form and confirm the mail arrives AND the entry stores
- [ ] Both color schemes, including a reload in dark (the no-flash gate)
- [ ] The in-page anchors on Work, which the sticky header offsets
- [ ] The mobile drawer, at 375px and at the 760px boundary
- [ ] Tab from the address bar: skip link, then the header controls
- [ ] `curl -I` a page and confirm it is not being cached mid-deploy

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
