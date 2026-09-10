# Workflow

How work gets done in this repo: the environment, the commands, and the two
policies — comments and commits — that decide what ends up in the history.

## Environment

The repo lives on the WSL filesystem at
`~/projects/mg/wp/wp-content/themes/mg-blocks`, inside a Docker WordPress stack
at `~/projects/mg`. The toolchain runs inside WSL; a Windows-side shell crosses
a boundary on every command.

```
wsl bash -c 'cd /home/dev/projects/mg/wp/wp-content/themes/mg-blocks && npm run build'
```

Wrap the command in **single** quotes — a double-quoted one has its `$` and
backticks expanded by the outer shell before WSL sees it, which produces wrong
results rather than errors. Never pass a heredoc across the boundary at all.
Every way this breaks, and there are several that look like environment
problems rather than quoting problems, is cataloged in
[WSL-TOOLING.md](WSL-TOOLING.md).

Site: http://localhost:8080. phpMyAdmin: http://localhost:8081. Admin
credentials are in the project-root `AGENTS.md`, outside this repo. WP-CLI needs
none of them — it bootstraps without a login, and `sb-push.php` resolves its
administrator **by role**, not by name.

The stack shares ports with the other local WordPress projects, so only one runs
at a time.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server with HMR — needs `CUSTOM_WP_VITE_DEV` true in `wp-config.php` |
| `npm run build` | Everything: `vite build`, `build:css` |
| `npm run build:css` | `src/style.scss` → `dist/assets/main.css`, autoprefixed and minified |
| `npm run lint` | eslint + stylelint + phpcs + block-grammar audit |
| `npm run lint:css:fix` | Stylelint, auto-fixing what it can |
| `docker compose run --rm -T wpcli wp …` | WP-CLI, from the **project root** |

`dist/` is git-ignored. A fresh clone renders unstyled until `npm run build` has
run once.

