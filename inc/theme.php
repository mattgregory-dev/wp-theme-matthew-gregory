<?php
/**
 * Color scheme — the no-flash resolver.
 *
 * The dark scheme in src/styles/_dark.scss hangs off [data-theme="dark"] on
 * <html>. Setting that from the bundle is too late: the light scheme paints
 * first and the page visibly flips. This prints a blocking inline script in the
 * head instead, ahead of the stylesheet.
 *
 * A stored choice wins; with none, the system preference decides. Unlike the
 * reveal gate this needs no failsafe — it changes colors rather than hiding
 * anything, so a script that never runs leaves a perfectly usable light page.
 *
 * @package starter-blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Resolve the scheme before the first paint.
 */
function sb_color_scheme_resolver() {
	$script = <<<'JS'
(function () {
	try {
		var stored = localStorage.getItem('mg-theme');
		var dark = stored
			? stored === 'dark'
			: window.matchMedia('(prefers-color-scheme: dark)').matches;
		document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
	} catch (e) {}
})();
JS;

	wp_print_inline_script_tag( $script );
}
add_action( 'wp_head', 'sb_color_scheme_resolver', 1 );
