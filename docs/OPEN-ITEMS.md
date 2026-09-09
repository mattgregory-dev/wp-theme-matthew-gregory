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

Choices that are still open, and that block work downstream. Say what the choice
is and what it is holding up — not a recommendation, which belongs in the
conversation that settles it.

## 2. Untested

Built, plausible, and never actually exercised. The point of a separate section
is that "written" and "verified" get conflated silently, and this is the list
that stops a launch on an assumption.

## 3. Deferred work, in rough priority order

Known work that is real but not now. Ordered, so the next session starts by
reading rather than deciding.

## 4. Content gaps

Where the site currently renders a placeholder, and what real content it is
waiting on. Each entry names the page and the block, so it is checkable rather
than remembered.

## 5. Conventions established

Decisions made in passing that are not yet written into a doc. This section is a
staging area on purpose — anything sitting here for long should be promoted into
`docs/` and reduced to a pointer.

## 6. Things that will bite

Known hazards that are not bugs: a fragile coupling, an ordering requirement, a
value that must stay in sync with something else. The test is whether someone
could reasonably break it without realizing.

## 7. Facts worth not rediscovering

Answers that cost time to establish and would otherwise be re-derived — a
setting's real effect, a limit that turned out to be different from the docs, a
thing that looks broken and is not. The highest-value section in this file.

## 8. What exists now

A short inventory of the build's current state: templates, parts, patterns,
custom blocks, pages. It answers "what have we got" without opening the tree, and
it is what makes the deferred list legible.

## 9. Completed

Finished work, newest first, with the one thing worth remembering about each.
Not a changelog — `git log` is the changelog. This is for entries that were open
questions long enough that their *resolution* is worth stating.
