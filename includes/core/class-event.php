<?php
/**
 * Event.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

use EKLIB\StellarWP\DB\DB;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Event.
 */
class Event {

	/**
	 * Event object.
	 *
	 * @var $event.
	 */
	private static $event = null;

	/**
	 * Default event meta keys.
	 *
	 * @var array
	 */
	private static $meta_keys = array(
		'title',
		'description',
		'summary',
		'image',
		'image_id',
		'calendar',
		'calendar_link',
		'start_date',
		'start_date_gmt',
		'start_date_iso',
		'start_date_g',
		'end_date',
		'end_date_gmt',
		'end_date_iso',
		'end_date_g',
		'timeline',
		'location_line',
		'modified_date',
		'modified_date_gmt',
		'status',
		'wp_status',
		'url',
		'ical',
		'tbc',
		'tbc_note',
		'type',
		'date_type',
		'address1',
		'address2',
		'address3',
		'location',
		'latitude',
		'longitude',
		'embed_gmap',
		'gmap_link',
		'virtual_url',
		'template',
		'timezone_display',
		'timezone',
		'event_days',
		'locations',
		'recurrence_rules',
		'recurrence_overrides',
		'rulesummary',
		'standard_type',
	);

	/**
	 * Event ID.
	 *
	 * @var $event_id.
	 */
	private static $event_id = 0;

	/**
	 * Control flags.
	 *
	 * @var bool
	 */
	private static $suppress_inline_rulesummary = false;

	/**
	 * Construct.
	 *
	 * @param {object, number} $event An event object or event ID.
	 */
	public function __construct( $event = null ) {

		if ( is_numeric( $event ) ) {
			$event = get_post( $event );
			if ( ! empty( $event->post_type ) && 'event' !== $event->post_type ) {
				$event = array();
			}
		}

		self::$event    = $event;
		self::$event_id = ! empty( $event->ID ) ? $event->ID : 0;
	}

	/**
	 * Set whether to suppress inline rule summaries inside rendered_datetime().
	 *
	 * @param bool $value True to suppress summaries, false to include them.
	 * @return void
	 */
	public static function suppress_inline_rulesummary( $value = true ) {
		self::$suppress_inline_rulesummary = (bool) $value;
	}

	/**
	 * Get event.
	 *
	 * @param int $event_id ID for an event.
	 */
	public static function get_event( $event_id ) {
		$event          = get_post( $event_id );
		self::$event    = $event;
		self::$event_id = ! empty( $event->ID ) ? $event->ID : 0;

		return self::get_meta();
	}

	/**
	 * Get meta.
	 *
	 * @return array Event meta, including instance overrides if applicable.
	 */
	public static function get_meta() {
		$meta = array(
			'id' => self::get_id(),
		);

		foreach ( self::$meta_keys as $key ) {
			$method       = 'get_' . $key;
			$meta[ $key ] = method_exists( __CLASS__, $method ) ? self::$method() : '';
		}

		// Apply instance-specific overrides, if any.
		$instance_ts = eventkoi_get_instance_id();
		if ( $instance_ts ) {
			$overrides = self::get_recurrence_overrides();

			if ( isset( $overrides[ $instance_ts ] ) && is_array( $overrides[ $instance_ts ] ) ) {
				foreach ( $overrides[ $instance_ts ] as $key => $value ) {
					// Prevent blank string overrides from replacing valid content for known fields.
					if (
					is_string( $value ) &&
					'' === trim( $value ) &&
					in_array( $key, array( 'title', 'description', 'summary' ), true )
					) {
						continue;
					}

					$meta[ $key ] = $value;
				}
			}
		}

		return apply_filters( 'eventkoi_get_event_meta', $meta, self::$event_id, self::$event );
	}

	/**
	 * Render meta.
	 *
	 * @param string $name This is the data name to render.
	 * @return string Rendered output.
	 */
	public static function render_meta( $name ) {
		$name = str_replace( 'eventkoi/', '', $name );
		$name = str_replace( '-', '_', $name );
		$name = str_replace( 'event_', '', $name );

		// Support location_1, location_2, etc.
		if ( preg_match( '/^location_(\d+)$/', $name, $matches ) ) {
			$index     = absint( $matches[1] ) - 1;
			$locations = self::get_locations();

			if ( isset( $locations[ $index ] ) && is_array( $locations[ $index ] ) ) {
				return self::render_location_single( $locations[ $index ] );
			}
		}

		// Support rulesummary_1, rulesummary_2, etc.
		if ( preg_match( '/^rulesummary_(\d+)$/', $name, $matches ) ) {
			$index = absint( $matches[1] ) - 1;
			$rules = self::get_recurrence_rules();

			if ( isset( $rules[ $index ] ) && is_array( $rules[ $index ] ) ) {
				return self::render_rule_summary_single( $rules[ $index ] );
			}
		}

		// Support datetime_1, datetime_2, etc.
		if ( preg_match( '/^datetime_(\d+)$/', $name, $matches ) ) {
			$index = absint( $matches[1] ) - 1;
			$type  = self::get_date_type();
			$data  = ( 'recurring' === $type ) ? self::get_recurrence_rules() : self::get_event_days();

			if ( isset( $data[ $index ] ) && is_array( $data[ $index ] ) ) {
				$item       = $data[ $index ];
				$start_ts   = ! empty( $item['start_date'] ) ? strtotime( $item['start_date'] ) : false;
				$end_ts     = ! empty( $item['end_date'] ) ? strtotime( $item['end_date'] ) : null;
				$is_all_day = ! empty( $item['all_day'] );

				if ( ! $start_ts ) {
					return '';
				}

				if ( $end_ts && $end_ts < $start_ts ) {
					$end_ts = null;
				}

				if ( $is_all_day ) {
					return eventkoi_date( 'M j, Y', $start_ts );
				}

				$start_str = eventkoi_date( 'M j, Y, g:ia', $start_ts );

				if ( $end_ts ) {
					$end_str    = eventkoi_date( 'g:ia', $end_ts );
					$start_str .= ' - ' . $end_str;
				}

				return $start_str;
			}
		}

		$method = 'rendered_' . $name;

		if ( method_exists( __CLASS__, $method ) ) {
			return apply_filters( 'eventkoi_' . $name . '_output', self::$method(), self::get_id() );
		} else {

			return self::rendered_meta( $name );
		}

		return '';
	}

	/**
	 * Render a single meta key.
	 *
	 * @param string $key A meta key to render.
	 */
	public static function rendered_meta( $key = '' ) {
		$value = '';

		if ( 'date_type' === $key ) {
			$value = self::get_date_type();
		}

		return apply_filters( 'eventkoi_rendered_meta_for_' . $key, $value, self::$event_id );
	}

	/**
	 * Render a single rule summary.
	 *
	 * @param array $rule Recurrence rule.
	 * @return string Human-readable summary.
	 */
	public static function render_rule_summary_single( $rule ) {
		if ( empty( $rule['start_date'] ) || empty( $rule['frequency'] ) ) {
			return '';
		}

		// Fake a multi-rule context for compatibility.
		$all_rules      = array( $rule );
		$original_rules = self::get_recurrence_rules();

		// Temporarily override get_recurrence_rules.
		add_filter(
			'eventkoi_get_event_recurrence_rules',
			function () use ( $all_rules ) {
				return $all_rules;
			},
			9999
		);

		$output = self::rendered_rulesummary( true );

		// Restore original filters immediately.
		remove_all_filters( 'eventkoi_get_event_recurrence_rules' );

		// If rendered_rulesummary returns multiple rules, extract only the first.
		$parts = explode( '<br>', $output );
		return isset( $parts[0] ) ? $parts[0] : '';
	}

	/**
	 * Render a single location array into HTML.
	 *
	 * @param array $location Location array.
	 * @return string HTML-safe location markup.
	 */
	public static function render_location_single( $location ) {
		if ( empty( $location ) || ! is_array( $location ) ) {
			return '';
		}

		$type      = $location['type'] ?? 'physical';
		$name      = $location['name'] ?? '';
		$line1     = $location['address1'] ?? '';
		$line2     = $location['address2'] ?? '';
		$city      = $location['city'] ?? '';
		$state     = $location['state'] ?? '';
		$zip       = $location['zip'] ?? '';
		$country   = $location['country'] ?? '';
		$url       = $location['virtual_url'] ?? '';
		$link_text = $location['link_text'] ?? '';

		$lines = array();

		if ( 'physical' === $type ) {
			foreach ( array( $name, $line1, $line2 ) as $part ) {
				if ( $part ) {
					$lines[] = esc_html( $part );
				}
			}

			$city_line = implode( ', ', array_filter( array( $city, $state, $zip ) ) );
			if ( $city_line ) {
				$lines[] = esc_html( $city_line );
			}
			if ( $country ) {
				$lines[] = esc_html( $country );
			}
		} elseif ( 'online' === $type && $url ) {
			if ( ! empty( $name ) ) {
				$title = $name;
			} else {
				$title = __( 'Attend online', 'eventkoi-lite' );
			}

			if ( ! empty( $link_text ) ) {
				$label = $link_text;
			} else {
				$label = $url;
			}

			$lines[] = '<strong>' . esc_html( $title ) . '</strong>';
			$lines[] = '<a href="' . esc_url( $url ) . '" target="_blank" rel="noopener noreferrer">'
			. esc_html( $label ) . '</a>';
		}

		if ( empty( $lines ) ) {
			return '';
		}

		$class = 'eventkoi-location ' . ( 'online' === $type ? 'virtual' : 'physical' );

		return '<address class="' . esc_attr( $class ) . '">' . implode( '<br>', $lines ) . '</address>';
	}

