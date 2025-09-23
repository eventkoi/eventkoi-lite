<?php
/**
 * Displays a single calendar.
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
	$content = eventkoi_get_calendar_content();
	$footer  = eventkoi_get_footer();
	?>
	<?php wp_head(); ?>
	<?php /* translators: %1$s calendar title, %2$s site name */ ?>
	<title><?php printf( esc_attr__( '%1$s &#8211; %2$s', 'eventkoi-lite' ), esc_attr( single_term_title() ), esc_attr( get_bloginfo( 'name' ) ) ); ?></title>
</head>

<body <?php body_class(); ?>>
	<?php wp_body_open(); ?>

<div class="wp-site-blocks">

	<?php echo wp_kses_post( $header ); ?>

	<?php do_action( 'eventkoi_before_calendar_content' ); ?>

	<?php echo wp_kses_post( $content ); ?>
	<?php do_action( 'eventkoi_single_calendar_template' ); ?>

	<?php do_action( 'eventkoi_after_calendar_content' ); ?>

	<?php echo wp_kses_post( $footer ); ?>

</div>

	<?php wp_footer(); ?>

</body>
</html>

	<?php
else :

		get_header();

		do_action( 'eventkoi_before_calendar_content' );

		echo wp_kses_post( eventkoi_get_calendar_content() );
		do_action( 'eventkoi_single_calendar_template' );

		do_action( 'eventkoi_after_calendar_content' );

		get_footer();

endif;
