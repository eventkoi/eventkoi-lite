<?php
/**
 * Compatibility template for Elementor's editor preview of events.
 *
 * Elementor injects its editable canvas through `the_content`, which the
 * plugin's own event block template never prints — without this view the
 * editor fatals with "content area was not found".
 *
 * @package EventKoi
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div class="wp-site-blocks">
	<main id="primary" class="eventkoi-elementor-preview-compat">
		<?php
		if ( have_posts() ) {
			while ( have_posts() ) {
				the_post();
				the_content();
			}
		}
		?>
	</main>
</div>
<?php wp_footer(); ?>
</body>
</html>
