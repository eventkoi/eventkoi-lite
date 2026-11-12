<?php
/**
 * Frontend render template for the Event Module.
 *
 * @var object $module The module instance.
 * @var object $settings The module settings.
 * @var string $id The module ID.
 */
$event_id = absint( $settings->event_id ?? 0 );

// Support "Use current event context" when no explicit event is selected.
if ( 0 === $event_id ) {
	$queried_id = absint( get_queried_object_id() );
	if ( $queried_id > 0 && 'eventkoi_event' === get_post_type( $queried_id ) ) {
		$event_id = $queried_id;
	}
}

if ( 0 === $event_id ) {
	$current_id = absint( get_the_ID() );
	if ( $current_id > 0 && 'eventkoi_event' === get_post_type( $current_id ) ) {
		$event_id = $current_id;
	}
}

if ( 0 === $event_id ) {
	$active_event_id = absint( \EventKoi\Core\Event::get_id() );
	if ( $active_event_id > 0 && 'eventkoi_event' === get_post_type( $active_event_id ) ) {
		$event_id = $active_event_id;
	}
}

if ( 0 === $event_id ) {
	if ( class_exists( 'FLBuilderModel' ) && FLBuilderModel::is_builder_active() ) {
		echo '<div class="eventkoi-beaver-module-placeholder" style="text-align:center; padding: 20px; background: #f0f0f1; border: 1px dashed #ccc;">';
		esc_html_e( 'Please select an event to display data.', 'eventkoi-lite' );
		echo '</div>';
	}
	return;
}

$event_data_items = $settings->event_data_items ?? array();

if ( empty( $event_data_items ) ) {
	return;
}

if ( ! is_array( $event_data_items ) ) {
	return;
}

$output = array();

foreach ( $event_data_items as $item ) {
	if ( empty( $item->show ) || 'yes' !== $item->show ) {
		continue;
	}

	$data_type = sanitize_text_field( $item->data_type ?? '' );
	if ( empty( $data_type ) ) {
		continue;
	}

	$shortcode = sprintf(
		'[eventkoi id=%d data=%s]',
		$event_id,
		esc_attr( $data_type )
	);

	$shortcode_output = do_shortcode( $shortcode );

	if ( ! empty( $shortcode_output ) ) {
		$shortcode_output = str_replace(
			'<div class="eventkoi-shortcode">',
			'<div class="eventkoi-shortcode eventkoi-data-' . esc_attr( $data_type ) . '">',
			$shortcode_output
		);
		$shortcode_output = str_replace(
			'<div class="eventkoi-data">',
			'<div class="eventkoi-data eventkoi-data-' . esc_attr( $data_type ) . '">',
			$shortcode_output
		);
	}

	// An optional label sits inline before the value, the way the block
	// templates put text around a token ("Starts on", "Series:").
	$item_label = sanitize_text_field( (string) ( $item->label ?? '' ) );
	if ( '' !== $item_label && '' !== trim( (string) $shortcode_output ) ) {
		$item_wrapper  = '<div class="eventkoi-data eventkoi-data-' . esc_attr( $data_type ) . '">';
		$item_labelled = $item_wrapper . '<span class="eventkoi-label">' . esc_html( $item_label ) . '</span> ';

		$shortcode_output = false !== strpos( $shortcode_output, $item_wrapper )
			? preg_replace( '/' . preg_quote( $item_wrapper, '/' ) . '/', $item_labelled, $shortcode_output, 1 )
			: $item_labelled . $shortcode_output . '</div>';
	}

	// Rows the plugin renders itself (the ticket and RSVP box with its
	// no-script form, the map mount, the series dates loop) carry forms and
	// data attributes the description filter would strip, and are already
	// escaped at the source. Everything else goes through the same allowed
	// set the event description uses.
	$output[] = in_array( $data_type, array( 'event_ticket_rsvp', 'event_gmap', 'event_series_dates' ), true )
		? $shortcode_output
		: wp_kses( $shortcode_output, \EventKoi\Core\Event::get_description_allowed_html() );
}

if ( ! empty( $output ) ) {
	echo '<div class="eventkoi-beaver-module">';
	echo implode( '', $output ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Each row is escaped above or rendered by the plugin itself.
	echo '</div>';
}
