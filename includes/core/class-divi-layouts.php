<?php
/**
 * Layout definitions for the ready-made Divi templates.
 *
 * Builds the same three pages the Elementor templates carry (single event,
 * event series, calendar) from the EventKoi Event and Calendar modules and
 * Divi's own buttons. The layouts are written in Divi's classic shortcode
 * format, which Divi 4 stores as is and Divi 5 converts to its own format, so
 * one definition serves both.
 *
 * @package EventKoi
 */

namespace EventKoi\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Class Divi_Layouts.
 */
class Divi_Layouts {

	/**
	 * Builder version stamped on every element. Divi 5 reads it to know the
	 * content still needs converting.
	 */
	const BUILDER_VERSION = '4.27.4';

	/**
	 * Build the layout content for a template.
	 *
	 * @param string $key Template key: event, series or calendar.
	 * @return string
	 */
	public function build( $key ) {
		switch ( $key ) {
			case 'event':
				return $this->event();
			case 'series':
				return $this->series();
			case 'calendar':
				return $this->calendar();
		}

		return '';
	}

	/**
	 * Single event page.
	 *
	 * @return string
	 */
	private function event() {
		$buttons = $this->action_buttons( 'right' );

		return $this->section(
			$this->row(
				'3_5,1_5,1_5',
				array(
					$this->event_data( 'event_calendar_link', __( '← See all events in', 'eventkoi-lite' ) )
						. $this->event_data( 'event_title', '', $this->title_style( 36 ) ),
					$buttons[0],
					$buttons[1],
				)
			)
			. $this->row(
				'2_3,1_3',
				array(
					$this->event_data( 'event_image' )
						. $this->event_data( 'event_details' )
						. $this->event_data( 'event_custom_fields_with_name' ),
					$this->info_box( array( 'event_datetime_with_summary', 'event_timezone', 'event_location' ) )
						. $this->event_data( 'event_ticket_rsvp', '', array( 'custom_margin' => '20px||||false|false' ) )
						. $this->event_data( 'event_gmap' ),
				)
			)
		);
	}

	/**
	 * Recurring event series page.
	 *
	 * @return string
	 */
	private function series() {
		$buttons = $this->action_buttons( 'left' );

		return $this->section(
			$this->row(
				'4_4',
				array(
					$this->event_data( 'event_calendar_link', __( '← See all events in', 'eventkoi-lite' ) )
						. $this->event_data( 'event_title', __( 'Series:', 'eventkoi-lite' ), $this->title_style( 32 ) )
						. $this->event_data( 'event_datetime', __( 'Starts on', 'eventkoi-lite' ) )
						. $this->event_data( 'event_rulesummary', __( 'Runs', 'eventkoi-lite' ) ),
				)
			)
			. $this->row( '1_5,1_5,3_5', array( $buttons[0], $buttons[1], '' ) )
			. $this->row(
				'4_4',
				array(
					$this->event_data( 'event_details' ) . $this->event_data( 'event_series_dates' ),
				)
			)
		);
	}

	/**
	 * Calendar page.
	 *
	 * @return string
	 */
	private function calendar() {
		return $this->section(
			$this->row(
				'4_4',
				array(
					$this->element(
						'et_pb_eventkoi_calendar',
						array(
							'eventkoi_calendar'      => 'current',
							'eventkoi_timeframe'     => 'month',
							'eventkoi_show_timezone' => 'on',
						)
					),
				)
			)
		);
	}

	/**
	 * Custom CSS that sets the event title like the block template heading.
	 *
	 * @param int $size Font size in pixels.
	 * @return array
	 */
	private function title_style( $size ) {
		return array(
			'custom_css_main_element' => 'font-size: ' . (int) $size . 'px;||font-weight: 600;||line-height: 1.2em;',
		);
	}

	/**
	 * The date and location box of the block template: consecutive modules
	 * sharing one background and border, so each stays its own module.
	 *
	 * @param array $types Data type keys in display order.
	 * @return string
	 */
	private function info_box( array $types ) {
		$output = '';
		$last   = count( $types ) - 1;

		foreach ( array_values( $types ) as $index => $type ) {
			$first = 0 === $index;
			$final = $last === $index;

			$settings = array(
				'background_color'    => '#f3f3f3',
				'custom_margin'       => '||0px||false|false',
				'custom_padding'      => ( $first ? '30px' : '0px' ) . '|30px|' . ( $final ? '30px' : '0px' ) . '|30px|false|false',
				'border_radii'        => 'on|' . ( $first ? '10px|10px' : '0px|0px' ) . '|' . ( $final ? '10px|10px' : '0px|0px' ),
				'border_width_left'   => '1px',
				'border_color_left'   => '#eeeeee',
				'border_width_right'  => '1px',
				'border_color_right'  => '#eeeeee',
				'border_width_top'    => $first ? '1px' : '0px',
				'border_color_top'    => '#eeeeee',
				'border_width_bottom' => $final ? '1px' : '0px',
				'border_color_bottom' => '#eeeeee',
			);

			if ( 'event_timezone' === $type ) {
				$settings['custom_css_main_element'] = 'color: #999999;';
			}

			$output .= $this->event_data( $type, '', $settings );
		}

		return $output;
	}

