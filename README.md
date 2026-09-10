# MG Blocks

A bespoke **Full Site Editing** WordPress theme for the Matthew Gregory
portfolio site, cloned from
[starter-blocks](https://github.com/mattgregory-dev/starter-blocks) at v1.0.0.
Design tokens in `theme.json`, page sections as block patterns, pages as block
templates, on a Vite + SCSS pipeline.

Built **native-first**: core WordPress blocks lead, and a custom block is
reached for only where core genuinely cannot express the design.

## Quick start

On a fresh clone:

```bash
npm install          # JS/CSS toolchain
composer install     # PHP dev tooling (phpcs + WordPress Coding Standards)
npm run build        # produce dist/ and build/ (both git-ignored)
```

Then, in WordPress:

1. **Activate** the theme.
2. **Reseed the tokens** in `theme.json` for the project — colors, fonts, type
   scale, spacing — before writing markup. Slugs are roles; you change the
   values, not the slugs.

For live development with hot-module reload, add `define( 'CUSTOM_WP_VITE_DEV', true );`
to `wp-config.php` and run `npm run dev` (Vite on `:5175`).

## What's inside

- **Native-first sections** — core blocks composed into patterns, with the look
  carried by tokens and a thin SCSS layer. No custom block layer.
- **Tokenized `theme.json`** — role-based color palette, type scale, spacing
  rhythm, shadows, element and block defaults, and self-hosted variable fonts.
- **One build pipeline** — Vite (`src/` → `dist/`), plus phpcs, eslint,
  stylelint, and a block-grammar audit.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — the styling model, token
  contract, project structure, custom blocks, portable images, accessibility.
- [docs/BUILD.md](docs/BUILD.md) — the two pipelines, commands, first-run setup,
  the SCSS layer, the block-grammar audit.
- [docs/WORKFLOW.md](docs/WORKFLOW.md) — how work gets done: commands, where
  page content lives, the comment policy and the commit policy.
- [docs/WSL-TOOLING.md](docs/WSL-TOOLING.md) — the Windows → WSL → Docker
  boundary, and the traps that look like broken environments instead of quoting.
- [docs/GOTCHAS.md](docs/GOTCHAS.md) — the non-obvious traps and their root
  causes (caching, block validation, core block CSS, `wpautop`, image seeding).
- [docs/PIPELINE.md](docs/PIPELINE.md) — the full project pipeline this theme is
  the Stage 0 standing asset for.
- [docs/DESIGN-HANDOFF.md](docs/DESIGN-HANDOFF.md) — how a mockup becomes
  theme tokens, and why the slugs stay put.
- [docs/OPEN-ITEMS.md](docs/OPEN-ITEMS.md) — the running state of the build:
  undecided, untested, deferred, and settled.
- [CLAUDE.md](CLAUDE.md) — the conventions index (namespaces, prefixes, token
  rules, commit discipline) read at the start of any work in this repo.
