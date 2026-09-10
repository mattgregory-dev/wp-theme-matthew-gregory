// Theme toggle.
// Flips [data-theme] on <html> and remembers the choice. The initial value is
// set by inc/theme.php before the first paint — doing it here would show the
// light scheme for a frame first.

const STORAGE_KEY = 'mg-theme';

function initThemeToggle() {
  // Two copies of the button, one per breakpoint — see _theme-toggle.scss.
  const buttons = document.querySelectorAll('.theme-toggle');
  if (!buttons.length) return;

  const root = document.documentElement;
  const isDark = () => root.getAttribute('data-theme') === 'dark';

  // aria-pressed carries the state, since the button's label never changes.
  const sync = (dark) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(dark)));
  };

  sync(isDark());

  buttons.forEach((button) => button.addEventListener('click', () => {
    const dark = !isDark();
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    sync(dark);

    // Private browsing and blocked storage both throw here, and neither is a
    // reason to leave the toggle broken for the rest of the visit.
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    } catch {
      // The choice holds for this page only.
    }
  }));

  // Follow the system while the visitor has expressed no preference of their
  // own. A stored choice outranks it.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    let stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Treated as no stored preference.
    }
    if (stored) return;

    root.setAttribute('data-theme', event.matches ? 'dark' : 'light');
    sync(event.matches);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeToggle);
} else {
  initThemeToggle();
}
