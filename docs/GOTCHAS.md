# Gotchas & root-cause notes

An engineering notebook of the non-obvious problems that shaped this theme, and
*why* each fix is what it is. These are hard-won: most cost real hours before the
cause was found, and they are kept here so they cost you minutes instead. Block
themes edit as flat files, but a lot of what WordPress derives from those files
is cached in the database or rendered in surprising contexts — so "the file is
right but the page is wrong" happens often, and the cause is rarely the file.

---

## 1. WordPress caching — "my change didn't take"

When behavior contradicts the file on disk, suspect the DB/transient layer
first. This is the single most common time-sink in block-theme work.

- **New/edited patterns render blank or stale.** Registered patterns are cached
  in transients. After adding or changing a `patterns/*.php` file, flush them:
  `wp transient delete --all` (or SQL:
  `DELETE FROM wp_options WHERE option_name LIKE '_transient_%' OR option_name LIKE '_site_transient_%';`).
  Adding or **removing** a pattern file also needs the theme's cached file list
  cleared before the new set is re-scanned — `wp_clean_themes_cache()` is the
  targeted call (it drops the `wp_theme_files_patterns-*` transient). The re-scan
  happens on the *next* request, so clear, then reload to verify.
- **`theme.json` changes don't show up.** The Site Editor writes user
  customizations to a `wp_global_styles` custom post, and **that DB copy
  overrides the file**. Reset via **Styles → Revert to theme defaults**, or
  clear the `wp_global_styles` post for the theme. The same shadowing applies to
  templates and template parts edited in the Site Editor: once you edit one in
  the Site Editor it forks into the database, and **deleting the file does not
  clear the fork** — you must reset it from the editor (Template → Clear
  customizations).
- **A new page/slug 404s, or a template won't resolve.** Rewrite rules are
  cached — `wp rewrite flush`.
- **Full reset:** `wp transient delete --all && wp rewrite flush`, plus a Global
  Styles revert if `theme.json` is involved.

