// Mobile nav toggle.
// Below 760px the menu collapses behind the button rendered in
// parts/header.html; this toggles .is-open on .site-header, which is what
// src/styles/_header.scss keys the drawer off. Closes on Escape and returns
// focus to the button.

function initNavToggle() {
  const header = document.querySelector('.site-header');
  const btn = document.querySelector('.nav-toggle');
  if (!header || !btn) return;

  const setOpen = (open) => {
    header.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  };

  btn.addEventListener('click', () => {
    setOpen(!header.classList.contains('is-open'));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('is-open')) {
      setOpen(false);
      btn.focus();
    }
  });

  // The drawer is a mobile-only affordance, so leaving that width with it open
  // would strand .is-open on a layout that no longer hides anything.
  const wide = window.matchMedia('(min-width: 761px)');
  wide.addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavToggle);
} else {
  initNavToggle();
}