**This theme has no custom blocks.** Sections are core blocks in patterns —
see [ARCHITECTURE.md](ARCHITECTURE.md#sections-are-core-blocks).

## Page content lives in the database

Templates, patterns and blocks are in git. **Page content is not** — it lives in
`post_content`, edited in the block editor, and nothing sends it back to the
repo. This split is deliberate (structure in the theme, content in the
database), and it has one consequence that costs real work when ignored:

**Anything writing page content programmatically must go through a
pull-then-push cycle with a stale guard, never a raw `wp post update`.** FJ
learned this twice, clobbering live editor work both times. Two reasons, and
the second is not obvious:

- **The user may be editing that page right now.** A push built from an
  in-context copy silently overwrites whatever they saved since. Re-pull
  immediately before every edit — including a page authored in the same
  session.
- **Raw WP-CLI runs as user 0, with kses ACTIVE.** It silently strips
  `<iframe>`, `<script>` and inline SVG out of content it writes. A push script
  running as an admin with `unfiltered_html` does not.

`scripts/sb-pull.php` and `scripts/sb-push.php` implement this. Both run through
WP-CLI, from the **project root**:

```
# PULL — arms the baseline, writes the working copy
docker compose run --rm -T wpcli wp eval-file \
  wp-content/themes/mg-blocks/scripts/sb-pull.php <post-id> > wp/.work/<slug>.html

# edit wp/.work/<slug>.html

# PUSH — slug-matched, guarded, backed up
docker compose run --rm -T wpcli wp eval-file \
  wp-content/themes/mg-blocks/scripts/sb-push.php <slug>
```

What the guards do, and why each is load-bearing:

- **Stale-push abort.** `sb-push` compares the DB against the `_sb_base_hash`
  recorded at the last pull. If the page changed since — you edited it in the
  block editor — it refuses to write. **There is no override flag, on purpose.**
  Re-pull, reconcile, then push.
- **No baseline, no push.** A page never pulled in this working copy aborts too,
  so the very first write cannot be a blind one.
- **Pre-push backup**, to `wp/.work/backups/<slug>-<utc-stamp>.html`, verified
  before the write proceeds. A failed backup aborts the push rather than
  reporting one it did not make.
- **Admin context.** `wp_set_current_user()` re-runs `kses_init()` so the write
  has `unfiltered_html`, and `wp_slash()` makes it byte-exact.

`wp/.work/` must be group-writable (`chmod 2775`) — the `wpcli` container writes
as uid 33, and a `.work/` created by the WSL user is not writable by it.

Recovery, when it does go wrong anyway: the pre-push backups are the first stop,
and WordPress post revisions the second. Check both before rebuilding by hand.

## Linting

Four linters, deliberately non-overlapping: **eslint** on `src/`, **stylelint**
on the SCSS, **phpcs** (WordPress Coding Standards) on the PHP, and a custom
**block-grammar audit** that stack-parses block comments in templates, parts and
patterns.

`npm run lint` should exit clean. There is no inherited baseline to ratchet down
— everything here is net-new, so keep it at zero.

The block-grammar audit is the one worth understanding: an unclosed
`<!-- wp:… -->` produces "This block contains unexpected or invalid content" in
the editor, which names no file and no line. The audit catches it before the
editor does.

## Comments

One test, before writing any comment:

> **Would a competent person reading this code re-break it without the note?**

If no, don't write it. Most of what fails that test is narration.

**Earns its place**

- A trap that gives no error — `wpautop` materializing empty grid cells from a
  block-level tag inside an anchor, a DB option silently outranking a theme
  file, `defaultFontSizes` wiping a custom scale.
- **A rejected alternative that looks obviously better.** The highest-value
  kind: it is what stops the next person "fixing" it back.
- An external contract you cannot see from here — WordPress applying kses to
  content written as user 0, a Store API schema honoring a filter, block
  validation comparing saved markup byte-for-byte.
- A value that looks arbitrary and is not. One line is enough.
- A specificity decision — a doubled class beating WordPress's own later-loading
  rule reads as a typo without the note.

**Does not**

- **Anything that came from a taste instruction** — "move it 3px", "make it
  navy", "drop the margin". Somebody decided, the code shows the decision, there
  is nothing to preserve. This is the common failure.
- What the code already says.
- **History.** "This used to be X." That is `git log`.
- The second sentence restating the first.
- **The mockup.** Never cite it — not as a reason, not as a source, not as
  something the code was ported from or departs from. It is an example somebody
  drew, not a specification, and a comment appealing to it teaches the next
  reader to go and check it.

**American English** in comments, commit messages and docs alike — color,
behavior, centered, gray. The CSS property is `color` either way, so a comment
spelling it `colour` two lines above is just noise.

**One idea, one statement.** What makes a block enormous is not facts, it is
saying one thing three ways — assert it, restate it, then explain the
restatement. Cutting the repetition is where nearly all the length goes, and no
fact is lost with it.

**Budget by what is being explained**, not a flat cap:

| | |
|---|---|
| A value or a small decision | 1–2 lines |
| A trap that fails silently | up to ~8 |
| A file header, where there is real architecture | ~15 |
| Longer | it belongs in `docs/` |

A trap gets the larger budget because it has to **name the symptom** — that is
what someone greps for when they hit it, and it is the part that saves the hour.
"The section renders an empty cell" finds the `wpautop` note; "paragraph" does
not.

**Speak from now.** Say what the code does and why it is right, not what it is
not. "No X", "not clamp", "rather than the 18px it was" all need the reader to
know something that is gone before the sentence resolves. A contrast is fine
when the alternative is one someone would reach for today — that stops a change.
A contrast with something deleted only stops comprehension.

**Keeping them current.** When you change behavior, re-read the comments on it.
A stale comment is worse than none: two comments describing the same control
differently leave the reader working out which one is lying.

**The check that catches drift: comments should not run past roughly a quarter
of a file.** A ratio flags the problem months before it becomes annoying, and no
per-comment rule does.

### The file pass

**Editing one comment in a file means reading all of them.** Not rewriting them
— reading them, and fixing what the rules above already condemn: British
spellings anywhere in the file, references to the mockup, anything phrased as a
changelog, comments describing a past state, the same fact explained twice, a
block that says one thing three ways.

**What survives a pass, always:** a trap that fails silently, a rejected
alternative still reachable today, an external contract, and a value that looks
arbitrary and is not. When a cut is borderline, keep it — the cost of an
unnecessary line is a line. The cost of deleting a trap is the hour it was
written to save.

## Committing

**Do not commit unless told to.** Leave finished work in the working tree,
unstaged, and report what is ready. This applies to `git add`, `--amend`,
rebases and branch rewrites too. Changes are reviewed, and usually tested in the
browser, before anything enters history.

### Commit messages

- **Do not add a `Co-Authored-By` trailer.** Omit it entirely.
- Subject line, imperative mood, conventional-commit prefix.
- **Most commits are a subject line and nothing else.**

#### The prefixes, and nothing outside this list

| Type | Use when |
|---|---|
| `feat:` | Visitor-facing output is new or improved |
| `fix:` | Broken output corrected |
| `refactor:` | Internal restructure, identical output |
| `perf:` | Performance improvement |
| `build:` | Build system or dependencies |
| `ci:` | CI config, lint pipeline |
| `docs:` | Documentation only |
| `chore:` | Maintenance that fits nothing above |

Eight, matching [PIPELINE.md](PIPELINE.md#git-discipline). **Do not invent a
ninth.** A doc example is read as an instruction, so a wrong one propagates
further than a wrong sentence.

The Angular set that most projects copy has three more, and each is left out on
purpose:

- **`style:`** means *code formatting* — whitespace, indentation, semicolons —
  and nothing about appearance. On a theme that reading is a trap: every
  instinct files a color change under `style:`, and a mislabeled commit does not
  error, it just makes the history lie. Appearance is `feat:` or `fix:` by
  what it did to the output; a formatting-only sweep is `chore:`.
- **`test:`** has nothing to label. There are no tests.
- **`revert:`** is redundant — `git revert` writes its own subject line.

Sequencing within a stage is covered in [PIPELINE.md](PIPELINE.md#git-discipline)
— `build:` before `feat:`, deletions trailing migrations, and so on.

#### Bodies

**`git log` is read as a story arc**, scrolled through to see how the work
moved. That is the job a body has to serve. The moment it stops being scannable
it has failed at the only thing it was for, however good the prose.

**THE BODY IS THE LAST PLACE TO PUT ANYTHING.** Check in order — is it in the
code comment, in `docs/`, or visible in the diff? If yes, the body says nothing
about it. All three sit nearer the code and stay current; the commit copy is the
one that goes stale and the one nobody opens.

**Default to no body.** Most commits are a subject line. Aim for ~70%.

**When there is one: one idea, one paragraph, about four lines.** Not a summary
of the change — the single thing a reader cannot get from the subject or the
diff. Usually why it happened, or what was rejected.

**Longer has to be uber-earned**, and the test is narrow: the information exists
nowhere else in the repo, AND someone acting without it loses real time. That is
roughly one commit in twenty.

**Always cut:** "also fixed on the way" lists, verification counts, mechanism,
provenance, and restatement of the subject. A trap goes in the CODE, where
someone hits it — not here.

**Bodies wrap at 72 columns.** `git log` indents by four, so anything wider
wraps raggedly in a default terminal.

**Editing a body means the file pass applies to it too** — American English, no
dates, no mockup, present tense.

## Assistant context files

`CLAUDE.md` is the one that is loaded automatically, so it is the file that
holds real content; it is tracked, because the conventions in it are the
project's rather than any one developer's. A developer arriving with a different
agent can rename or mirror it.

Keep it short. It is conventions plus pointers into `docs/`, not a second copy
of them — anything that grows past a few lines belongs in a doc, with `CLAUDE.md`
linking to it.
