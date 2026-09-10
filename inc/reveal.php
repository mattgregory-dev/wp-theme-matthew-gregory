<?php
/**
 * Scroll reveal — the gate class.
 *
 * The hidden start state in src/styles/_reveal.scss applies only under
 * .sb-reveal-on. Added from the module bundle the class arrives after the
 * browser has painted, so a section flashes in, disappears, and fades back as
 * it is scrolled to. A blocking inline script in the head lands before the
 * first paint, which is why this is not in the bundle.
 *
 * Because it hides content it also arms a failsafe: if the bundle never
 * initializes — a build that did not ship, a JS error, a blocked request — the
 * class comes back off. src/scripts/reveal.js clears the timer as it takes
 * over.
 *
 * @package starter-blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Print the gate script into the head.
 */
function sb_reveal_gate() {
	$script = <<<'JS'
(function () {
	var root = document.documentElement;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	if (!('IntersectionObserver' in window)) return;
	root.classList.add('sb-reveal-on');
	window.sbRevealFailsafe = setTimeout(function () {
		root.classList.remove('sb-reveal-on');
	}, 2000);
})();
JS;

	wp_print_inline_script_tag( $script );
}
add_action( 'wp_head', 'sb_reveal_gate', 1 );