	/**
	 * Update event.
	 *
	 * @param array  $meta An array with event meta.
	 * @param string $status A pre-defeind event status.
	 */
	public static function update( $meta = array(), $status = 'draft' ) {

		$meta = apply_filters( 'eventkoi_pre_update_event_meta', $meta, $meta['id'] );

		$id    = $meta['id'];
		$title = $meta['title'];

		if ( 0 === $id ) {
			$args = array(
				'post_type'   => 'event',
				'post_status' => $status,
				'post_title'  => $title,
				'post_name'   => sanitize_title_with_dashes( $title, '', 'save' ),
				'post_author' => get_current_user_id(),
			);

			$last_id        = wp_insert_post( $args );
			$event          = get_post( $last_id );
			self::$event    = $event;
			self::$event_id = ! empty( $event->ID ) ? $event->ID : 0;

			self::update_meta( $meta );

			return array_merge(
				array(
					'update_endpoint' => true,
					'message'         => __( 'Event created.', 'eventkoi-lite' ),
				),
				self::get_meta(),
			);
		}

		$args = array(
			'ID'          => $id,
			'post_title'  => $title,
			'post_name'   => sanitize_title_with_dashes( $title, '', 'save' ),
			'post_status' => $status,
		);

		$last_id        = wp_update_post( $args );
		$event          = get_post( $last_id );
		self::$event    = $event;
		self::$event_id = ! empty( $event->ID ) ? $event->ID : 0;

		self::update_meta( $meta );

		return array_merge(
			array(
				'message' => __( 'Event updated.', 'eventkoi-lite' ),
			),
			self::get_meta(),
		);
	}

	/**
	 * Update event meta.
	 *
	 * @param array $meta An array with event meta.
	 */
	public static function update_meta( $meta = array() ) {
		// Hook to allow chnages to event metadata.
		$meta = apply_filters( 'eventkoi_update_event_meta', $meta, self::$event_id, self::$event );

		do_action( 'eventkoi_before_update_event_meta', $meta, self::$event_id, self::$event );

		$timezone_display = ! empty( $meta['timezone_display'] );
		$tbc              = ! empty( $meta['tbc'] );
		$tbc_note         = ! empty( $meta['tbc_note'] ) ? esc_attr( $meta['tbc_note'] ) : '';
		$start_date       = ! empty( $meta['start_date'] ) ? esc_attr( $meta['start_date'] ) : '';
		$end_date         = ! empty( $meta['end_date'] ) ? esc_attr( $meta['end_date'] ) : '';
		$type             = ! empty( $meta['type'] ) ? esc_attr( $meta['type'] ) : 'inperson';
		$location         = ! empty( $meta['location'] ) ? $meta['location'] : array();
		$address1         = ! empty( $meta['address1'] ) ? esc_attr( $meta['address1'] ) : '';
		$address2         = ! empty( $meta['address2'] ) ? esc_attr( $meta['address2'] ) : '';
		$address3         = ! empty( $meta['address3'] ) ? esc_attr( $meta['address3'] ) : '';
		$latitude         = ! empty( $meta['latitude'] ) ? esc_attr( $meta['latitude'] ) : '';
		$longitude        = ! empty( $meta['longitude'] ) ? esc_attr( $meta['longitude'] ) : '';
		$embed_gmap       = ! empty( $meta['embed_gmap'] );
		$gmap_link        = ! empty( $meta['gmap_link'] ) ? sanitize_url( self::extract_map_url( $meta['gmap_link'] ) ) : '';
		$virtual_url      = ! empty( $meta['virtual_url'] ) ? esc_attr( $meta['virtual_url'] ) : '';
		$description      = ! empty( $meta['description'] ) ? wp_kses_post( $meta['description'] ) : '';
		$image            = ! empty( $meta['image'] ) ? sanitize_url( $meta['image'] ) : '';
		$image_id         = ! empty( $meta['image_id'] ) ? absint( $meta['image_id'] ) : 0;
		$date_type        = ! empty( $meta['date_type'] ) ? esc_attr( $meta['date_type'] ) : 'standard';
		$event_days       = ! empty( $meta['event_days'] ) ? $meta['event_days'] : array();
		$locations        = ! empty( $meta['locations'] ) ? $meta['locations'] : array();
		$standard_type    = ! empty( $meta['standard_type'] ) ? esc_attr( $meta['standard_type'] ) : 'selected';
		$recurrence_rules = ! empty( $meta['recurrence_rules'] ) && is_array( $meta['recurrence_rules'] )
		? array_values( array_filter( $meta['recurrence_rules'], 'is_array' ) )
		: array();

		update_post_meta( self::$event_id, 'timezone_display', (bool) $timezone_display );
		update_post_meta( self::$event_id, 'tbc', (bool) $tbc );
		update_post_meta( self::$event_id, 'tbc_note', (string) $tbc_note );
		update_post_meta( self::$event_id, 'type', (string) $type );
		update_post_meta( self::$event_id, 'location', (array) $location );
		update_post_meta( self::$event_id, 'address1', (string) $address1 );
		update_post_meta( self::$event_id, 'address2', (string) $address2 );
		update_post_meta( self::$event_id, 'address3', (string) $address3 );
		update_post_meta( self::$event_id, 'latitude', (string) $latitude );
		update_post_meta( self::$event_id, 'longitude', (string) $longitude );
		update_post_meta( self::$event_id, 'embed_gmap', (bool) $embed_gmap );
		update_post_meta( self::$event_id, 'gmap_link', (string) $gmap_link );
		update_post_meta( self::$event_id, 'virtual_url', (string) $virtual_url );
		update_post_meta( self::$event_id, 'description', $description );
		update_post_meta( self::$event_id, 'image', (string) $image );
		update_post_meta( self::$event_id, 'image_id', $image_id );
		update_post_meta( self::$event_id, 'date_type', (string) $date_type );
		update_post_meta( self::$event_id, 'event_days', (array) $event_days );
		update_post_meta( self::$event_id, 'locations', (array) $locations );
		update_post_meta( self::$event_id, 'standard_type', (string) $standard_type );
		update_post_meta( self::$event_id, 'recurrence_rules', $recurrence_rules );

		// Set FSE page template if provided.
		$template = ! empty( $meta['template'] ) ? sanitize_key( $meta['template'] ) : '';

		if ( 'default' === $template ) {
			delete_post_meta( self::$event_id, '_wp_page_template' );
		} elseif ( ! empty( $template ) ) {
			update_post_meta( self::$event_id, '_wp_page_template', $template );
		}

		if ( $image_id ) {
			set_post_thumbnail( self::$event_id, $image_id );
		}

		if ( $start_date ) {
			$start_utc_ts = strtotime( $start_date );

			update_post_meta( self::$event_id, 'start_date', $start_date );
			update_post_meta( self::$event_id, 'start_timestamp', $start_utc_ts );

		} else {
			delete_post_meta( self::$event_id, 'start_date' );
			delete_post_meta( self::$event_id, 'start_timestamp' );
		}

		if ( $end_date ) {
			$end_utc_ts = strtotime( $end_date );

			update_post_meta( self::$event_id, 'end_date', $end_date );
			update_post_meta( self::$event_id, 'end_timestamp', $end_utc_ts );
		} else {
			delete_post_meta( self::$event_id, 'end_date' );
			delete_post_meta( self::$event_id, 'end_timestamp' );
		}

		// Set selected calendars.
		$calendars = array();

		if ( empty( $meta['calendar'] ) ) {
			$default_event_cal = (int) get_option( 'default_event_cal', 0 );
			$calendars         = array( $default_event_cal );
		} else {
			foreach ( $meta['calendar'] as $calendar ) {
				if ( isset( $calendar['id'] ) ) {
					$calendars[] = (int) $calendar['id'];
				}
			}
		}

		wp_set_post_terms( self::$event_id, $calendars, 'event_cal' );

		do_action( 'eventkoi_after_update_event_meta', $meta, self::$event_id, self::$event );
	}

	/**
	 * Get event ID.
	 */
	public static function get_id() {
		$id = self::$event_id;

		return apply_filters( 'eventkoi_get_event_id', $id, self::$event_id, self::$event );
	}

	/**
	 * Get event timezone.
	 *
	 * @return string
	 */
	public static function get_timezone() {
		$timezone = eventkoi_timezone();

		return apply_filters( 'eventkoi_get_event_timezone', (string) $timezone, self::$event_id, self::$event );
	}

