<?php

/**
 * Frontend CSS template for the Event Module.
 *
 * @var object $module The module instance.
 * @var object $settings The module settings.
 * @var string $id The module ID.
 */
$data_types = array(
	'event_title',
	'event_details',
	'event_timezone',
	'event_gmap',
	'event_image',
	'event_image_url',
	'event_calendar_url',
	'event_calendar',
	'event_calendar_link',
	'event_location',
	'event_datetime_with_summary',
	'event_datetime',
	'event_date_type',
	'event_rulesummary',
);

foreach ( $data_types as $type ) {
	$typography_setting = "{$type}_typography";
	$color_setting      = "{$type}_color";
	$bg_setting         = "{$type}_bg_color";
	$align_setting      = "{$type}_align";
	$selector           = ".fl-node-$id .eventkoi-data.eventkoi-data-$type, .fl-node-$id .eventkoi-shortcode.eventkoi-data-$type";

	// Typography
	FLBuilderCSS::typography_field_rule( array(
		'settings'     => $settings,
		'setting_name' => $typography_setting,
		'selector'     => $selector,
	) );

	// Text Color
	FLBuilderCSS::rule( array(
		'selector' => $selector,
		'props'    => array(
			'color' => $settings->$color_setting ?? '',
		),
	) );

	// Bg Color
	FLBuilderCSS::rule( array(
		'selector' => $selector,
		'props'    => array(
			'background-color' => $settings->$bg_setting ?? '',
		),
	) );

	// Align
	FLBuilderCSS::rule( array(
		'selector' => $selector,
		'props'    => array(
			'text-align' => $settings->$align_setting ?? '',
		),
	) );
}
