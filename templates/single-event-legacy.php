<?php
/**
 * Displays a single event.
 *
 * @package EventKoi
 */

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

	<?php echo wp_kses_post( $header ); ?>

	<?php do_action( 'eventkoi_before_event_content' ); ?>

	<?php while ( have_posts() ) : ?>

		<?php echo wp_kses_post( $content ); ?>
		<?php do_action( 'eventkoi_single_event_template', the_post() ); ?>

	<?php endwhile; ?>

	<?php do_action( 'eventkoi_after_event_content' ); ?>

	<?php echo wp_kses_post( $footer ); ?>

</div>

	<?php wp_footer(); ?>

</body>
</html>

	<?php
else :

	get_header();

	do_action( 'eventkoi_before_event_content' );

	while ( have_posts() ) :

		echo wp_kses_post( eventkoi_get_content() );
		do_action( 'eventkoi_single_event_template', the_post() );

	endwhile;

	do_action( 'eventkoi_after_event_content' );

	get_footer();

endif;
