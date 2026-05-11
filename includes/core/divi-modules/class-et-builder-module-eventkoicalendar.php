<?php
/**
 * EventKoi Calendar — Divi module.
 *
 * @package EventKoi
 */

defined( 'ABSPATH' ) || exit;

/**
 * ET_Builder_Module_EventkoiCalendar.
 */
class ET_Builder_Module_EventkoiCalendar extends ET_Builder_Module {

	/**
	 * Init module.
	 */
	public function init() {
		$this->name       = esc_html__( 'EventKoi Calendar', 'eventkoi-lite' );
		$this->plural     = esc_html__( 'EventKoi Calendars', 'eventkoi-lite' );
		$this->slug       = 'et_pb_eventkoi_calendar';
		$this->vb_support = 'off';

		$this->settings_modal_toggles = array(
			'general' => array(
				'toggles' => array(
					'main_content' => esc_html__( 'Calendar', 'eventkoi-lite' ),
				),
			),
		);
	}

	/**
	 * Fields.
	 *
	 * @return array
	 */
	public function get_fields() {
		return array(
			'eventkoi_calendar'   => array(
				'label'           => esc_html__( 'Calendar', 'eventkoi-lite' ),
				'type'            => 'select',
				'option_category' => 'basic_option',
				'options'         => $this->calendar_options(),
				'default'         => '',
				'description'     => esc_html__( 'Leave empty to use the default calendar.', 'eventkoi-lite' ),
				'toggle_slug'     => 'main_content',
			),
			'eventkoi_timeframe'  => array(
				'label'            => esc_html__( 'Default timeframe', 'eventkoi-lite' ),
				'type'             => 'select',
				'option_category'  => 'configuration',
				'options'          => array(
					'month' => esc_html__( 'Month', 'eventkoi-lite' ),
					'week'  => esc_html__( 'Week', 'eventkoi-lite' ),
				),
				'default_on_front' => 'month',
				'toggle_slug'      => 'main_content',
			),
			'eventkoi_week_start' => array(
				'label'            => esc_html__( 'Week starts on', 'eventkoi-lite' ),
				'type'             => 'select',
				'option_category'  => 'configuration',
				'options'          => array(
					'sunday'    => esc_html__( 'Sunday', 'eventkoi-lite' ),
					'monday'    => esc_html__( 'Monday', 'eventkoi-lite' ),
					'tuesday'   => esc_html__( 'Tuesday', 'eventkoi-lite' ),
					'wednesday' => esc_html__( 'Wednesday', 'eventkoi-lite' ),
					'thursday'  => esc_html__( 'Thursday', 'eventkoi-lite' ),
					'friday'    => esc_html__( 'Friday', 'eventkoi-lite' ),
					'saturday'  => esc_html__( 'Saturday', 'eventkoi-lite' ),
				),
				'default_on_front' => 'monday',
				'toggle_slug'      => 'main_content',
			),
		);
	}

	/**
	 * Render.
	 *
	 * @param array  $attrs       Attributes.
	 * @param string $content     Content.
	 * @param string $render_slug Slug.
	 * @return string
	 */
	public function render( $attrs, $content, $render_slug ) {
		unset( $attrs, $content, $render_slug );

		$calendar_id = absint( $this->props['eventkoi_calendar'] ?? 0 );
		if ( ! $calendar_id ) {
			$calendar_id = (int) get_option( 'eventkoi_default_event_cal', 0 );
		}

		$args = array(
			'calendars'     => $calendar_id ? array( $calendar_id ) : array(),
			'startday'      => in_array( ( $this->props['eventkoi_week_start'] ?? 'monday' ), array( 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday' ), true ) ? $this->props['eventkoi_week_start'] : 'monday',
			'timeframe'     => in_array( ( $this->props['eventkoi_timeframe'] ?? 'month' ), array( 'month', 'week' ), true ) ? $this->props['eventkoi_timeframe'] : 'month',
			'default_month' => '',
			'default_year'  => '',
			'context'       => 'block',
		);

		if ( ! function_exists( 'eventkoi_get_calendar_content' ) ) {
			return '';
		}

		return sprintf(
			'<div class="eventkoi-divi-calendar eventkoi-calendar-wrapper">%s</div>',
			eventkoi_get_calendar_content( $calendar_id, 'calendar', $args )
		);
	}

	/**
	 * Calendar dropdown options.
	 *
	 * @return array
	 */
	protected function calendar_options() {
		$options = array( '' => esc_html__( '— Default calendar —', 'eventkoi-lite' ) );

		$terms = get_terms(
			array(
				'taxonomy'   => 'event_cal',
				'hide_empty' => false,
			)
		);

		if ( is_wp_error( $terms ) || empty( $terms ) ) {
			return $options;
		}

		foreach ( $terms as $term ) {
			$options[ (string) $term->term_id ] = eventkoi_decode_term_name( $term->name );
		}

		return $options;
	}
}
