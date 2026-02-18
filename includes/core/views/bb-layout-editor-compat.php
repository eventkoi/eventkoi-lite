<?php
/**
 * Block-theme compatibility template for Beaver Themer editor route.
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
	<?php
	if ( function_exists( 'eventkoi_get_header' ) ) {
		echo eventkoi_get_header(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}
	?>
	<main id="primary" class="eventkoi-bb-layout-editor-compat">
		<?php
		if ( class_exists( 'FLThemeBuilderLayoutRenderer' ) ) {
			FLThemeBuilderLayoutRenderer::render_content_layout();
		} elseif ( have_posts() ) {
			while ( have_posts() ) {
				the_post();
				the_content();
			}
		}
		?>
	</main>
	<?php
	if ( function_exists( 'eventkoi_get_footer' ) ) {
		echo eventkoi_get_footer(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}
	?>
</div>
<?php wp_footer(); ?>
</body>
</html>
