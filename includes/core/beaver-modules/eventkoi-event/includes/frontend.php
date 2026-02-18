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
		esc_html_e( 'Please select an event to display data.', 'eventkoi' );
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

	$output[] = $shortcode_output;
}

if ( ! empty( $output ) ) {
	echo '<div class="eventkoi-beaver-module">';
	echo implode( '', $output );
	echo '</div>';
}
