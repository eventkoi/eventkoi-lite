<?php
/**
 * Beaver Module Manager.
 *
 * @package EventKoi\Core
 */

namespace EventKoi\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Register Beaver Builder modules and settings forms.
 */
class Beaver_Modules {
	/**
	 * Hook Beaver module registration.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register_modules' ), 20 );
	}

	/**
	 * Register Beaver Builder modules.
	 */
	public function register_modules() {
		if ( ! class_exists( 'FLBuilder' ) ) {
			return;
		}

		require_once EVENTKOI_PLUGIN_DIR . 'includes/core/beaver-modules/eventkoi-calendar/class-module-calendar.php';
		require_once EVENTKOI_PLUGIN_DIR . 'includes/core/beaver-modules/eventkoi-event/class-module-event.php';

		\FLBuilder::register_settings_form( 'eventkoi_event_data_item_form', $this->get_event_data_item_form() );
		\FLBuilder::register_module( 'EventKoi_Beaver_Calendar_Module', $this->get_calendar_module_form() );
		\FLBuilder::register_module( 'EventKoi_Beaver_Event_Module', $this->get_event_module_form() );
	}

	/**
	 * Get settings form for Event Data item.
	 *
	 * @return array
	 */
	private function get_event_data_item_form() {
		return array(
			'title' => __( 'Event Data Item Settings', 'eventkoi-lite' ),
			'tabs'  => array(
				'general' => array(
					'title'    => __( 'General', 'eventkoi-lite' ),
					'sections' => array(
						'general' => array(
							'title'  => '',
							'fields' => array(
								'data_type' => array(
									'type'    => 'select',
									'label'   => __( 'Data Type', 'eventkoi-lite' ),
									'options' => eventkoi_get_event_data_options(),
								),
								'show'      => array(
									'type'    => 'select',
									'label'   => __( 'Show', 'eventkoi-lite' ),
									'options' => array(
										'yes' => __( 'Yes', 'eventkoi-lite' ),
										'no'  => __( 'No', 'eventkoi-lite' ),
									),
									'default' => 'yes',
								),
							),
						),
					),
				),
			),
		);
	}

	/**
	 * Get settings for Event Calendar module.
	 *
	 * @return array
	 */
	private function get_calendar_module_form() {
		return array(
			'general' => array(
				'title'    => __( 'Calendar Options', 'eventkoi-lite' ),
				'sections' => array(
					'general' => array(
						'title'  => '',
						'fields' => array(
							'calendars'      => array(
								'type'    => 'select',
								'label'   => __( 'Select Calendar', 'eventkoi-lite' ),
								'options' => eventkoi_get_calendar_options(),
								'help'    => __( 'Leave empty to use the default calendar.', 'eventkoi-lite' ),
							),
							'timeframe'      => array(
								'type'    => 'select',
								'label'   => __( 'Timeframe defaults to', 'eventkoi-lite' ),
								'default' => 'month',
								'options' => array(
									'month' => __( 'Month', 'eventkoi-lite' ),
									'week'  => __( 'Week', 'eventkoi-lite' ),
								),
							),
							'default_month'  => array(
								'type'    => 'select',
								'label'   => __( 'Default month to display', 'eventkoi-lite' ),
								'default' => 'current',
								'options' => eventkoi_get_month_options(),
								'help'    => __( 'Choose a fixed month or use the current month.', 'eventkoi-lite' ),
							),
							'default_year'   => array(
								'type'        => 'text',
								'label'       => __( 'Default year to display', 'eventkoi-lite' ),
								'placeholder' => wp_date( 'Y' ),
								/* translators: %s: example year value. */
								'help'        => sprintf( __( 'Leave empty to follow the current year or enter a four-digit year (e.g. %s).', 'eventkoi-lite' ), '2025' ),
								'size'        => '10',
							),
							'week_starts_on' => array(
								'type'    => 'select',
								'label'   => __( 'Week starts on', 'eventkoi-lite' ),
								'default' => 'monday',
								'options' => eventkoi_get_weekday_options(),
							),
						),
					),
				),
			),
			'style'   => array(
				'title'    => __( 'Style', 'eventkoi-lite' ),
				'sections' => array(
					'labels' => array(
						'title'  => __( 'Day\'s Labels', 'eventkoi-lite' ),
						'fields' => array(
							'table_header_label_typography' => array(
								'type'       => 'typography',
								'label'      => __( 'Typography', 'eventkoi-lite' ),
								'responsive' => true,
								'preview'    => array(
									'type'     => 'css',
									'selector' => 'table.fc-scrollgrid .fc-col-header-cell span',
								),
							),
							'table_header_label_color'    => array(
								'type'       => 'color',
								'label'      => __( 'Color', 'eventkoi-lite' ),
								'show_reset' => true,
								'preview'    => array(
									'type'     => 'css',
									'selector' => 'table.fc-scrollgrid .fc-col-header-cell span',
									'property' => 'color',
								),
							),
							'table_header_label_bg_color' => array(
								'type'       => 'color',
								'label'      => __( 'Background Color', 'eventkoi-lite' ),
								'show_reset' => true,
								'preview'    => array(
									'type'     => 'css',
									'selector' => 'table.fc-scrollgrid .fc-col-header-cell',
									'property' => 'background-color',
								),
							),
							'table_header_label_hover_color' => array(
								'type'       => 'color',
								'label'      => __( 'Hover Color', 'eventkoi-lite' ),
								'show_reset' => true,
								'preview'    => array(
									'type'     => 'css',
									'selector' => 'table.fc-scrollgrid .fc-col-header-cell:hover span',
									'property' => 'color',
								),
							),
							'table_header_label_hover_bg_color' => array(
								'type'       => 'color',
								'label'      => __( 'Hover Background Color', 'eventkoi-lite' ),
								'show_reset' => true,
								'preview'    => array(
									'type'     => 'css',
									'selector' => 'table.fc-scrollgrid .fc-col-header-cell:hover',
									'property' => 'background-color',
								),
							),
						),
					),
				),
			),
		);
	}

