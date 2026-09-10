# Open items

The running state of this build: what is undecided, untested, deferred, and
already settled. It is the file to read when picking work back up after a gap,
and the file to add to the moment something is discovered rather than done.

## How this file works

- **Entries move, they don't vanish.** When something is finished it moves down
  to *Completed* rather than being deleted — that is what makes this a build log
  as well as a to-do list, and it is why "we already tried that" stays
  answerable months later.
- **One entry, one thing**, with enough context that it survives being read cold
  by someone who was not in the conversation. An entry nobody can act on is
  noise.
- **Say who is blocked on what.** An item waiting on a decision is not the same
  as one waiting on work, and mixing them makes the list unreadable.
- **This is not a duplicate of the docs.** A convention that is settled belongs
  in [WORKFLOW.md](WORKFLOW.md) or [ARCHITECTURE.md](ARCHITECTURE.md); a trap
  belongs in [GOTCHAS.md](GOTCHAS.md). What lives here is the work that is still
  in motion. When an entry stops moving, promote it into the right doc and leave
  a one-line pointer behind.

---

## 1. Decisions not yet made

- **Resume PDF.** The header button and the footer link both point at `#`.
  Needs a real file before launch.
- **Repo name and remote.** The theme is `mg-blocks`; the GitHub repo has no
  remote yet and could reasonably be `matthew-gregory-blocks`.
- **Blog.** Templates are band-ready but there are no posts and no nav entry.
  Turning it on means deciding whether the blog list sections keep their inline
  `padding-bottom` or become proper bands.

## 2. Untested

- **Every template except `page` and `404`.** `index`, `home`, `archive`,
  `single` and `search` were converted to the band system without a post to
  render them.
- **The site on a real phone.** Layouts have only been checked in a resized
  desktop window, which is not the same as iOS Safari with browser chrome
  eating viewport height.
- **Reduced motion.** `_accessibility.scss` neutralizes transitions globally,
  but no component has been checked with the preference on.

## 3. Deferred work, in rough priority order

1. **About, Stack, Contact, Privacy pages.** Created and empty. Privacy needs a
   narrow prose treatment — the page template caps content at 1076px, which is
   too wide to read legal copy in.
2. **Lightbox for the work screenshots.** The mats currently link to the live
   sites in a new tab, which is arguably better for a portfolio. Full-size
   screenshots are already archived as attachments 37 and 38, waiting for it.
3. **Real screenshots for the two long-run cases.** Hoel's and Iboga Quest use
   the horizontal placeholder (attachments 34, 35), as does the third home page
   work card (30).
4. **Scroll reveal.** The mockup staggers sections in on scroll
   (`data-reveal`). None of it is ported.

## 4. Content gaps

- **Home → Recent work, third card.** Placeholder image; needs a Hoel's
  storefront screenshot.
- **Work → Two engagements.** Both cases use placeholders.
- **Header / footer → Resume (PDF).** No file behind the link.

## 5. Conventions established

All promoted already — kept here as an index of where each one landed:

- Token and class naming, and what a good design handoff looks like →
  [DESIGN-HANDOFF.md](DESIGN-HANDOFF.md)
- Six ways core's layout CSS overrules ours → [GOTCHAS.md](GOTCHAS.md), #10
- Comment and commit policy → [WORKFLOW.md](WORKFLOW.md)
- Page content through sb-pull/sb-push → [WORKFLOW.md](WORKFLOW.md)

## 6. Things that will bite

- **Every grid group must be listed in `_grids.scss`.** A grid that sets
  `--sb-grid-min` but is missing from that selector list silently gains a
  trailing empty column. This has already cost two round trips.
- **A group declared `flow` in markup but styled as grid/flex in CSS needs its
  children's margins zeroed.** Core still applies the flow block gap, which
  offsets every child but the first.
- **`columnCount` grids never reflow.** Unlike `minimumColumnWidth`, they emit a
  fixed `repeat(n, …)`, so the mobile stack has to be written by hand.
- **Class names in page content are not checked by anything.** A typo in a
  `className` is a selector that matches nothing, silent in every tool. See the
  audit in section 7.

## 7. Facts worth not rediscovering

- **Two checks worth running on any page build**, both cheap:
  `node scripts/block-audit.js` covers templates, parts and patterns but NOT
  page content, so run `scripts/check-blocks.php`-style stack parsing over the
  working file before pushing; and diff the `sb-*` classes in the rendered HTML
  against those defined in `src/styles/` to catch a class that matches nothing.
- **`container-type: inline-size` implies `contain: style`,** which scopes CSS
  counters. Increment on the grid item, never on a pseudo-element inside it.
- **The `wpcli` container only mounts `wp/`.** `wp media import` cannot see
  `temp/`; stage the file through `wp/.work/` first.
- **Our bundle loads after core's block stylesheets,** so a selector that ties
  on specificity wins. That is why matching core's selector shape works instead
  of escalating.
- **Where core forces `color: inherit`** (the navigation link), set the color on
  an ancestor rather than out-specifying it.

## 8. What exists now

- **Pages:** Home and Work built. About, Stack, Contact, Privacy created and
  empty.
- **Templates:** `page`, `404` (designed), plus `index`, `home`, `archive`,
  `single`, `search` on the band system.
- **Parts:** header (with mobile drawer), footer.
- **Custom blocks:** none, by design. Sections are core blocks.
- **Patterns:** none yet. Repeated sections become patterns when a second page
  needs them.
- **Component vocabulary:** see [ARCHITECTURE.md](ARCHITECTURE.md#the-component-vocabulary).

## 9. Completed

Newest first. Not a changelog — only decisions whose *resolution* is worth
stating.

- **Native-first, no custom blocks.** The starter's six section blocks were
  removed: their value is authoring guardrails for a client, and this site's
  only author is its developer.
- **Bands own vertical rhythm.** FJ's flush-to-footer machinery was deleted
  rather than ported; main claims no space for a band to cancel.
- **`contentSize` is 1076px, not 1140.** 1140 is the outer frame; the content
  measure is that minus both gutters.
- **Tokens keep starter-blocks' role names.** The mockup adapts to the contract,
  not the reverse.