	/**
	 * Get event days.
	 *
	 * @return array Event days array, or empty array if none.
	 */
	public static function get_event_days() {
		$event_days = get_post_meta( self::$event_id, 'event_days', true );

		if ( empty( $event_days ) || ! is_array( $event_days ) ) {
			$event_days = array();
		}

		/**
		 * Filter the retrieved event days.
		 *
		 * @param array    $event_days Event days array.
		 * @param int      $event_id   Event ID.
		 * @param \WP_Post $event      Event post object.
		 */
		return apply_filters( 'eventkoi_get_event_days', $event_days, self::$event_id, self::$event );
	}

	/**
	 * Get event recurrence rules.
	 *
	 * @return array
	 */
	public static function get_recurrence_rules() {
		$rules = get_post_meta( self::$event_id, 'recurrence_rules', true );

		if ( empty( $rules ) || ! is_array( $rules ) ) {
			$rules = array();
		}

		return apply_filters( 'eventkoi_get_event_recurrence_rules', $rules, self::$event_id, self::$event );
	}

	/**
	 * Get event recurrence overrides.
	 *
	 * @return array
	 */
	public static function get_recurrence_overrides() {
		$rows = DB::table( 'ek_recurrence_overrides' )
		->where( 'event_id', self::$event_id )
		->orderBy( 'timestamp', 'asc' )
		->getAll();

		$overrides = array();

		foreach ( $rows as $row ) {
			$timestamp = (int) $row->timestamp;
			$data      = maybe_unserialize( $row->data );

			if ( is_array( $data ) ) {
				$overrides[ $timestamp ] = $data;
			}
		}

		return apply_filters( 'eventkoi_get_event_recurrence_overrides', $overrides, self::$event_id, self::$event );
	}

	/**
	 * Get event thumbnail URL.
	 *
	 * @return string
	 */
	public static function get_thumbnail() {
		$thumbnail = get_the_post_thumbnail_url( self::get_id(), 'full' );

		return apply_filters( 'eventkoi_get_event_thumbnail', esc_url( $thumbnail ), self::$event_id, self::$event );
	}

	/**
	 * Get date type.
	 *
	 * @return string
	 */
	public static function get_date_type() {
		return get_post_meta( self::get_id(), 'date_type', true );
	}

	/**
	 * Get event title.
	 */
	public static function get_title() {
		$title = ! empty( self::$event->post_title ) ? self::$event->post_title : '';

		return apply_filters( 'eventkoi_get_event_title', $title, self::$event_id, self::$event );
	}

	/**
	 * Get event description.
	 */
	public static function get_description() {
		$description = get_post_meta( self::$event_id, 'description', true );

		return apply_filters( 'eventkoi_get_event_description', wp_kses_post( $description ), self::$event_id, self::$event );
	}

	/**
	 * Get event image.
	 */
	public static function get_image() {
		$image = get_post_meta( self::$event_id, 'image', true );

		return apply_filters( 'eventkoi_get_event_image', esc_url( $image ), self::$event_id, self::$event );
	}

	/**
	 * Get event image ID.
	 */
	public static function get_image_id() {
		$image_id = get_post_meta( self::$event_id, 'image_id', true );

		return apply_filters( 'eventkoi_get_event_image_id', absint( $image_id ), self::$event_id, self::$event );
	}

	/**
	 * Get event locations (multiple).
	 *
	 * @return array
	 */
	public static function get_locations() {
		$locations = get_post_meta( self::$event_id, 'locations', true );

		if ( empty( $locations ) || ! is_array( $locations ) ) {
			$locations = array();
		}

		return apply_filters( 'eventkoi_get_event_locations', $locations, self::$event_id, self::$event );
	}

	/**
	 * Get event calendar.
	 */
	public static function get_calendar() {
		$calendar = array();

		$args = array( 'fields' => 'all' );

		$terms = wp_get_post_terms( self::$event_id, 'event_cal', $args );

		foreach ( $terms as $term ) {
			$calendar[] = array(
				'id'   => $term->term_id,
				'name' => $term->name,
				'slug' => $term->slug,
				'url'  => get_term_link( $term, 'event_cal' ),
			);
		}

		return apply_filters( 'eventkoi_get_event_calendar', $calendar, self::$event_id, self::$event );
	}

	/**
	 * Get event permalink or URL.
	 *
	 * Adds `?instance=timestamp` for recurring events with plain permalinks,
	 * or appends `/timestamp/` for pretty permalinks.
	 *
	 * @return string Event URL.
	 */
	public static function get_url() {
		$url      = get_permalink( self::$event_id );
		$instance = eventkoi_get_instance_id();

		if ( ! $url ) {
			return '';
		}

		if ( 'recurring' === self::get_date_type() && $instance ) {
			if ( get_option( 'permalink_structure' ) ) {
				// Pretty permalinks — append instance timestamp as path segment.
				$url = trailingslashit( $url ) . $instance . '/';
			} else {
				// Fallback for plain permalinks.
				$url = add_query_arg( 'instance', $instance, $url );
			}
		}

		return apply_filters( 'eventkoi_get_event_url', $url, self::$event_id, self::$event );
	}

	/**
	 * Get event iCal link.
	 */
	public static function get_ical() {
		$ical = get_permalink( self::$event_id );
		$ical = str_replace( 'https', 'webcal', $ical );
		$ical = str_replace( 'http', 'webcal', $ical );
		$ical = add_query_arg( 'ical', 1, $ical );

		$instance = eventkoi_get_instance_id();

		if ( $instance ) {
			$ical = add_query_arg( 'instance', absint( $instance ), $ical );
		}

		return apply_filters( 'eventkoi_get_event_ical', $ical, self::$event_id, self::$event );
	}

	/**
	 * Get event status.
	 *
	 * @return string Event status.
	 */
	public static function get_status() {
		$status = ! empty( self::$event->post_status ) ? self::$event->post_status : 'draft';

		// If trashed, skip further checks.
		if ( 'trash' === $status ) {
			return $status;
		}

		// If TBC is set, return 'tbc'.
		if ( true === self::get_tbc() ) {
			return 'tbc';
		}

		// If this is a recurring series (not an instance), always say "recurring".
		if ( self::get_date_type() === 'recurring' ) {
			return 'recurring';
		}

		// Otherwise, use your existing status logic for non-recurring events.
		$now    = time();
		$starts = strtotime( self::get_start_date( true ) );
		$ends   = strtotime( self::get_end_date( true ) );

		if ( ! empty( $starts ) && ! empty( $ends ) && $starts <= $now && $ends >= $now ) {
			$status = 'live';
		} elseif ( ! empty( $ends ) && $ends < $now ) {
			$status = 'completed';
		} elseif ( ! empty( $starts ) && $starts > $now ) {
			$status = 'upcoming';
		}

		return apply_filters( 'eventkoi_get_event_status', $status, self::$event_id, self::$event );
	}

	/**
	 * Get event status from WordPress.
	 */
	public static function get_wp_status() {
		$status = ! empty( self::$event->post_status ) ? self::$event->post_status : 'draft';

		return apply_filters( 'eventkoi_get_event_core_status', $status, self::$event_id, self::$event );
	}

	/**
	 * Get first instance data (start_date, end_date, all_day) from event_days or recurrence_rules.
	 *
	 * @return array
	 */
	public static function get_first_instance() {
		$type = self::get_date_type();

		if ( in_array( $type, array( 'standard', 'multi' ), true ) ) {
			$days = self::get_event_days();
			if ( ! empty( $days[0] ) && is_array( $days[0] ) ) {
				return array(
					'start_date' => $days[0]['start_date'] ?? '',
					'end_date'   => $days[0]['end_date'] ?? '',
					'all_day'    => ! empty( $days[0]['all_day'] ),
				);
			}
		}

		if ( 'recurring' === $type ) {
			$rules = self::get_recurrence_rules();
			if ( ! empty( $rules[0] ) && is_array( $rules[0] ) ) {
				return array(
					'start_date' => $rules[0]['start_date'] ?? '',
					'end_date'   => $rules[0]['end_date'] ?? '',
					'all_day'    => ! empty( $rules[0]['all_day'] ),
				);
			}
		}

		// Fallback to legacy start_date.
		return array(
			'start_date' => self::get_start_date( true ),
			'end_date'   => self::get_end_date( true ),
			'all_day'    => false,
		);
	}

	/**
	 * Get event start date exactly as saved (no timezone conversion).
	 *
	 * @param bool $gmt Optional. If true, return date in GMT. Default false.
	 * @return string Raw event start date string.
	 */
	public static function get_start_date( $gmt = true ) {
		$formatted     = '';
		$type          = self::get_date_type();
		$standard_type = get_post_meta( self::$event_id, 'standard_type', true );

		// If standard + continuous, read directly from meta.
		if ( 'standard' === $type && 'continuous' === $standard_type ) {
			$meta_val = get_post_meta( self::$event_id, 'start_date', true );
			if ( ! empty( $meta_val ) ) {
				$formatted = $meta_val;
			}
		}

		// Standard & multi-day (but not continuous standard).
		if ( empty( $formatted ) && in_array( $type, array( 'standard', 'multi' ), true ) ) {
			$days = self::get_event_days();
			if ( ! empty( $days[0]['start_date'] ) ) {
				$formatted = $days[0]['start_date'];
			}
		}

		// Recurring.
		if ( empty( $formatted ) && 'recurring' === $type ) {
			$rules = self::get_recurrence_rules();
			if ( ! empty( $rules[0]['start_date'] ) ) {
				$formatted = $rules[0]['start_date'];
			}
		}

		// Fallback to post meta.
		if ( empty( $formatted ) ) {
			$date = get_post_meta( self::$event_id, 'start_date', true );
			if ( $date ) {
				$formatted = $date;
			}
		}

		return apply_filters( 'eventkoi_get_event_start_date_raw', (string) $formatted, self::$event_id, self::$event );
	}