	/**
	 * Get settings for Event Data module.
	 *
	 * @return array
	 */
	private function get_event_module_form() {
		$data_types = eventkoi_get_event_data_options();
		$form       = array(
			'general' => array(
				'title'    => __( 'Event Options', 'eventkoi-lite' ),
				'sections' => array(
					'general' => array(
						'title'  => '',
						'fields' => array(
							'event_id'         => array(
								'type'    => 'select',
								'label'   => __( 'Select Event', 'eventkoi-lite' ),
								'options' => $this->get_beaver_event_options(),
								'default' => '',
							),
							'event_data_items' => array(
								'type'         => 'form',
								'label'        => __( 'Event Data Items', 'eventkoi-lite' ),
								'form'         => 'eventkoi_event_data_item_form',
								'preview_text' => 'data_type',
								'multiple'     => true,
								'default'      => eventkoi_get_default_event_data_items(),
							),
						),
					),
				),
			),
			'style'   => array(
				'title'    => __( 'Style', 'eventkoi-lite' ),
				'sections' => array(),
			),
		);

		foreach ( $data_types as $data_type_key => $data_type_label ) {
			$form['style']['sections'][ 'style_' . $data_type_key ] = array(
				'title'  => $data_type_label,
				'fields' => array(
					$data_type_key . '_typography' => array(
						'type'       => 'typography',
						'label'      => __( 'Typography', 'eventkoi-lite' ),
						'responsive' => false,
						'preview'    => array(
							'type'     => 'css',
							'selector' => '.eventkoi-data.eventkoi-data-' . $data_type_key . ', .eventkoi-shortcode.eventkoi-data-' . $data_type_key,
						),
					),
					$data_type_key . '_color'      => array(
						'type'       => 'color',
						'label'      => __( 'Text Color', 'eventkoi-lite' ),
						'show_reset' => true,
						'preview'    => array(
							'type'     => 'css',
							'selector' => '.eventkoi-data.eventkoi-data-' . $data_type_key . ', .eventkoi-shortcode.eventkoi-data-' . $data_type_key,
							'property' => 'color',
						),
					),
					$data_type_key . '_bg_color'   => array(
						'type'       => 'color',
						'label'      => __( 'Background Color', 'eventkoi-lite' ),
						'show_reset' => true,
						'preview'    => array(
							'type'     => 'css',
							'selector' => '.eventkoi-data.eventkoi-data-' . $data_type_key . ', .eventkoi-shortcode.eventkoi-data-' . $data_type_key,
							'property' => 'background-color',
						),
					),
					$data_type_key . '_align'      => array(
						'type'    => 'select',
						'label'   => __( 'Alignment', 'eventkoi-lite' ),
						'options' => array(
							''       => __( 'Default', 'eventkoi-lite' ),
							'left'   => __( 'Left', 'eventkoi-lite' ),
							'center' => __( 'Center', 'eventkoi-lite' ),
							'right'  => __( 'Right', 'eventkoi-lite' ),
						),
						'preview' => array(
							'type'     => 'css',
							'selector' => '.eventkoi-data.eventkoi-data-' . $data_type_key . ', .eventkoi-shortcode.eventkoi-data-' . $data_type_key,
							'property' => 'text-align',
						),
					),
				),
			);
		}

		return $form;
	}

	/**
	 * Get event options for Beaver module settings.
	 *
	 * Beaver serializes a large number of form inputs while editing modules.
	 * Limiting option count avoids hitting PHP max_input_vars on sites with
	 * many events.
	 *
	 * @return array<string, string>
	 */
	private function get_beaver_event_options() {
		$limit = (int) apply_filters( 'eventkoi_beaver_event_options_limit', 200 );
		if ( $limit < 1 ) {
			$limit = 200;
		}

		$options = array(
			'' => __( 'Use current event context', 'eventkoi-lite' ),
		);

		$events = get_posts(
			array(
				'post_type'      => 'eventkoi_event',
				'posts_per_page' => $limit,
				'post_status'    => array( 'publish', 'draft', 'future', 'private' ),
				'orderby'        => 'modified',
				'order'          => 'DESC',
			)
		);

		if ( is_wp_error( $events ) || empty( $events ) ) {
			return $options;
		}

		foreach ( $events as $event_post ) {
			$id = absint( $event_post->ID );
			/* translators: %d: event post ID used as fallback event label. */
			$fallback_title          = sprintf( __( 'Event #%d', 'eventkoi-lite' ), $id );
			$title                   = ! empty( $event_post->post_title )
				? $event_post->post_title
				: $fallback_title;
			$options[ (string) $id ] = $title;
		}

		return $options;
	}

}