	/**
	 * The Add to calendar and Share buttons the block templates carry.
	 *
	 * @param string $align left or right.
	 * @return string[] Two button elements.
	 */
	private function action_buttons( $align ) {
		$style = array(
			'button_alignment'              => $align,
			'custom_button'                 => 'on',
			'button_text_size'              => '14px',
			'button_text_color'             => '#2d2d2d',
			'button_bg_color'               => '#ffffff',
			'button_border_width'           => '1px',
			'button_border_color'           => '#dcdcdc',
			'button_border_radius'          => '10px',
			'button_bg_color__hover_enabled' => 'on|hover',
			'button_bg_color__hover'        => '#f3f3f3',
			'custom_padding'                => '10px|20px|10px|20px|true|true',
		);

		return array(
			$this->element(
				'et_pb_button',
				array_merge(
					array(
						'button_text' => __( '+ Add to calendar', 'eventkoi-lite' ),
						'button_url'  => '#add-to-cal',
						'button_use_icon' => 'off',
					),
					$style
				)
			),
			$this->element(
				'et_pb_button',
				array_merge(
					array(
						'button_text' => __( 'Share', 'eventkoi-lite' ),
						'button_url'  => '#event-share',
						'button_use_icon' => 'off',
					),
					$style
				)
			),
		);
	}

	/**
	 * An EventKoi Event module following the page's event.
	 *
	 * @param string $type     Data type key.
	 * @param string $label    Optional text printed before the value.
	 * @param array  $settings Extra module settings (design options).
	 * @return string
	 */
	private function event_data( $type, $label = '', array $settings = array() ) {
		return $this->element(
			'et_pb_eventkoi_event',
			array_merge(
				array(
					'eventkoi_event_id' => 'current',
					'eventkoi_data'     => $type,
					'eventkoi_label'    => $label,
				),
				$settings
			)
		);
	}

	/**
	 * The page section, carrying the eventkoi-front class so the frontend
	 * styles scope to the layout like the block template.
	 *
	 * @param string $rows Row elements.
	 * @return string
	 */
	private function section( $rows ) {
		return $this->element(
			'et_pb_section',
			array(
				'fb_built'       => '1',
				'module_class'   => 'eventkoi-front',
				'custom_padding' => '40px|30px|40px|30px|true|true',
			),
			$rows
		);
	}

	/**
	 * A row constrained to 1100px.
	 *
	 * @param string   $structure Column structure, such as 2_3,1_3.
	 * @param string[] $columns   Content of each column, in order.
	 * @return string
	 */
	private function row( $structure, array $columns ) {
		$types  = explode( ',', $structure );
		$output = '';

		foreach ( $types as $index => $type ) {
			$output .= $this->element( 'et_pb_column', array( 'type' => $type ), (string) ( $columns[ $index ] ?? '' ) );
		}

		$settings = array(
			'width'          => '100%',
			'max_width'      => '1100px',
			'custom_padding' => '0px||30px||false|false',
		);

		if ( '4_4' !== $structure ) {
			$settings = array_merge( array( 'column_structure' => $structure ), $settings );
		}

		return $this->element( 'et_pb_row', $settings, $output );
	}

	/**
	 * One element in shortcode form.
	 *
	 * @param string      $tag      Shortcode tag.
	 * @param array       $settings Attributes.
	 * @param string|null $content  Inner content, or null for a module.
	 * @return string
	 */
	private function element( $tag, array $settings, $content = null ) {
		$settings['_builder_version'] = self::BUILDER_VERSION;

		$attributes = '';
		foreach ( $settings as $name => $value ) {
			if ( '' === (string) $value ) {
				continue;
			}

			$attributes .= ' ' . $name . '="' . self::escape( (string) $value ) . '"';
		}

		return '[' . $tag . $attributes . ']' . (string) $content . '[/' . $tag . ']';
	}

	/**
	 * Make a value safe inside a shortcode attribute.
	 *
	 * Square brackets would end the shortcode early and a double quote would
	 * end the attribute, so both are written as entities, the way Divi does.
	 *
	 * @param string $value Raw value.
	 * @return string
	 */
	private static function escape( $value ) {
		return str_replace(
			array( '"', '[', ']' ),
			array( '%22', '%91', '%93' ),
			$value
		);
	}
}
