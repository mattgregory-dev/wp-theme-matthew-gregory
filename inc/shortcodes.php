<?php
/**
 * Small content shortcodes.
 *
 * @package starter-blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// The current year, for a copyright line that should not need editing every
// January. `wp_date` reads the site's timezone rather than the server's, so the
// year turns over when it does locally and not hours early or late.
//
// Template parts are HTML files that no shortcode filter runs over, so a bare
// [sb_year] in one renders as literal text. It has to sit inside a
// core/shortcode block, which is what calls do_shortcode on its content.
function sb_year_shortcode() {
	return esc_html( wp_date( 'Y' ) );
}
add_shortcode( 'sb_year', 'sb_year_shortcode' );