	/**
	 * Get event end date exactly as saved (no timezone conversion).
	 *
	 * @param bool $gmt Optional. If true, return date in GMT. Default false.
	 * @return string Raw event end date string.
	 */
	public static function get_end_date( $gmt = true ) {
		$formatted = '';

		$type          = self::get_date_type();
		$standard_type = self::get_standard_type();

		// If standard + continuous, read directly from meta.
		if ( 'standard' === $type && 'continuous' === $standard_type ) {
			$meta_val = get_post_meta( self::$event_id, 'end_date', true );
			if ( ! empty( $meta_val ) ) {
				$formatted = $meta_val;
			}
		}

		// Standard & multi-day (but not continuous standard).
		if ( empty( $formatted ) && in_array( $type, array( 'standard', 'multi' ), true ) ) {
			$days = self::get_event_days();
			if ( ! empty( $days ) ) {
				$last_day = end( $days );
				if ( ! empty( $last_day['end_date'] ) ) {
					$formatted = $last_day['end_date'];
				}
			}
		}

		// Recurring.
		if ( empty( $formatted ) && 'recurring' === $type ) {
			$last = self::get_last_start_end_datetime();

			if ( ! empty( $last['is_infinite'] ) ) {
				return '';
			}

			if ( ! empty( $last['end'] ) ) {
				// If it's already a string, use as-is.
				if ( $last['end'] instanceof \DateTimeInterface ) {
					$formatted = $last['end']->format( 'Y-m-d H:i:s' );
				} else {
					$formatted = $last['end'];
				}
			}
		}

		// Fallback to post meta.
		if ( empty( $formatted ) ) {
			$date = get_post_meta( self::$event_id, 'end_date', true );
			if ( $date ) {
				$formatted = $date;
			}
		}

		return apply_filters( 'eventkoi_get_event_end_date_raw', (string) $formatted, self::$event_id, self::$event );
	}

	/**
	 * Get event start date formatted for Google Calendar.
	 *
	 * @return string Google Calendar format string (e.g. 20250327T160300+0400).
	 */
	public static function get_start_date_g() {
		$raw = self::get_start_date( true );
		return apply_filters(
			'eventkoi_get_start_date_g',
			eventkoi_format_gcal_datetime( $raw ),
			self::$event_id,
			self::$event
		);
	}

	/**
	 * Get event end date formatted for Google Calendar.
	 *
	 * @return string Google Calendar format string (e.g. 20250327T170300+0400).
	 */
	public static function get_end_date_g() {
		$raw = self::get_end_date( true );
		return apply_filters(
			'eventkoi_get_end_date_g',
			eventkoi_format_gcal_datetime( $raw ),
			self::$event_id,
			self::$event
		);
	}

	/**
	 * Get event start date in ISO-8601 format.
	 *
	 * @return string ISO-formatted start date in UTC, or empty string if not set.
	 */
	public static function get_start_date_iso() {
		$raw = self::get_start_date( true );
		if ( '' === $raw ) {
			return '';
		}

		$ts = strtotime( $raw );
		if ( false === $ts ) {
			return '';
		}

		// Force UTC/GMT output.
		$iso = gmdate( 'Y-m-d\TH:i:s\Z', $ts );

		/**
		 * Filters the ISO-formatted start date for an event.
		 *
		 * @since x.x.x
		 *
		 * @param string $iso       ISO-formatted start date in UTC.
		 * @param int    $event_id  Event post ID.
		 * @param array  $event     Full event data array.
		 */
		return (string) apply_filters( 'eventkoi_get_event_start_date_iso', $iso, self::$event_id, self::$event );
	}

	/**
	 * Get event end date in ISO-8601 format.
	 *
	 * For recurring events, uses the end of the last occurrence.
	 *
	 * @return string
	 */
	public static function get_end_date_iso() {
		$raw = self::get_end_date( true );
		if ( '' === $raw ) {
			return '';
		}

		$ts = strtotime( $raw );
		if ( false === $ts ) {
			return '';
		}

		// Force UTC/GMT output.
		$iso = gmdate( 'Y-m-d\TH:i:s\Z', $ts );

		/**
		 * Filters the ISO-formatted end date for an event.
		 *
		 * @since x.x.x
		 *
		 * @param string $iso       ISO-formatted end date in UTC.
		 * @param int    $event_id  Event post ID.
		 * @param array  $event     Full event data array.
		 */
		return (string) apply_filters( 'eventkoi_get_event_end_date_iso', $iso, self::$event_id, self::$event );
	}

	/**
	 * Get timeline of an event.
	 *
	 * NOTE: This version does not apply timezone conversion.
	 *       Dates are in UTC; timezone conversion happens in JS.
	 *       For recurring events, still returns the recurring summary text.
	 *
	 * @return string|null
	 */
	public static function get_timeline() {
		if ( self::get_tbc() ) {
			$tbc_note = self::get_tbc_note();
			return $tbc_note ? $tbc_note : __( 'Date and time to be confirmed', 'eventkoi-lite' );
		}

		$date_type = self::get_date_type();

		if ( 'recurring' === $date_type ) {
			$rules = self::get_recurrence_rules();

			if ( ! empty( $rules ) && is_array( $rules ) ) {
				$start_ts = null;

				foreach ( $rules as $rule ) {
					if ( empty( $rule['start_date'] ) ) {
						continue;
					}
					$ts = strtotime( $rule['start_date'] . ' UTC' );
					if ( ! $start_ts || $ts < $start_ts ) {
						$start_ts = $ts;
					}
				}

				$start_str = $start_ts ? gmdate( 'j M Y', $start_ts ) : '';

				if ( $start_str ) {
					$first_summary = self::render_rule_summary_single( $rules[0] );
					$extra_count   = count( $rules ) - 1;

					$line = $start_str;

					if ( $first_summary ) {
						$line .= ' · ' . wp_strip_all_tags( $first_summary );
					}

					if ( $extra_count > 0 ) {
						/* translators: %d is the number of extra recurrence rules. */
						$line .= ' +' . sprintf( _n( '%d more rule', '%d more rules', $extra_count, 'eventkoi-lite' ), $extra_count );
					}

					return $line;
				}
			}
		}

		return null;
	}

	/**
	 * Get event modified date.
	 *
	 * @param bool $gmt If true, returns UTC date string in ISO 8601 format with Z suffix.
	 * @return string
	 */
	public static function get_modified_date( $gmt = true ) {
		$date = '';

		if ( ! empty( self::$event->post_modified_gmt ) && strtotime( self::$event->post_modified_gmt ) > 0 ) {
			if ( $gmt ) {
				// Return as ISO 8601 UTC with Z suffix.
				$date = gmdate( 'Y-m-d\TH:i:s\Z', strtotime( self::$event->post_modified_gmt ) );
			} else {
				// Convert GMT to site timezone and return as local ISO 8601.
				$local = get_date_from_gmt( self::$event->post_modified_gmt, 'Y-m-d H:i:s' );
				$date  = date_i18n( 'Y-m-d\TH:i:s', strtotime( $local ) );
			}
		}

		$hook = $gmt ? 'eventkoi_get_event_modified_date_gmt' : 'eventkoi_get_event_modified_date';

		return apply_filters( $hook, (string) $date, self::$event_id, self::$event );
	}

	/**
	 * Get event to be confirmed status.
	 */
	public static function get_tbc() {
		$tbc = get_post_meta( self::$event_id, 'tbc', true );

		return apply_filters( 'eventkoi_get_event_tbc', (bool) $tbc, self::$event_id, self::$event );
	}

	/**
	 * Returns whether the timezone should be shown.
	 */
	public static function get_timezone_display() {
		$timezone_display = get_post_meta( self::$event_id, 'timezone_display', true );

		return apply_filters( 'eventkoi_get_timezone_display', (bool) $timezone_display, self::$event_id, self::$event );
	}

	/**
	 * Get to be confirmed notification.
	 */
	public static function get_tbc_note() {
		$tbc_note = get_post_meta( self::$event_id, 'tbc_note', true );

		return apply_filters( 'eventkoi_get_event_tbc_note', (string) $tbc_note, self::$event_id, self::$event );
	}

	/**
	 * Get event type.
	 */
	public static function get_type() {
		$type = get_post_meta( self::$event_id, 'type', true );

		if ( empty( $type ) ) {
			$type = 'inperson';
		}

		return apply_filters( 'eventkoi_get_event_type', (string) $type, self::$event_id, self::$event );
	}

	/**
	 * Get event standard type.
	 */
	public static function get_standard_type() {
		$standard_type = get_post_meta( self::$event_id, 'standard_type', true );

		if ( empty( $standard_type ) ) {
			$standard_type = 'continuous';
		}

		return apply_filters( 'eventkoi_get_event_standard_type', (string) $standard_type, self::$event_id, self::$event );
	}

