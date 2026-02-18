<?php

/**
 * Frontend CSS template for the Calendar Module.
 *
 * @var object $module The module instance.
 * @var object $settings The module settings.
 * @var string $id The module ID.
 */

FLBuilderCSS::typography_field_rule(
	array(
		'settings'     => $settings,
		'setting_name' => 'table_header_label_typography',
		'selector'     => ".fl-node-$id table.fc-scrollgrid .fc-col-header-cell span",
	)
);

// Normal State
FLBuilderCSS::rule( array(
	'selector' => ".fl-node-$id table.fc-scrollgrid .fc-col-header-cell span",
	'props'    => array(
		'color' => $settings->table_header_label_color ?? '',
	),
) );

FLBuilderCSS::rule( array(
	'selector' => ".fl-node-$id table.fc-scrollgrid .fc-col-header-cell",
	'props'    => array(
		'background-color' => $settings->table_header_label_bg_color ?? '',
	),
) );

// Hover State
FLBuilderCSS::rule( array(
	'selector' => ".fl-node-$id table.fc-scrollgrid .fc-col-header-cell:hover span",
	'props'    => array(
		'color' => $settings->table_header_label_hover_color ?? '',
	),
) );

FLBuilderCSS::rule( array(
	'selector' => ".fl-node-$id table.fc-scrollgrid .fc-col-header-cell:hover",
	'props'    => array(
		'background-color' => $settings->table_header_label_hover_bg_color ?? '',
	),
) );
