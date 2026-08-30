<?php
/**
 * Event.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

use EKLIB\StellarWP\DB\DB;
use EventKoi\Core\Settings;

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
		'slug',
		'excerpt',
		'description',
		'summary',
		'image',
		'image_thumb',
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
		'price_from_amount',
		'price_from_url',
		'price_from_details',
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
		'event_timezone',
		'timezone',
		'event_days',
		'locations',
		'recurrence_rules',
		'recurrence_overrides',
		'rulesummary',
		'standard_type',
		'event_single_package',
		'attendance_mode',
		'rsvp_enabled',
		'rsvp_capacity',
		'rsvp_show_count',
		'rsvp_show_remaining',
		'rsvp_allow_guests',
		'rsvp_max_guests',
		'rsvp_allow_edit',
		'rsvp_auto_account',
		'rsvp_sale_start',
		'rsvp_sale_end',
		'tickets_terms_conditions_required',
		'tickets_agreements',
		'tickets_event_capacity',
		'tickets_show_remaining',
		'tickets_show_unavailable',
		'tickets_show_sold_out',
		'tickets_show_upcoming',
		'tickets_show_ended',
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
			if ( ! empty( $event->post_type ) && 'eventkoi_event' !== $event->post_type ) {
				$event = array();
			}
		}

		self::$event    = $event;
		self::$event_id = ! empty( $event->ID ) ? $event->ID : 0;
	}

	/**
	 * The event the static renderers are currently pointed at.
	 *
	 * Constructing an Event repoints every static renderer for the rest of the
	 * request. Anything that renders a field for a post other than the one
	 * being displayed has to put the previous event back afterwards, and it
	 * needs this to know what that was.
	 *
	 * @return int Event ID, or 0 when none is set.
	 */
	public static function current_id() {
		return (int) self::$event_id;
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

		$native_edit_url = self::get_native_edit_url();
		if ( '' !== $native_edit_url ) {
			$meta['native_edit_url']   = $native_edit_url;
			$meta['has_plugin_fields'] = self::has_embeddable_plugin_fields();
			$meta['has_seo_plugin']    = class_exists( '\EventKoi\Admin\Scripts' ) && \EventKoi\Admin\Scripts::has_seo_plugin();
		}

		$meta['custom_taxonomies'] = self::get_custom_taxonomies();

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

		// A taxonomy slug may contain hyphens, and turning them into
		// underscores would stop the slug resolving.
		if ( 0 !== strpos( $name, 'event_tax_' ) && 0 !== strpos( $name, 'tax_' ) ) {
			$name = str_replace( '-', '_', $name );
		}

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
			$data  = ( 'recurring' === $type ) ? self::get_recurrence_rules() : self::get_event_days_for_rendering();

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

				$args = array(
					'separator' => ' - ',
				);
				if ( $is_all_day ) {
					$args['timezone'] = self::get_all_day_datetime_timezone( self::get_timezone(), $item );
				}

				return eventkoi_format_datetime_range( $start_ts, $end_ts, $is_all_day, $args );
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
	 * Render the terms this event has in one taxonomy.
	 *
	 * Plain comma separated names: every builder can print it, and it carries
	 * no assumptions about a term having a public archive.
	 *
	 * @param string $slug Taxonomy slug.
	 * @return string Comma separated term names, or an empty string.
	 */
	public static function rendered_taxonomy_terms( $slug ) {
		$slug = sanitize_key( (string) $slug );

		if ( '' === $slug || ! taxonomy_exists( $slug ) ) {
			// A deleted taxonomy leaves its field behind in saved layouts, so
			// this has to read as "nothing to show" rather than break the page.
			return '';
		}

		$terms = wp_get_object_terms( self::$event_id, $slug, array( 'fields' => 'names' ) );

		if ( is_wp_error( $terms ) || empty( $terms ) ) {
			return '';
		}

		$separator = apply_filters( 'eventkoi_taxonomy_terms_separator', ', ', $slug, self::$event_id );

		return apply_filters(
			'eventkoi_rendered_taxonomy_terms',
			implode( $separator, array_map( 'sanitize_text_field', $terms ) ),
			$slug,
			self::$event_id
		);
	}

	/**
	 * Render a single meta key.
	 *
	 * @param string $key A meta key to render.
	 */
	public static function rendered_meta( $key = '' ) {
		$value = '';

		// A site's own taxonomies resolve here the same way custom fields do,
		// so a taxonomy prints its assigned terms wherever event data is
		// available.
		if ( 0 === strpos( $key, 'tax_' ) ) {
			return self::rendered_taxonomy_terms( substr( $key, 4 ) );
		}

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

		$address   = isset( $location['address'] ) && is_array( $location['address'] ) ? $location['address'] : array();
		$type      = self::get_location_type( $location, 'inperson' );
		$name      = self::location_text_value( $location, 'name' );
		$line1     = self::first_location_text(
			self::location_text_value( $location, 'address1' ),
			self::location_text_value( $address, 'streetAddress' )
		);
		$line2     = self::location_text_value( $location, 'address2' );
		$line3     = self::location_text_value( $location, 'address3' );
		$city      = self::first_location_text(
			self::location_text_value( $location, 'city' ),
			self::location_text_value( $address, 'addressLocality' )
		);
		$state     = self::first_location_text(
			self::location_text_value( $location, 'state' ),
			self::location_text_value( $address, 'addressRegion' )
		);
		$zip       = self::first_location_text(
			self::location_text_value( $location, 'zip' ),
			self::location_text_value( $address, 'postalCode' )
		);
		$country   = self::first_location_text(
			self::location_text_value( $location, 'country' ),
			self::location_text_value( $address, 'addressCountry' )
		);
		$url       = self::get_location_virtual_url( $location );
		$link_text = self::location_text_value( $location, 'link_text' );

		$lines = array();

		if ( in_array( $type, array( 'physical', 'inperson' ), true ) ) {
			foreach ( array( $name, $line1, $line2 ) as $part ) {
				if ( $part ) {
					$lines[] = esc_html( $part );
				}
			}
			if ( $line3 ) {
				$lines[] = esc_html( $line3 );
			}

			$city_line = implode( ', ', array_filter( array( $city, $state, $zip ) ) );
			if ( $city_line ) {
				$lines[] = esc_html( $city_line );
			}
			if ( $country ) {
				$lines[] = esc_html( $country );
			}
		} elseif ( in_array( $type, array( 'online', 'virtual' ), true ) && $url ) {
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

		$class = 'eventkoi-location ' . ( in_array( $type, array( 'online', 'virtual' ), true ) ? 'virtual' : 'physical' );

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

		$id      = $meta['id'];
		$title   = $meta['title'];
		$slug    = ! empty( $meta['slug'] ) ? sanitize_title( $meta['slug'] ) : '';
		$excerpt = isset( $meta['excerpt'] ) ? sanitize_textarea_field( $meta['excerpt'] ) : null;

		if ( 0 === $id ) {
			$args = array(
				'post_type'   => 'eventkoi_event',
				'post_status' => $status,
				'post_title'  => $title,
				'post_name'   => $slug ? $slug : sanitize_title( $title ),
				'post_author' => get_current_user_id(),
			);

			if ( null !== $excerpt ) {
				$args['post_excerpt'] = $excerpt;
			}

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
			'post_status' => $status,
		);

		// Empty slug regenerates from the title, so clearing the field restores
		// the default instead of silently keeping the old post_name.
		$args['post_name'] = '' !== $slug ? $slug : sanitize_title( $title );

		// Only written when the payload carries it, so saves from screens that
		// never load the field cannot blank an existing excerpt.
		if ( null !== $excerpt ) {
			$args['post_excerpt'] = $excerpt;
		}

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

		// Default ON for new events to match the editor's default toggle.
		$timezone_display = array_key_exists( 'timezone_display', $meta ) ? self::normalize_boolean_meta( $meta['timezone_display'] ) : true;
		$tbc              = array_key_exists( 'tbc', $meta ) ? self::normalize_boolean_meta( $meta['tbc'] ) : false;
		$event_timezone = isset( $meta['event_timezone'] ) ? sanitize_text_field( (string) $meta['event_timezone'] ) : '';
		if ( '' !== $event_timezone && ! in_array( $event_timezone, timezone_identifiers_list(), true ) ) {
			$event_timezone = '';
		}
		$tbc_note         = ! empty( $meta['tbc_note'] ) ? esc_attr( $meta['tbc_note'] ) : '';

		$price_from_amount  = isset( $meta['price_from_amount'] ) && '' !== $meta['price_from_amount'] && is_numeric( $meta['price_from_amount'] )
			? (string) max( 0, (float) $meta['price_from_amount'] )
			: '';
		$price_from_url     = isset( $meta['price_from_url'] ) ? esc_url_raw( (string) $meta['price_from_url'] ) : '';
		$price_from_details = isset( $meta['price_from_details'] ) ? wp_kses_post( (string) $meta['price_from_details'] ) : '';
		$start_date       = array_key_exists( 'start_date', $meta ) ? self::normalize_utc_datetime_iso_string( $meta['start_date'] ) : '';
		$end_date         = array_key_exists( 'end_date', $meta ) ? self::normalize_utc_datetime_iso_string( $meta['end_date'] ) : '';
		$type             = ! empty( $meta['type'] ) ? esc_attr( $meta['type'] ) : 'inperson';
		$location         = ! empty( $meta['location'] ) ? $meta['location'] : array();
		$address1         = ! empty( $meta['address1'] ) ? esc_attr( $meta['address1'] ) : '';
		$address2         = ! empty( $meta['address2'] ) ? esc_attr( $meta['address2'] ) : '';
		$address3         = ! empty( $meta['address3'] ) ? esc_attr( $meta['address3'] ) : '';
		$latitude         = ! empty( $meta['latitude'] ) ? esc_attr( $meta['latitude'] ) : '';
		$longitude        = ! empty( $meta['longitude'] ) ? esc_attr( $meta['longitude'] ) : '';
		$embed_gmap       = array_key_exists( 'embed_gmap', $meta ) ? self::normalize_boolean_meta( $meta['embed_gmap'] ) : false;
		$gmap_link        = ! empty( $meta['gmap_link'] ) ? sanitize_url( self::extract_map_url( $meta['gmap_link'] ) ) : '';
		$virtual_url      = ! empty( $meta['virtual_url'] ) ? esc_attr( $meta['virtual_url'] ) : '';
		$description      = ! empty( $meta['description'] ) ? self::sanitize_description_html( $meta['description'] ) : '';
		$image            = ! empty( $meta['image'] ) ? sanitize_url( $meta['image'] ) : '';
		$image_id         = ! empty( $meta['image_id'] ) ? absint( $meta['image_id'] ) : 0;
		$date_type        = ! empty( $meta['date_type'] ) ? esc_attr( $meta['date_type'] ) : 'standard';
			$event_days       = ! empty( $meta['event_days'] ) ? $meta['event_days'] : array();
			$all_day_timezone = self::get_all_day_storage_timezone( $event_days );
			$event_days       = self::prepare_event_days_for_storage( $event_days );
			$locations        = ! empty( $meta['locations'] ) ? $meta['locations'] : array();
			$primary_location = self::get_primary_location_from_locations( $locations );
			if ( is_array( $primary_location ) ) {
				$location = $primary_location;
			}
			$standard_type    = ! empty( $meta['standard_type'] ) ? esc_attr( $meta['standard_type'] ) : 'selected';
		$recurrence_rules = ! empty( $meta['recurrence_rules'] ) && is_array( $meta['recurrence_rules'] )
		? array_values( array_filter( $meta['recurrence_rules'], 'is_array' ) )
		: array();
		$recurrence_rules = self::prepare_recurrence_rules_for_storage( $recurrence_rules );
		$stored_attendance_mode      = get_post_meta( self::$event_id, 'attendance_mode', true );
		$attendance_mode             = isset( $meta['attendance_mode'] )
			? sanitize_text_field( $meta['attendance_mode'] )
			: ( ! empty( $stored_attendance_mode ) ? sanitize_text_field( $stored_attendance_mode ) : ( self::$event_id ? 'rsvp' : 'none' ) );
		$rsvp_enabled        = ( 'rsvp' === $attendance_mode );
		$rsvp_capacity       = isset( $meta['rsvp_capacity'] ) ? absint( $meta['rsvp_capacity'] ) : 0;
		$rsvp_show_count     = array_key_exists( 'rsvp_show_count', $meta ) ? self::normalize_boolean_meta( $meta['rsvp_show_count'] ) : true;
		$rsvp_show_remaining = array_key_exists( 'rsvp_show_remaining', $meta ) ? self::normalize_boolean_meta( $meta['rsvp_show_remaining'] ) : true;
		$rsvp_allow_guests   = array_key_exists( 'rsvp_allow_guests', $meta ) ? self::normalize_boolean_meta( $meta['rsvp_allow_guests'] ) : false;
		$rsvp_max_guests     = isset( $meta['rsvp_max_guests'] ) ? absint( $meta['rsvp_max_guests'] ) : 0;
		$rsvp_allow_edit     = array_key_exists( 'rsvp_allow_edit', $meta ) ? self::normalize_boolean_meta( $meta['rsvp_allow_edit'] ) : true;
		$rsvp_auto_account   = array_key_exists( 'rsvp_auto_account', $meta ) ? self::normalize_boolean_meta( $meta['rsvp_auto_account'] ) : false;
		$rsvp_sale_start     = isset( $meta['rsvp_sale_start'] ) ? self::normalize_utc_datetime_string( $meta['rsvp_sale_start'] ) : '';
		$rsvp_sale_end       = isset( $meta['rsvp_sale_end'] ) ? self::normalize_utc_datetime_string( $meta['rsvp_sale_end'] ) : '';

		update_post_meta( self::$event_id, 'timezone_display', $timezone_display ? 1 : 0 );
		if ( '' !== $all_day_timezone ) {
			update_post_meta( self::$event_id, 'timezone', (string) $all_day_timezone );
		}
		update_post_meta( self::$event_id, 'tbc', $tbc ? 1 : 0 );
		if ( '' === $event_timezone ) {
			delete_post_meta( self::$event_id, 'event_timezone' );
		} else {
			update_post_meta( self::$event_id, 'event_timezone', $event_timezone );
		}
		update_post_meta( self::$event_id, 'tbc_note', (string) $tbc_note );
		update_post_meta( self::$event_id, 'price_from_amount', $price_from_amount );
		update_post_meta( self::$event_id, 'price_from_url', $price_from_url );
		update_post_meta( self::$event_id, 'price_from_details', $price_from_details );
		update_post_meta( self::$event_id, 'type', (string) $type );
		update_post_meta( self::$event_id, 'location', (array) $location );
		update_post_meta( self::$event_id, 'address1', (string) $address1 );
		update_post_meta( self::$event_id, 'address2', (string) $address2 );
		update_post_meta( self::$event_id, 'address3', (string) $address3 );
		update_post_meta( self::$event_id, 'latitude', (string) $latitude );
		update_post_meta( self::$event_id, 'longitude', (string) $longitude );
		update_post_meta( self::$event_id, 'embed_gmap', $embed_gmap ? 1 : 0 );
		update_post_meta( self::$event_id, 'gmap_link', (string) $gmap_link );
		update_post_meta( self::$event_id, 'virtual_url', (string) $virtual_url );
		update_post_meta( self::$event_id, 'description', $description );
		update_post_meta( self::$event_id, 'image', (string) $image );
		update_post_meta( self::$event_id, 'image_id', $image_id );
		// Read before anything below overwrites it: an occurrence that moves has
		// to be paired with where it moved to, or per-instance overrides end up
		// stranded on a date that no longer exists (helpdesk T9R4IMAW).
		$instance_ts_migrations = self::get_instance_ts_migrations(
			(string) get_post_meta( self::$event_id, 'date_type', true ),
			(string) get_post_meta( self::$event_id, 'standard_type', true ),
			(array) get_post_meta( self::$event_id, 'event_days', true ),
			(array) get_post_meta( self::$event_id, 'recurrence_rules', true ),
			(string) get_post_meta( self::$event_id, 'timezone', true ),
			(string) $date_type,
			(string) $standard_type,
			(array) $event_days,
			(array) $recurrence_rules,
			(string) ( $meta['timezone'] ?? get_post_meta( self::$event_id, 'timezone', true ) )
		);

		update_post_meta( self::$event_id, 'date_type', (string) $date_type );
		update_post_meta( self::$event_id, 'event_days', (array) $event_days );
		update_post_meta( self::$event_id, 'locations', (array) $locations );
		update_post_meta( self::$event_id, 'standard_type', (string) $standard_type );
		// Absent key keeps the historical per-day behaviour (grandfathering); the
		// editor sends true for new events via the new-event template default.
		$event_single_package = array_key_exists( 'event_single_package', $meta ) ? self::normalize_boolean_meta( $meta['event_single_package'] ) : false;
		update_post_meta( self::$event_id, 'event_single_package', $event_single_package ? 1 : 0 );
		update_post_meta( self::$event_id, 'recurrence_rules', $recurrence_rules );
		update_post_meta( self::$event_id, 'rsvp_enabled', $rsvp_enabled ? 1 : 0 );
		update_post_meta( self::$event_id, 'rsvp_capacity', $rsvp_capacity );
		update_post_meta( self::$event_id, 'rsvp_show_count', $rsvp_show_count ? 1 : 0 );
		update_post_meta( self::$event_id, 'rsvp_show_remaining', $rsvp_show_remaining ? 1 : 0 );
		update_post_meta( self::$event_id, 'rsvp_allow_guests', $rsvp_allow_guests ? 1 : 0 );
		update_post_meta( self::$event_id, 'rsvp_max_guests', $rsvp_max_guests );
		update_post_meta( self::$event_id, 'rsvp_allow_edit', $rsvp_allow_edit ? 1 : 0 );
		update_post_meta( self::$event_id, 'rsvp_auto_account', $rsvp_auto_account ? 1 : 0 );
		update_post_meta( self::$event_id, 'rsvp_sale_start', (string) $rsvp_sale_start );
		update_post_meta( self::$event_id, 'rsvp_sale_end', (string) $rsvp_sale_end );
		update_post_meta( self::$event_id, 'attendance_mode', $attendance_mode );

		$tickets_enabled             = array_key_exists( 'tickets_enabled', $meta ) ? self::normalize_boolean_meta( $meta['tickets_enabled'] ) : false;
		$tickets_require_account     = array_key_exists( 'tickets_require_account', $meta ) ? self::normalize_boolean_meta( $meta['tickets_require_account'] ) : false;
		$tickets_auto_create_account = array_key_exists( 'tickets_auto_create_account', $meta ) ? self::normalize_boolean_meta( $meta['tickets_auto_create_account'] ) : false;
		$tickets_show_remaining      = array_key_exists( 'tickets_show_remaining', $meta ) ? self::normalize_boolean_meta( $meta['tickets_show_remaining'] ) : true;
		$tickets_show_unavailable    = array_key_exists( 'tickets_show_unavailable', $meta ) ? self::normalize_boolean_meta( $meta['tickets_show_unavailable'] ) : false;
		// The split visibility toggles inherit the legacy catch-all value when
		// absent, so events saved before the split keep their behavior.
		$tickets_show_sold_out       = array_key_exists( 'tickets_show_sold_out', $meta ) ? self::normalize_boolean_meta( $meta['tickets_show_sold_out'] ) : $tickets_show_unavailable;
		$tickets_show_upcoming       = array_key_exists( 'tickets_show_upcoming', $meta ) ? self::normalize_boolean_meta( $meta['tickets_show_upcoming'] ) : $tickets_show_unavailable;
		$tickets_show_ended          = array_key_exists( 'tickets_show_ended', $meta ) ? self::normalize_boolean_meta( $meta['tickets_show_ended'] ) : $tickets_show_unavailable;
		$tickets_terms_conditions    = isset( $meta['tickets_terms_conditions'] ) ? wp_kses_post( $meta['tickets_terms_conditions'] ) : '';
		$tickets_terms_required      = array_key_exists( 'tickets_terms_conditions_required', $meta ) ? self::normalize_boolean_meta( $meta['tickets_terms_conditions_required'] ) : false;
		$tickets_agreements          = self::sanitize_tickets_agreements( $meta['tickets_agreements'] ?? array() );
		// Total ticket quantity per event (venue capacity). 0 / empty = unlimited.
		$tickets_event_capacity      = array_key_exists( 'tickets_event_capacity', $meta ) ? max( 0, absint( $meta['tickets_event_capacity'] ) ) : 0;
		$tickets_display_mode        = isset( $meta['tickets_display_mode'] ) ? sanitize_key( $meta['tickets_display_mode'] ) : 'cards';

		update_post_meta( self::$event_id, 'tickets_enabled', $tickets_enabled ? 1 : 0 );
		update_post_meta( self::$event_id, 'tickets_require_account', $tickets_require_account ? 1 : 0 );
		update_post_meta( self::$event_id, 'tickets_auto_create_account', $tickets_auto_create_account ? 1 : 0 );
		update_post_meta( self::$event_id, 'tickets_show_remaining', $tickets_show_remaining ? 1 : 0 );
		update_post_meta( self::$event_id, 'tickets_show_unavailable', $tickets_show_unavailable ? 1 : 0 );
		update_post_meta( self::$event_id, 'tickets_show_sold_out', $tickets_show_sold_out ? 1 : 0 );
		update_post_meta( self::$event_id, 'tickets_show_upcoming', $tickets_show_upcoming ? 1 : 0 );
		update_post_meta( self::$event_id, 'tickets_show_ended', $tickets_show_ended ? 1 : 0 );
		update_post_meta( self::$event_id, 'tickets_terms_conditions', $tickets_terms_conditions );
		update_post_meta( self::$event_id, 'tickets_terms_conditions_required', $tickets_terms_required ? 1 : 0 );
		update_post_meta( self::$event_id, 'tickets_agreements', $tickets_agreements );
		update_post_meta( self::$event_id, 'tickets_event_capacity', $tickets_event_capacity );
		update_post_meta( self::$event_id, 'tickets_display_mode', $tickets_display_mode );

		if ( isset( $meta['custom_taxonomies'] ) && is_array( $meta['custom_taxonomies'] ) ) {
			self::update_custom_taxonomies( $meta['custom_taxonomies'] );
		}

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
			$old_start_ts = (int) get_post_meta( self::$event_id, 'start_timestamp', true );

			update_post_meta( self::$event_id, 'start_date', $start_date );
			update_post_meta( self::$event_id, 'start_timestamp', $start_utc_ts );

			self::migrate_rsvp_instance_ts( $old_start_ts, (int) $start_utc_ts );
		} else {
			delete_post_meta( self::$event_id, 'start_date' );
			delete_post_meta( self::$event_id, 'start_timestamp' );
		}

		self::migrate_recurrence_override_timestamps( $instance_ts_migrations );

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
			$default_event_cal = \eventkoi_resolve_calendar_id( (int) get_option( 'eventkoi_default_event_cal', 0 ) );
			$calendars         = $default_event_cal ? array( $default_event_cal ) : array();
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
	 * Get event excerpt.
	 *
	 * @return string
	 */
	public static function get_excerpt() {
		$excerpt = ! empty( self::$event->post_excerpt ) ? self::$event->post_excerpt : '';

		return apply_filters( 'eventkoi_get_event_excerpt', $excerpt, self::$event_id, self::$event );
	}

	/**
	 * Get event slug.
	 *
	 * @return string
	 */
	public static function get_slug() {
		$slug = ! empty( self::$event->post_name ) ? self::$event->post_name : '';

		return apply_filters( 'eventkoi_get_event_slug', $slug, self::$event_id, self::$event );
	}

	/**
	 * Get event timezone.
	 *
	 * @return string
	 */
	public static function get_timezone() {
		$timezone = self::get_event_timezone();

		if ( '' === $timezone ) {
			$timezone = eventkoi_php_timezone( eventkoi_timezone() );
		}

		return apply_filters( 'eventkoi_get_event_timezone', (string) $timezone, self::$event_id, self::$event );
	}

	/**
	 * Per-event timezone override, or '' when the event follows the site.
	 *
	 * Stored under its own key: the legacy `timezone` meta doubles as the
	 * all-day storage zone and is rewritten on save, so it cannot carry an
	 * explicit user choice.
	 *
	 * @return string Valid timezone identifier or ''.
	 */
	public static function get_event_timezone() {
		$timezone = (string) get_post_meta( self::$event_id, 'event_timezone', true );

		if ( '' === $timezone || ! in_array( $timezone, timezone_identifiers_list(), true ) ) {
			return '';
		}

		return $timezone;
	}

	/**
	 * Timezone used to display this event's dates.
	 *
	 * The event's own override when set, the site timezone otherwise — so
	 * events without an override render exactly as before.
	 *
	 * @return \DateTimeZone
	 */
	public static function get_display_timezone() {
		return new \DateTimeZone( self::get_timezone() );
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

		$event_days = self::prepare_event_days_all_day_dates( $event_days );

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
	 * Get the selected standard event-day index from the frontend request.
	 *
	 * @param bool $ignore_loop_context When true, skip the query-loop per-card
	 *                                  selected-day context and only honor a real
	 *                                  ?event_day request. Used by the datetime
	 *                                  summary so a loop card lists every day.
	 * @return int|null
	 */
	protected static function get_selected_event_day_index_from_request( $ignore_loop_context = false ) {
		if ( is_admin() ) {
			return null;
		}

		if ( ! $ignore_loop_context ) {
			$context = $GLOBALS['eventkoi_selected_event_day_context'][ self::$event_id ] ?? null;
			if ( null !== $context && is_scalar( $context ) ) {
				$context = (string) $context;
				if ( ctype_digit( $context ) ) {
					return (int) $context;
				}
			}
		}

		$raw = filter_input( INPUT_GET, 'event_day', FILTER_DEFAULT );

		if ( null === $raw && isset( $_GET['event_day'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only frontend occurrence selector.
			$raw = wp_unslash( $_GET['event_day'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Sanitized below after array guard.
		}

		if ( is_array( $raw ) ) {
			return null;
		}

		$raw = sanitize_text_field( (string) $raw );
		if ( '' === $raw || ! ctype_digit( $raw ) ) {
			return null;
		}

		return (int) $raw;
	}

	/**
	 * Get the selected standard event-day row for frontend occurrence URLs.
	 *
	 * @param bool $ignore_loop_context When true, skip the query-loop per-card
	 *                                  selected-day context (real ?event_day still
	 *                                  applies).
	 * @return array|null
	 */
	protected static function get_selected_event_day_from_request( $ignore_loop_context = false ) {
		// A single-package event is rendered and sold as one unit; never resolve a
		// per-day occurrence from the request, so no single day is shown, held, or
		// purchased even if a stale ?event_day arg is present in the URL.
		if ( self::is_package() ) {
			return null;
		}

		if ( 'standard' !== self::get_date_type() || 'selected' !== self::get_standard_type() ) {
			return null;
		}

		$index = self::get_selected_event_day_index_from_request( $ignore_loop_context );
		if ( null === $index ) {
			return null;
		}

		$days = self::get_event_days();
		if ( ! isset( $days[ $index ] ) || ! is_array( $days[ $index ] ) || empty( $days[ $index ]['start_date'] ) ) {
			return null;
		}

		return $days[ $index ];
	}

	/**
	 * Get event days scoped to a selected frontend occurrence when requested.
	 *
	 * @param bool $ignore_loop_context When true, skip the query-loop per-card
	 *                                  selected-day context so every day is kept
	 *                                  (real ?event_day still scopes the result).
	 * @return array
	 */
	protected static function get_event_days_for_rendering( $ignore_loop_context = false ) {
		$selected_day = self::get_selected_event_day_from_request( $ignore_loop_context );

		if ( is_array( $selected_day ) ) {
			return array( $selected_day );
		}

		return self::get_event_days();
	}

	/**
	 * Add source timezone date-only fields to all-day event-day rows.
	 *
	 * Stored dates remain UTC instants. These derived fields let editors and
	 * renderers treat all-day events as calendar dates in the event/source
	 * timezone instead of shifting them through the current site timezone.
	 *
	 * @param array $event_days Event day rows.
	 * @return array
	 */
	protected static function prepare_event_days_all_day_dates( array $event_days ) {
		if ( empty( $event_days ) ) {
			return $event_days;
		}

		foreach ( $event_days as $index => $day ) {
			if ( is_array( $day ) && array_key_exists( 'all_day', $day ) ) {
				$day['all_day']                  = self::normalize_boolean_meta( $day['all_day'] );
				$event_days[ $index ]['all_day'] = $day['all_day'];
			}

			if ( ! is_array( $day ) || ! self::normalize_boolean_meta( $day['all_day'] ?? false ) || empty( $day['start_date'] ) ) {
				continue;
			}

			$timezone = self::get_all_day_datetime_timezone( self::get_timezone(), $day );
			$start_ts = strtotime( (string) $day['start_date'] );
			if ( ! $start_ts ) {
				continue;
			}

			$start = ( new \DateTimeImmutable( '@' . (int) $start_ts ) )->setTimezone( $timezone );
			$end   = null;

			if ( ! empty( $day['end_date'] ) ) {
				$end_ts = strtotime( (string) $day['end_date'] );
				if ( $end_ts && $end_ts >= $start_ts ) {
					$end = ( new \DateTimeImmutable( '@' . (int) $end_ts ) )->setTimezone( $timezone );
				}
			}

			$display_end = self::get_all_day_display_end_date( $start, $end );
			if ( ! $display_end || $display_end < $start ) {
				$display_end = $start;
			}

			$event_days[ $index ]['all_day_timezone']           = $timezone->getName();
			$event_days[ $index ]['all_day_start_date']         = $start->setTime( 0, 0, 0 )->format( 'Y-m-d' );
			$event_days[ $index ]['all_day_end_date']           = $display_end->setTime( 0, 0, 0 )->format( 'Y-m-d' );
			$event_days[ $index ]['all_day_end_exclusive_date'] = $display_end->setTime( 0, 0, 0 )->modify( '+1 day' )->format( 'Y-m-d' );
		}

		return $event_days;
	}

	/**
	 * Resolve inclusive display end date for all-day rows.
	 *
	 * @param \DateTimeImmutable      $start Start date in source timezone.
	 * @param \DateTimeImmutable|null $end   End date in source timezone.
	 * @return \DateTimeImmutable|null
	 */
	protected static function get_all_day_display_end_date( \DateTimeImmutable $start, $end ) {
		if ( ! $end instanceof \DateTimeImmutable ) {
			return $start;
		}

		if ( function_exists( 'eventkoi_is_single_all_day_span' ) && eventkoi_is_single_all_day_span( $start->getTimestamp(), $end->getTimestamp() ) ) {
			return $start;
		}

		if ( '00:00:00' === $end->format( 'H:i:s' ) && $end->format( 'Y-m-d' ) !== $start->format( 'Y-m-d' ) ) {
			return $end->modify( '-1 day' );
		}

		return $end;
	}

	/**
	 * Resolve the all-day source timezone to persist on save.
	 *
	 * @param mixed $event_days Raw event_days payload.
	 * @return string
	 */
	protected static function get_all_day_storage_timezone( $event_days ) {
		if ( empty( $event_days ) || ! is_array( $event_days ) ) {
			return '';
		}

		$stored = (string) get_post_meta( self::$event_id, 'timezone', true );

		foreach ( $event_days as $day ) {
			if ( ! is_array( $day ) || ! self::normalize_boolean_meta( $day['all_day'] ?? false ) ) {
				continue;
			}

			$start_raw = $day['start_date'] ?? '';
			$end_raw   = $day['end_date'] ?? '';
			$inferred  = function_exists( 'eventkoi_infer_all_day_timezone_from_utc_range' )
				? eventkoi_infer_all_day_timezone_from_utc_range( $start_raw, $end_raw )
				: '';

			$candidates = array(
				(string) ( $day['all_day_timezone'] ?? '' ),
				function_exists( 'eventkoi_all_day_timezone_should_prefer_stored' ) && eventkoi_all_day_timezone_should_prefer_stored( $stored, $inferred, $start_raw, $end_raw ) ? $stored : '',
				$inferred,
				$stored,
			);

			foreach ( $candidates as $candidate ) {
				if ( '' === trim( $candidate ) ) {
					continue;
				}

				try {
					$timezone = new \DateTimeZone( eventkoi_php_timezone( $candidate ) );
					return $timezone->getName();
				} catch ( \Exception $e ) {
					continue;
				}
			}
		}

		return '';
	}

	/**
	 * Remove derived all-day display fields before writing event_days meta.
	 *
	 * @param mixed $event_days Raw event_days payload.
	 * @return array
	 */
	protected static function prepare_event_days_for_storage( $event_days ) {
		if ( empty( $event_days ) || ! is_array( $event_days ) ) {
			return array();
		}

		foreach ( $event_days as $index => $day ) {
			if ( ! is_array( $day ) ) {
				continue;
			}

			unset(
				$day['all_day_timezone'],
				$day['all_day_start_date'],
				$day['all_day_end_date'],
				$day['all_day_end_exclusive_date'],
				// Client-side React-key identity; never persist.
				$day['_uid']
			);

			foreach ( array( 'start_date', 'end_date' ) as $date_key ) {
				if ( array_key_exists( $date_key, $day ) ) {
					$day[ $date_key ] = self::normalize_utc_datetime_iso_string( $day[ $date_key ] );
				}
			}

			if ( array_key_exists( 'all_day', $day ) ) {
				$day['all_day'] = self::normalize_boolean_meta( $day['all_day'] );
			}

			$event_days[ $index ] = $day;
		}

		return $event_days;
	}

	/**
	 * Remove derived all-day display date fields before writing recurrence rules.
	 *
	 * @param mixed $rules Raw recurrence rules payload.
	 * @return array
	 */
	protected static function prepare_recurrence_rules_for_storage( $rules ) {
		if ( empty( $rules ) || ! is_array( $rules ) ) {
			return array();
		}

		foreach ( $rules as $index => $rule ) {
			if ( ! is_array( $rule ) ) {
				continue;
			}

			unset(
				$rule['all_day_start_date'],
				$rule['all_day_end_date'],
				$rule['all_day_end_exclusive_date'],
				// Client-side React-key identity; never persist.
				$rule['_uid']
			);

			foreach ( array( 'start_date', 'end_date' ) as $date_key ) {
				if ( array_key_exists( $date_key, $rule ) ) {
					$rule[ $date_key ] = self::normalize_utc_datetime_iso_string( $rule[ $date_key ] );
				}
			}

			if ( array_key_exists( 'all_day', $rule ) ) {
				$rule['all_day'] = self::normalize_boolean_meta( $rule['all_day'] );
			}

			$rules[ $index ] = $rule;
		}

		return $rules;
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
		try {
			$rows = DB::table( 'eventkoi_recurrence_overrides' )
			->where( 'event_id', self::$event_id )
			->orderBy( 'timestamp', 'asc' )
			->getAll();
		} catch ( \Exception $e ) {
			// This runs while enqueueing front end assets, so an unreadable
			// table used to throw straight through wp_enqueue_scripts and white
			// screen the whole site. An event without its overrides still
			// renders, so degrade and try to rebuild the table (XVSZTDGT).
			Activator::maybe_repair_tables();

			return apply_filters( 'eventkoi_get_event_recurrence_overrides', array(), self::$event_id, self::$event );
		}

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

		return apply_filters( 'eventkoi_get_event_description', self::sanitize_description_html( $description ), self::$event_id, self::$event );
	}

	/**
	 * Sanitize event description HTML.
	 *
	 * @param mixed $description Raw description.
	 * @return string
	 */
	public static function sanitize_description_html( $description ) {
		if ( ! is_scalar( $description ) ) {
			return '';
		}

		$description = (string) $description;
		if ( '' === trim( $description ) ) {
			return '';
		}

		$description = self::normalize_description_iframes( $description );

		return wp_kses( $description, self::get_description_allowed_html() );
	}

	/**
	 * Get allowed HTML for event descriptions.
	 *
	 * @return array
	 */
	public static function get_description_allowed_html() {
		$allowed = wp_kses_allowed_html( 'post' );

		$allowed['iframe'] = array(
			'allow'           => true,
			'allowfullscreen' => true,
			'class'           => true,
			'frameborder'     => true,
			'height'          => true,
			'loading'         => true,
			'referrerpolicy'  => true,
			'src'             => true,
			'title'           => true,
			'width'           => true,
		);

		return $allowed;
	}

	/**
	 * Replace iframes with normalized safe YouTube embeds.
	 *
	 * @param string $description Raw description HTML.
	 * @return string
	 */
	private static function normalize_description_iframes( $description ) {
		return preg_replace_callback(
			'/<iframe\b[^>]*>(?:\s*<\/iframe>)?/i',
			static function ( $matches ) {
				$tag = $matches[0];
				if ( ! preg_match( '/\bsrc\s*=\s*([\'"])(.*?)\1/i', $tag, $src_match ) ) {
					return '';
				}

				$src = html_entity_decode( (string) $src_match[2], ENT_QUOTES, get_bloginfo( 'charset' ) );
				$src = self::normalize_youtube_embed_url( $src );
				if ( '' === $src ) {
					return '';
				}

				return sprintf(
					'<iframe src="%1$s" width="560" height="315" title="%2$s" frameborder="0" allow="%3$s" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>',
					esc_url( $src ),
					esc_attr__( 'YouTube video', 'eventkoi-lite' ),
					esc_attr( 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' )
				);
			},
			$description
		);
	}

	/**
	 * Normalize a YouTube URL to a privacy-enhanced embed URL.
	 *
	 * @param string $url Raw URL.
	 * @return string
	 */
	private static function normalize_youtube_embed_url( $url ) {
		$parts = wp_parse_url( trim( (string) $url ) );
		if ( empty( $parts['host'] ) ) {
			return '';
		}

		$host  = preg_replace( '/^www\./', '', strtolower( $parts['host'] ) );
		$path  = isset( $parts['path'] ) ? trim( $parts['path'], '/' ) : '';
		$paths = '' !== $path ? explode( '/', $path ) : array();
		$id    = '';

		if ( 'youtu.be' === $host ) {
			$id = $paths[0] ?? '';
		} elseif ( in_array( $host, array( 'youtube.com', 'm.youtube.com', 'youtube-nocookie.com' ), true ) ) {
			if ( in_array( $paths[0] ?? '', array( 'embed', 'shorts', 'live' ), true ) ) {
				$id = $paths[1] ?? '';
			} elseif ( ! empty( $parts['query'] ) ) {
				parse_str( $parts['query'], $query );
				$id = isset( $query['v'] ) ? (string) $query['v'] : '';
			}
		}

		if ( ! preg_match( '/^[A-Za-z0-9_-]{6,}$/', $id ) ) {
			return '';
		}

		return 'https://www.youtube-nocookie.com/embed/' . rawurlencode( $id );
	}

	/**
	 * Get event image.
	 */
	public static function get_image() {
		$image = get_post_meta( self::$event_id, 'image', true );

		if ( empty( $image ) ) {
			$thumb_id = get_post_thumbnail_id( self::$event_id );
			if ( $thumb_id ) {
				$image = wp_get_attachment_image_url( $thumb_id, 'full' );
			}
		}

		return apply_filters( 'eventkoi_get_event_image', esc_url( $image ), self::$event_id, self::$event );
	}

	/**
	 * Get event image thumbnail.
	 *
	 * @return string
	 */
	public static function get_image_thumb() {
		$image_id = self::get_image_id();

		if ( empty( $image_id ) ) {
			$image_id = get_post_thumbnail_id( self::$event_id );
		}

		if ( empty( $image_id ) ) {
			$image_url = self::get_image();
			if ( ! empty( $image_url ) ) {
				$image_id = attachment_url_to_postid( $image_url );
			}
		}

		$thumb = $image_id ? wp_get_attachment_image_url( $image_id, 'medium' ) : '';

		if ( empty( $thumb ) ) {
			$thumb = self::get_image();
		}

		return apply_filters( 'eventkoi_get_event_image_thumb', esc_url( $thumb ), self::$event_id, self::$event );
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
				'name' => eventkoi_decode_term_name( $term->name ),
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

		$event_day = self::get_selected_event_day_index_from_request();
		if ( null !== $event_day && 'standard' === self::get_date_type() && 'selected' === self::get_standard_type() ) {
			$days = self::get_event_days();
			if ( isset( $days[ $event_day ] ) && is_array( $days[ $event_day ] ) ) {
				$url = add_query_arg( 'event_day', absint( $event_day ), $url );
			}
		}

		$url = eventkoi_append_frontend_timezone_arg( $url );

		return apply_filters( 'eventkoi_get_event_url', $url, self::$event_id, self::$event );
	}

	/**
	 * Whether a plugin that registers editor metaboxes is active.
	 *
	 * Gates the embedded "Other plugin fields" panel. Filterable so sites can
	 * force it on or off.
	 *
	 * @return bool
	 */
	public static function has_embeddable_plugin_fields() {
		// Any plugin besides EventKoi may register a classic metabox, so the
		// gate only rules out sites with no other plugins at all. The embedded
		// screen reports how many third-party boxes actually rendered and the
		// panel stays hidden when there are none. Gutenberg-only sidebars
		// (Rank Math) cannot appear here; that is a known, accepted limitation.
		$plugins = (array) get_option( 'active_plugins', array() );

		if ( is_multisite() ) {
			$plugins = array_merge( $plugins, array_keys( (array) get_site_option( 'active_sitewide_plugins', array() ) ) );
		}

		$active = false;
		foreach ( $plugins as $plugin_file ) {
			if ( 0 !== strpos( (string) $plugin_file, 'eventkoi' ) ) {
				$active = true;
				break;
			}
		}

		return (bool) apply_filters( 'eventkoi_has_plugin_fields', $active, self::$event_id );
	}

	/**
	 * Get the native WordPress edit URL for SEO plugin panels.
	 *
	 * @return string
	 */
	public static function get_native_edit_url() {
		if ( empty( self::$event_id ) || ! current_user_can( 'edit_post', self::$event_id ) ) {
			return '';
		}

		$url = add_query_arg(
			array(
				'post'            => absint( self::$event_id ),
				'action'          => 'edit',
				'eventkoi_native' => '1',
			),
			admin_url( 'post.php' )
		);

		return apply_filters( 'eventkoi_get_event_native_edit_url', esc_url_raw( $url ), self::$event_id, self::$event );
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

		$event_day = self::get_selected_event_day_index_from_request();
		if ( null !== $event_day && 'standard' === self::get_date_type() && 'selected' === self::get_standard_type() ) {
			$days = self::get_event_days();
			if ( isset( $days[ $event_day ] ) && is_array( $days[ $event_day ] ) ) {
				$ical = add_query_arg( 'event_day', absint( $event_day ), $ical );
			}
		}

		$ical = eventkoi_append_frontend_timezone_arg( $ical );

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
			$selected_day = self::get_selected_event_day_from_request();
			if ( is_array( $selected_day ) ) {
				return array_merge(
					array(
						'start_date'       => '',
						'end_date'         => '',
						'all_day'          => false,
						'all_day_timezone' => '',
					),
					$selected_day
				);
			}

			$days = self::get_event_days();
			// Only use days[0] when it actually carries a start_date; some events
			// have a placeholder row with null/empty fields that would otherwise
			// short-circuit before the post-meta fallback below.
			if ( ! empty( $days[0]['start_date'] ) ) {
				return array(
					'start_date'       => $days[0]['start_date'],
					'end_date'         => $days[0]['end_date'] ?? '',
					'all_day'          => ! empty( $days[0]['all_day'] ),
					'all_day_timezone' => (string) ( $days[0]['all_day_timezone'] ?? '' ),
				);
			}
		}

		if ( 'recurring' === $type ) {
			$rules = self::get_recurrence_rules();
			if ( ! empty( $rules[0]['start_date'] ) ) {
				return array(
					'start_date'       => $rules[0]['start_date'],
					'end_date'         => $rules[0]['end_date'] ?? '',
					'all_day'          => ! empty( $rules[0]['all_day'] ),
					'all_day_timezone' => (string) ( $rules[0]['all_day_timezone'] ?? '' ),
				);
			}
		}

		// Fallback to legacy post-meta start_date / end_date.
		return array(
			'start_date'       => self::get_start_date( true ),
			'end_date'         => self::get_end_date( true ),
			'all_day'          => false,
			'all_day_timezone' => '',
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

		$selected_day = self::get_selected_event_day_from_request();
		if ( is_array( $selected_day ) && ! empty( $selected_day['start_date'] ) ) {
			$formatted = $selected_day['start_date'];
		}

		// If standard + continuous, read directly from meta.
		if ( empty( $formatted ) && 'standard' === $type && 'continuous' === $standard_type ) {
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

		$selected_day = self::get_selected_event_day_from_request();
		if ( is_array( $selected_day ) && ! empty( $selected_day['end_date'] ) ) {
			$formatted = $selected_day['end_date'];
		}

		// If standard + continuous, read directly from meta.
		if ( empty( $formatted ) && 'standard' === $type && 'continuous' === $standard_type ) {
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
	 * Third-party taxonomies registered for events, with their terms and the
	 * terms assigned to this event. EventKoi's own calendar taxonomy is
	 * excluded; it has a dedicated picker.
	 *
	 * @return array[]
	 */
	public static function get_custom_taxonomies() {
		$taxonomies = get_object_taxonomies( 'eventkoi_event', 'objects' );
		$payload    = array();

		foreach ( $taxonomies as $taxonomy ) {
			if ( in_array( $taxonomy->name, array( 'event_cal' ), true ) ) {
				continue;
			}

			if ( empty( $taxonomy->show_ui ) ) {
				continue;
			}

			$terms = get_terms(
				array(
					'taxonomy'   => $taxonomy->name,
					'hide_empty' => false,
					'number'     => 500,
				)
			);
			if ( is_wp_error( $terms ) ) {
				$terms = array();
			}

			$assigned = wp_get_object_terms( self::$event_id, $taxonomy->name, array( 'fields' => 'ids' ) );
			if ( is_wp_error( $assigned ) ) {
				$assigned = array();
			}

			$payload[] = array(
				'taxonomy'     => $taxonomy->name,
				'label'        => (string) ( $taxonomy->labels->name ?? $taxonomy->label ),
				'hierarchical' => (bool) $taxonomy->hierarchical,
				'terms'        => array_map(
					static function ( $term ) {
						return array(
							'id'     => (int) $term->term_id,
							'name'   => $term->name,
							'parent' => (int) $term->parent,
						);
					},
					$terms
				),
				'assigned'     => array_map( 'intval', $assigned ),
			);
		}

		return apply_filters( 'eventkoi_get_event_custom_taxonomies', $payload, self::$event_id, self::$event );
	}

	/**
	 * Persist third-party taxonomy assignments sent back by the event editor.
	 *
	 * @param array $items Items shaped as array{ taxonomy: string, assigned: int[] }.
	 * @return void
	 */
	public static function update_custom_taxonomies( $items ) {
		if ( ! is_array( $items ) ) {
			return;
		}

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$taxonomy = sanitize_key( (string) ( $item['taxonomy'] ?? '' ) );
			if ( '' === $taxonomy || 'event_cal' === $taxonomy ) {
				continue;
			}

			if ( ! taxonomy_exists( $taxonomy ) || ! is_object_in_taxonomy( 'eventkoi_event', $taxonomy ) ) {
				continue;
			}

			if ( ! array_key_exists( 'assigned', $item ) ) {
				continue;
			}

			$term_ids = array_values( array_filter( array_map( 'absint', (array) $item['assigned'] ) ) );
			wp_set_object_terms( self::$event_id, $term_ids, $taxonomy, false );
		}
	}

	/**
	 * Get event to be confirmed status.
	 */
	public static function get_tbc() {
		$tbc = get_post_meta( self::$event_id, 'tbc', true );

		return apply_filters( 'eventkoi_get_event_tbc', self::normalize_boolean_meta( $tbc ), self::$event_id, self::$event );
	}

	/**
	 * Returns whether the timezone should be shown.
	 */
	public static function get_timezone_display() {
		// Default to TRUE when the meta key is absent (new events that
		// haven't been saved yet). Saved events with an explicit 0 stay off.
		$has_meta         = metadata_exists( 'post', self::$event_id, 'timezone_display' );
		$timezone_display = $has_meta
			? self::normalize_boolean_meta( get_post_meta( self::$event_id, 'timezone_display', true ) )
			: true;

		return apply_filters( 'eventkoi_get_timezone_display', $timezone_display, self::$event_id, self::$event );
	}

	/**
	 * Get the "Price from" starting amount.
	 *
	 * @return string Numeric string, empty when unset.
	 */
	public static function get_price_from_amount() {
		$amount = get_post_meta( self::$event_id, 'price_from_amount', true );

		return apply_filters( 'eventkoi_get_event_price_from_amount', (string) $amount, self::$event_id, self::$event );
	}

	/**
	 * Get the "Price from" external ticket site URL.
	 *
	 * @return string
	 */
	public static function get_price_from_url() {
		$url = get_post_meta( self::$event_id, 'price_from_url', true );

		return apply_filters( 'eventkoi_get_event_price_from_url', (string) $url, self::$event_id, self::$event );
	}

	/**
	 * Get the "Price from" pricing details text.
	 *
	 * @return string
	 */
	public static function get_price_from_details() {
		$details = get_post_meta( self::$event_id, 'price_from_details', true );

		return apply_filters( 'eventkoi_get_event_price_from_details', (string) $details, self::$event_id, self::$event );
	}

	/**
	 * Get to be confirmed notification.
	 */
	public static function get_tbc_note() {
		$tbc_note = get_post_meta( self::$event_id, 'tbc_note', true );

		return apply_filters( 'eventkoi_get_event_tbc_note', (string) $tbc_note, self::$event_id, self::$event );
	}

	/**
	 * Build a human-readable event timeline.
	 *
	 * Mirrors frontend JS buildTimeline() behavior.
	 *
	 * @return string|null Timeline string or null if invalid.
	 */
	public static function get_datetime() {
		// Handle TBC.
		if ( self::get_tbc() ) {
			$tbc_note = self::get_tbc_note();

			if ( ! empty( $tbc_note ) ) {
				return $tbc_note;
			}

			return __( 'Date and time to be confirmed', 'eventkoi-lite' );
		}

		// Context / formatting settings.
		$settings    = Settings::get();
		$wp_timezone = self::get_display_timezone();
		$date_format = \eventkoi_resolved_date_format();
		$time_format = \eventkoi_resolved_time_format();
		$time_pref   = isset( $settings['time_format'] ) ? $settings['time_format'] : '12';
		// When the admin set a custom time_format_string, it has already been
		// baked into $time_format above; the 12/24 toggle must NOT override it.
		$has_custom_time = ! empty( $settings['time_format_string'] );

		$parse = static function ( $iso ) use ( $wp_timezone ) {
			if ( empty( $iso ) ) {
				return null;
			}
			try {
				$dt = new \DateTimeImmutable( $iso, new \DateTimeZone( 'UTC' ) );
				return $dt->setTimezone( $wp_timezone );
			} catch ( \Exception $e ) {
				return null;
			}
		};

		$fmt_time = static function ( $dt ) use ( $time_pref, $time_format, $has_custom_time ) {
			if ( ! $dt instanceof \DateTimeInterface ) {
				return '';
			}

			if ( $has_custom_time ) {
				$fmt = $time_format;
			} elseif ( '24' === $time_pref ) {
				$fmt = 'H:i';
			} elseif ( '12' === $time_pref ) {
				$fmt = 'g:i a';
			} else {
				$fmt = $time_format;
			}

			$out = wp_date( $fmt, $dt->getTimestamp(), $dt->getTimezone() );

			if ( str_contains( $time_format, 'A' ) ) {
				$out = preg_replace_callback(
					'/\b(am|pm)\b/i',
					static function ( $m ) {
						return strtoupper( $m[0] );
					},
					$out
				);
			} elseif ( str_contains( $time_format, 'a' ) ) {
				$out = preg_replace_callback(
					'/\b(AM|PM)\b/',
					static function ( $m ) {
						return strtolower( $m[0] );
					},
					$out
				);
			}

			return $out;
		};

		$fmt_date = static function ( $dt ) use ( $date_format ) {
			if ( $dt instanceof \DateTimeInterface ) {
				return wp_date( $date_format, $dt->getTimestamp(), $dt->getTimezone() );
			}
			return '';
		};

		$fmt = static function ( $dt, $type = 'datetime' ) use ( $fmt_date, $fmt_time ) {
			if ( ! $dt instanceof \DateTimeInterface ) {
				return '';
			}

			if ( 'date' === $type ) {
				return $fmt_date( $dt );
			}

			if ( 'time' === $type ) {
				return $fmt_time( $dt );
			}

			return sprintf( '%s, %s', $fmt_date( $dt ), $fmt_time( $dt ) );
		};

		$start_iso = self::get_start_date_iso();
		$end_iso   = self::get_end_date_iso();

		$date_type = self::get_date_type();
		$start     = $parse( $start_iso );
		$end       = $parse( $end_iso );

		if ( ! $start ) {
			return null;
		}

		$first_instance = self::get_first_instance();
		$all_day        = array_key_exists( 'all_day', (array) $first_instance )
			? (bool) $first_instance['all_day']
			: self::normalize_boolean_meta( get_post_meta( self::$event_id, 'all_day', true ) );
		if ( $all_day ) {
			$all_day_timezone = self::get_all_day_datetime_timezone(
				self::get_timezone(),
				array(
					'start_date'       => $start_iso,
					'end_date'         => $end_iso,
					'all_day_timezone' => $first_instance['all_day_timezone'] ?? '',
				)
			);

			if ( 'recurring' !== $date_type || '' !== (string) get_post_meta( self::$event_id, 'timezone', true ) || ! empty( $first_instance['all_day_timezone'] ) ) {
				try {
					$start = ( new \DateTimeImmutable( $start_iso, new \DateTimeZone( 'UTC' ) ) )->setTimezone( $all_day_timezone );
					$end   = ! empty( $end_iso )
						? ( new \DateTimeImmutable( $end_iso, new \DateTimeZone( 'UTC' ) ) )->setTimezone( $all_day_timezone )
						: null;
				} catch ( \Exception $e ) {
					// Keep the WordPress-time parsed values.
				}
			}
		}
		$is_same   = ( $end instanceof \DateTimeInterface ) && ( $start->format( 'Y-m-d' ) === $end->format( 'Y-m-d' ) );
		$is_single_all_day_span = $all_day && $end && eventkoi_is_single_all_day_span( $start->getTimestamp(), $end->getTimestamp() );

		if ( 'recurring' === $date_type ) {
			if ( $is_same && ! $all_day ) {
				return sprintf(
					'%s, %s – %s',
					$fmt( $start, 'date' ),
					$fmt( $start, 'time' ),
					$fmt( $end, 'time' )
				);
			}

			if ( ! $end || $is_same || $is_single_all_day_span ) {
				return $fmt( $start, 'date' );
			}

			return sprintf( '%s – %s', $fmt( $start, 'date' ), $fmt( $end, 'date' ) );
		}

		if ( in_array( $date_type, array( 'standard', 'multi' ), true ) ) {
			if ( $all_day ) {
				if ( ! $end || $is_same || $is_single_all_day_span ) {
					return $fmt( $start, 'date' );
				}

				return sprintf( '%s – %s', $fmt( $start, 'date' ), $fmt( $end, 'date' ) );
			}

			if ( $is_same && $end ) {
				return sprintf(
					'%s, %s – %s',
					$fmt( $start, 'date' ),
					$fmt( $start, 'time' ),
					$fmt( $end, 'time' )
				);
			}

			if ( ! $end ) {
				return sprintf( '%s, %s', $fmt( $start, 'date' ), $fmt( $start, 'time' ) );
			}

			return sprintf(
				'%s, %s – %s, %s',
				$fmt( $start, 'date' ),
				$fmt( $start, 'time' ),
				$fmt( $end, 'date' ),
				$fmt( $end, 'time' )
			);
		}

		return null;
	}

	/**
	 * Normalize stored event type values to supported values.
	 *
	 * @param string $type Raw event type.
	 * @return string
	 */
	private static function normalize_event_type_value( $type ) {
		$type = sanitize_key( (string) $type );

		if ( 'physical' === $type ) {
			return 'inperson';
		}

		if ( 'virtual' === $type ) {
			return 'online';
		}

		if ( in_array( $type, array( 'inperson', 'online', 'mixed' ), true ) ) {
			return $type;
		}

		if ( str_contains( $type, 'virtuallocation' ) ) {
			return 'online';
		}

		if ( str_contains( $type, 'place' ) ) {
			return 'inperson';
		}

		return '';
	}

	/**
	 * Infer event type from the locations array.
	 *
	 * @param array $locations Event locations.
	 * @return string
	 */
	private static function infer_event_type_from_locations( $locations ) {
		if ( ! is_array( $locations ) || empty( $locations ) ) {
			return '';
		}

		$has_online   = false;
		$has_physical = false;

		foreach ( $locations as $location ) {
			if ( ! is_array( $location ) ) {
				continue;
			}

			$location_type = self::get_location_type( $location );

			if ( 'online' === $location_type ) {
				$has_online = true;
			} elseif ( 'inperson' === $location_type ) {
				$has_physical = true;
			}

			if ( $has_online && $has_physical ) {
				return 'mixed';
			}
		}

		if ( $has_online ) {
			return 'online';
		}

		if ( $has_physical ) {
			return 'inperson';
		}

		return '';
	}

	/**
	 * Get event type.
	 */
	public static function get_type() {
		$locations = self::get_instance_field( 'locations' );
		$locations = is_array( $locations ) ? $locations : array();
		$type      = self::infer_event_type_from_locations( $locations );

		if ( empty( $type ) && ! self::has_instance_locations_override() ) {
			$type = self::normalize_event_type_value( get_post_meta( self::$event_id, 'type', true ) );
		}

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

		// Defensive normalize: legacy / stale data may carry values like
		// 'single' that the current code paths and UI don't accept. Map any
		// unrecognised value to the safe default.
		$allowed = array( 'continuous', 'selected' );
		if ( ! in_array( $standard_type, $allowed, true ) ) {
			$standard_type = 'continuous';
		}

		return apply_filters( 'eventkoi_get_event_standard_type', (string) $standard_type, self::$event_id, self::$event );
	}

	/**
	 * Whether a multi-day selected-dates event should be treated as one package.
	 *
	 * New events default ON; existing events without the meta default OFF so the
	 * historical per-day behaviour is preserved on update (grandfathering).
	 *
	 * @return bool
	 */
	public static function get_event_single_package() {
		// New, unsaved events (the editor template runs with event id 0): default ON.
		if ( empty( self::$event_id ) ) {
			return apply_filters( 'eventkoi_get_event_single_package', true, self::$event_id, self::$event );
		}

		// Existing events that predate this setting keep their current per-day
		// behaviour until the toggle is explicitly saved.
		if ( ! metadata_exists( 'post', self::$event_id, 'event_single_package' ) ) {
			return apply_filters( 'eventkoi_get_event_single_package', false, self::$event_id, self::$event );
		}

		$enabled = get_post_meta( self::$event_id, 'event_single_package', true );

		return apply_filters( 'eventkoi_get_event_single_package', self::normalize_boolean_meta( $enabled ), self::$event_id, self::$event );
	}

	/**
	 * Whether the current event behaves as a single multi-day package.
	 *
	 * True only for a standard, selected-dates event that has more than one date
	 * row AND has the single-package toggle enabled. When true, the event links to
	 * its bare permalink (no per-day ?event_day arg) and is sold as one unit.
	 *
	 * @return bool
	 */
	public static function is_package() {
		if ( 'standard' !== self::get_date_type() || 'selected' !== self::get_standard_type() ) {
			return false;
		}

		$days = self::get_event_days();
		if ( ! is_array( $days ) || count( $days ) <= 1 ) {
			return false;
		}

		return (bool) self::get_event_single_package();
	}

	/**
	 * Collapse a package's day rows into one continuous span row.
	 *
	 * Order-independent: the span starts at the earliest day start and ends at the
	 * latest day end (so unsorted event_days, or a day with a blank end, still
	 * yield a correct start..end window).
	 *
	 * @param array $days Event day rows.
	 * @return array Single row with start_date/end_date/all_day.
	 */
	public static function collapse_package_days( $days ) {
		$min_start    = '';
		$min_start_ts = 0;
		$max_end      = '';
		$max_end_ts   = 0;
		$all_day      = false;

		if ( is_array( $days ) ) {
			foreach ( $days as $row ) {
				if ( ! is_array( $row ) || empty( $row['start_date'] ) ) {
					continue;
				}

				$start_ts = strtotime( (string) $row['start_date'] );
				if ( $start_ts && ( '' === $min_start || $start_ts < $min_start_ts ) ) {
					$min_start_ts = $start_ts;
					$min_start    = $row['start_date'];
					$all_day      = ! empty( $row['all_day'] );
				}

				$end    = ! empty( $row['end_date'] ) ? $row['end_date'] : $row['start_date'];
				$end_ts = strtotime( (string) $end );
				if ( $end_ts && $end_ts > $max_end_ts ) {
					$max_end_ts = $end_ts;
					$max_end    = $end;
				}
			}
		}

		return array(
			'start_date' => $min_start,
			'end_date'   => '' !== $max_end ? $max_end : $min_start,
			'all_day'    => $all_day,
		);
	}

	/**
	 * Context-safe check for whether a given event id is a single-day package.
	 *
	 * Saves and restores the static event context so callers that pass an
	 * arbitrary id (e.g. checkout) do not disturb the event currently loaded.
	 *
	 * @param int $event_id Event ID.
	 * @return bool
	 */
	public static function is_package_event( $event_id ) {
		$event_id = absint( $event_id );
		if ( ! $event_id ) {
			return false;
		}

		$prev_event    = self::$event;
		$prev_event_id = self::$event_id;

		self::$event    = get_post( $event_id );
		self::$event_id = $event_id;

		$result = self::is_package();

		self::$event    = $prev_event;
		self::$event_id = $prev_event_id;

		return $result;
	}

	/**
	 * Get event location.
	 */
	public static function get_location() {
		$locations                       = self::get_instance_field( 'locations' );
		$locations                       = is_array( $locations ) ? $locations : array();
		$has_instance_locations_override = self::has_instance_locations_override();
		$has_locations_meta              = ! empty( $locations );
		$location                        = array();

		$primary_location = self::get_primary_location_from_locations( $locations );
		if ( is_array( $primary_location ) ) {
			$location = $primary_location;
		} elseif ( ! $has_locations_meta && ! $has_instance_locations_override ) {
			$location = get_post_meta( self::$event_id, 'location', true );

			if ( empty( $location ) ) {
				$location = array();
			}

			if ( is_array( $location ) && isset( $location[0] ) && is_array( $location[0] ) && ! isset( $location['type'] ) ) {
				$location = $location[0];
			}
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

		return apply_filters( 'eventkoi_get_event_embed_gmap', self::normalize_boolean_meta( $embed_gmap ), self::$event_id, self::$event );
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
		$virtual_url = '';
		$locations   = self::get_instance_field( 'locations' );

		if ( is_array( $locations ) ) {
			foreach ( $locations as $location ) {
				if ( ! is_array( $location ) ) {
					continue;
				}

				$type = self::get_location_type( $location );
				if ( 'online' === $type ) {
					$virtual_url = self::get_location_virtual_url( $location );
					if ( '' !== $virtual_url ) {
						break;
					}
				}
			}
		}

		if ( '' === $virtual_url && ! self::has_instance_locations_override() ) {
			$virtual_url = get_post_meta( self::$event_id, 'virtual_url', true );
		}

		return apply_filters( 'eventkoi_get_event_virtual_url', (string) $virtual_url, self::$event_id, self::$event );
	}

	/**
	 * Returns the attendance mode for the event.
	 *
	 * @return string 'none', 'rsvp', or 'tickets'.
	 */
	public static function get_attendance_mode() {
		$mode = get_post_meta( self::$event_id, 'attendance_mode', true );
		if ( empty( $mode ) ) {
			$mode = 'rsvp';
		}

		return apply_filters( 'eventkoi_get_event_attendance_mode', $mode, self::$event_id, self::$event );
	}

	/**
	 * Returns whether tickets are enabled for the event.
	 *
	 * @return bool
	 */
	public static function get_tickets_enabled() {
		$enabled = get_post_meta( self::$event_id, 'tickets_enabled', true );

		return apply_filters( 'eventkoi_get_event_tickets_enabled', self::normalize_boolean_meta( $enabled ), self::$event_id, self::$event );
	}

	/**
	 * Get tickets terms and conditions.
	 *
	 * @return string
	 */
	public static function get_tickets_terms_conditions() {
		$terms = get_post_meta( self::$event_id, 'tickets_terms_conditions', true );

		return apply_filters( 'eventkoi_get_event_tickets_terms_conditions', $terms, self::$event_id, self::$event );
	}

	/**
	 * Whether buyers must tick a checkbox agreeing to the ticket terms.
	 *
	 * @return bool
	 */
	public static function get_tickets_terms_conditions_required() {
		$required = self::normalize_boolean_meta( get_post_meta( self::$event_id, 'tickets_terms_conditions_required', true ) );

		return (bool) apply_filters( 'eventkoi_get_event_tickets_terms_conditions_required', $required, self::$event_id, self::$event );
	}

	/**
	 * Additional agreement checkboxes shown at ticket checkout.
	 *
	 * Each item is a separate consent (e.g. privacy statement, refund policy)
	 * with its own checkbox, on top of the main terms & conditions field.
	 *
	 * @return array[] Items shaped as array{ id: string, text: string, required: bool }.
	 */
	public static function get_tickets_agreements() {
		$items = self::sanitize_tickets_agreements( get_post_meta( self::$event_id, 'tickets_agreements', true ) );

		return apply_filters( 'eventkoi_get_event_tickets_agreements', $items, self::$event_id, self::$event );
	}

	/**
	 * Sanitize a raw agreements list into the canonical shape.
	 *
	 * Empty-text items are dropped; missing IDs are generated so the checkout
	 * can reference each agreement stably.
	 *
	 * @param mixed $raw Raw agreements value (from meta or a REST payload).
	 * @return array[]
	 */
	public static function sanitize_tickets_agreements( $raw ) {
		$items = array();
		$seen  = array();

		if ( ! is_array( $raw ) ) {
			return $items;
		}

		foreach ( $raw as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$text = trim( wp_kses_post( (string) ( $item['text'] ?? '' ) ) );
			if ( '' === $text ) {
				continue;
			}

			// A missing or duplicate id would make two checkboxes share one
			// checkout state, so mint a fresh unique one in either case.
			$id = sanitize_key( (string) ( $item['id'] ?? '' ) );
			if ( '' === $id || isset( $seen[ $id ] ) ) {
				$id = 'agr_' . substr( md5( $text . wp_rand() ), 0, 8 );
			}
			$seen[ $id ] = true;

			$items[] = array(
				'id'       => $id,
				'text'     => $text,
				'required' => self::normalize_boolean_meta( $item['required'] ?? false ),
			);
		}

		return $items;
	}

	/**
	 * Total ticket quantity allowed for the whole event (venue capacity).
	 *
	 * Applies across every ticket type combined, on top of each ticket's own
	 * "Quantity available". 0 means unlimited (no event-wide cap).
	 *
	 * @return int
	 */
	public static function get_tickets_event_capacity() {
		$capacity = absint( get_post_meta( self::$event_id, 'tickets_event_capacity', true ) );

		return (int) apply_filters( 'eventkoi_get_event_tickets_event_capacity', $capacity, self::$event_id, self::$event );
	}

	/**
	 * Rendered ticket terms and conditions, for the data shortcode and dynamic tags.
	 *
	 * @return string
	 */
	public static function rendered_tickets_terms_conditions() {
		$terms = trim( (string) self::get_tickets_terms_conditions() );

		if ( '' === $terms ) {
			return '';
		}

		$output = '<div class="eventkoi-ticket-terms">' . wp_kses_post( wpautop( $terms ) ) . '</div>';

		return apply_filters( 'eventkoi_rendered_tickets_terms_conditions', $output, self::$event_id );
	}

	/**
	 * Get tickets require account setting.
	 *
	 * @return bool
	 */
	public static function get_tickets_require_account() {
		return self::normalize_boolean_meta( get_post_meta( self::$event_id, 'tickets_require_account', true ) );
	}

	/**
	 * Get tickets auto-create account setting.
	 *
	 * @return bool
	 */
	public static function get_tickets_auto_create_account() {
		return self::normalize_boolean_meta( get_post_meta( self::$event_id, 'tickets_auto_create_account', true ) );
	}

	/**
	 * Get tickets show remaining setting.
	 *
	 * @return bool
	 */
	public static function get_tickets_show_remaining() {
		$value = get_post_meta( self::$event_id, 'tickets_show_remaining', true );
		if ( ! metadata_exists( 'post', self::$event_id, 'tickets_show_remaining' ) && ( '' === $value || null === $value ) ) {
			return true;
		}

		return self::normalize_boolean_meta( $value );
	}

	/**
	 * Get tickets show unavailable setting.
	 *
	 * @return bool
	 */
	public static function get_tickets_show_unavailable() {
		$value = get_post_meta( self::$event_id, 'tickets_show_unavailable', true );

		if ( ! metadata_exists( 'post', self::$event_id, 'tickets_show_unavailable' ) && ( '' === $value || null === $value ) ) {
			return false;
		}

		return self::normalize_boolean_meta( $value );
	}

	/**
	 * Read one of the split unavailable-ticket visibility toggles.
	 *
	 * Falls back to the legacy catch-all tickets_show_unavailable value for
	 * events saved before the toggle was split.
	 *
	 * @param string $meta_key Meta key of the split toggle.
	 * @return bool
	 */
	private static function get_tickets_show_flag( $meta_key ) {
		if ( metadata_exists( 'post', self::$event_id, $meta_key ) ) {
			return self::normalize_boolean_meta( get_post_meta( self::$event_id, $meta_key, true ) );
		}

		return self::get_tickets_show_unavailable();
	}

	/**
	 * Whether sold out ticket types stay visible on the event page.
	 *
	 * @return bool
	 */
	public static function get_tickets_show_sold_out() {
		return self::get_tickets_show_flag( 'tickets_show_sold_out' );
	}

	/**
	 * Whether not-yet-on-sale ticket types stay visible on the event page.
	 *
	 * @return bool
	 */
	public static function get_tickets_show_upcoming() {
		return self::get_tickets_show_flag( 'tickets_show_upcoming' );
	}

	/**
	 * Whether ended ticket types stay visible on the event page.
	 *
	 * @return bool
	 */
	public static function get_tickets_show_ended() {
		return self::get_tickets_show_flag( 'tickets_show_ended' );
	}

	/**
	 * Get tickets display mode.
	 *
	 * @return string
	 */
	public static function get_tickets_display_mode() {
		$mode = get_post_meta( self::$event_id, 'tickets_display_mode', true );
		if ( empty( $mode ) ) {
			$mode = 'cards';
		}

		return apply_filters( 'eventkoi_get_event_tickets_display_mode', $mode, self::$event_id, self::$event );
	}

	/**
	 * Returns whether RSVPs are enabled for the event.
	 *
	 * @return bool
	 */
	public static function get_rsvp_enabled() {
		$enabled = get_post_meta( self::$event_id, 'rsvp_enabled', true );

		return apply_filters( 'eventkoi_get_event_rsvp_enabled', self::normalize_boolean_meta( $enabled ), self::$event_id, self::$event );
	}

	/**
	 * Get RSVP capacity (0 = unlimited).
	 *
	 * @return int
	 */
	public static function get_rsvp_capacity( $instance_ts = 0 ) {
		// Lite has no recurring events, so $instance_ts is always treated as
		// series-wide. Param kept for Pro+Lite signature parity.
		unset( $instance_ts );
		$capacity = get_post_meta( self::$event_id, 'rsvp_capacity', true );

		return apply_filters( 'eventkoi_get_event_rsvp_capacity', absint( $capacity ), self::$event_id, self::$event );
	}

	/**
	 * Whether to show RSVP count.
	 *
	 * @return bool
	 */
	public static function get_rsvp_show_count() {
		$show_count = get_post_meta( self::$event_id, 'rsvp_show_count', true );
		if ( ! metadata_exists( 'post', self::$event_id, 'rsvp_show_count' ) && ( '' === $show_count || false === $show_count || null === $show_count ) ) {
			$show_count = true;
		}

		return apply_filters( 'eventkoi_get_event_rsvp_show_count', self::normalize_boolean_meta( $show_count ), self::$event_id, self::$event );
	}

	/**
	 * Whether to show remaining spots.
	 *
	 * @return bool
	 */
	public static function get_rsvp_show_remaining() {
		$show_remaining = get_post_meta( self::$event_id, 'rsvp_show_remaining', true );
		if ( ! metadata_exists( 'post', self::$event_id, 'rsvp_show_remaining' ) && ( '' === $show_remaining || false === $show_remaining || null === $show_remaining ) ) {
			$show_remaining = true;
		}

		return apply_filters( 'eventkoi_get_event_rsvp_show_remaining', self::normalize_boolean_meta( $show_remaining ), self::$event_id, self::$event );
	}

	/**
	 * Whether guests are allowed on RSVP.
	 *
	 * @return bool
	 */
	public static function get_rsvp_allow_guests() {
		$allow_guests = get_post_meta( self::$event_id, 'rsvp_allow_guests', true );

		return apply_filters( 'eventkoi_get_event_rsvp_allow_guests', self::normalize_boolean_meta( $allow_guests ), self::$event_id, self::$event );
	}

	/**
	 * Max guests per RSVP (0 = none).
	 *
	 * @return int
	 */
	public static function get_rsvp_max_guests() {
		$max_guests = get_post_meta( self::$event_id, 'rsvp_max_guests', true );

		return apply_filters( 'eventkoi_get_event_rsvp_max_guests', absint( $max_guests ), self::$event_id, self::$event );
	}

	/**
	 * Whether users can edit their RSVP.
	 *
	 * @return bool
	 */
	public static function get_rsvp_allow_edit() {
		$allow_edit = get_post_meta( self::$event_id, 'rsvp_allow_edit', true );
		// Default ON for events with no value stored. get_post_meta returns false
		// when the post id is 0 (new-event template), so handle both ''/false/null.
		if ( ! metadata_exists( 'post', self::$event_id, 'rsvp_allow_edit' ) && ( '' === $allow_edit || false === $allow_edit || null === $allow_edit ) ) {
			$allow_edit = true;
		}

		return apply_filters( 'eventkoi_get_event_rsvp_allow_edit', self::normalize_boolean_meta( $allow_edit ), self::$event_id, self::$event );
	}

	/**
	 * Whether to auto-create WP users for RSVPs.
	 *
	 * @return bool
	 */
	public static function get_rsvp_auto_account() {
		$auto_account = get_post_meta( self::$event_id, 'rsvp_auto_account', true );

		return apply_filters( 'eventkoi_get_event_rsvp_auto_account', self::normalize_boolean_meta( $auto_account ), self::$event_id, self::$event );
	}

	/**
	 * RSVP window start (UTC `Y-m-d H:i:s`) or '' for no boundary.
	 *
	 * Lite has no per-instance overrides; the parameter is accepted for
	 * signature parity with Pro so frontend code paths can stay identical.
	 *
	 * @param int $instance_ts Unused in Lite.
	 * @return string
	 */
	public static function get_rsvp_sale_start( $instance_ts = 0 ) {
		$start = (string) get_post_meta( self::$event_id, 'rsvp_sale_start', true );

		return apply_filters( 'eventkoi_get_event_rsvp_sale_start', $start, self::$event_id, self::$event, $instance_ts );
	}

	/**
	 * RSVP window end (UTC `Y-m-d H:i:s`) or '' for no boundary.
	 *
	 * @param int $instance_ts Unused in Lite.
	 * @return string
	 */
	public static function get_rsvp_sale_end( $instance_ts = 0 ) {
		$end = (string) get_post_meta( self::$event_id, 'rsvp_sale_end', true );

		return apply_filters( 'eventkoi_get_event_rsvp_sale_end', $end, self::$event_id, self::$event, $instance_ts );
	}

	/**
	 * Normalize an inbound datetime to UTC `Y-m-d H:i:s`. Returns '' for empty
	 * or unparseable input.
	 *
	 * @param mixed $value
	 * @return string
	 */
	private static function normalize_utc_datetime_string( $value ) {
		if ( null === $value ) {
			return '';
		}
		$trimmed = trim( (string) $value );
		if ( '' === $trimmed ) {
			return '';
		}
		try {
			$dt = new \DateTime( $trimmed, new \DateTimeZone( 'UTC' ) );
			$dt->setTimezone( new \DateTimeZone( 'UTC' ) );
			return $dt->format( 'Y-m-d H:i:s' );
		} catch ( \Exception $e ) {
			return '';
		}
	}

	/**
	 * Normalize an inbound event datetime to UTC ISO-8601. Returns '' for empty
	 * or unparseable input.
	 *
	 * Event rows are read directly by the admin app with ISO parsers, so keep
	 * their storage format canonical and JavaScript-safe.
	 *
	 * @param mixed $value Datetime input, usually ISO-8601.
	 * @return string
	 */
	private static function normalize_utc_datetime_iso_string( $value ) {
		if ( null === $value ) {
			return '';
		}
		$trimmed = trim( (string) $value );
		if ( '' === $trimmed ) {
			return '';
		}
		try {
			$dt = new \DateTimeImmutable( $trimmed, new \DateTimeZone( 'UTC' ) );
			$dt = $dt->setTimezone( new \DateTimeZone( 'UTC' ) );
			return $dt->format( 'Y-m-d\TH:i:s\Z' );
		} catch ( \Exception $e ) {
			return '';
		}
	}

	/**
	 * Normalize boolean-like event meta values.
	 *
	 * @param mixed $value Boolean-like value from REST/admin payloads.
	 * @return bool
	 */
	private static function normalize_boolean_meta( $value ) {
		return rest_sanitize_boolean( $value );
	}

	/**
	 * Get the first usable location (physical or virtual).
	 *
	 * @return array|null
	 */
	public static function get_primary_location() {
		$locations = self::get_instance_field( 'locations' );

		return self::get_primary_location_from_locations( is_array( $locations ) ? $locations : array() );
	}

	/**
	 * Get the first usable location from a locations array.
	 *
	 * @param array $locations Locations.
	 * @return array|null
	 */
	protected static function get_primary_location_from_locations( $locations ) {
		if ( ! is_array( $locations ) ) {
			return null;
		}

		foreach ( $locations as $loc ) {
			if ( ! is_array( $loc ) ) {
				continue;
			}

			$type = self::get_location_type( $loc );

			if ( 'inperson' === $type && '' !== self::format_physical_location_line( $loc, true ) ) {
				return $loc;
			}

			if ( 'online' === $type && '' !== self::get_location_virtual_url( $loc ) ) {
				return $loc;
			}
		}

		return null;
	}

	/**
	 * Whether the active recurring instance explicitly overrides locations.
	 *
	 * @return bool
	 */
	protected static function has_instance_locations_override() {
		$instance_ts = function_exists( 'eventkoi_get_instance_id' ) ? absint( eventkoi_get_instance_id() ) : 0;
		if ( ! $instance_ts ) {
			return false;
		}

		$overrides = self::get_recurrence_overrides();

		return isset( $overrides[ $instance_ts ] )
			&& is_array( $overrides[ $instance_ts ] )
			&& array_key_exists( 'locations', $overrides[ $instance_ts ] );
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

		$type = self::get_location_type( $loc );

		if ( 'inperson' === $type ) {
			return self::format_physical_location_line( $loc, false );
		}

		if ( 'online' === $type ) {
			return esc_url_raw( self::get_location_virtual_url( $loc ) );
		}

		return '';
	}

	/**
	 * Format a physical location row as a single line.
	 *
	 * @param array $location     Location row.
	 * @param bool  $include_name Include the venue name.
	 * @return string
	 */
	protected static function format_physical_location_line( array $location, $include_name = true ) {
		$address = isset( $location['address'] ) && is_array( $location['address'] ) ? $location['address'] : array();

		$city_line = implode(
			', ',
			array_filter(
				array(
					self::first_location_text(
						self::location_text_value( $location, 'city' ),
						self::location_text_value( $address, 'addressLocality' )
					),
					self::first_location_text(
						self::location_text_value( $location, 'state' ),
						self::location_text_value( $address, 'addressRegion' )
					),
					self::first_location_text(
						self::location_text_value( $location, 'zip' ),
						self::location_text_value( $address, 'postalCode' )
					),
				)
			)
		);

		$parts = array(
			self::first_location_text(
				self::location_text_value( $location, 'address1' ),
				self::location_text_value( $address, 'streetAddress' )
			),
			self::location_text_value( $location, 'address2' ),
			self::location_text_value( $location, 'address3' ),
			$city_line,
			self::first_location_text(
				self::location_text_value( $location, 'country' ),
				self::location_text_value( $address, 'addressCountry' )
			),
		);

		if ( $include_name ) {
			array_unshift( $parts, self::location_text_value( $location, 'name' ) );
		}

		return implode( ', ', array_unique( array_filter( $parts ) ) );
	}

	/**
	 * Read a single text field from the primary physical location.
	 *
	 * Falls back to the schema.org address sub-object so imported events (which
	 * may store the value under streetAddress/addressLocality/etc.) resolve too.
	 *
	 * @param string $key        Location array key (e.g. "city").
	 * @param string $schema_key Optional schema.org address key (e.g. "addressLocality").
	 * @return string
	 */
	protected static function location_field_text( $key, $schema_key = '' ) {
		$location = self::get_primary_location();

		if ( ! is_array( $location ) || empty( $location ) ) {
			return '';
		}

		$address = isset( $location['address'] ) && is_array( $location['address'] ) ? $location['address'] : array();

		return self::first_location_text(
			self::location_text_value( $location, $key ),
			'' !== $schema_key ? self::location_text_value( $address, $schema_key ) : ''
		);
	}

	/**
	 * Render the primary location's venue name.
	 *
	 * @return string
	 */
	public static function rendered_location_name() {
		return esc_html( self::location_field_text( 'name' ) );
	}

	/**
	 * Render the primary location's street address (line 1).
	 *
	 * @return string
	 */
	public static function rendered_location_address() {
		return esc_html( self::location_field_text( 'address1', 'streetAddress' ) );
	}

	/**
	 * Render the primary location's apartment / unit (address line 2).
	 *
	 * @return string
	 */
	public static function rendered_location_unit() {
		return esc_html( self::location_field_text( 'address2' ) );
	}

	/**
	 * Render the primary location's city.
	 *
	 * @return string
	 */
	public static function rendered_location_city() {
		return esc_html( self::location_field_text( 'city', 'addressLocality' ) );
	}

	/**
	 * Render the primary location's state / region.
	 *
	 * @return string
	 */
	public static function rendered_location_state() {
		return esc_html( self::location_field_text( 'state', 'addressRegion' ) );
	}

	/**
	 * Render the primary location's country.
	 *
	 * @return string
	 */
	public static function rendered_location_country() {
		return esc_html( self::location_field_text( 'country', 'addressCountry' ) );
	}

	/**
	 * Render the primary location's post code / zip.
	 *
	 * @return string
	 */
	public static function rendered_location_zip() {
		return esc_html( self::location_field_text( 'zip', 'postalCode' ) );
	}

	/**
	 * Whether a locations array holds at least one physical location with details.
	 *
	 * Pure helper (no event context) that powers the `_eventkoi_has_location`
	 * flag, which page builders read in conditional logic to show/hide a row
	 * depending on whether an event has a venue.
	 *
	 * @param mixed $locations Locations array (or its serialized form).
	 * @return bool
	 */
	public static function locations_have_physical( $locations ) {
		if ( ! is_array( $locations ) ) {
			$locations = maybe_unserialize( $locations );
		}

		if ( ! is_array( $locations ) ) {
			return false;
		}

		foreach ( $locations as $location ) {
			if ( ! is_array( $location ) ) {
				continue;
			}

			$type = self::get_location_type( $location, 'inperson' );
			if ( ! in_array( $type, array( 'physical', 'inperson' ), true ) ) {
				continue;
			}

			if ( '' !== trim( self::format_physical_location_line( $location, true ) ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Return the first non-empty location text.
	 *
	 * @param string ...$values Values.
	 * @return string
	 */
	protected static function first_location_text( ...$values ) {
		foreach ( $values as $value ) {
			$value = trim( (string) $value );
			if ( '' !== $value ) {
				return $value;
			}
		}

		return '';
	}

	/**
	 * Get sanitized text from a location row.
	 *
	 * @param array  $location Location row.
	 * @param string $key      Field key.
	 * @return string
	 */
	protected static function location_text_value( array $location, $key ) {
		if ( ! array_key_exists( $key, $location ) ) {
			return '';
		}

		$value = $location[ $key ];
		if ( is_object( $value ) ) {
			$value = get_object_vars( $value );
		}

		if ( is_array( $value ) ) {
			foreach ( array( 'name', 'text', 'url', '@id' ) as $nested_key ) {
				if ( array_key_exists( $nested_key, $value ) ) {
					$text = self::location_scalar_text( $value[ $nested_key ] );
					if ( '' !== $text ) {
						return $text;
					}
				}
			}

			$texts = array();
			foreach ( $value as $nested_value ) {
				$text = self::location_scalar_text( $nested_value );
				if ( '' !== $text ) {
					$texts[] = $text;
				}
			}

			return implode( ' ', array_unique( $texts ) );
		}

		return self::location_scalar_text( $value );
	}

	/**
	 * Normalize a scalar location value to text.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	protected static function location_scalar_text( $value ) {
		if ( is_array( $value ) || is_object( $value ) ) {
			return '';
		}

		return sanitize_text_field( (string) $value );
	}

	/**
	 * Normalize EventKoi and raw Schema.org location types.
	 *
	 * @param array  $location Location row.
	 * @param string $default  Optional default normalized type.
	 * @return string
	 */
	protected static function get_location_type( array $location, $default = '' ) {
		$type = self::normalize_event_type_value( self::location_text_value( $location, 'type' ) );
		if ( '' !== $type ) {
			return $type;
		}

		$schema_type = strtolower( self::location_text_value( $location, '@type' ) );
		if ( str_contains( $schema_type, 'virtuallocation' ) ) {
			return 'online';
		}
		if ( str_contains( $schema_type, 'place' ) ) {
			return 'inperson';
		}

		return self::normalize_event_type_value( $default );
	}

	/**
	 * Get the virtual URL from supported location shapes.
	 *
	 * @param array $location Location row.
	 * @return string
	 */
	protected static function get_location_virtual_url( array $location ) {
		return self::first_location_text(
			self::location_text_value( $location, 'virtual_url' ),
			self::location_text_value( $location, 'url' )
		);
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
			'post_type'   => 'eventkoi_event',
			'post_status' => 'draft',
			'post_title'  => $title,
			'post_name'   => sanitize_title( $title ),
			'post_author' => get_current_user_id(),
		);

		// The excerpt lives on the post row rather than in post meta, so
		// update_meta() below cannot carry it over the way it does the rest of
		// the event. It has to be copied here or the duplicate loses it.
		if ( isset( $meta['excerpt'] ) && '' !== $meta['excerpt'] ) {
			$args['post_excerpt'] = $meta['excerpt'];
		}

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
	public static function get_instance_field( $key ) {
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
		// An event designed with Elementor shows that design as its details:
		// Elementor content only reaches pages through the_content, which the
		// event templates never print, so this is where "the layout saves
		// with the event" actually surfaces. The static stack breaks recursion
		// when the design itself embeds a widget asking for the details again.
		static $rendering_builder = array();
		if ( did_action( 'elementor/loaded' ) && class_exists( '\Elementor\Plugin' ) && empty( $rendering_builder[ self::$event_id ] ) ) {
			$document = \Elementor\Plugin::$instance->documents->get( self::$event_id );
			if ( $document && $document->is_built_with_elementor() ) {
				$rendering_builder[ self::$event_id ] = true;
				try {
					// get_builder_content, not the *_for_display wrapper: the
					// wrapper refuses to render the currently queried post,
					// which is exactly the post whose details these are.
					$built = (string) \Elementor\Plugin::$instance->frontend->get_builder_content( self::$event_id );
				} finally {
					unset( $rendering_builder[ self::$event_id ] );
				}

				if ( '' !== trim( $built ) ) {
					return apply_filters( 'eventkoi_rendered_event_details', $built, self::$event_id, self::$event );
				}
			}
		}

		$details = self::get_instance_field( 'description' );

		$has_content = ! empty( $details ) && ( trim( wp_strip_all_tags( $details ) ) || preg_match( '/<[a-z][a-z0-9]*[\s\/>]/i', $details ) );
		if ( $has_content ) {
			// Allow safe HTML output, since this content comes from an RTE.
			$details = self::sanitize_description_html( $details );
		} else {
			$details = __( 'No event details.', 'eventkoi-lite' );
		}

		return apply_filters( 'eventkoi_rendered_event_details', $details, self::$event_id, self::$event );
	}

	/**
	 * Rendered event excerpt.
	 *
	 * Deliberately the hand-written post excerpt only, with no fallback to the
	 * description. The excerpt exists so a short summary can be shown next to,
	 * or instead of, the full details; falling back would make the two fields
	 * render the same text and defeat the point of having both.
	 *
	 * @return string
	 */
	public static function rendered_excerpt() {
		$excerpt = (string) get_post_field( 'post_excerpt', self::$event_id );
		$excerpt = trim( $excerpt );

		return apply_filters(
			'eventkoi_rendered_event_excerpt',
			'' !== $excerpt ? wp_kses_post( $excerpt ) : '',
			self::$event_id,
			self::$event
		);
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
	 * Rendered event URL.
	 *
	 * @return string Event URL.
	 */
	public static function rendered_url() {
		$url = esc_url( self::get_url() );

		return apply_filters( 'eventkoi_rendered_event_url', $url, self::$event_id, self::$event );
	}

	/**
	 * Rendered iCal URL.
	 *
	 * @return string Event iCal URL.
	 */
	public static function rendered_ical() {
		$url = esc_url( self::get_ical() );

		return apply_filters( 'eventkoi_rendered_event_ical', $url, self::$event_id, self::$event );
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

			$address   = isset( $location['address'] ) && is_array( $location['address'] ) ? $location['address'] : array();
			$name      = self::location_text_value( $location, 'name' );
			$line1     = self::first_location_text(
				self::location_text_value( $location, 'address1' ),
				self::location_text_value( $address, 'streetAddress' )
			);
			$line2     = self::location_text_value( $location, 'address2' );
			$line3     = self::location_text_value( $location, 'address3' );
			$city      = self::first_location_text(
				self::location_text_value( $location, 'city' ),
				self::location_text_value( $address, 'addressLocality' )
			);
			$state     = self::first_location_text(
				self::location_text_value( $location, 'state' ),
				self::location_text_value( $address, 'addressRegion' )
			);
			$zip       = self::first_location_text(
				self::location_text_value( $location, 'zip' ),
				self::location_text_value( $address, 'postalCode' )
			);
			$country   = self::first_location_text(
				self::location_text_value( $location, 'country' ),
				self::location_text_value( $address, 'addressCountry' )
			);
			$url       = self::get_location_virtual_url( $location );
			$link_text = self::location_text_value( $location, 'link_text' );
			$type      = self::get_location_type( $location, 'inperson' );

			$lines = array();

			if ( 'inperson' === $type ) {
				if ( ! empty( $name ) ) {
					$lines[] = '<strong>' . esc_html( $name ) . '</strong>';
				}
				if ( ! empty( $line1 ) ) {
					$lines[] = esc_html( $line1 );
				}
				if ( ! empty( $line2 ) ) {
					$lines[] = esc_html( $line2 );
				}
				if ( ! empty( $line3 ) ) {
					$lines[] = esc_html( $line3 );
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

				if ( empty( $lines ) ) {
					continue;
				}

				$class_list  = 'eventkoi-location';
				$class_list .= 'online' === $type ? ' virtual' : ' physical';

			$outputs[] = '<address class="' . esc_attr( $class_list ) . '" style="white-space:pre-line">'
			. implode( "\n", $lines ) .
				'</address>';
			}

			if ( empty( $outputs ) ) {
				return '<span class="eventkoi-no-location">' . esc_html__( 'No location available.', 'eventkoi-lite' ) . '</span>';
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
		// The same mount point the event template's map block emits; the
		// frontend script hydrates it from the current event page's data and
		// hides it when the event has no embeddable location.
		return '<div class="eventkoi-gmap"></div>';
	}

	/**
	 * Rendered timezone (only when the per-event "Display timezone in event
	 * page" toggle is enabled). Applies to all surfaces that call this:
	 * dynamic tag, shortcode, block binding, and the implicit datetime widget.
	 *
	 * @return string
	 */
	public static function rendered_timezone() {
		$settings                  = get_option( 'eventkoi_settings', array() );
		$settings                  = is_array( $settings ) ? $settings : array();
		$auto_detect_timezone      = rest_sanitize_boolean( $settings['auto_detect_timezone'] ?? false );
		$has_timezone_query_string = false;

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Frontend display preference only; sanitized immediately below.
		if ( isset( $_GET['tz'] ) ) {
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Frontend display preference only.
			$has_timezone_query_string = '' !== trim( sanitize_text_field( wp_unslash( $_GET['tz'] ) ) );
		}

		if ( ! self::get_timezone_display() && ! $auto_detect_timezone && ! $has_timezone_query_string ) {
			return '';
		}

		$timezone = wp_kses_post( self::get_timezone() );
		$output   = sprintf(
			'<span class="ek-timezone" data-source-tz="%1$s">%2$s</span>',
			esc_attr( $timezone ),
			esc_html( $timezone )
		);

		/**
		 * Filter the rendered timezone string for the event.
		 *
		 * @param string $timezone The rendered timezone string.
		 * @param int    $event_id Event ID.
		 * @param object $event    Event object.
		 */
		return apply_filters( 'eventkoi_rendered_event_timezone', $output, self::$event_id, self::$event );
	}

	/**
	 * Rendered RSVP or tickets widget based on attendance mode.
	 *
	 * @return string
	 */
	public static function rendered_ticket_rsvp() {
		$mode = self::get_attendance_mode();

		if ( 'tickets' === $mode ) {
			$event_id = self::get_id();
			if ( empty( $event_id ) ) {
				return '';
			}

			$instance_ts = function_exists( 'eventkoi_get_instance_id' )
				? absint( eventkoi_get_instance_id() )
				: 0;
			if ( 0 === $instance_ts && isset( $_GET['instance'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
				$instance_ts = absint( wp_unslash( $_GET['instance'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			}

			Scripts::enqueue_frontend_assets();

			$attrs = sprintf(
				'data-event-id="%1$d" data-instance-ts="%2$d"',
				(int) $event_id,
				(int) $instance_ts
			);

			$output = sprintf(
				'<div class="eventkoi-front"><div id="eventkoi-tickets-%1$d" class="eventkoi-tickets" %2$s></div></div>',
				(int) $event_id,
				$attrs
			);

			return apply_filters( 'eventkoi_rendered_event_tickets', $output, self::$event_id, self::$event );
		}

		if ( 'rsvp' === $mode ) {
			$output = do_shortcode( '[eventkoi_rsvp]' );
			return apply_filters( 'eventkoi_rendered_event_rsvp', $output, self::$event_id, self::$event );
		}

		if ( 'price_from' === $mode ) {
			return apply_filters( 'eventkoi_rendered_event_price_from', self::rendered_price_from_box(), self::$event_id, self::$event );
		}

		return '';
	}

	/**
	 * Format a "Price from" amount in the store currency.
	 *
	 * @param string $amount Numeric amount string.
	 * @return string
	 */
	protected static function format_price_from_amount( $amount ) {
		if ( '' === $amount || ! is_numeric( $amount ) ) {
			return '';
		}

		$value = (float) $amount;

		// A starting price of zero (or a stray negative) is not a price to show;
		// leave it blank so no "From 0" line appears.
		if ( $value <= 0 ) {
			return '';
		}

		$settings = Settings::get();
		$currency = strtoupper( (string) ( $settings['currency'] ?? 'USD' ) );

		if ( class_exists( '\NumberFormatter' ) ) {
			$formatter = new \NumberFormatter( get_locale(), \NumberFormatter::CURRENCY );
			// Show whole amounts with no decimals ("$25") but keep each currency's
			// own minor units for fractional amounts ("$25.50", "KWD 25.500"). Floor
			// so a "from" price never reads higher than the real minimum.
			if ( 0.0 === fmod( $value, 1 ) ) {
				$formatter->setAttribute( \NumberFormatter::MIN_FRACTION_DIGITS, 0 );
				$formatter->setAttribute( \NumberFormatter::MAX_FRACTION_DIGITS, 0 );
			}
			$formatter->setAttribute( \NumberFormatter::ROUNDING_MODE, \NumberFormatter::ROUND_FLOOR );
			$formatted = $formatter->formatCurrency( $value, $currency );
			if ( false !== $formatted ) {
				return $formatted;
			}
		}

		$symbols  = array(
			'USD' => '$',
			'EUR' => '€',
			'GBP' => '£',
			'JPY' => '¥',
			'AUD' => 'A$',
			'CAD' => 'C$',
			'CHF' => 'CHF ',
			'SEK' => 'kr ',
			'NOK' => 'kr ',
			'DKK' => 'kr ',
		);
		$symbol   = $symbols[ $currency ] ?? $currency . ' ';
		$decimals = fmod( $value, 1 ) ? 2 : 0;

		return $symbol . number_format_i18n( $value, $decimals );
	}

	/**
	 * "Price from" formatted string, e.g. "From $25".
	 *
	 * @return string
	 */
	public static function rendered_price_from() {
		$formatted = self::format_price_from_amount( self::get_price_from_amount() );
		if ( '' === $formatted ) {
			return '';
		}

		/* translators: %s: formatted starting price. */
		return sprintf( __( 'From %s', 'eventkoi-lite' ), $formatted );
	}

	/**
	 * "Price from" external ticket site URL.
	 *
	 * @return string
	 */
	public static function rendered_price_from_url() {
		return esc_url( self::get_price_from_url() );
	}

	/**
	 * "Price from" details text.
	 *
	 * @return string
	 */
	public static function rendered_price_from_details() {
		$details = self::get_price_from_details();

		if ( '' === trim( $details ) ) {
			return '';
		}

		// Rich-text value: opt out of the frontend Tailwind preflight (which strips
		// list markers) via `no-eventkoi`, mirroring the rich-text description.
		return sprintf(
			'<div class="eventkoi-richtext no-eventkoi">%s</div>',
			wp_kses_post( $details )
		);
	}

	/**
	 * Server-rendered "Price from" box for the event page tickets slot.
	 *
	 * Reuses the ticket widget's utility classes so it inherits the exact
	 * styling of the React tickets box without loading that bundle.
	 *
	 * @return string
	 */
	protected static function rendered_price_from_box() {
		$price_line = self::rendered_price_from();
		$url        = self::get_price_from_url();
		$details    = self::get_price_from_details();

		if ( '' === $price_line && '' === $url && '' === $details ) {
			return '';
		}

		Scripts::enqueue_frontend_assets();

		$parts   = array();
		$parts[] = '<div class="flex items-center justify-between gap-4">';
		$parts[] = '<div class="text-base font-semibold uppercase tracking-normal text-foreground">' . esc_html__( 'Tickets', 'eventkoi-lite' ) . '</div>';
		if ( '' !== $price_line ) {
			$parts[] = '<div class="text-3xl font-semibold leading-none text-foreground tabular-nums">' . esc_html( $price_line ) . '</div>';
		}
		$parts[] = '</div>';

		if ( '' !== trim( $details ) ) {
			$parts[] = '<div class="eventkoi-richtext no-eventkoi text-base text-muted-foreground">' . wp_kses_post( $details ) . '</div>';
		}

		if ( '' !== $url ) {
			$parts[] = sprintf(
				'<a class="inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-primary text-base font-semibold text-primary-foreground no-underline transition-colors hover:bg-primary/90" href="%1$s" target="_blank" rel="noopener noreferrer">%2$s</a>',
				esc_url( $url ),
				esc_html__( 'Get tickets', 'eventkoi-lite' )
			);
		}

		return '<div class="eventkoi-front"><div class="eventkoi-price-from"><div class="eventkoi-tickets__widget w-full max-w-[450px] rounded-[10px] border p-6" style="background-color:#f3f3f3;border-color:#eeeeee"><div class="flex flex-col gap-6">'
			. implode( '', $parts )
			. '</div></div></div></div>';
	}

	/**
	 * Resolve the recurrence rule and display window for a concrete instance.
	 *
	 * @param int $instance_ts Instance start timestamp.
	 * @return array{rule:array|null,end_ts:int|null,all_day:bool}|null
	 */
	private static function resolve_recurring_instance_context( $instance_ts ) {
		$instance_ts = (int) $instance_ts;
		if ( $instance_ts <= 0 ) {
			return null;
		}

		$rules = self::get_recurrence_rules();
		if ( empty( $rules ) || ! is_array( $rules ) ) {
			return self::get_loop_instance_context( $instance_ts );
		}

		$timezone_string = self::get_timezone();
		$timezone_string = $timezone_string ? $timezone_string : wp_timezone_string();
		$timezone_string = $timezone_string ? $timezone_string : 'UTC';
		try {
			$timezone = new \DateTimeZone( $timezone_string );
		} catch ( \Exception $e ) {
			$timezone = new \DateTimeZone( 'UTC' );
		}

		$fallback = null;
		foreach ( $rules as $rule ) {
			if ( empty( $rule['start_date'] ) || empty( $rule['frequency'] ) ) {
				continue;
			}

			$context = self::build_recurring_instance_context_from_rule( $rule, $instance_ts );
			if ( null === $context ) {
				continue;
			}

			if ( null === $fallback ) {
				$fallback = $context;
			}

			if ( self::recurring_rule_contains_instance( $rule, $instance_ts, $timezone ) ) {
				return $context;
			}
		}

		$loop_context = self::get_loop_instance_context( $instance_ts );
		if ( null !== $loop_context ) {
			return $loop_context;
		}

		return $fallback;
	}

	/**
	 * Build a display context for one recurrence rule at a concrete instance.
	 *
	 * @param array $rule Recurrence rule.
	 * @param int   $instance_ts Instance start timestamp.
	 * @return array{rule:array,end_ts:int|null,all_day:bool}|null
	 */
	private static function build_recurring_instance_context_from_rule( $rule, $instance_ts ) {
		if ( empty( $rule['start_date'] ) ) {
			return null;
		}

		try {
			$rule_start = new \DateTimeImmutable( (string) $rule['start_date'], new \DateTimeZone( 'UTC' ) );
			$rule_end   = ! empty( $rule['end_date'] )
				? new \DateTimeImmutable( (string) $rule['end_date'], new \DateTimeZone( 'UTC' ) )
				: null;
		} catch ( \Exception $e ) {
			return null;
		}

		$duration = null;
		if ( $rule_end instanceof \DateTimeImmutable && $rule_end->getTimestamp() > $rule_start->getTimestamp() ) {
			$duration = $rule_end->getTimestamp() - $rule_start->getTimestamp();
		}

		return array(
			'rule'    => $rule,
			'end_ts'  => null !== $duration ? ( (int) $instance_ts + (int) $duration ) : null,
			'all_day' => ! empty( $rule['all_day'] ),
		);
	}

	/**
	 * Resolve instance context already attached by builder loop integrations.
	 *
	 * @param int $instance_ts Instance start timestamp.
	 * @return array{rule:null,end_ts:int|null,all_day:bool}|null
	 */
	private static function get_loop_instance_context( $instance_ts ) {
		$post = get_post();
		if ( ! ( $post instanceof \WP_Post ) || empty( $post->eventkoi_instance_context ) || ! is_array( $post->eventkoi_instance_context ) ) {
			return null;
		}

		$context_start = isset( $post->eventkoi_instance_context['start'] ) ? (int) $post->eventkoi_instance_context['start'] : 0;
		if ( $context_start !== (int) $instance_ts ) {
			return null;
		}

		return array(
			'rule'    => null,
			'end_ts'  => ! empty( $post->eventkoi_instance_context['end'] ) ? (int) $post->eventkoi_instance_context['end'] : null,
			'all_day' => ! empty( $post->eventkoi_instance_context['all_day'] ),
		);
	}

	/**
	 * Determine whether a recurrence rule generates the requested instance.
	 *
	 * @param array         $rule Recurrence rule.
	 * @param int           $instance_ts Instance start timestamp.
	 * @param \DateTimeZone $timezone Event timezone.
	 * @return bool
	 */
	private static function recurring_rule_contains_instance( $rule, $instance_ts, \DateTimeZone $timezone ) {
		$options = self::build_recurring_rule_options( $rule, $timezone );
		if ( empty( $options ) ) {
			return false;
		}

		try {
			$rrule = new \EKLIB\RRule\RRule( $options );

			// Use occursAt() — the library's deterministic membership check.
			// Avoids the previous fixed-iteration loop that silently rejected
			// valid occurrences past iteration ~500 for long-running rules.
			$candidate = ( new \DateTimeImmutable( '@' . (int) $instance_ts ) )->setTimezone( $timezone );
			if ( $rrule->occursAt( $candidate ) ) {
				return true;
			}
		} catch ( \Exception $e ) {
			return false;
		}

		return false;
	}

	/**
	 * Build RRule options for a stored EventKoi recurrence rule.
	 *
	 * @param array         $rule Recurrence rule.
	 * @param \DateTimeZone $timezone Event timezone.
	 * @return array<string,mixed>|null
	 */
	private static function build_recurring_rule_options( $rule, \DateTimeZone $timezone ) {
		if ( empty( $rule['start_date'] ) || empty( $rule['frequency'] ) ) {
			return null;
		}

		$freq_map = array(
			'day'   => 'DAILY',
			'week'  => 'WEEKLY',
			'month' => 'MONTHLY',
			'year'  => 'YEARLY',
		);
		$frequency = (string) $rule['frequency'];
		if ( ! isset( $freq_map[ $frequency ] ) ) {
			return null;
		}

		try {
			$start_utc  = new \DateTimeImmutable( (string) $rule['start_date'], new \DateTimeZone( 'UTC' ) );
			$start_wall = $start_utc->setTimezone( $timezone );
		} catch ( \Exception $e ) {
			return null;
		}

		$options = array(
			'FREQ'     => $freq_map[ $frequency ],
			'DTSTART'  => $start_wall,
			'INTERVAL' => isset( $rule['every'] ) ? max( 1, absint( $rule['every'] ) ) : 1,
		);

		if ( isset( $rule['ends'] ) && 'after' === $rule['ends'] && ! empty( $rule['ends_after'] ) ) {
			$options['COUNT'] = absint( $rule['ends_after'] );
		} elseif ( isset( $rule['ends'] ) && 'on' === $rule['ends'] && ! empty( $rule['ends_on'] ) ) {
			$until = eventkoi_recurrence_until( $rule['ends_on'], $timezone );
			if ( $until ) {
				$options['UNTIL'] = $until;
			}
		}

		$weekdays = self::normalize_recurring_rule_weekdays( $rule, $start_wall );
		if ( 'week' === $frequency && ! empty( $weekdays ) ) {
			$map   = array( 'SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA' );
			$byday = array();
			foreach ( $weekdays as $weekday ) {
				if ( isset( $map[ (int) $weekday ] ) ) {
					$byday[] = $map[ (int) $weekday ];
				}
			}
			if ( ! empty( $byday ) ) {
				$options['BYDAY'] = implode( ',', $byday );
			}
		}

		if ( 'month' === $frequency && ! empty( $rule['month_day_rule'] ) ) {
			if ( 'day-of-month' === $rule['month_day_rule'] ) {
				$options['BYMONTHDAY'] = (int) $start_wall->format( 'j' );
			} elseif ( 'weekday-of-month' === $rule['month_day_rule'] ) {
				$nth              = (int) ceil( (int) $start_wall->format( 'j' ) / 7 );
				$weekday_map      = array(
					'Sun' => 'SU',
					'Mon' => 'MO',
					'Tue' => 'TU',
					'Wed' => 'WE',
					'Thu' => 'TH',
					'Fri' => 'FR',
					'Sat' => 'SA',
				);
				$weekday          = $weekday_map[ $start_wall->format( 'D' ) ] ?? 'MO';
				$options['BYDAY'] = $nth . $weekday;
			}
		}

		if ( 'year' === $frequency && ! empty( $rule['months'] ) && is_array( $rule['months'] ) ) {
			$options['BYMONTH'] = array_map(
				static function ( $month ) {
					return (int) $month + 1;
				},
				$rule['months']
			);
		}

		return $options;
	}

	/**
	 * Normalize stored weekly day values for RRule.
	 *
	 * @param array              $rule Recurrence rule.
	 * @param \DateTimeImmutable $start_wall Rule start in event timezone.
	 * @return array<int>
	 */
	private static function normalize_recurring_rule_weekdays( $rule, $start_wall ) {
		$weekdays = array();
		if ( ! empty( $rule['weekdays'] ) && is_array( $rule['weekdays'] ) ) {
			foreach ( $rule['weekdays'] as $weekday ) {
				if ( is_string( $weekday ) && preg_match( '/^(SU|MO|TU|WE|TH|FR|SA)$/i', trim( $weekday ) ) ) {
					$map        = array(
						'SU' => 0,
						'MO' => 1,
						'TU' => 2,
						'WE' => 3,
						'TH' => 4,
						'FR' => 5,
						'SA' => 6,
					);
					$weekdays[] = $map[ strtoupper( trim( $weekday ) ) ];
					continue;
				}

				$value = (int) $weekday;
				if ( $value >= 0 && $value <= 6 ) {
					$weekdays[] = $value;
				}
			}
		}

		if ( 'week' !== ( $rule['frequency'] ?? '' ) || 1 !== count( $weekdays ) ) {
			return array_values( array_unique( $weekdays ) );
		}

		if ( $start_wall instanceof \DateTimeInterface ) {
			return array( (int) $start_wall->format( 'w' ) );
		}

		return array_values( array_unique( $weekdays ) );
	}

	/**
	 * Rendered event datetime (start–end formatted, respects all_day). Includes recurrence rule summary.
	 *
	 * @return string
	 */
	public static function rendered_datetime_with_summary() {
		$type        = self::get_date_type();
		$instance_ts = eventkoi_get_instance_id();
		$event_tz    = self::get_timezone();

		if ( self::get_tbc() ) {
			$tbc_note = self::get_tbc_note();

			$message = ! empty( $tbc_note )
			? esc_html( $tbc_note )
			: esc_html__( 'Date and time to be confirmed.', 'eventkoi-lite' );

			return apply_filters( 'eventkoi_rendered_event_datetime', $message, self::$event_id, self::$event );
		}

		// Render specific instance from ?instance=timestamp.
		if ( $instance_ts && 'recurring' === $type ) {
			$instance_context = self::resolve_recurring_instance_context( $instance_ts );

			if ( $instance_context ) {
				$rule       = $instance_context['rule'];
				$end_ts     = $instance_context['end_ts'];
				$is_all_day = (bool) $instance_context['all_day'];
				$args       = array( 'timezone' => self::get_display_timezone() );
				if ( $is_all_day ) {
					$args['timezone'] = self::get_all_day_datetime_timezone(
						$event_tz,
						self::get_all_day_occurrence_range( $instance_ts, $end_ts, is_array( $rule ) ? $rule : array() )
					);
				}
				$line = eventkoi_format_datetime_range( $instance_ts, $end_ts, $is_all_day, $args );

				$summary = is_array( $rule ) ? self::render_rule_summary_single( $rule, $instance_ts ) : '';
				if ( ! empty( $summary ) ) {
					$line .= '<br><span class="eventkoi-rule-summary">' . esc_html( $summary ) . '</span>';
				}

				$line = self::wrap_datetime_with_data( $line, $instance_ts, $end_ts, $event_tz, $is_all_day );

				return apply_filters(
					'eventkoi_rendered_event_datetime_with_summary',
					wp_kses_post( $line ),
					self::$event_id,
					self::$event
				);
			}
		}

		// Fallback: full set of standard dates or recurring rules. The "with
		// summary" field always lists the full schedule, so ignore the query-loop
		// per-card selected-day context that anchors single-date fields to the
		// upcoming day. A real ?event_day request on a single event page still
		// scopes the result.
		$data = ( 'recurring' === $type ) ? self::get_recurrence_rules() : self::get_event_days_for_rendering( true );

		// Standard + continuous events read directly from start_date/end_date meta
		// and don't require event_days to be populated. Only short-circuit when
		// the data set is empty AND we aren't in the continuous branch below.
		$is_continuous = ( 'standard' === $type && 'continuous' === self::get_standard_type() );
		if ( ! $is_continuous && ( empty( $data ) || ! is_array( $data ) ) ) {
			return '';
		}

		$outputs = array();

		// Handle continuous standard events using event start/end meta.
		if ( $is_continuous ) {
			$start_date = self::get_start_date(); // Already stored in UTC.
			$end_date   = self::get_end_date();

			$start_ts   = $start_date ? strtotime( $start_date ) : null;
			$end_ts     = $end_date ? strtotime( $end_date ) : null;
			// Authoritative source: event_days[0].all_day. Fall back to legacy top-level
			// meta only when the day item has no explicit flag (undefined, not just false).
			$days       = self::get_event_days();
			$first_day  = ! empty( $days ) && is_array( $days ) ? $days[0] : array();
			$is_all_day = array_key_exists( 'all_day', (array) $first_day )
				? (bool) $first_day['all_day']
				: self::normalize_boolean_meta( get_post_meta( self::$event_id, 'all_day', true ) );

			if ( $start_ts ) {
				$args = array( 'timezone' => self::get_display_timezone() );
				if ( $is_all_day ) {
					$args['timezone'] = self::get_all_day_datetime_timezone( $event_tz, $first_day );
				}
				$line      = eventkoi_format_datetime_range( $start_ts, $end_ts, $is_all_day, $args );
				$outputs[] = self::wrap_datetime_with_data( $line, $start_ts, $end_ts, $event_tz, $is_all_day );
			}
		} else {
			// Per-day / per-rule rendering.
			foreach ( $data as $item ) {
				if ( empty( $item['start_date'] ) ) {
					continue;
				}

				$start_ts   = strtotime( $item['start_date'] );
				$end_ts     = ! empty( $item['end_date'] ) ? strtotime( $item['end_date'] ) : null;
				$is_all_day = ! empty( $item['all_day'] );

					$args = array( 'timezone' => self::get_display_timezone() );
					if ( $is_all_day ) {
						$args['timezone'] = self::get_all_day_datetime_timezone( $event_tz, $item );
					}

				$line = eventkoi_format_datetime_range( $start_ts, $end_ts, $is_all_day, $args );

				if ( 'recurring' === $type ) {
					$summary = self::render_rule_summary_single( $item );
					if ( ! empty( $summary ) ) {
						$line .= '<br><span class="eventkoi-rule-summary">' . esc_html( $summary ) . '</span>';
					}
				}

				$outputs[] = self::wrap_datetime_with_data( $line, $start_ts, $end_ts, $event_tz, $is_all_day );
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
	 * Rendered event date (date only — no times, regardless of all_day).
	 *
	 * Use as the `event_date` dynamic token / block binding when you only want
	 * the date portion of the event's first instance.
	 *
	 * @return string
	 */
	public static function rendered_date() {
		$instance_ts = eventkoi_get_instance_id();
		$type        = self::get_date_type();

		// Instance-aware render for a specific recurring occurrence.
		if ( $instance_ts && 'recurring' === $type ) {
			$instance_context = self::resolve_recurring_instance_context( $instance_ts );
			if ( $instance_context ) {
				$end_ts = $instance_context['end_ts'];
				$args   = array();
				if ( ! empty( $instance_context['all_day'] ) ) {
					$args['timezone'] = self::get_all_day_datetime_timezone(
						self::get_timezone(),
						self::get_all_day_occurrence_range(
							$instance_ts,
							$end_ts,
							is_array( $instance_context['rule'] ?? null ) ? $instance_context['rule'] : array()
						)
					);
				}

				$output = eventkoi_format_datetime_range( $instance_ts, $end_ts, true, $args );

				return apply_filters(
					'eventkoi_rendered_event_date',
					$output,
					self::$event_id,
					self::$event
				);
			}
		}

		$first = self::get_first_instance();

		$start_ts = ! empty( $first['start_date'] ) ? strtotime( $first['start_date'] ) : null;
		$end_ts   = ! empty( $first['end_date'] ) ? strtotime( $first['end_date'] ) : null;

		if ( ! $start_ts ) {
			return '';
		}

		if ( $end_ts && $end_ts < $start_ts ) {
			$end_ts = null;
		}

		// Force all-day format: date(s) only, no times.
		$args = array();
		if ( 'recurring' !== $type && ! empty( $first['all_day'] ) ) {
			$args['timezone'] = self::get_all_day_datetime_timezone( self::get_timezone(), $first );
		}

		$output = eventkoi_format_datetime_range( $start_ts, $end_ts, true, $args );

		return apply_filters(
			'eventkoi_rendered_event_date',
			$output,
			self::$event_id,
			self::$event
		);
	}

	/**
	 * Rendered event time (time only — start, or start – end if same day).
	 *
	 * Returns an empty string for all-day events.
	 *
	 * @return string
	 */
	public static function rendered_time() {
		$instance_ts = eventkoi_get_instance_id();
		$type        = self::get_date_type();
		$time_format = eventkoi_resolved_time_format();

		// Instance-aware render for a specific recurring occurrence.
		if ( $instance_ts && 'recurring' === $type ) {
			$instance_context = self::resolve_recurring_instance_context( $instance_ts );
			if ( $instance_context ) {
				if ( ! empty( $instance_context['all_day'] ) ) {
					return apply_filters( 'eventkoi_rendered_event_time', '', self::$event_id, self::$event );
				}

				$end_ts = $instance_context['end_ts'];

				$start_str = wp_date( $time_format, $instance_ts );
				$same_day  = $end_ts && wp_date( 'Y-m-d', $instance_ts ) === wp_date( 'Y-m-d', $end_ts );
				$output    = $end_ts && $same_day
					? $start_str . ' — ' . wp_date( $time_format, $end_ts )
					: $start_str;

				return apply_filters(
					'eventkoi_rendered_event_time',
					$output,
					self::$event_id,
					self::$event
				);
			}
		}

		$first = self::get_first_instance();

		if ( ! empty( $first['all_day'] ) ) {
			return apply_filters( 'eventkoi_rendered_event_time', '', self::$event_id, self::$event );
		}

		$start_ts = ! empty( $first['start_date'] ) ? strtotime( $first['start_date'] ) : null;
		$end_ts   = ! empty( $first['end_date'] ) ? strtotime( $first['end_date'] ) : null;

		if ( ! $start_ts ) {
			return apply_filters( 'eventkoi_rendered_event_time', '', self::$event_id, self::$event );
		}

		if ( $end_ts && $end_ts < $start_ts ) {
			$end_ts = null;
		}

		$start_str = wp_date( $time_format, $start_ts );

		$same_day = $end_ts && wp_date( 'Y-m-d', $start_ts ) === wp_date( 'Y-m-d', $end_ts );
		if ( $end_ts && $same_day ) {
			$output = $start_str . ' — ' . wp_date( $time_format, $end_ts );
		} else {
			$output = $start_str;
		}

		return apply_filters(
			'eventkoi_rendered_event_time',
			$output,
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
		$type        = self::get_date_type();
		$event_tz    = self::get_timezone();
		$instance_ts = eventkoi_get_instance_id();

		if ( self::get_tbc() ) {
			$tbc_note = self::get_tbc_note();

			$message = ! empty( $tbc_note )
			? esc_html( $tbc_note )
			: esc_html__( 'Date and time to be confirmed.', 'eventkoi-lite' );

			return apply_filters( 'eventkoi_rendered_event_datetime', $message, self::$event_id, self::$event );
		}

		// Instance-aware render for a specific recurring occurrence (e.g. /event/slug/1778058000/
		// or ?instance=1778058000 on any page that invokes the shortcode or dynamic tag).
		if ( $instance_ts && 'recurring' === $type ) {
			$instance_context = self::resolve_recurring_instance_context( $instance_ts );
			if ( $instance_context ) {
				$end_ts     = $instance_context['end_ts'];
				$is_all_day = (bool) $instance_context['all_day'];
				$args       = array( 'timezone' => self::get_display_timezone() );
				if ( $is_all_day ) {
					$args['timezone'] = self::get_all_day_datetime_timezone(
						$event_tz,
						self::get_all_day_occurrence_range(
							$instance_ts,
							$end_ts,
							is_array( $instance_context['rule'] ?? null ) ? $instance_context['rule'] : array()
						)
					);
				}
				$line = eventkoi_format_datetime_range( $instance_ts, $end_ts, $is_all_day, $args );
				$line = self::wrap_datetime_with_data( $line, $instance_ts, $end_ts, $event_tz, $is_all_day );

				return apply_filters(
					'eventkoi_rendered_event_datetime',
					wp_kses_post( $line ),
					self::$event_id,
					self::$event
				);
			}
		}

		if ( 'recurring' === $type ) {
			$data = self::get_recurrence_rules();
		} else {
			$data = self::get_event_days_for_rendering();
		}

		// Fall back to post-meta start/end when get_event_days returns a
		// placeholder row with empty fields (some standard events). Without
		// this, the dynamic token / block binding renders empty even though
		// start_date is set in post meta.
		if ( ! is_array( $data ) || empty( array_filter( $data, static function ( $row ) {
			return is_array( $row ) && ! empty( $row['start_date'] );
		} ) ) ) {
			$first = self::get_first_instance();
			if ( ! empty( $first['start_date'] ) ) {
				$data = array( $first );
			} else {
				return '';
			}
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

			$args = array( 'timezone' => self::get_display_timezone() );
			if ( $is_all_day ) {
				$args['timezone'] = self::get_all_day_datetime_timezone( $event_tz, $item );
			}

			$line      = eventkoi_format_datetime_range( $start_ts, $end_ts, $is_all_day, $args );
			$outputs[] = self::wrap_datetime_with_data( $line, $start_ts, $end_ts, $event_tz, $is_all_day );
		}

		return apply_filters(
			'eventkoi_rendered_event_datetime',
			wp_kses_post( implode( '<br>', $outputs ) ),
			self::$event_id,
			self::$event
		);
	}

	/**
	 * Wrap datetime markup with data attributes for client-side timezone conversion.
	 *
	 * @param string $line Rendered HTML string.
	 * @param int    $start_ts Start timestamp.
	 * @param int    $end_ts End timestamp.
	 * @param string $timezone Timezone string.
	 * @param bool   $is_all_day Whether the event is all-day.
	 * @return string
	 */
	protected static function wrap_datetime_with_data( $line, $start_ts, $end_ts, $timezone, $is_all_day = false ) {
		$start_dt = new \DateTime( '@' . $start_ts );
		$start_dt->setTimezone( new \DateTimeZone( 'UTC' ) );
		$start_iso = $start_dt->format( \DateTime::ATOM );

		$end_attr = '';
		if ( ! empty( $end_ts ) ) {
			$end_dt = new \DateTime( '@' . $end_ts );
			$end_dt->setTimezone( new \DateTimeZone( 'UTC' ) );
			$end_attr = ' data-end="' . esc_attr( $end_dt->format( \DateTime::ATOM ) ) . '"';
		}

		$all_day_attr = $is_all_day ? ' data-all-day="1"' : '';
		if ( $is_all_day ) {
			$all_day_timezone = self::get_all_day_datetime_timezone(
				$timezone,
				array(
					'start_date' => gmdate( 'Y-m-d\TH:i:s\Z', (int) $start_ts ),
					'end_date'   => ! empty( $end_ts ) ? gmdate( 'Y-m-d\TH:i:s\Z', (int) $end_ts ) : '',
				)
			);
			$start_day        = ( new \DateTimeImmutable( '@' . (int) $start_ts ) )->setTimezone( $all_day_timezone );
			$end_day          = ! empty( $end_ts )
				? ( new \DateTimeImmutable( '@' . (int) $end_ts ) )->setTimezone( $all_day_timezone )
				: $start_day;

			if ( ! $end_day || $end_day < $start_day || eventkoi_is_single_all_day_span( $start_ts, $end_ts ) ) {
				$end_day = $start_day;
			}

			$all_day_attr .= sprintf(
				' data-all-day-start-date="%1$s" data-all-day-end-date="%2$s" data-all-day-tz="%3$s"',
				esc_attr( $start_day->format( 'Y-m-d' ) ),
				esc_attr( $end_day->format( 'Y-m-d' ) ),
				esc_attr( $all_day_timezone->getName() )
			);
		}

		return sprintf(
			'<span class="ek-datetime" data-start="%1$s"%2$s data-tz="%3$s"%4$s>%5$s</span>',
			esc_attr( $start_iso ),
			$end_attr,
			esc_attr( $timezone ),
			$all_day_attr,
			$line
		);
	}

	/**
	 * Resolve the source timezone for all-day date-only client attributes.
	 *
	 * @param string $fallback Fallback timezone string.
	 * @return \DateTimeZone
	 */
	protected static function get_all_day_datetime_timezone( $fallback, $range = array() ) {
		$start_raw = is_array( $range ) ? ( $range['start_date'] ?? '' ) : '';
		$end_raw   = is_array( $range ) ? ( $range['end_date'] ?? '' ) : '';
		$stored    = (string) get_post_meta( self::$event_id, 'timezone', true );
		$inferred  = is_array( $range ) && function_exists( 'eventkoi_infer_all_day_timezone_from_utc_range' )
			? eventkoi_infer_all_day_timezone_from_utc_range( $start_raw, $end_raw )
			: '';

		$candidates = array(
			is_array( $range ) ? (string) ( $range['all_day_timezone'] ?? '' ) : '',
			function_exists( 'eventkoi_all_day_timezone_should_prefer_stored' ) && eventkoi_all_day_timezone_should_prefer_stored( $stored, $inferred, $start_raw, $end_raw ) ? $stored : '',
			$inferred,
			$stored,
			(string) $fallback,
		);

		foreach ( $candidates as $candidate ) {
			if ( '' === trim( $candidate ) ) {
				continue;
			}

			try {
				return new \DateTimeZone( eventkoi_php_timezone( $candidate ) );
			} catch ( \Exception $e ) {
				continue;
			}
		}

		return self::get_display_timezone();
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
	 * Fetch active tickets for the current event, cached per-request.
	 *
	 * @return array<int,object> Array of ticket rows ordered by sort_order.
	 */
	protected static function get_active_tickets() {
		static $cache = array();

		$event_id = (int) self::$event_id;
		if ( $event_id <= 0 ) {
			return array();
		}

		if ( isset( $cache[ $event_id ] ) ) {
			return $cache[ $event_id ];
		}

		global $wpdb;
		$table = $wpdb->prefix . 'eventkoi_tickets';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, name, price, currency, quantity_available, quantity_sold, sale_start, sale_end, sort_order FROM {$table} WHERE event_id = %d AND status = %s ORDER BY sort_order ASC, id ASC", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$event_id,
				'active'
			)
		);

		$cache[ $event_id ] = is_array( $rows ) ? $rows : array();
		return $cache[ $event_id ];
	}

	/**
	 * Compute capacity / sold / held / remaining for the current event.
	 *
	 * Mirrors the logic used by the public-tickets API so the event-level
	 * tokens stay consistent with the checkout widget's numbers.
	 *
	 * @return array{capacity: int|null, sold: int, held: int, remaining: int|null}
	 */
	protected static function get_capacity_snapshot() {
		static $cache = array();

		$event_id = (int) self::$event_id;
		if ( $event_id <= 0 ) {
			return array(
				'capacity'  => null,
				'sold'      => 0,
				'held'      => 0,
				'remaining' => null,
			);
		}

		if ( isset( $cache[ $event_id ] ) ) {
			return $cache[ $event_id ];
		}

		$tickets = self::get_active_tickets();

		if ( empty( $tickets ) ) {
			$cache[ $event_id ] = array(
				'capacity'  => null,
				'sold'      => 0,
				'held'      => 0,
				'remaining' => null,
			);
			return $cache[ $event_id ];
		}

		global $wpdb;
		$orders_table = $wpdb->prefix . 'eventkoi_ticket_orders';

		// Remote ticket sales (authoritative sold counts per ticket).
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$sales_rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT ticket_id, SUM(quantity) AS qty FROM {$orders_table} WHERE event_id = %d AND payment_status IN ('complete','completed','succeeded','partially_refunded') GROUP BY ticket_id", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$event_id
			)
		);

		$remote_sales = array();
		if ( $sales_rows ) {
			foreach ( $sales_rows as $row ) {
				$tid = absint( $row->ticket_id ?? 0 );
				if ( $tid > 0 ) {
					$remote_sales[ $tid ] = absint( $row->qty ?? 0 );
				}
			}
		}

		// Held quantity per ticket (holds expire after 15 minutes server-side).
		$hold_duration = defined( '\\EventKoi\\API\\Tickets::HOLD_DURATION' )
			? (int) constant( '\\EventKoi\\API\\Tickets::HOLD_DURATION' )
			: 15 * MINUTE_IN_SECONDS;
		$hold_threshold = gmdate( 'Y-m-d H:i:s', time() - $hold_duration );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$hold_rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT ticket_id, COALESCE(SUM(quantity),0) AS qty FROM {$orders_table} WHERE event_id = %d AND payment_status = 'hold' AND created_at > %s GROUP BY ticket_id", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$event_id,
				$hold_threshold
			)
		);

		$held_per_ticket = array();
		if ( $hold_rows ) {
			foreach ( $hold_rows as $row ) {
				$tid = absint( $row->ticket_id ?? 0 );
				if ( $tid > 0 ) {
					$held_per_ticket[ $tid ] = absint( $row->qty ?? 0 );
				}
			}
		}

		$capacity  = 0;
		$sold      = 0;
		$held      = 0;
		$unlimited = false;

		foreach ( $tickets as $ticket ) {
			$tid = (int) $ticket->id;

			if ( null === $ticket->quantity_available || '' === $ticket->quantity_available ) {
				$unlimited = true;
			} else {
				$capacity += absint( $ticket->quantity_available );
			}

			$local_sold  = absint( $ticket->quantity_sold );
			$remote_sold = isset( $remote_sales[ $tid ] ) ? $remote_sales[ $tid ] : 0;
			$sold       += max( $local_sold, $remote_sold );

			$held += isset( $held_per_ticket[ $tid ] ) ? $held_per_ticket[ $tid ] : 0;
		}

		$remaining = null;
		if ( ! $unlimited ) {
			$remaining = max( $capacity - $sold - $held, 0 );
		}

		$cache[ $event_id ] = array(
			'capacity'  => $unlimited ? null : $capacity,
			'sold'      => $sold,
			'held'      => $held,
			'remaining' => $remaining,
		);

		return $cache[ $event_id ];
	}

	/**
	 * Whether a ticket row is currently on sale based on sale_start / sale_end.
	 *
	 * @param object $ticket Ticket row.
	 * @return bool
	 */
	protected static function is_ticket_on_sale( $ticket ) {
		if ( ! is_object( $ticket ) ) {
			return false;
		}
		$now           = time();
		$sale_start_ts = ! empty( $ticket->sale_start ) ? strtotime( $ticket->sale_start . ' UTC' ) : 0;
		$sale_end_ts   = ! empty( $ticket->sale_end ) ? strtotime( $ticket->sale_end . ' UTC' ) : 0;

		if ( $sale_start_ts && $now < $sale_start_ts ) {
			return false;
		}
		if ( $sale_end_ts && $now > $sale_end_ts ) {
			return false;
		}
		return true;
	}

	/**
	 * Rendered total ticket capacity across all active tickets.
	 *
	 * Returns empty string when any ticket is unlimited.
	 *
	 * @return string
	 */
	public static function rendered_capacity() {
		$snap   = self::get_capacity_snapshot();
		$output = null === $snap['capacity'] ? '' : (string) $snap['capacity'];
		return apply_filters( 'eventkoi_rendered_event_capacity', $output, self::$event_id, self::$event );
	}

	/**
	 * Rendered remaining capacity (capacity - sold - held, floor 0).
	 *
	 * @return string
	 */
	public static function rendered_capacity_remaining() {
		$snap   = self::get_capacity_snapshot();
		$output = null === $snap['remaining'] ? '' : (string) $snap['remaining'];
		return apply_filters( 'eventkoi_rendered_event_capacity_remaining', $output, self::$event_id, self::$event );
	}

	/**
	 * Rendered sold capacity across all active tickets.
	 *
	 * @return string
	 */
	public static function rendered_capacity_sold() {
		$snap   = self::get_capacity_snapshot();
		$output = (string) $snap['sold'];
		return apply_filters( 'eventkoi_rendered_event_capacity_sold', $output, self::$event_id, self::$event );
	}

	/**
	 * Rendered "Sold out" label when the event is sold out, otherwise empty.
	 *
	 * @return string
	 */
	public static function rendered_sold_out() {
		$snap    = self::get_capacity_snapshot();
		$is_full = null !== $snap['capacity'] && $snap['capacity'] > 0 && 0 === $snap['remaining'];
		$label   = $is_full ? __( 'Sold out', 'eventkoi-lite' ) : '';
		return apply_filters( 'eventkoi_rendered_event_sold_out', $label, self::$event_id, self::$event );
	}

	/**
	 * Rendered "Low stock" label when remaining stock is at or below the threshold.
	 *
	 * Threshold defaults to 10% of capacity, with a minimum of 5.
	 *
	 * @return string
	 */
	public static function rendered_low_stock() {
		$snap = self::get_capacity_snapshot();

		if ( null === $snap['capacity'] || $snap['capacity'] <= 0 || null === $snap['remaining'] ) {
			return apply_filters( 'eventkoi_rendered_event_low_stock', '', self::$event_id, self::$event );
		}

		$default_threshold = max( 5, (int) ceil( $snap['capacity'] * 0.1 ) );
		/**
		 * Override the "low stock" threshold.
		 *
		 * @param int $threshold Default computed threshold.
		 * @param int $event_id  Event ID.
		 * @param int $capacity  Total capacity.
		 */
		$threshold = (int) apply_filters( 'eventkoi_low_stock_threshold', $default_threshold, self::$event_id, $snap['capacity'] );

		$is_low = $snap['remaining'] > 0 && $snap['remaining'] <= $threshold;
		$label  = $is_low ? __( 'Low stock', 'eventkoi-lite' ) : '';

		return apply_filters( 'eventkoi_rendered_event_low_stock', $label, self::$event_id, self::$event );
	}

	/**
	 * Rendered number of active ticket types for the event.
	 *
	 * @return string
	 */
	public static function rendered_ticket_count() {
		$tickets = self::get_active_tickets();
		$output  = (string) count( $tickets );
		return apply_filters( 'eventkoi_rendered_event_ticket_count', $output, self::$event_id, self::$event );
	}

	/**
	 * Rendered comma-separated list of active ticket names in sort order.
	 *
	 * @return string
	 */
	public static function rendered_ticket_summary() {
		$tickets = self::get_active_tickets();
		$names   = array();
		foreach ( $tickets as $ticket ) {
			$name = isset( $ticket->name ) ? trim( (string) $ticket->name ) : '';
			if ( '' !== $name ) {
				$names[] = $name;
			}
		}
		$output = implode( ', ', $names );
		return apply_filters( 'eventkoi_rendered_event_ticket_summary', $output, self::$event_id, self::$event );
	}

	/**
	 * Rendered earliest sale_start timestamp across active tickets.
	 *
	 * @return string
	 */
	public static function rendered_sales_start() {
		$tickets  = self::get_active_tickets();
		$earliest = null;
		foreach ( $tickets as $ticket ) {
			if ( empty( $ticket->sale_start ) ) {
				continue;
			}
			$ts = strtotime( $ticket->sale_start . ' UTC' );
			if ( ! $ts ) {
				continue;
			}
			if ( null === $earliest || $ts < $earliest ) {
				$earliest = $ts;
			}
		}

		$output = null === $earliest ? '' : eventkoi_format_datetime_range( $earliest, null, false );
		return apply_filters( 'eventkoi_rendered_event_sales_start', $output, self::$event_id, self::$event );
	}

	/**
	 * Rendered latest sale_end timestamp across active tickets.
	 *
	 * @return string
	 */
	public static function rendered_sales_end() {
		$tickets = self::get_active_tickets();
		$latest  = null;
		foreach ( $tickets as $ticket ) {
			if ( empty( $ticket->sale_end ) ) {
				continue;
			}
			$ts = strtotime( $ticket->sale_end . ' UTC' );
			if ( ! $ts ) {
				continue;
			}
			if ( null === $latest || $ts > $latest ) {
				$latest = $ts;
			}
		}

		$output = null === $latest ? '' : eventkoi_format_datetime_range( $latest, null, false );
		return apply_filters( 'eventkoi_rendered_event_sales_end', $output, self::$event_id, self::$event );
	}

	/**
	 * Format a price with the ticket's currency, preferring wc_price() when available.
	 *
	 * @param float  $price    Price in major units (e.g. 10.00).
	 * @param string $currency 3-letter currency code.
	 * @return string
	 */
	protected static function format_ticket_price( $price, $currency ) {
		$price    = (float) $price;
		$currency = strtoupper( trim( (string) $currency ) );
		if ( '' === $currency ) {
			$currency = 'USD';
		}

		if ( function_exists( 'wc_price' ) ) {
			return wp_strip_all_tags( wc_price( $price, array( 'currency' => $currency ) ) );
		}

		$symbol_map = array(
			'USD' => '$',
			'EUR' => '€',
			'GBP' => '£',
			'JPY' => '¥',
			'CNY' => '¥',
			'CAD' => 'C$',
			'AUD' => 'A$',
			'SGD' => 'S$',
			'INR' => '₹',
		);
		$symbol    = isset( $symbol_map[ $currency ] ) ? $symbol_map[ $currency ] : $currency . ' ';
		$formatted = number_format_i18n( $price, 2 );
		return $symbol . $formatted;
	}

	/**
	 * Compute the min / max active-ticket prices with a shared currency.
	 *
	 * @return array{min: float|null, max: float|null, currency: string}
	 */
	protected static function get_ticket_price_snapshot() {
		$tickets = self::get_active_tickets();
		$min     = null;
		$max     = null;
		$cur     = '';
		foreach ( $tickets as $ticket ) {
			if ( ! isset( $ticket->price ) ) {
				continue;
			}
			$price = (float) $ticket->price;
			if ( null === $min || $price < $min ) {
				$min = $price;
			}
			if ( null === $max || $price > $max ) {
				$max = $price;
			}
			if ( '' === $cur && ! empty( $ticket->currency ) ) {
				$cur = (string) $ticket->currency;
			}
		}
		return array(
			'min'      => $min,
			'max'      => $max,
			'currency' => $cur,
		);
	}

	/**
	 * Rendered lowest ticket price across active tickets.
	 *
	 * @return string
	 */
	public static function rendered_ticket_price_from() {
		$snap = self::get_ticket_price_snapshot();
		$out  = null === $snap['min'] ? '' : self::format_ticket_price( $snap['min'], $snap['currency'] );
		return apply_filters( 'eventkoi_rendered_event_ticket_price_from', $out, self::$event_id, self::$event );
	}

	/**
	 * Rendered highest ticket price across active tickets. Empty when all tickets share a price.
	 *
	 * @return string
	 */
	public static function rendered_ticket_price_to() {
		$snap = self::get_ticket_price_snapshot();
		if ( null === $snap['max'] || $snap['min'] === $snap['max'] ) {
			return apply_filters( 'eventkoi_rendered_event_ticket_price_to', '', self::$event_id, self::$event );
		}
		return apply_filters(
			'eventkoi_rendered_event_ticket_price_to',
			self::format_ticket_price( $snap['max'], $snap['currency'] ),
			self::$event_id,
			self::$event
		);
	}

	/**
	 * Rendered price range "$min – $max", collapsing to single value when prices are equal.
	 *
	 * @return string
	 */
	public static function rendered_ticket_price_range() {
		$snap = self::get_ticket_price_snapshot();
		if ( null === $snap['min'] ) {
			return apply_filters( 'eventkoi_rendered_event_ticket_price_range', '', self::$event_id, self::$event );
		}
		$from = self::format_ticket_price( $snap['min'], $snap['currency'] );
		if ( $snap['min'] === $snap['max'] ) {
			$out = $from;
		} else {
			$to  = self::format_ticket_price( $snap['max'], $snap['currency'] );
			$out = $from . ' – ' . $to;
		}
		return apply_filters( 'eventkoi_rendered_event_ticket_price_range', $out, self::$event_id, self::$event );
	}

	/**
	 * Resolve the effective event start timestamp, honouring the instance context
	 * so date-format tokens match the rest of the renderers under /event/slug/{ts}/.
	 *
	 * @return int|null
	 */
	protected static function get_effective_start_timestamp() {
		$instance_ts = eventkoi_get_instance_id();
		$type        = self::get_date_type();

		if ( $instance_ts && 'recurring' === $type ) {
			return (int) $instance_ts;
		}

		$first = self::get_first_instance();
		if ( ! empty( $first['start_date'] ) ) {
			$ts = strtotime( $first['start_date'] );
			if ( $ts ) {
				return (int) $ts;
			}
		}
		return null;
	}

	/**
	 * Rendered event year (YYYY).
	 *
	 * @return string
	 */
	public static function rendered_date_year() {
		$ts  = self::get_effective_start_timestamp();
		$out = $ts ? wp_date( 'Y', $ts ) : '';
		return apply_filters( 'eventkoi_rendered_event_date_year', $out, self::$event_id, self::$event );
	}

	/**
	 * Rendered event month full name ("May").
	 *
	 * @return string
	 */
	public static function rendered_date_month() {
		$ts  = self::get_effective_start_timestamp();
		$out = $ts ? wp_date( 'F', $ts ) : '';
		return apply_filters( 'eventkoi_rendered_event_date_month', $out, self::$event_id, self::$event );
	}

	/**
	 * Rendered event month short name ("May").
	 *
	 * @return string
	 */
	public static function rendered_date_month_short() {
		$ts  = self::get_effective_start_timestamp();
		$out = $ts ? wp_date( 'M', $ts ) : '';
		return apply_filters( 'eventkoi_rendered_event_date_month_short', $out, self::$event_id, self::$event );
	}

	/**
	 * Rendered event day number without leading zero ("4").
	 *
	 * @return string
	 */
	public static function rendered_date_day() {
		$ts  = self::get_effective_start_timestamp();
		$out = $ts ? wp_date( 'j', $ts ) : '';
		return apply_filters( 'eventkoi_rendered_event_date_day', $out, self::$event_id, self::$event );
	}

	/**
	 * Rendered event day name ("Monday").
	 *
	 * @return string
	 */
	public static function rendered_date_day_name() {
		$ts  = self::get_effective_start_timestamp();
		$out = $ts ? wp_date( 'l', $ts ) : '';
		return apply_filters( 'eventkoi_rendered_event_date_day_name', $out, self::$event_id, self::$event );
	}

	/**
	 * Rendered event date in ISO form ("2026-05-04").
	 *
	 * @return string
	 */
	public static function rendered_date_iso() {
		$ts  = self::get_effective_start_timestamp();
		$out = $ts ? wp_date( 'Y-m-d', $ts ) : '';
		return apply_filters( 'eventkoi_rendered_event_date_iso', $out, self::$event_id, self::$event );
	}

	/**
	 * RSVP counts/capacity snapshot. Lite has no recurring events, so this is
	 * always the event-level aggregate.
	 *
	 * @return array{capacity:int, going:int, maybe:int, remaining:int|null}
	 */
	protected static function get_rsvp_snapshot() {
		static $cache = array();

		$event_id = (int) self::$event_id;
		if ( $event_id <= 0 ) {
			return array( 'capacity' => 0, 'going' => 0, 'maybe' => 0, 'remaining' => null );
		}
		if ( isset( $cache[ $event_id ] ) ) {
			return $cache[ $event_id ];
		}

		$capacity = self::get_rsvp_capacity();

		global $wpdb;
		$table = $wpdb->prefix . 'eventkoi_rsvps';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT status, COALESCE(SUM(1 + guests),0) AS cnt FROM {$table} WHERE event_id = %d AND status IN ('going','maybe') GROUP BY status", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$event_id
			)
		);

		$going = 0;
		$maybe = 0;
		if ( $rows ) {
			foreach ( $rows as $r ) {
				if ( 'going' === $r->status ) {
					$going = absint( $r->cnt );
				} elseif ( 'maybe' === $r->status ) {
					$maybe = absint( $r->cnt );
				}
			}
		}

		$remaining = $capacity > 0 ? max( $capacity - $going, 0 ) : null;
		$cache[ $event_id ] = array(
			'capacity'  => $capacity,
			'going'     => $going,
			'maybe'     => $maybe,
			'remaining' => $remaining,
		);
		return $cache[ $event_id ];
	}

	/**
	 * Rendered RSVP capacity. Empty string when unlimited.
	 *
	 * @return string
	 */
	public static function rendered_rsvp_capacity() {
		$snap = self::get_rsvp_snapshot();
		$out  = $snap['capacity'] > 0 ? (string) $snap['capacity'] : '';
		return apply_filters( 'eventkoi_rendered_event_rsvp_capacity', $out, self::$event_id, self::$event );
	}

	/**
	 * Rendered remaining RSVP spots.
	 *
	 * @return string
	 */
	public static function rendered_rsvp_remaining() {
		$snap = self::get_rsvp_snapshot();
		$out  = null === $snap['remaining'] ? '' : (string) $snap['remaining'];
		return apply_filters( 'eventkoi_rendered_event_rsvp_remaining', $out, self::$event_id, self::$event );
	}

	/**
	 * Rendered going RSVP count.
	 *
	 * @return string
	 */
	public static function rendered_rsvp_going() {
		if ( ! self::get_rsvp_show_count() ) {
			return apply_filters( 'eventkoi_rendered_event_rsvp_going', '', self::$event_id, self::$event );
		}

		$snap = self::get_rsvp_snapshot();
		return apply_filters( 'eventkoi_rendered_event_rsvp_going', (string) $snap['going'], self::$event_id, self::$event );
	}

	/**
	 * Rendered "RSVP full" label when at capacity.
	 *
	 * @return string
	 */
	public static function rendered_rsvp_full() {
		$snap    = self::get_rsvp_snapshot();
		$is_full = $snap['capacity'] > 0 && null !== $snap['remaining'] && 0 === $snap['remaining'];
		$label   = $is_full ? __( 'RSVP full', 'eventkoi-lite' ) : '';
		return apply_filters( 'eventkoi_rendered_event_rsvp_full', $label, self::$event_id, self::$event );
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
			0 => __( 'Sunday', 'eventkoi-lite' ),
			1 => __( 'Monday', 'eventkoi-lite' ),
			2 => __( 'Tuesday', 'eventkoi-lite' ),
			3 => __( 'Wednesday', 'eventkoi-lite' ),
			4 => __( 'Thursday', 'eventkoi-lite' ),
			5 => __( 'Friday', 'eventkoi-lite' ),
			6 => __( 'Saturday', 'eventkoi-lite' ),
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
					$weekday_name = wp_date( 'l', $start->getTimestamp(), $start->getTimezone() );
					$nth          = (int) ceil( $start->format( 'j' ) / 7 );
					$nth_str      = isset( $ordinals[ $nth ] ) ? $ordinals[ $nth ] : $nth . 'th';
					$label       .= sprintf(
						/* translators: 1: ordinal week in the month, 2: weekday name. */
						__( ', on the %1$s %2$s', 'eventkoi-lite' ),
						$nth_str,
						$weekday_name
					);
				} catch ( \Exception $e ) {} // phpcs:ignore.
			}

			// 3. Details for "day-of-month"
			if (
			in_array( $frequency, array( 'month', 'year' ), true ) &&
			isset( $rule['month_day_rule'] ) && 'day-of-month' === $rule['month_day_rule']
			) {
				try {
					$start  = new \DateTimeImmutable( $start_date );
					$label .= sprintf(
						/* translators: %d: day number in the month. */
						__( ', on day %d', 'eventkoi-lite' ),
						(int) $start->format( 'j' )
					);
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
					$label .= sprintf(
						/* translators: %s: comma-separated month names. */
						__( ', in %s', 'eventkoi-lite' ),
						implode( ', ', $selected_months )
					);
				}
			}

			// 5. Weekly day names
			if ( 'week' === $frequency && ! empty( $rule['weekdays'] ) ) {
				$days = array();

				// Order the days in calendar order (from the site's first day of
				// the week) instead of the order they were selected in. Weekdays
				// are stored 0=Sunday..6=Saturday, matching WordPress's
				// start_of_week convention.
				$summary_weekdays = array_values( array_map( 'intval', (array) $rule['weekdays'] ) );
				$start_of_week    = (int) get_option( 'start_of_week', 0 );
				usort(
					$summary_weekdays,
					static function ( $a, $b ) use ( $start_of_week ) {
						return ( ( $a - $start_of_week + 7 ) % 7 ) <=> ( ( $b - $start_of_week + 7 ) % 7 );
					}
				);

				foreach ( $summary_weekdays as $i ) {
					if ( isset( $weekday_names[ $i ] ) ) {
						$days[] = $weekday_names[ $i ];
					}
				}
				if ( ! empty( $days ) ) {
					$label .= sprintf(
						/* translators: %s: comma-separated weekday names. */
						__( ', on %s', 'eventkoi-lite' ),
						implode( ', ', $days )
					);
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
						$until = eventkoi_recurrence_until( $rule['ends_on'] );
						if ( $until ) {
							$options['UNTIL'] = $until;
						}
					}
					if ( 'week' === $frequency && ! empty( $rule['weekdays'] ) ) {
						$map   = array( 'SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA' );
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
						$label .= __( ', forever', 'eventkoi-lite' );
					} elseif ( isset( $rule['ends'] ) && 'after' === $rule['ends'] ) {
						if ( 0 === $remaining ) {
							$label .= sprintf(
								/* translators: %d: total completed events. */
								_n( ', all %d event completed', ', all %d events completed', $total, 'eventkoi-lite' ),
								$total
							);
						} else {
							$label .= sprintf(
								/* translators: 1: remaining events, 2: total events. */
								_n( ', %1$d of %2$d event left', ', %1$d of %2$d events left', $remaining, 'eventkoi-lite' ),
								$remaining,
								$total
							);
						}
					} elseif ( isset( $rule['ends'] ) && 'on' === $rule['ends'] ) {
						if ( 0 === $remaining ) {
							$label .= sprintf(
								/* translators: %d: total completed events. */
								_n( ', all %d event completed', ', all %d events completed', $total, 'eventkoi-lite' ),
								$total
							);
						} else {
							$label .= sprintf(
								/* translators: 1: remaining events, 2: total events. */
								_n( ', %1$d of %2$d event left', ', %1$d of %2$d events left', $remaining, 'eventkoi-lite' ),
								$remaining,
								$total
							);
						}
					} else {
						$label .= __( ', forever', 'eventkoi-lite' );
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
						$until = eventkoi_recurrence_until( $rule['ends_on'], $tz_wp );
						if ( $until ) {
							$options['UNTIL'] = $until;
						}
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
					$map   = array( 'SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA' );
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

	/**
	 * Work out where each occurrence moved to when an event's dates changed.
	 *
	 * Occurrences are matched by ordinal within a rule, or by row order for a
	 * selected-dates event, which is what lets anything keyed to an occurrence
	 * follow it to its new time.
	 *
	 * @param string $old_date_type     Previous date type.
	 * @param string $old_standard_type Previous standard type.
	 * @param array  $old_event_days    Previous event_days rows.
	 * @param array  $old_rules         Previous recurrence rules.
	 * @param string $old_timezone      Previous timezone.
	 * @param string $new_date_type     New date type.
	 * @param string $new_standard_type New standard type.
	 * @param array  $new_event_days    New event_days rows.
	 * @param array  $new_rules         New recurrence rules.
	 * @param string $new_timezone      New timezone.
	 * @return array<int,int> Old timestamp => new timestamp.
	 */
	private static function get_instance_ts_migrations( $old_date_type, $old_standard_type, array $old_event_days, array $old_rules, $old_timezone, $new_date_type, $new_standard_type, array $new_event_days, array $new_rules, $new_timezone ) {
		$migrations = array();

		if ( 'standard' === $old_date_type && 'standard' === $new_date_type && ( 'selected' === $old_standard_type || 'selected' === $new_standard_type ) ) {
			$migrations = self::merge_instance_ts_migrations(
				$migrations,
				self::get_event_day_instance_ts_migrations( $old_event_days, $new_event_days )
			);
		}

		if ( 'recurring' === $old_date_type && 'recurring' === $new_date_type ) {
			$migrations = self::merge_instance_ts_migrations(
				$migrations,
				self::get_recurring_rule_instance_ts_migrations( $old_rules, $new_rules, $old_timezone, $new_timezone )
			);
		}

		return $migrations;
	}

	/**
	 * Pair selected event days by row order.
	 *
	 * @param array $old_event_days Previous event_days rows.
	 * @param array $new_event_days New event_days rows.
	 * @return array<int,int>
	 */
	private static function get_event_day_instance_ts_migrations( array $old_event_days, array $new_event_days ) {
		$old_starts = self::get_event_day_start_timestamps( $old_event_days );
		$new_starts = self::get_event_day_start_timestamps( $new_event_days );

		if ( empty( $old_starts ) || empty( $new_starts ) || count( $old_starts ) !== count( $new_starts ) ) {
			return array();
		}

		$migrations = array();
		foreach ( $old_starts as $index => $old_ts ) {
			$new_ts = isset( $new_starts[ $index ] ) ? (int) $new_starts[ $index ] : 0;

			if ( $old_ts <= 0 || $new_ts <= 0 || $old_ts === $new_ts ) {
				continue;
			}

			// The day still exists elsewhere in the list, so it was reordered
			// rather than moved and whatever is keyed to it should stay put.
			if ( in_array( $old_ts, $new_starts, true ) ) {
				continue;
			}

			$migrations[ $old_ts ] = $new_ts;
		}

		return $migrations;
	}

	/**
	 * Start timestamps of stored event_days rows, in row order.
	 *
	 * @param array $event_days Event day rows.
	 * @return int[]
	 */
	private static function get_event_day_start_timestamps( array $event_days ) {
		$starts = array();

		foreach ( array_values( $event_days ) as $day ) {
			if ( ! is_array( $day ) || empty( $day['start_date'] ) ) {
				continue;
			}

			$start_ts = strtotime( (string) self::normalize_utc_datetime_iso_string( $day['start_date'] ) );

			if ( $start_ts ) {
				$starts[] = (int) $start_ts;
			}
		}

		return $starts;
	}

	/**
	 * Pair recurring occurrences by rule index and ordinal.
	 *
	 * @param array  $old_rules    Previous recurrence rules.
	 * @param array  $new_rules    New recurrence rules.
	 * @param string $old_timezone Previous timezone.
	 * @param string $new_timezone New timezone.
	 * @return array<int,int>
	 */
	private static function get_recurring_rule_instance_ts_migrations( array $old_rules, array $new_rules, $old_timezone, $new_timezone ) {
		$old_rules = array_values( array_filter( $old_rules, 'is_array' ) );
		$new_rules = array_values( array_filter( $new_rules, 'is_array' ) );

		if ( empty( $old_rules ) || empty( $new_rules ) || count( $old_rules ) !== count( $new_rules ) ) {
			return array();
		}

		$migrations = array();
		foreach ( $old_rules as $index => $old_rule ) {
			// Both lists were filtered to arrays above, so presence is enough.
			$new_rule = $new_rules[ $index ] ?? array();

			if ( ! self::rules_are_instance_migration_compatible( $old_rule, $new_rule ) ) {
				continue;
			}

			$old_starts = self::get_rule_instance_starts_for_migration( $old_rule, $old_timezone );
			$new_starts = self::get_rule_instance_starts_for_migration( $new_rule, $new_timezone );
			$limit      = min( count( $old_starts ), count( $new_starts ) );

			for ( $i = 0; $i < $limit; ++$i ) {
				$old_ts = (int) $old_starts[ $i ];
				$new_ts = (int) $new_starts[ $i ];

				if ( $old_ts > 0 && $new_ts > 0 && $old_ts !== $new_ts ) {
					$migrations[ $old_ts ] = $new_ts;
				}
			}
		}

		return $migrations;
	}

	/**
	 * Whether two versions of a rule are similar enough to pair by ordinal.
	 *
	 * Deliberately strict. Anything that could change how many occurrences a
	 * rule produces, or which days they land on, makes ordinal pairing a guess,
	 * and a wrong guess would move a customisation onto the wrong date. Bailing
	 * out leaves the old behaviour for that rule, which is merely unhelpful.
	 *
	 * @param array $old_rule Previous rule.
	 * @param array $new_rule New rule.
	 * @return bool
	 */
	private static function rules_are_instance_migration_compatible( array $old_rule, array $new_rule ) {
		$old_frequency = (string) ( $old_rule['frequency'] ?? '' );
		$new_frequency = (string) ( $new_rule['frequency'] ?? '' );

		if ( '' === $old_frequency || $old_frequency !== $new_frequency ) {
			return false;
		}

		if ( max( 1, absint( $old_rule['every'] ?? 1 ) ) !== max( 1, absint( $new_rule['every'] ?? 1 ) ) ) {
			return false;
		}

		if ( ! empty( $old_rule['all_day'] ) !== ! empty( $new_rule['all_day'] ) ) {
			return false;
		}

		if ( (string) ( $old_rule['ends'] ?? 'never' ) !== (string) ( $new_rule['ends'] ?? 'never' ) ) {
			return false;
		}

		$old_weekdays = is_array( $old_rule['weekdays'] ?? null ) ? $old_rule['weekdays'] : array();
		$new_weekdays = is_array( $new_rule['weekdays'] ?? null ) ? $new_rule['weekdays'] : array();

		if ( 'week' === $old_frequency && count( $old_weekdays ) !== count( $new_weekdays ) ) {
			return false;
		}

		if ( 'month' === $old_frequency && (string) ( $old_rule['month_day_rule'] ?? 'day-of-month' ) !== (string) ( $new_rule['month_day_rule'] ?? 'day-of-month' ) ) {
			return false;
		}

		if ( 'year' === $old_frequency ) {
			$old_months = is_array( $old_rule['months'] ?? null ) ? $old_rule['months'] : array();
			$new_months = is_array( $new_rule['months'] ?? null ) ? $new_rule['months'] : array();

			if ( count( $old_months ) !== count( $new_months ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Expand a rule to occurrence start timestamps, using the same RRule path
	 * the rest of the plugin renders from.
	 *
	 * @param array  $rule           Recurrence rule.
	 * @param string $event_timezone Event timezone.
	 * @return int[]
	 */
	private static function get_rule_instance_starts_for_migration( array $rule, $event_timezone ) {
		$starts = array();

		if ( empty( $rule['start_date'] ) || empty( $rule['frequency'] ) ) {
			return $starts;
		}

		$timezone = self::get_rule_timezone_for_migration( $rule, $event_timezone );
		$limit    = max( 50, (int) apply_filters( 'eventkoi_max_recurrence_iterations', 500 ) );

		try {
			$options = self::build_recurring_rule_options( $rule, $timezone );

			if ( empty( $options ) ) {
				return array();
			}

			$rrule = new \EKLIB\RRule\RRule( $options );
			$count = 0;

			foreach ( $rrule as $occurrence ) {
				if ( $count++ >= $limit ) {
					break;
				}

				if ( $occurrence instanceof \DateTimeInterface ) {
					$starts[] = (int) $occurrence->getTimestamp();
				}
			}
		} catch ( \Exception $e ) {
			return array();
		}

		$starts = array_values( array_unique( array_filter( array_map( 'intval', $starts ) ) ) );
		sort( $starts, SORT_NUMERIC );

		return $starts;
	}

	/**
	 * Timezone a rule's occurrences are generated in.
	 *
	 * @param array  $rule           Recurrence rule.
	 * @param string $event_timezone Event timezone.
	 * @return \DateTimeZone
	 */
	private static function get_rule_timezone_for_migration( array $rule, $event_timezone ) {
		$event_timezone = (string) $event_timezone;

		if ( '' === $event_timezone ) {
			$event_timezone = self::get_timezone();
		}

		if ( ! empty( $rule['all_day'] ) ) {
			try {
				return self::get_all_day_datetime_timezone( $event_timezone, $rule );
			} catch ( \Exception $e ) {
				unset( $e );
			}
		}

		try {
			return new \DateTimeZone( eventkoi_php_timezone( $event_timezone ) );
		} catch ( \Exception $e ) {
			return new \DateTimeZone( 'UTC' );
		}
	}

	/**
	 * Merge migration maps without letting a later rule claim a slot already
	 * taken, in either direction.
	 *
	 * @param array $base  Base migrations.
	 * @param array $extra Extra migrations.
	 * @return array<int,int>
	 */
	private static function merge_instance_ts_migrations( array $base, array $extra ) {
		foreach ( $extra as $old_ts => $new_ts ) {
			$old_ts = (int) $old_ts;
			$new_ts = (int) $new_ts;

			if ( $old_ts <= 0 || $new_ts <= 0 || $old_ts === $new_ts || isset( $base[ $old_ts ] ) || in_array( $new_ts, $base, true ) ) {
				continue;
			}

			$base[ $old_ts ] = $new_ts;
		}

		return $base;
	}

	/**
	 * Move per-instance overrides onto the timestamps their occurrences now have.
	 *
	 * Overrides are keyed by the occurrence's start timestamp, so a master edit
	 * that shifts those times used to strand every customised occurrence on a
	 * timestamp that no longer existed, and the occurrence silently fell back
	 * to the master's title and description (helpdesk T9R4IMAW).
	 *
	 * Done in three passes because the moves can collide with each other: a
	 * series shifted by exactly its own interval maps each occurrence onto the
	 * slot the next one is still occupying. Rows are parked above any real epoch
	 * value first, then landed, and anything that still cannot land goes back
	 * where it started. Nothing is deleted and nothing is left parked, so the
	 * worst case is the old behaviour for that one row rather than a lost
	 * override.
	 *
	 * @param array<int,int> $migrations Old timestamp => new timestamp.
	 * @return void
	 */
	private static function migrate_recurrence_override_timestamps( array $migrations ) {
		if ( ! self::$event_id || empty( $migrations ) ) {
			return;
		}

		$pairs = array();
		foreach ( $migrations as $old_ts => $new_ts ) {
			$old_ts = (int) $old_ts;
			$new_ts = (int) $new_ts;

			if ( $old_ts <= 0 || $new_ts <= 0 || $old_ts === $new_ts ) {
				continue;
			}

			$pairs[ $old_ts ] = $new_ts;
		}

		if ( empty( $pairs ) ) {
			return;
		}

		global $wpdb;
		$table    = $wpdb->prefix . 'eventkoi_recurrence_overrides';
		$event_id = (int) self::$event_id;

		// Far above any real epoch second, and well inside BIGINT UNSIGNED.
		$parking = 1000000000000000;

		foreach ( array( 'park', 'land', 'restore' ) as $pass ) {
			foreach ( $pairs as $old_ts => $new_ts ) {
				if ( 'park' === $pass ) {
					$from = $old_ts;
					$to   = $parking + $new_ts;
				} elseif ( 'land' === $pass ) {
					$from = $parking + $new_ts;
					$to   = $new_ts;
				} else {
					$from = $parking + $new_ts;
					$to   = $old_ts;
				}

				$wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
					$wpdb->prepare(
						"UPDATE IGNORE {$table} SET timestamp = %d WHERE event_id = %d AND timestamp = %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
						$to,
						$event_id,
						$from
					)
				);
			}
		}
	}

	/**
	 * When a non-recurring event's start_timestamp changes, re-key existing
	 * RSVP rows from the old instance_ts to the new one so the attendee list
	 * does not appear empty after a date edit (PROD-449).
	 *
	 * @param int $old_ts Previous start_timestamp.
	 * @param int $new_ts New start_timestamp.
	 */
	private static function migrate_rsvp_instance_ts( $old_ts, $new_ts ) {
		$old_ts = (int) $old_ts;
		$new_ts = (int) $new_ts;

		if ( ! self::$event_id || $old_ts <= 0 || $new_ts <= 0 || $old_ts === $new_ts ) {
			return;
		}

		if ( 'recurring' === self::get_date_type() ) {
			return;
		}

		global $wpdb;
		$table = $wpdb->prefix . 'eventkoi_rsvps';
		$wpdb->update( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$table,
			array( 'instance_ts' => $new_ts ),
			array(
				'event_id'    => (int) self::$event_id,
				'instance_ts' => $old_ts,
			),
			array( '%d' ),
			array( '%d', '%d' )
		);
	}
}