	/**
	 * Get event location.
	 */
	public static function get_location() {

		$location = get_post_meta( self::$event_id, 'location', true );

		if ( empty( $location ) ) {
			$location = array();
		}

		return apply_filters( 'eventkoi_get_event_location', $location, self::$event_id, self::$event );
	}

	/**
	 * Get event latitude.
	 */
	public static function get_latitude() {
		$latitude = get_post_meta( self::$event_id, 'latitude', true );

		return apply_filters( 'eventkoi_get_event_latitude', (string) $latitude, self::$event_id, self::$event );
	}

	/**
	 * Get event longitude.
	 */
	public static function get_longitude() {
		$longitude = get_post_meta( self::$event_id, 'longitude', true );

		return apply_filters( 'eventkoi_get_event_longitude', (string) $longitude, self::$event_id, self::$event );
	}

	/**
	 * Get event embed_gmap.
	 */
	public static function get_embed_gmap() {
		$embed_gmap = get_post_meta( self::$event_id, 'embed_gmap', true );

		return apply_filters( 'eventkoi_get_event_embed_gmap', (bool) $embed_gmap, self::$event_id, self::$event );
	}

	/**
	 * Get event gmap link.
	 */
	public static function get_gmap_link() {
		$gmap_link = get_post_meta( self::$event_id, 'gmap_link', true );

		return apply_filters( 'eventkoi_get_event_gmap_link', (string) $gmap_link, self::$event_id, self::$event );
	}

	/**
	 * Get event virtual URL.
	 */
	public static function get_virtual_url() {
		$virtual_url = get_post_meta( self::$event_id, 'virtual_url', true );

		return apply_filters( 'eventkoi_get_event_virtual_url', (string) $virtual_url, self::$event_id, self::$event );
	}

	/**
	 * Get the first usable location (physical or virtual).
	 *
	 * @return array|null
	 */
	public static function get_primary_location() {
		$locations = self::get_locations();

		foreach ( $locations as $loc ) {
			if ( ! is_array( $loc ) || empty( $loc['type'] ) ) {
				continue;
			}

			if ( 'physical' === $loc['type'] && ! empty( $loc['address1'] ) ) {
				return $loc;
			}

			if ( in_array( $loc['type'], array( 'virtual', 'online' ), true ) && ! empty( $loc['virtual_url'] ) ) {
				return $loc;
			}
		}

		return null;
	}

	/**
	 * Get a single-line summary of the primary location (for dashboards).
	 *
	 * @return string
	 */
	public static function get_location_line() {
		$loc = self::get_primary_location();

		if ( ! $loc || ! is_array( $loc ) ) {
			return '';
		}

		if ( 'physical' === $loc['type'] && ! empty( $loc['address1'] ) ) {
			return $loc['address1'];
		}

		if ( in_array( $loc['type'], array( 'virtual', 'online' ), true ) && ! empty( $loc['virtual_url'] ) ) {
			return esc_url_raw( $loc['virtual_url'] );
		}

		return '';
	}

	/**
	 * Get event template.
	 *
	 * @return string Template slug or 'default'.
	 */
	public static function get_template() {
		$post_id = self::get_id();

		if ( empty( $post_id ) ) {
			return 'default';
		}

		$template = get_post_meta( $post_id, '_wp_page_template', true );

		if ( ! empty( $template ) ) {
			return sanitize_key( $template );
		}

		return 'default';
	}

	/**
	 * Restore a single event.
	 *
	 * @param int $event_id ID of an event.
	 */
	public static function restore_event( $event_id = 0 ) {

		wp_untrash_post( $event_id );

		$result = array(
			'event'   => self::get_event( $event_id ),
			'message' => __( 'Event restored successfully.', 'eventkoi-lite' ),
		);

		return $result;
	}

	/**
	 * Delete a single event.
	 *
	 * @param int $event_id ID of an event.
	 */
	public static function delete_event( $event_id = 0 ) {

		wp_trash_post( $event_id );

		$result = array(
			'message' => __( 'Event moved to Trash.', 'eventkoi-lite' ),
		);

		return $result;
	}

	/**
	 * Duplicate a single event.
	 */
	public static function duplicate_event() {

		$meta = self::get_meta();

		/* translators: %s event title */
		$title = sprintf( __( '[Duplicate]: %s', 'eventkoi-lite' ), $meta['title'] );

		$args = array(
			'post_type'   => 'event',
			'post_status' => 'draft',
			'post_title'  => $title,
			'post_name'   => sanitize_title_with_dashes( $title, '', 'save' ),
			'post_author' => get_current_user_id(),
		);

		$last_id        = wp_insert_post( $args );
		$event          = get_post( $last_id );
		self::$event    = $event;
		self::$event_id = ! empty( $event->ID ) ? $event->ID : 0;

		wp_update_post( array( 'ID' => $last_id ) );

		self::update_meta( $meta );

		$result = array_merge(
			array(
				'update_endpoint' => true,
				'message'         => __( 'Event duplicated.', 'eventkoi-lite' ),
			),
			self::get_meta(),
		);

		return $result;
	}

	/**
	 * Get cleaned and shortened excerpt from event description.
	 *
	 * @param int $max_chars Max number of characters to keep.
	 * @return string
	 */
	public static function get_summary( $max_chars = 160 ) {
		$content = self::get_instance_field( 'description' );

		// Decode HTML entities like &nbsp; and &amp;.
		$content = html_entity_decode( $content, ENT_QUOTES | ENT_HTML5, 'UTF-8' );

		// Strip all tags from RTE (e.g., <p>, <h2>, <strong>).
		$content = wp_strip_all_tags( $content );

		// Replace non-breaking spaces with real spaces.
		$content = str_replace( "\xC2\xA0", ' ', $content );
		$content = str_replace( '&nbsp;', ' ', $content );

		// Collapse multiple spaces and newlines.
		$content = preg_replace( '/\s+/', ' ', $content );
		$content = trim( $content );

		// Truncate by character count (preserving multibyte support).
		if ( mb_strlen( $content ) > $max_chars ) {
			$content = mb_substr( $content, 0, $max_chars - 3 ) . '...';
		}

		/**
		 * Filter event excerpt.
		 *
		 * @param string $content   Final excerpt text.
		 * @param int    $event_id  Event ID.
		 * @param object $event     Event post object.
		 */
		return apply_filters( 'eventkoi_get_summary', $content, self::$event_id, self::$event );
	}

	/**
	 * Get a field from recurrence overrides or fall back to base event data.
	 *
	 * @param string $key Field key to retrieve.
	 * @return mixed
	 */
	protected static function get_instance_field( $key ) {
		$instance_ts = eventkoi_get_instance_id();

		if ( empty( $instance_ts ) ) {
			return self::get_fallback_field( $key );
		}

		$overrides = self::get_recurrence_overrides();

		if (
		isset( $overrides[ $instance_ts ] ) &&
		isset( $overrides[ $instance_ts ][ $key ] )
		) {
			return $overrides[ $instance_ts ][ $key ];
		}

		return self::get_fallback_field( $key );
	}

	/**
	 * Fallback to base event value when no override exists.
	 *
	 * @param string $key Field key.
	 * @return mixed
	 */
	protected static function get_fallback_field( $key ) {
		switch ( $key ) {
			case 'title':
				return self::get_title();
			case 'description':
				return self::get_description();
			case 'summary':
				return self::get_summary();
			case 'locations':
				return self::get_locations();
			default:
				return null;
		}
	}

	/**
	 * Rendered title.
	 */
	public static function rendered_title() {
		$title = self::get_instance_field( 'title' );
		$title = wp_kses_post( $title );

		if ( empty( $title ) ) {
			return __( 'Untitled event', 'eventkoi-lite' );
		}

		return apply_filters( 'eventkoi_rendered_event_title', $title, self::$event_id, self::$event );
	}

	/**
	 * Rendered description.
	 *
	 * @return string Rendered HTML-safe description.
	 */
	public static function rendered_details() {
		$details = self::get_instance_field( 'description' );

		if ( ! empty( $details ) && trim( wp_strip_all_tags( $details ) ) ) {
			// Allow safe HTML output, since this content comes from an RTE.
			$details = wp_kses_post( $details );
		} else {
			$details = __( 'No event details.', 'eventkoi-lite' );
		}

		return apply_filters( 'eventkoi_rendered_event_details', $details, self::$event_id, self::$event );
	}

	/**
	 * Rendered event image as an <img> tag.
	 *
	 * @return string HTML img tag or empty string.
	 */
	public static function rendered_image() {
		$instance_ts = eventkoi_get_instance_id();
		$url         = '';

		if ( 0 !== $instance_ts ) {
			$overrides = self::get_recurrence_overrides();

			if ( isset( $overrides[ $instance_ts ]['image'] ) && ! empty( $overrides[ $instance_ts ]['image'] ) ) {
				$url = esc_url_raw( $overrides[ $instance_ts ]['image'] );
			}
		}

		if ( empty( $url ) ) {
			$url = self::get_image();
		}

		if ( empty( $url ) ) {
			return '';
		}

		$alt = esc_attr( self::get_title() );

		return '<img src="' . esc_url( $url ) . '" alt="' . $alt . '" class="eventkoi-image" style="max-width:100%;height:auto;" />';
	}