> **Not a cache:** if a font size looks wrong (core's 13/20/36/42 instead of the
> theme's ladder), that's `settings.typography.defaultFontSizes`, which defaults
> to `true` and merges core's sizes on top of yours. This theme sets it to
> `false`.

---

## 2. `WP_DEBUG_DISPLAY` breaks the media library

**Symptom:** every item in the Media Library grid stuck showing "uploading…",
even long-uploaded images whose thumbnails clearly existed.

**Root cause:** the media grid loads its items via
`admin-ajax.php?action=query-attachments`, which must return clean JSON. With
`WP_DEBUG_DISPLAY = true`, PHP notices/deprecations are *printed into the
output* — including AJAX responses. A single core deprecation firing on admin
requests (`preg_replace(): Passing null …` in `wp-admin/includes/plugin.php`)
corrupted the JSON, the grid's JS couldn't parse it, and every item stayed
frozen in its initial "uploading…" placeholder.

**Fix:** the standard dev configuration — keep logging, stop *printing*:

```php
define( 'WP_DEBUG',         true  );
define( 'WP_DEBUG_LOG',     true  );
define( 'WP_DEBUG_DISPLAY', false );  // ← the fix
```

Any notice + `WP_DEBUG_DISPLAY` on will do this, and it can break the block
editor the same way. Errors still go to `debug.log`; they just stop poisoning
responses.

---

## 3. Inline-SVG logos and the Custom HTML sandbox

The starter ships no inline-SVG logo, but adding one is a common first
customization — and it has a trap worth knowing before you hit it.

**Symptom:** an inline `<svg fill="currentColor">` logo placed in a **Custom
HTML** block renders the wrong color (or invisible) in the **editor**, while the
front end is fine — and several "obvious" fixes do nothing.

**Root cause:** the block editor previews each Custom HTML block in an isolated
`<iframe srcdoc>` containing **only that block's own markup** — no
`.site-header` / `.site-footer` ancestor, and not the front-end bundle unless
it's a registered editor style. So any selector that leaned on an ancestor could
never match in the sandbox.

**What works:**

- **Style the logo with direct `.site-logo` selectors, never ancestor
  selectors.** Set the base color on `.site-logo` itself; give a footer variant
  its own class (e.g. `.site-logo--footer`) rather than selecting it through
  `.site-footer`.
- **Put the logo color in `theme.json` `styles.css`, not the SCSS bundle.**
  theme.json global styles load in *both* the editor and the front end, and
  aren't run through the CSS minifier — which can rewrite a nested `&` rule down
  to a bare, over-broad selector that then takes over once the editor re-scopes
  everything under `.editor-styles-wrapper`.
- **Gate editor-only tweaks on the sandbox body.** The sandbox `<body>` carries
  `data-resizable-iframe-connected`; the front-end body doesn't. So
  `body[data-resizable-iframe-connected]:has(a.site-logo--footer){…}` fixes the
  preview **in the editor only**, with zero effect on the live site.
- `add_editor_style( 'dist/assets/main.css' )` loads the bundle into the editor
  canvas so most custom CSS previews correctly — but it does **not** reach the
  isolated Custom HTML sandbox, which is the other reason logo color belongs in
  theme.json.

**Takeaway:** an inline-SVG-in-Custom-HTML element is styled by ancestor context
on the front end but rendered context-free in a sandboxed iframe in the editor.
Anything depending on `.site-header`/`.site-footer` — or on the bundle being
present — silently breaks in the editor only. Keep such an element's color in
theme.json and its layout (sizing/`display`) in the SCSS layer.

---

## 4. "This block contains unexpected or invalid content"

**Symptom:** a block in a template or pattern shows the error bar in the editor
and offers "Attempt Recovery". The markup looks correct and renders fine on the
front end.

**Root cause:** block validation compares the **saved HTML** against what
Gutenberg would generate right now from the block's attributes. Any mismatch
fails, and the message never says which one. Hand-authored markup is the usual
cause, because a support attribute carries a class the author did not write:

- `"align":"full"` requires the `alignfull` class on the element.
- a sticky position support requires `is-position-sticky`.
- a color attribute requires `has-{slug}-color` **and** the pipe form
  `var:preset|color|{slug}` inside the attribute itself. A leftover of one
  without the other is the easiest version of this to miss.

**Fix:** add the missing support class, or stop hand-writing — round-trip the
markup through the editor's Code editor and paste back what it produces.

**When diffing an "Attempt Recovery" result**, ignore the cosmetic churn
(attribute reordering, whitespace) and hunt the ONE class or attribute that
changed the rendered element. That is the whole diff that matters.

---

## 5. Do not trim core block CSS in an FSE theme

**Symptom:** center-aligned markup renders left. The class is on the element,
the editor shows it centered, and the served page contains no `text-align:center`
at all.

**Root cause:** two plausible-looking optimizations both cause it.

- **Conditionally dequeuing `wp-block-library` on `has_blocks()`.**
  `has_blocks()` inspects the queried post's `post_content`, but FSE pages render
  through templates and patterns and usually have **empty** `post_content`. It
  returns false on nearly every page, so core block CSS is dequeued site-wide and
  classes like `.has-text-align-center` stop existing.
- **`should_load_separate_core_block_assets` set to true.** Tried as the
  "correct" version of that trim; it produced the identical left-align symptom
  and was reverted.

**Fix:** let WordPress load `wp-block-library` normally — it already loads block
CSS efficiently. The saving is around 30KB and not worth the risk.
`inc/bloat.php` keeps only the emoji and generator removals.

---

## 6. `wpautop` turns block tags inside an anchor into empty cells

**Symptom:** a grid renders extra empty cells between its real items. Nothing in
the source produced them.

**Root cause:** content rendered through `the_content` — a shortcode inside the
core Shortcode block, for instance — passes through `wpautop`, which wraps text
in paragraphs. A **block-level** tag inside an inline `<a>` makes it emit an
orphan closing paragraph tag, and the HTML parser materializes that as an empty
paragraph element, which a grid parent then lays out as a cell.

**Fix:** keep markup inside an anchor **inline only** — spans, not divs or
headings. Style the spans as blocks in CSS if block layout is needed.

---

## 7. Verifying from the command line

`curl` against the running site separates SERVER state (what WordPress
generated: markup classes, `global-styles-inline-css`, preset variables) from
BROWSER state (a stale cache). It is the fastest way to settle an "editor vs.
front end" disagreement. Two things distort it:

- **`wptexturize` curls straight quotes and apostrophes into entities** in
  rendered HTML, so grepping for a literal `we'll` or a quoted phrase gives a
  false negative. Verify with apostrophe-free phrases.
- **OPcache revalidates every ~2 seconds** in the `wordpress:php8.2-apache`
  image, so rapid successive edits to a PHP file can appear not to apply — the
  front end serves the previous compile. `docker restart mgp-wordpress-1` forces
  a flush. `theme.json`, pattern and markup changes are read fresh and never
  need it.

---

## 8. Layout classes silently overrule your CSS

**Symptom:** a rule that is plainly correct does nothing. The class is on the
element, the declaration is in the compiled stylesheet, devtools shows it
struck through or shows a WordPress rule winning. Six separate mechanisms
produce this, all from the `layout` attribute on a `core/group`.

### Flex children cannot take margins

WordPress ships:

```css
.is-layout-flex > :is(*, div) { margin: 0; }
```

`:is()` takes the specificity of its **most specific** argument — `div` — so
that rule scores (0,1,1) and beats a plain `.my-class { margin-left: auto }` at
(0,1,0). The item simply refuses to move.

**Fix:** write the rule as a child selector — `.parent > .my-class` — which
scores (0,2,0). Every auto or explicit margin on a flex child needs this,
including the `margin-left: auto` that pushes a nav to the right and any
`margin-top` inside a drawer.

### Constrained groups carry global padding

A group with `"layout":{"type":"constrained"}` is stamped `has-global-padding`,
which applies the root padding — the gutter, up to 2rem here — as left and
right padding **inside** the group. On a full-width band that is the point. On
a small lockup like a logo and its wordmark, it is 2rem of unexplained space
that looks like a broken `gap`.

**Fix:** use `"layout":{"type":"default"}` (flow). Constrained means "center
children at content width"; a group that only stacks two lines of text never
needed it.

### Flow groups add a block-gap margin to every child

`:root :where(.is-layout-flow) > * { margin-block-start: 1.5rem; }`. The
`:where()` gives it zero specificity, so any real rule beats it — but only if
you write one. A flow group whose children space themselves (a flex `gap`, an
explicit margin under a title) gets **both**, and the rhythm comes out at
roughly double.

**Fix:** `margin-block: 0` on the children you space yourself.

### A flex group cannot be hidden by class alone

```css
body .is-layout-flex { display: flex; }
```

Element plus class is (0,1,1), which beats `.my-drawer { display: none }` at
(0,1,0). The drawer stays open from page load with its open-state styling
applied, so it reads as a JavaScript failure rather than a CSS one — and
*opening* works, because the `.is-open` rule usually has a parent scope
already.

**Fix:** scope the hide the same way — `.site-header .site-header__menu`.

### Constrained children with a max-width center themselves

```css
.is-layout-constrained > :where(…) {
  max-width: var(--wp--style--global--content-size);
  margin-left: auto !important;
  margin-right: auto !important;
}
```

Anything narrower than the content width gets centered by those auto margins,
so a capped heading drifts to the middle of a left-aligned section
while a full-width sibling beside it stays put. That mismatch is what makes it
look arbitrary. The `!important` means specificity cannot save you.

**Fix:** put the section's contents in a **flow-layout wrapper** inside the
constrained group. The wrapper absorbs the centering (it is full width, so it
is a no-op) and its children lay out left with their caps intact. This is
the standard shape for every left-aligned band.

### Grid groups scope CSS counters and keep empty columns

A grid-layout group emits two things worth knowing:

```css
grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
container-type: inline-size;
```

**`auto-fill` keeps empty tracks.** Three panels in a wide band lay out as four
columns with a hole on the end. `auto-fit` collapses them, and WordPress never
emits it — override `grid-template-columns` (see `_grids.scss`).

**`container-type: inline-size` implies `contain: style`, which scopes CSS
counters.** A `counter-increment` on a pseudo-element deep inside that subtree
stops accumulating, so every item reads `01`. Increment on the grid ITEM
instead, and let the pseudo-element only print the value.

**The pattern behind all six:** the `layout` attribute is not cosmetic. It
decides which stylesheet WordPress generates for that group, and the generated
CSS is authored to win — with `!important` where auto margins are involved.
Read the emitted classes on the element (`is-layout-flex`,
`has-global-padding`, `is-layout-constrained`) before debugging your own
stylesheet — the answer is usually in the block markup, not the SCSS.
