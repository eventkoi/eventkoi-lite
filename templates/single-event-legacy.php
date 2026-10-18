<?php
/**
 * Displays a single event.
 *
 * @package EventKoi
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( eventkoi_current_theme_support() ) : ?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<?php
	$header  = eventkoi_get_header();
	$content = eventkoi_get_content();
	$footer  = eventkoi_get_footer();
	?>
	<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
	<?php wp_body_open(); ?>

<div class="wp-site-blocks">

	<?php echo $header; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered theme header template part, output as core does. ?>

	<?php do_action( 'eventkoi_before_event_content' ); ?>

	<?php while ( have_posts() ) : ?>

		<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered plugin block output. ?>
		<?php do_action( 'eventkoi_single_event_template', $post ); ?>

	<?php endwhile; ?>

	<?php do_action( 'eventkoi_after_event_content' ); ?>

	<?php echo $footer; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered theme footer template part, output as core does. ?>

</div>

	<?php wp_footer(); ?>

</body>
</html>

	<?php
else :

	get_header();

	do_action( 'eventkoi_before_event_content' );

	while ( have_posts() ) :
		the_post();

		echo eventkoi_get_content(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered plugin block output.

		do_action( 'eventkoi_single_event_template', get_post() );

	endwhile;

	do_action( 'eventkoi_after_event_content' );

	get_footer();

endif;