	/**
	 * Rendered image URL.
	 *
	 * @return string Image URL.
	 */
	public static function rendered_image_url() {
		$instance_ts = eventkoi_get_instance_id();
		$url         = '';

		if ( 0 !== $instance_ts ) {
			$overrides = self::get_recurrence_overrides();

			if ( isset( $overrides[ $instance_ts ]['image'] ) && ! empty( $overrides[ $instance_ts ]['image'] ) ) {
				$url = esc_url_raw( $overrides[ $instance_ts ]['image'] );
			}
		}

		if ( empty( $url ) ) {
			$url = self::get_image();
		}

		$url = esc_url( $url );

		return apply_filters( 'eventkoi_rendered_event_image_url', $url, self::$event_id, self::$event );
	}

	/**
	 * Render linked calendar names for the current event.
	 *
	 * @return string HTML string with anchor tags for each calendar.
	 */
	public static function rendered_calendar_link() {
		$calendars = self::get_calendar();

		if ( empty( $calendars ) ) {
			return '';
		}

		$links = array();

		foreach ( $calendars as $calendar ) {
			if ( empty( $calendar['name'] ) || empty( $calendar['url'] ) ) {
				continue;
			}

			$links[] = sprintf(
				'<a href="%s">%s</a>',
				esc_url( $calendar['url'] ),
				esc_html( $calendar['name'] )
			);
		}

		return implode( ', ', $links );
	}

	/**
	 * Rendered calendar.
	 */
	public static function rendered_calendar() {
		$calendars = self::get_calendar();

		if ( empty( $calendars ) || ! is_array( $calendars ) ) {
			return '';
		}

		$names = array();

		foreach ( $calendars as $calendar ) {
			if ( ! empty( $calendar['name'] ) ) {
				$names[] = esc_html( $calendar['name'] );
			}
		}

		return apply_filters(
			'eventkoi_rendered_event_calendar',
			implode( ', ', $names ),
			self::$event_id,
			self::$event
		);
	}

	/**
	 * Rendered calendar URL.
	 */
	public static function rendered_calendar_url() {
		$url       = '';
		$calendars = self::get_calendar();

		if ( ! empty( $calendars ) ) {
			$url = $calendars[0]['url'];
		}

		return apply_filters( 'eventkoi_rendered_event_calendar_url', $url, self::$event_id, self::$event );
	}

	/**
	 * Rendered event locations (multiple).
	 *
	 * @return string Rendered HTML-safe locations list.
	 */
	public static function rendered_location() {
		$locations = self::get_instance_field( 'locations' );

		if ( ! is_array( $locations ) || empty( $locations ) ) {
			return '<span class="eventkoi-no-location">' . esc_html__( 'No location available.', 'eventkoi-lite' ) . '</span>';
		}

		$outputs = array();

		foreach ( $locations as $location ) {
			if ( ! is_array( $location ) || empty( $location ) ) {
				continue;
			}

			$name      = isset( $location['name'] ) ? $location['name'] : '';
			$line1     = isset( $location['address1'] ) ? $location['address1'] : '';
			$line2     = isset( $location['address2'] ) ? $location['address2'] : '';
			$city      = isset( $location['city'] ) ? $location['city'] : '';
			$state     = isset( $location['state'] ) ? $location['state'] : '';
			$zip       = isset( $location['zip'] ) ? $location['zip'] : '';
			$country   = isset( $location['country'] ) ? $location['country'] : '';
			$url       = isset( $location['virtual_url'] ) ? $location['virtual_url'] : '';
			$link_text = isset( $location['link_text'] ) ? $location['link_text'] : '';
			$type      = isset( $location['type'] ) ? $location['type'] : 'physical';

			$lines = array();

			if ( 'physical' === $type ) {
				if ( ! empty( $name ) ) {
					$lines[] = '<strong>' . esc_html( $name ) . '</strong>';
				}
				if ( ! empty( $line1 ) ) {
					$lines[] = esc_html( $line1 );
				}
				if ( ! empty( $line2 ) ) {
					$lines[] = esc_html( $line2 );
				}

				$city_line_parts = array_filter( array( $city, $state, $zip ) );
				$city_line       = implode( ', ', $city_line_parts );

				if ( ! empty( $city_line ) ) {
					$lines[] = esc_html( $city_line );
				}
				if ( ! empty( $country ) ) {
					$lines[] = esc_html( $country );
				}
			} elseif ( 'online' === $type && ! empty( $url ) ) {
				$online_title = ! empty( $name ) ? $name : __( 'Attend online', 'eventkoi-lite' );
				$online_label = ! empty( $link_text ) ? $link_text : $url;

				$lines[] = '<strong>' . esc_html( $online_title ) . '</strong>';
				$lines[] = '<a href="' . esc_url( $url ) . '" target="_blank" rel="noopener noreferrer">'
				. esc_html( $online_label ) .
				'</a>';
			}

			$class_list  = 'eventkoi-location';
			$class_list .= ( 'online' === $type ) ? ' virtual' : ' physical';

			$outputs[] = '<address class="' . esc_attr( $class_list ) . '" style="white-space:pre-line">'
			. implode( "\n", $lines ) .
			'</address>';
		}

		return apply_filters(
			'eventkoi_rendered_event_location',
			implode( "\n\n", $outputs ),
			self::$event_id,
			self::$event
		);
	}

	/**
	 * Rendered Google Map.
	 */
	public static function rendered_gmap() {
		return ''; // Legacy fallback — no longer used in block rendering.
	}

	/**
	 * Rendered timezone (only if setting is enabled).
	 *
	 * @return string
	 */
	public static function rendered_timezone() {
		$show = self::get_timezone_display();

		if ( false === $show ) {
			return '';
		}

		$timezone = wp_kses_post( eventkoi_timezone() );

		/**
		 * Filter the rendered timezone string for the event.
		 *
		 * @param string $timezone The rendered timezone string.
		 * @param int    $event_id Event ID.
		 * @param object $event    Event object.
		 */
		return apply_filters( 'eventkoi_rendered_event_timezone', $timezone, self::$event_id, self::$event );
	}

	/**
	 * Rendered event datetime (start–end formatted, respects all_day). Includes recurrence rule summary.
	 *
	 * @return string
	 */
	public static function rendered_datetime_with_summary() {
		$type        = self::get_date_type();
		$instance_ts = eventkoi_get_instance_id();

		if ( self::get_tbc() ) {
			$tbc_note = self::get_tbc_note();

			$message = ! empty( $tbc_note )
			? esc_html( $tbc_note )
			: esc_html__( 'Date and time to be confirmed.', 'eventkoi-lite' );

			return apply_filters( 'eventkoi_rendered_event_datetime', $message, self::$event_id, self::$event );
		}

		// Render specific instance from ?instance=timestamp.
		if ( $instance_ts && 'recurring' === $type ) {
			$rules = self::get_recurrence_rules();

			foreach ( $rules as $rule ) {
				$rule_start = ! empty( $rule['start_date'] ) ? strtotime( $rule['start_date'] . ' UTC' ) : null;
				$rule_end   = ! empty( $rule['end_date'] ) ? strtotime( $rule['end_date'] . ' UTC' ) : null;
				$duration   = ( $rule_start && $rule_end && $rule_end > $rule_start ) ? ( $rule_end - $rule_start ) : null;
				$end_ts     = $duration ? ( $instance_ts + $duration ) : null;
				$is_all_day = ! empty( $rule['all_day'] );

				// Render using WP timezone.
				if ( $is_all_day ) {
					$line = eventkoi_date( 'M j, Y', $instance_ts );
				} else {
					$start_str = eventkoi_date( 'M j, Y, g:ia', $instance_ts );
					$line      = $end_ts ? $start_str . ' - ' . eventkoi_date( 'g:ia', $end_ts ) : $start_str;
				}

				$summary = self::render_rule_summary_single( $rule, $instance_ts );
				if ( ! empty( $summary ) ) {
					$line .= '<br><span class="eventkoi-rule-summary">' . esc_html( $summary ) . '</span>';
				}

				return apply_filters(
					'eventkoi_rendered_event_datetime_with_summary',
					wp_kses_post( $line ),
					self::$event_id,
					self::$event
				);
			}
		}

		// Fallback: full set of standard or recurring rules.
		$data = ( 'recurring' === $type ) ? self::get_recurrence_rules() : self::get_event_days();

		if ( empty( $data ) || ! is_array( $data ) ) {
			return '';
		}

		$outputs = array();

		// Handle continuous standard events using event start/end meta.
		if ( 'standard' === $type && 'continuous' === self::get_standard_type() ) {
			$start_date = self::get_start_date(); // Already stored in UTC.
			$end_date   = self::get_end_date();

			$start_ts   = $start_date ? strtotime( $start_date ) : null;
			$end_ts     = $end_date ? strtotime( $end_date ) : null;
			$is_all_day = false;

			if ( $is_all_day ) {
				$line = eventkoi_date( 'M j, Y', $start_ts ) . ( $end_ts ? ' — ' . eventkoi_date( 'M j, Y', $end_ts ) : '' );
			} else {
				$start_str = eventkoi_date( 'M j, Y, g:ia', $start_ts );
				$line      = $end_ts ? $start_str . ' — ' . eventkoi_date( 'M j, Y, g:ia', $end_ts ) : $start_str;
			}

			$outputs[] = $line;
		} else {
			// Existing per-day rendering.
			foreach ( $data as $item ) {
				if ( empty( $item['start_date'] ) ) {
					continue;
				}

				$start_ts   = strtotime( $item['start_date'] );
				$end_ts     = ! empty( $item['end_date'] ) ? strtotime( $item['end_date'] ) : null;
				$is_all_day = ! empty( $item['all_day'] );

				if ( $is_all_day ) {
					$line = eventkoi_date( 'M j, Y', $start_ts );
				} else {
					$start_str = eventkoi_date( 'M j, Y, g:ia', $start_ts );
					$line      = $end_ts ? $start_str . ' - ' . eventkoi_date( 'g:ia', $end_ts ) : $start_str;
				}

				if ( 'recurring' === $type ) {
					$summary = self::render_rule_summary_single( $item );
					if ( ! empty( $summary ) ) {
						$line .= '<br><span class="eventkoi-rule-summary">' . esc_html( $summary ) . '</span>';
					}
				}

				$outputs[] = $line;
			}
		}

		return apply_filters(
			'eventkoi_rendered_event_datetime_with_summary',
			wp_kses_post( implode( '<br>', $outputs ) ),
			self::$event_id,
			self::$event
		);
	}

