// Scroll reveal.
// Elements carrying .sb-reveal, and the direct children of .sb-reveal-group,
// fade in once as they enter the viewport.
//
// The hidden start state lives in src/styles/_reveal.scss behind .sb-reveal-on,
// which inc/reveal.php adds in the head — anything added from here lands after
// the first paint, and shows as a flash. That script also arms a failsafe to
// strip the class if this module never runs.

const STEP = 90; // ms between children of a group
const STEP_SLOW = 140; // for .sb-reveal-group--slow

function initReveal() {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The head script hid the content; this module is what brings it back, so the
  // failsafe stands down only once we are certain to run.
  clearTimeout(window.sbRevealFailsafe);

  if (reduce || !('IntersectionObserver' in window)) {
    root.classList.remove('sb-reveal-on');
    return;
  }

  const groups = document.querySelectorAll('.sb-reveal-group');
  const singles = document.querySelectorAll('.sb-reveal');
  if (!groups.length && !singles.length) {
    root.classList.remove('sb-reveal-on');
    return;
  }

  // Only the delays are set here. The hidden state itself is in the stylesheet,
  // which is what keeps it from arriving a paint too late.
  groups.forEach((group) => {
    const step = group.classList.contains('sb-reveal-group--slow') ? STEP_SLOW : STEP;
    [...group.children].forEach((child, i) => {
      child.style.setProperty('--sb-reveal-delay', `${i * step}ms`);
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        if (entry.target.classList.contains('sb-reveal-group')) {
          [...entry.target.children].forEach((child) => child.classList.add('is-in'));
        } else {
          entry.target.classList.add('is-in');
        }

        // One-shot: nothing re-hides on the way back up.
        observer.unobserve(entry.target);
      });
    },
    // Fires a little before the element is fully in view, so the motion reads
    // as the section arriving rather than as a correction after it has landed.
    { rootMargin: '0px 0px -12% 0px', threshold: 0.18 }
  );

  groups.forEach((group) => observer.observe(group));
  singles.forEach((el) => {
    // A .sb-reveal inside a group is sequenced by its group, not on its own.
    if (!el.closest('.sb-reveal-group')) observer.observe(el);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReveal);
} else {
  initReveal();
}
