// Fonts are self-hosted and registered in theme.json via `fontFace`
// (assets/fonts/*.woff2). WordPress loads them on the front end AND in the
// editor canvas, and surfaces them in the Font Library, so no JS font imports
// belong here.

// Dev-only: pull SCSS through Vite so the escape-hatch styles hot-reload.
// The production build compiles src/style.scss separately (see package.json).
if (import.meta.env.DEV) {
  import("./style.scss");
}

// Interactions that FSE handles natively (responsive nav, etc.) live in core
// blocks, not here. Add custom JS below only for genuinely bespoke behavior,
// ideally via the WordPress Interactivity API. JS behavior modules live in
// src/scripts/ (mirrors src/styles/ for SCSS), imported here as features land.

// Mobile nav toggle (drawer below 760px; markup in parts/header.html).
import "./scripts/nav-toggle.js";

// Back-to-top button (fixed-position chrome; markup in inc/scroll-top.php).
import "./scripts/scroll-top.js";

// Scroll reveal (opt-in via .sb-reveal / .sb-reveal-group on page content).
import "./scripts/reveal.js";

// Color scheme toggle (button in parts/header.html; gate in inc/theme.php).
import "./scripts/theme-toggle.js";