	/**
	 * Rendered event datetime (start-end formatted, respects all_day).
	 *
	 * @return string
	 */
	public static function rendered_datetime() {
		$type = self::get_date_type();

		if ( self::get_tbc() ) {
			$tbc_note = self::get_tbc_note();

			$message = ! empty( $tbc_note )
			? esc_html( $tbc_note )
			: esc_html__( 'Date and time to be confirmed.', 'eventkoi-lite' );

			return apply_filters( 'eventkoi_rendered_event_datetime', $message, self::$event_id, self::$event );
		}

		if ( 'recurring' === $type ) {
			$data = self::get_recurrence_rules();
		} else {
			$data = self::get_event_days();
		}

		if ( empty( $data ) || ! is_array( $data ) ) {
			return '';
		}

		$outputs = array();

		foreach ( $data as $item ) {
			if ( empty( $item['start_date'] ) ) {
				continue;
			}

			$start_ts = strtotime( $item['start_date'] );
			$end_ts   = ! empty( $item['end_date'] ) ? strtotime( $item['end_date'] ) : null;

			if ( ! $start_ts ) {
				continue;
			}

			$is_all_day = ! empty( $item['all_day'] );

			// Ignore invalid end dates.
			if ( $end_ts && $end_ts < $start_ts ) {
				$end_ts = null;
			}

			if ( $is_all_day ) {
				$line = eventkoi_date( 'M j, Y', $start_ts );
			} else {
				$start_str = eventkoi_date( 'M j, Y, g:ia', $start_ts );

				if ( $end_ts ) {
					$end_str    = eventkoi_date( 'g:ia', $end_ts );
					$start_str .= ' - ' . $end_str;
				}

				$line = $start_str;
			}

			$outputs[] = $line;
		}

		return apply_filters(
			'eventkoi_rendered_event_datetime',
			wp_kses_post( implode( '<br>', $outputs ) ),
			self::$event_id,
			self::$event
		);
	}

	/**
	 * Extract map url
	 *
	 * @param int $input iframe or url.
	 */
	public static function extract_map_url( $input ) {
		$iframe_pattern = '/<iframe[^>]+src=["\']([^"\']+)["\']/i';
		$url_pattern    = '/^https:\/\/www\.google\.com\/maps\/embed(\?.*)?$/i';

		if ( preg_match( $iframe_pattern, $input, $matches ) ) {
			$iframe_src = $matches[1];
			return preg_match( $url_pattern, $iframe_src ) ? $iframe_src : '';
		} elseif ( preg_match( $url_pattern, $input ) ) {
			return $input;
		}

		return '';
	}

	/**
	 * Rendered recurring rule summary string.
	 *
	 * @return string Recurrence summary.
	 */
	public static function rendered_rulesummary() {
		if ( 'recurring' !== self::get_date_type() ) {
			return '';
		}
		if ( self::get_tbc() ) {
			return '';
		}
		$rules = self::get_recurrence_rules();
		if ( empty( $rules ) || ! is_array( $rules ) ) {
			return '';
		}
		$outputs = array();

		$weekday_names = array(
			0 => __( 'Monday', 'eventkoi' ),
			1 => __( 'Tuesday', 'eventkoi' ),
			2 => __( 'Wednesday', 'eventkoi' ),
			3 => __( 'Thursday', 'eventkoi' ),
			4 => __( 'Friday', 'eventkoi' ),
			5 => __( 'Saturday', 'eventkoi' ),
			6 => __( 'Sunday', 'eventkoi' ),
		);

		$ordinals = array(
			1 => __( 'first', 'eventkoi-lite' ),
			2 => __( 'second', 'eventkoi-lite' ),
			3 => __( 'third', 'eventkoi-lite' ),
			4 => __( 'fourth', 'eventkoi-lite' ),
			5 => __( 'fifth', 'eventkoi-lite' ),
		);
		foreach ( $rules as $rule ) {
			if ( empty( $rule['start_date'] ) || empty( $rule['frequency'] ) ) {
				continue;
			}
			$start_date = $rule['start_date'];
			$frequency  = $rule['frequency'];
			$every      = isset( $rule['every'] ) ? absint( $rule['every'] ) : 1;

			if ( $every > 1 ) {
				$plural_map = array(
					'day'   => __( 'days', 'eventkoi-lite' ),
					'week'  => __( 'weeks', 'eventkoi-lite' ),
					'month' => __( 'months', 'eventkoi-lite' ),
					'year'  => __( 'years', 'eventkoi-lite' ),
				);
				$plural     = isset( $plural_map[ $frequency ] ) ? $plural_map[ $frequency ] : $frequency . 's';
				/* translators: %1$d: interval number (e.g., 2). %2$s: period plural (e.g., "months"). */
				$label = sprintf( __( 'Every %1$d %2$s', 'eventkoi-lite' ), $every, $plural );
			} elseif ( 'day' === $frequency ) {
				$label = __( 'Daily', 'eventkoi-lite' );
			} elseif ( 'week' === $frequency ) {
				$label = __( 'Weekly', 'eventkoi-lite' );
			} elseif ( 'month' === $frequency ) {
				$label = __( 'Monthly', 'eventkoi-lite' );
			} elseif ( 'year' === $frequency ) {
				$label = __( 'Yearly', 'eventkoi-lite' );
			} else {
				$label = ucfirst( $frequency );
			}

			// 2. Details for "weekday-of-month"
			if (
			in_array( $frequency, array( 'month', 'year' ), true ) &&
			isset( $rule['month_day_rule'] ) && 'weekday-of-month' === $rule['month_day_rule']
			) {
				try {
					$start        = new \DateTimeImmutable( $start_date );
					$weekday_name = $start->format( 'l' );
					$nth          = (int) ceil( $start->format( 'j' ) / 7 );
					$nth_str      = isset( $ordinals[ $nth ] ) ? $ordinals[ $nth ] : $nth . 'th';
					$label       .= ', on the ' . $nth_str . ' ' . $weekday_name;
				} catch ( \Exception $e ) {} // phpcs:ignore.
			}

			// 3. Details for "day-of-month"
			if (
			in_array( $frequency, array( 'month', 'year' ), true ) &&
			isset( $rule['month_day_rule'] ) && 'day-of-month' === $rule['month_day_rule']
			) {
				try {
					$start  = new \DateTimeImmutable( $start_date );
					$label .= ', on day ' . (int) $start->format( 'j' );
				} catch ( \Exception $e ) {} // phpcs:ignore.
			}

			// 4. Yearly months (e.g. "in May, June")
			if ( 'year' === $frequency && ! empty( $rule['months'] ) && is_array( $rule['months'] ) ) {
				$month_names     = array(
					1  => __( 'January', 'eventkoi-lite' ),
					2  => __( 'February', 'eventkoi-lite' ),
					3  => __( 'March', 'eventkoi-lite' ),
					4  => __( 'April', 'eventkoi-lite' ),
					5  => __( 'May', 'eventkoi-lite' ),
					6  => __( 'June', 'eventkoi-lite' ),
					7  => __( 'July', 'eventkoi-lite' ),
					8  => __( 'August', 'eventkoi-lite' ),
					9  => __( 'September', 'eventkoi-lite' ),
					10 => __( 'October', 'eventkoi-lite' ),
					11 => __( 'November', 'eventkoi-lite' ),
					12 => __( 'December', 'eventkoi-lite' ),
				);
				$selected_months = array();
				$sorted          = array_map( 'intval', $rule['months'] );
				sort( $sorted );
				foreach ( $sorted as $m ) {
					$index = (int) $m + 1;
					if ( isset( $month_names[ $index ] ) ) {
						$selected_months[] = $month_names[ $index ];
					}
				}
				if ( ! empty( $selected_months ) ) {
					$label .= ', in ' . implode( ', ', $selected_months );
				}
			}

			// 5. Weekly day names
			if ( 'week' === $frequency && ! empty( $rule['weekdays'] ) ) {
				$days = array();
				foreach ( $rule['weekdays'] as $i ) {
					if ( isset( $weekday_names[ $i ] ) ) {
						$days[] = $weekday_names[ $i ];
					}
				}
				if ( ! empty( $days ) ) {
					$label .= ', on ' . implode( ', ', $days );
				}
			}

			// 6. Instance count and end condition
			if ( class_exists( '\EKLIB\RRule\RRule' ) ) {
				try {
					$freq_map = array(
						'day'   => 'DAILY',
						'week'  => 'WEEKLY',
						'month' => 'MONTHLY',
						'year'  => 'YEARLY',
					);
					if ( ! isset( $freq_map[ $frequency ] ) ) {
						continue;
					}
					$options = array(
						'FREQ'     => $freq_map[ $frequency ],
						'DTSTART'  => new \DateTimeImmutable( $start_date ),
						'INTERVAL' => $every,
					);
					if ( isset( $rule['ends'] ) && 'after' === $rule['ends'] && ! empty( $rule['ends_after'] ) ) {
						$options['COUNT'] = absint( $rule['ends_after'] );
					} elseif ( isset( $rule['ends'] ) && 'on' === $rule['ends'] && ! empty( $rule['ends_on'] ) ) {
						$options['UNTIL'] = new \DateTimeImmutable( $rule['ends_on'] );
					}
					if ( 'week' === $frequency && ! empty( $rule['weekdays'] ) ) {
						$map   = array( 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU' );
						$byday = array();
						foreach ( $rule['weekdays'] as $i ) {
							if ( isset( $map[ $i ] ) ) {
								$byday[] = $map[ $i ];
							}
						}
						$options['BYDAY'] = implode( ',', $byday );
					}
					if ( 'month' === $frequency && ! empty( $rule['month_day_rule'] ) ) {
						$date = new \DateTimeImmutable( $start_date );
						if ( 'day-of-month' === $rule['month_day_rule'] ) {
							$options['BYMONTHDAY'] = $date->format( 'j' );
						} elseif ( 'weekday-of-month' === $rule['month_day_rule'] ) {
							$nth              = (int) ceil( $date->format( 'j' ) / 7 );
							$weekday_map      = array(
								'Sun' => 'SU',
								'Mon' => 'MO',
								'Tue' => 'TU',
								'Wed' => 'WE',
								'Thu' => 'TH',
								'Fri' => 'FR',
								'Sat' => 'SA',
							);
							$weekday_short    = $date->format( 'D' );
							$weekday          = isset( $weekday_map[ $weekday_short ] ) ? $weekday_map[ $weekday_short ] : 'MO';
							$options['BYDAY'] = $nth . $weekday; // Example: 1TH.
						}
					}
					if ( 'year' === $frequency && ! empty( $rule['months'] ) ) {
						$options['BYMONTH'] = array_map(
							static function ( $m ) {
								return (int) $m + 1;
							},
							$rule['months']
						);
					}
					$rrule     = new \EKLIB\RRule\RRule( $options );
					$instances = array();
					$total     = 0;
					$completed = 0;
					$now       = time();
					$max_count = 500;
					$duration  = 0;
					if ( ! empty( $rule['start_date'] ) && ! empty( $rule['end_date'] ) ) {
						$duration = strtotime( $rule['end_date'] ) - strtotime( $rule['start_date'] );
					}
					foreach ( $rrule as $dt ) {
						if ( $total >= $max_count ) {
							break;
						}
						$instances[] = $dt;
						++$total;
						$end_ts = $dt->getTimestamp() + $duration;
						if ( $now > $end_ts ) {
							++$completed;
						}
					}
					$remaining = $total - $completed;
					if ( 0 === $total ) {
						$label .= ', forever';
					} elseif ( isset( $rule['ends'] ) && 'after' === $rule['ends'] ) {
						if ( 0 === $remaining ) {
							$label .= ', all ' . $total . ' events completed';
						} else {
							$label .= ', ' . $remaining . ' of ' . $total . ' events left';
						}
					} elseif ( isset( $rule['ends'] ) && 'on' === $rule['ends'] ) {
						if ( 0 === $remaining ) {
							$label .= ', all ' . $total . ' events completed';
						} else {
							$label .= ', ' . $remaining . ' of ' . $total . ' events left';
						}
					} else {
						$label .= ', forever';
					}
				} catch ( \Exception $e ) {} // phpcs:ignore.
			}
			$outputs[] = rtrim( $label, ', ' ) . '.';
		}
		return implode( '<br/>', $outputs );
	}

	/**
	 * Retrieve the start/end of the final recurring instance.
	 *
	 * @return array{start: \DateTimeImmutable|null, end: \DateTimeImmutable|null}
	 */
	public static function get_last_start_end_datetime() {
		$tz_wp = new \DateTimeZone( 'UTC' );
		$rules = self::get_recurrence_rules();

		foreach ( $rules as $rule ) {
			if ( empty( $rule['start_date'] ) || empty( $rule['frequency'] ) ) {
				continue;
			}

			try {
				// 1. Base start/end in WP timezone
				$dt_start_local = new \DateTimeImmutable( $rule['start_date'], $tz_wp );
				$dt_end_local   = ! empty( $rule['end_date'] )
				? new \DateTimeImmutable( $rule['end_date'], $tz_wp )
				: null;

				// 2. Calculate local duration in seconds
				$duration = $dt_end_local
				? ( $dt_end_local->getTimestamp() - $dt_start_local->getTimestamp() )
				: 0;

				// 3. RRule setup
				$freq_map = array(
					'day'   => 'DAILY',
					'week'  => 'WEEKLY',
					'month' => 'MONTHLY',
					'year'  => 'YEARLY',
				);
				$freq     = $rule['frequency'];
				if ( ! isset( $freq_map[ $freq ] ) ) {
					continue;
				}

				$options = array(
					'FREQ'     => $freq_map[ $freq ],
					'DTSTART'  => $dt_start_local,
					'INTERVAL' => absint( $rule['every'] ?? 1 ),
				);

				if ( isset( $rule['ends'] ) ) {
					if ( 'after' === $rule['ends'] && ! empty( $rule['ends_after'] ) ) {
						$options['COUNT'] = absint( $rule['ends_after'] );
					} elseif ( 'on' === $rule['ends'] && ! empty( $rule['ends_on'] ) ) {
						$options['UNTIL'] = new \DateTimeImmutable( $rule['ends_on'], $tz_wp );
					} elseif ( 'never' === $rule['ends'] ) {
						return array(
							'start'       => $dt_start_local,
							'end'         => null,
							'is_infinite' => true,
						);
					}
				}

				// 4. Weekly BYDAY
				if ( 'week' === $freq && ! empty( $rule['weekdays'] ) ) {
					$map   = array( 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU' );
					$byday = array();
					foreach ( $rule['weekdays'] as $i ) {
						if ( isset( $map[ $i ] ) ) {
							$byday[] = $map[ $i ];
						}
					}
					$options['BYDAY'] = implode( ',', $byday );
				}

				// 5. Monthly day rules
				if ( 'month' === $freq && ! empty( $rule['month_day_rule'] ) ) {
					if ( 'day-of-month' === $rule['month_day_rule'] ) {
						$options['BYMONTHDAY'] = (int) $dt_start_local->format( 'j' );
					} elseif ( 'weekday-of-month' === $rule['month_day_rule'] ) {
						$nth              = (int) ceil( $dt_start_local->format( 'j' ) / 7 );
						$wmap             = array(
							'Sun' => 'SU',
							'Mon' => 'MO',
							'Tue' => 'TU',
							'Wed' => 'WE',
							'Thu' => 'TH',
							'Fri' => 'FR',
							'Sat' => 'SA',
						);
						$weekday          = $dt_start_local->format( 'D' );
						$options['BYDAY'] = $nth . ( $wmap[ $weekday ] ?? 'MO' );
					}
				}

				try {
					$rrule = new \EKLIB\RRule\RRule( $options );

					$max_occurrences = apply_filters( 'eventkoi_max_recurrence_iterations', 500 );
					$occurrences     = array();
					$count           = 0;

					foreach ( $rrule as $occurrence ) {
						if ( $count++ >= $max_occurrences ) {
							break;
						}
						$occurrences[] = $occurrence;
					}
				} catch ( \Exception $e ) {
					return array(
						'start'       => null,
						'end'         => null,
						'is_infinite' => false,
					);
				}

				$last_start_local = end( $occurrences );
				$last_end_local   = null;
				if ( $duration > 0 ) {
					$end_ts         = $last_start_local->getTimestamp() + $duration;
					$last_end_local = new \DateTimeImmutable( '@' . $end_ts );
				}

				return array(
					'start' => $last_start_local,
					'end'   => $last_end_local,
				);

			} catch ( \Exception $e ) {
				continue;
			}
		}

		return array(
			'start' => null,
			'end'   => null,
		);
	}
}
