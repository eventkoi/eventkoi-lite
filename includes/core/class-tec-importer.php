<?php
/**
 * The Events Calendar (TEC) Importer.
 *
 * Imports events from The Events Calendar plugin into EventKoi.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use EventKoi\API\REST;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class TEC_Importer
 *
 * Handles importing events from The Events Calendar to EventKoi.
 */
class TEC_Importer {

	/**
	 * Constructor — registers REST routes.
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Register REST API routes for the TEC importer.
	 *
	 * @return void
	 */
	public static function register_routes() {
		register_rest_route(
			EVENTKOI_API,
			'/tec-import/detect',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'detect' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/tec-import/run',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'run_import' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);
	}

	/**
	 * Detect TEC installation and return event counts.
	 *
	 * @return WP_REST_Response
	 */
	public static function detect() {
		$active = self::is_tec_active();

		if ( ! $active ) {
			return rest_ensure_response(
				array(
					'installed' => false,
					'message'   => __( 'The Events Calendar plugin is not active.', 'eventkoi' ),
				)
			);
		}

		$already_imported = self::get_imported_source_ids();
		$total_events     = self::count_posts( 'tribe_events' );
		$events_count     = $total_events - count( $already_imported );
		$venues_count     = self::count_posts( 'tribe_venue' );
		$organizers_count = self::count_posts( 'tribe_organizer' );
		$categories       = get_terms(
			array(
				'taxonomy'   => 'tribe_events_cat',
				'hide_empty' => false,
				'fields'     => 'all',
			)
		);

		$categories_list = array();
		if ( ! is_wp_error( $categories ) ) {
			foreach ( $categories as $cat ) {
				$categories_list[] = array(
					'id'    => $cat->term_id,
					'name'  => $cat->name,
					'slug'  => $cat->slug,
					'count' => $cat->count,
				);
			}
		}

		// Get preview of events.
		$preview_events = self::get_tec_events_preview();

		return rest_ensure_response(
			array(
				'installed'        => true,
				'total_events'     => $total_events,
				'events_count'     => $events_count,
				'venues_count'     => $venues_count,
				'organizers_count' => $organizers_count,
				'categories'       => $categories_list,
				'preview'          => $preview_events,
				'has_recurring'    => self::has_recurring_events(),
			)
		);
	}

	/**
	 * Run the import process.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function run_import( WP_REST_Request $request ) {
		$data          = json_decode( $request->get_body(), true );
		$event_ids     = ! empty( $data['event_ids'] ) && is_array( $data['event_ids'] ) ? array_map( 'absint', $data['event_ids'] ) : array();
		$import_images = ! empty( $data['import_images'] );

		if ( ! self::is_tec_active() ) {
			return new WP_Error( 'tec_not_active', __( 'The Events Calendar plugin is not active.', 'eventkoi' ), array( 'status' => 400 ) );
		}

		// If no specific IDs, import all published events.
		if ( empty( $event_ids ) ) {
			$posts     = get_posts(
				array(
					'post_type'      => 'tribe_events',
					'post_status'    => array( 'publish', 'draft', 'pending', 'future', 'private' ),
					'posts_per_page' => -1,
					'fields'         => 'ids',
				)
			);
			$event_ids = $posts;
		}

		$results  = array();
		$imported = 0;
		$skipped  = 0;
		$errors   = 0;

		foreach ( $event_ids as $tec_id ) {
			$result = self::import_single_event( $tec_id, $import_images );

			if ( is_wp_error( $result ) ) {
				++$errors;
				$results[] = array(
					'tec_id'  => $tec_id,
					'success' => false,
					'error'   => $result->get_error_message(),
				);
			} elseif ( false === $result ) {
				++$skipped;
			} else {
				++$imported;
				$results[] = array(
					'tec_id'   => $tec_id,
					'success'  => true,
					'event_id' => $result['event_id'],
					'title'    => $result['title'],
				);
			}
		}

		return rest_ensure_response(
			array(
				'imported' => $imported,
				'skipped'  => $skipped,
				'errors'   => $errors,
				'results'  => $results,
			)
		);
	}

	/**
	 * Import a single TEC event into EventKoi.
	 *
	 * @param int  $tec_id        The TEC event post ID.
	 * @param bool $import_images Whether to copy featured images.
	 * @return array|WP_Error|false Array with event_id/title on success, WP_Error on failure, false if skipped.
	 */
	private static function import_single_event( $tec_id, $import_images = false ) {
		// Skip if already imported (dedup by source ID).
		$existing = get_posts(
			array(
				'post_type'      => 'eventkoi_event',
				'post_status'    => 'any',
				'meta_key'       => '_tec_import_source_id', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'meta_value'     => $tec_id, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
				'posts_per_page' => 1,
				'fields'         => 'ids',
			)
		);

		if ( ! empty( $existing ) ) {
			return false; // Already imported — skip.
		}

		$post = get_post( $tec_id );

		if ( ! $post || 'tribe_events' !== $post->post_type ) {
			return new WP_Error( 'invalid_event', __( 'TEC event not found.', 'eventkoi' ) );
		}

		$title       = $post->post_title;
		$description = $post->post_content;
		$status      = $post->post_status;

		// Date/time.
		$start_date = get_post_meta( $tec_id, '_EventStartDate', true );
		$end_date   = get_post_meta( $tec_id, '_EventEndDate', true );
		$timezone   = get_post_meta( $tec_id, '_EventTimezone', true );
		$all_day    = 'yes' === get_post_meta( $tec_id, '_EventAllDay', true );

		if ( empty( $start_date ) ) {
			return new WP_Error( 'no_start_date', __( 'Event has no start date.', 'eventkoi' ) );
		}

		// Convert TEC dates (stored in local timezone) to ISO format.
		$start_iso = self::to_iso_date( $start_date, $timezone );
		$end_iso   = ! empty( $end_date ) ? self::to_iso_date( $end_date, $timezone ) : '';

		// Build event_days array for standard events.
		$event_days = array(
			array(
				'start_date' => $start_iso,
				'end_date'   => $end_iso,
				'all_day'    => $all_day,
			),
		);

		// Location from venue.
		$locations  = self::build_locations( $tec_id );
		$event_type = ! empty( $locations ) ? self::infer_type_from_locations( $locations ) : 'inperson';

		// Virtual URL.
		$event_url   = get_post_meta( $tec_id, '_EventURL', true );
		$virtual_url = '';
		if ( ! empty( $event_url ) && empty( $locations ) ) {
			$virtual_url = $event_url;
			$event_type  = 'virtual';
		}

		// Organizer info — append to description.
		$organizer_info = self::get_organizer_info( $tec_id );
		if ( ! empty( $organizer_info ) ) {
			$description .= "\n\n" . $organizer_info;
		}

		// Cost info — append to description.
		$cost = get_post_meta( $tec_id, '_EventCost', true );
		if ( ! empty( $cost ) ) {
			$currency_symbol = get_post_meta( $tec_id, '_EventCurrencySymbol', true );
			$currency_pos    = get_post_meta( $tec_id, '_EventCurrencyPosition', true );
			if ( ! empty( $currency_symbol ) ) {
				$cost_display = 'prefix' === $currency_pos ? $currency_symbol . $cost : $cost . $currency_symbol;
			} else {
				$cost_display = $cost;
			}
			$description .= "\n\n<!-- tec_cost:" . esc_attr( $cost_display ) . ' -->';
		}

		// Recurrence (TEC Pro).
		$date_type        = 'standard';
		$recurrence_rules = array();
		$recurrence_meta  = get_post_meta( $tec_id, '_EventRecurrence', true );

		if ( ! empty( $recurrence_meta ) && is_array( $recurrence_meta ) && ! empty( $recurrence_meta['rules'] ) ) {
			$converted = self::convert_recurrence_rules( $recurrence_meta['rules'], $start_date, $end_date, $timezone );

			if ( ! empty( $converted ) ) {
				$date_type        = 'recurring';
				$recurrence_rules = $converted;
				$event_days       = array(); // Clear event_days for recurring events.
			}
		}

		// Map Google Maps settings.
		$embed_gmap = '1' === get_post_meta( $tec_id, '_EventShowMap', true );

		// Create the EventKoi event post.
		$new_post_id = wp_insert_post(
			array(
				'post_type'   => 'eventkoi_event',
				'post_status' => $status,
				'post_title'  => $title,
				'post_name'   => sanitize_title_with_dashes( $title, '', 'save' ),
				'post_author' => get_current_user_id(),
			),
			true
		);

		if ( is_wp_error( $new_post_id ) ) {
			return $new_post_id;
		}

		// Set meta using the same approach as Event::update_meta().
		update_post_meta( $new_post_id, 'description', wp_kses_post( $description ) );
		update_post_meta( $new_post_id, 'date_type', $date_type );
		update_post_meta( $new_post_id, 'start_date', $start_iso );
		update_post_meta( $new_post_id, 'start_timestamp', strtotime( $start_iso ) );
		update_post_meta( $new_post_id, 'event_days', $event_days );
		update_post_meta( $new_post_id, 'locations', $locations );
		update_post_meta( $new_post_id, 'type', $event_type );
		update_post_meta( $new_post_id, 'standard_type', 'selected' );
		update_post_meta( $new_post_id, 'embed_gmap', $embed_gmap );
		update_post_meta( $new_post_id, 'virtual_url', sanitize_url( $virtual_url ) );
		update_post_meta( $new_post_id, 'recurrence_rules', $recurrence_rules );
		update_post_meta( $new_post_id, 'attendance_mode', 'none' );
		update_post_meta( $new_post_id, 'timezone_display', false );

		if ( ! empty( $end_iso ) ) {
			update_post_meta( $new_post_id, 'end_date', $end_iso );
			update_post_meta( $new_post_id, 'end_timestamp', strtotime( $end_iso ) );
		}

		if ( ! empty( $timezone ) ) {
			update_post_meta( $new_post_id, 'timezone', $timezone );
		}

		// Legacy location fields from primary location.
		if ( ! empty( $locations[0] ) ) {
			$primary = $locations[0];
			update_post_meta( $new_post_id, 'location', $primary );
			update_post_meta( $new_post_id, 'address1', $primary['address1'] ?? '' );
			update_post_meta( $new_post_id, 'latitude', $primary['lat'] ?? '' );
			update_post_meta( $new_post_id, 'longitude', $primary['lng'] ?? '' );
		}

		// Map TEC categories to EventKoi calendars.
		self::map_categories( $tec_id, $new_post_id );

		// Featured image.
		if ( $import_images ) {
			$thumbnail_id = get_post_thumbnail_id( $tec_id );
			if ( $thumbnail_id ) {
				set_post_thumbnail( $new_post_id, $thumbnail_id );
				$image_url = wp_get_attachment_url( $thumbnail_id );
				if ( $image_url ) {
					update_post_meta( $new_post_id, 'image', $image_url );
					update_post_meta( $new_post_id, 'image_id', $thumbnail_id );
				}
			}
		}

		// Store reference to original TEC event for dedup.
		update_post_meta( $new_post_id, '_tec_import_source_id', $tec_id );

		return array(
			'event_id' => $new_post_id,
			'title'    => $title,
		);
	}

	/**
	 * Build EventKoi locations array from TEC venue.
	 *
	 * @param int $tec_id The TEC event post ID.
	 * @return array Locations array.
	 */
	private static function build_locations( $tec_id ) {
		$venue_id = get_post_meta( $tec_id, '_EventVenueID', true );

		if ( empty( $venue_id ) ) {
			return array();
		}

		$venue = get_post( $venue_id );
		if ( ! $venue ) {
			return array();
		}

		$address = get_post_meta( $venue_id, '_VenueAddress', true );
		$city    = get_post_meta( $venue_id, '_VenueCity', true );
		$state   = get_post_meta( $venue_id, '_VenueState', true );
		$zip     = get_post_meta( $venue_id, '_VenueZip', true );
		$country = get_post_meta( $venue_id, '_VenueCountry', true );
		$lat     = get_post_meta( $venue_id, '_VenueLat', true );
		$lng     = get_post_meta( $venue_id, '_VenueLng', true );

		// Build full address string.
		$address_parts = array_filter( array( $address, $city, $state, $zip, $country ) );
		$full_address  = implode( ', ', $address_parts );

		return array(
			array(
				'type'     => 'physical',
				'name'     => $venue->post_title,
				'address1' => $full_address,
				'address2' => '',
				'address3' => '',
				'lat'      => $lat ? (string) $lat : '',
				'lng'      => $lng ? (string) $lng : '',
			),
		);
	}

	/**
	 * Get organizer information as formatted text.
	 *
	 * @param int $tec_id The TEC event post ID.
	 * @return string Organizer info HTML, or empty string.
	 */
	private static function get_organizer_info( $tec_id ) {
		$organizer_id = get_post_meta( $tec_id, '_EventOrganizerID', true );

		if ( empty( $organizer_id ) ) {
			return '';
		}

		$organizer = get_post( $organizer_id );
		if ( ! $organizer ) {
			return '';
		}

		$parts   = array();
		$parts[] = '<strong>' . esc_html__( 'Organizer', 'eventkoi' ) . ':</strong> ' . esc_html( $organizer->post_title );

		$email = get_post_meta( $organizer_id, '_OrganizerEmail', true );
		if ( ! empty( $email ) ) {
			$parts[] = esc_html__( 'Email', 'eventkoi' ) . ': ' . esc_html( $email );
		}

		$phone = get_post_meta( $organizer_id, '_OrganizerPhone', true );
		if ( ! empty( $phone ) ) {
			$parts[] = esc_html__( 'Phone', 'eventkoi' ) . ': ' . esc_html( $phone );
		}

		$website = get_post_meta( $organizer_id, '_OrganizerWebsite', true );
		if ( ! empty( $website ) ) {
			$parts[] = esc_html__( 'Website', 'eventkoi' ) . ': <a href="' . esc_url( $website ) . '">' . esc_html( $website ) . '</a>';
		}

		return implode( '<br>', $parts );
	}

	/**
	 * Map TEC categories to EventKoi calendars (event_cal taxonomy).
	 *
	 * Creates matching calendar terms if they don't exist.
	 *
	 * @param int $tec_id     The TEC event post ID.
	 * @param int $new_post_id The new EventKoi event post ID.
	 */
	private static function map_categories( $tec_id, $new_post_id ) {
		$tec_cats = wp_get_post_terms( $tec_id, 'tribe_events_cat', array( 'fields' => 'all' ) );

		if ( is_wp_error( $tec_cats ) || empty( $tec_cats ) ) {
			// Assign default calendar if no categories.
			$default_cal = (int) get_option( 'eventkoi_default_event_cal', 0 );
			if ( $default_cal ) {
				wp_set_post_terms( $new_post_id, array( $default_cal ), 'event_cal' );
			}
			return;
		}

		$cal_ids = array();

		foreach ( $tec_cats as $cat ) {
			// Check if a calendar with this slug already exists.
			$existing = get_term_by( 'slug', $cat->slug, 'event_cal' );

			if ( $existing ) {
				$cal_ids[] = $existing->term_id;
			} else {
				// Create the calendar term.
				$new_term = wp_insert_term(
					$cat->name,
					'event_cal',
					array( 'slug' => $cat->slug )
				);

				if ( ! is_wp_error( $new_term ) ) {
					$cal_ids[] = $new_term['term_id'];
				}
			}
		}

		if ( ! empty( $cal_ids ) ) {
			wp_set_post_terms( $new_post_id, $cal_ids, 'event_cal' );
		}
	}

	/**
	 * Convert TEC Pro recurrence rules to EventKoi format.
	 *
	 * @param array  $tec_rules  TEC recurrence rules array.
	 * @param string $start_date Original start date.
	 * @param string $end_date   Original end date.
	 * @param string $timezone   Event timezone.
	 * @return array EventKoi recurrence_rules array.
	 */
	private static function convert_recurrence_rules( $tec_rules, $start_date, $end_date, $timezone ) {
		$ek_rules = array();

		// TEC frequency mapping.
		$freq_map = array(
			'Daily'   => 'day',
			'Weekly'  => 'week',
			'Monthly' => 'month',
			'Yearly'  => 'year',
		);

		foreach ( $tec_rules as $rule ) {
			if ( empty( $rule['type'] ) || 'Custom' === $rule['type'] ) {
				continue;
			}

			$frequency = $freq_map[ $rule['type'] ] ?? '';
			if ( empty( $frequency ) ) {
				continue;
			}

			$start_iso = self::to_iso_date( $start_date, $timezone );
			$end_iso   = ! empty( $end_date ) ? self::to_iso_date( $end_date, $timezone ) : '';

			$ek_rule = array(
				'start_date' => $start_iso,
				'end_date'   => $end_iso,
				'frequency'  => $frequency,
				'all_day'    => false,
			);

			// Weekly: map day numbers.
			if ( 'week' === $frequency && ! empty( $rule['custom']['week']['day'] ) ) {
				// TEC uses day numbers: 1=Mon through 7=Sun.
				// EventKoi uses 0=Sun through 6=Sat.
				$tec_days = $rule['custom']['week']['day'];
				$ek_days  = array();

				foreach ( $tec_days as $d ) {
					$d = (int) $d;
					// TEC: 1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat,7=Sun.
					// EK:  0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat.
					$ek_days[] = ( 7 === $d ) ? 0 : $d;
				}

				$ek_rule['weekdays'] = $ek_days;
			}

			// End recurrence handling.
			if ( ! empty( $rule['end-type'] ) ) {
				if ( 'After' === $rule['end-type'] && ! empty( $rule['end-count'] ) ) {
					$ek_rule['count'] = (int) $rule['end-count'];
				} elseif ( 'On' === $rule['end-type'] && ! empty( $rule['end'] ) ) {
					$ek_rule['until'] = self::to_iso_date( $rule['end'], $timezone );
				}
			}

			$ek_rules[] = $ek_rule;
		}

		return $ek_rules;
	}

	/**
	 * Convert a date string to ISO 8601 format.
	 *
	 * @param string $date     Date string (Y-m-d H:i:s format from TEC).
	 * @param string $timezone Timezone identifier.
	 * @return string ISO 8601 date string.
	 */
	private static function to_iso_date( $date, $timezone = '' ) {
		if ( empty( $date ) ) {
			return '';
		}

		try {
			$tz = ! empty( $timezone ) ? new \DateTimeZone( $timezone ) : wp_timezone();
			$dt = new \DateTime( $date, $tz );
			return $dt->format( 'c' ); // ISO 8601 format.
		} catch ( \Exception $e ) {
			return $date;
		}
	}

	/**
	 * Get a preview of TEC events for the detection UI.
	 *
	 * @return array Preview list of events.
	 */
	private static function get_tec_events_preview() {
		$already_imported = self::get_imported_source_ids();

		$query_args = array(
			'post_type'      => 'tribe_events',
			'post_status'    => array( 'publish', 'draft', 'pending', 'future', 'private' ),
			'posts_per_page' => -1,
			'orderby'        => 'meta_value',
			'meta_key'       => '_EventStartDate', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
			'order'          => 'ASC',
		);

		if ( ! empty( $already_imported ) ) {
			$query_args['post__not_in'] = $already_imported;
		}

		$posts = get_posts( $query_args );

		$events = array();

		foreach ( $posts as $post ) {
			$start   = get_post_meta( $post->ID, '_EventStartDate', true );
			$end     = get_post_meta( $post->ID, '_EventEndDate', true );
			$all_day = 'yes' === get_post_meta( $post->ID, '_EventAllDay', true );

			$venue_id   = get_post_meta( $post->ID, '_EventVenueID', true );
			$venue_name = '';
			if ( $venue_id ) {
				$venue      = get_post( $venue_id );
				$venue_name = $venue ? $venue->post_title : '';
			}

			$categories = wp_get_post_terms( $post->ID, 'tribe_events_cat', array( 'fields' => 'names' ) );
			$has_image  = has_post_thumbnail( $post->ID );

			$events[] = array(
				'id'         => $post->ID,
				'title'      => $post->post_title,
				'status'     => $post->post_status,
				'start_date' => $start,
				'end_date'   => $end,
				'all_day'    => $all_day,
				'venue'      => $venue_name,
				'categories' => is_wp_error( $categories ) ? array() : $categories,
				'has_image'  => $has_image,
				'recurring'  => ! empty( get_post_meta( $post->ID, '_EventRecurrence', true ) ),
			);
		}

		return $events;
	}

	/**
	 * Check whether TEC is active.
	 *
	 * @return bool
	 */
	private static function is_tec_active() {
		return class_exists( 'Tribe__Events__Main' ) || defined( 'TRIBE_EVENTS_FILE' );
	}

	/**
	 * Count published posts of a given type.
	 *
	 * @param string $post_type Post type slug.
	 * @return int
	 */
	private static function count_posts( $post_type ) {
		$counts = wp_count_posts( $post_type );
		return ( $counts->publish ?? 0 ) + ( $counts->draft ?? 0 ) + ( $counts->pending ?? 0 ) + ( $counts->future ?? 0 ) + ( $counts->private ?? 0 );
	}

	/**
	 * Check if any TEC events have recurrence data (TEC Pro).
	 *
	 * @return bool
	 */
	private static function has_recurring_events() {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$count = $wpdb->get_var(
			"SELECT COUNT(*) FROM {$wpdb->postmeta}
			 WHERE meta_key = '_EventRecurrence'
			 AND meta_value != ''
			 AND meta_value NOT LIKE '%\"rules\";a:0%'"
		);

		return (int) $count > 0;
	}

	/**
	 * Infer event type from locations array.
	 *
	 * @param array $locations Locations array.
	 * @return string Event type (inperson, virtual, hybrid).
	 */
	private static function infer_type_from_locations( $locations ) {
		$has_physical = false;
		$has_virtual  = false;

		foreach ( $locations as $loc ) {
			$type = $loc['type'] ?? 'physical';
			if ( 'physical' === $type ) {
				$has_physical = true;
			} elseif ( 'virtual' === $type ) {
				$has_virtual = true;
			}
		}

		if ( $has_physical && $has_virtual ) {
			return 'hybrid';
		}

		return $has_physical ? 'inperson' : 'virtual';
	}

	/**
	 * Get TEC source IDs that have already been imported.
	 *
	 * @return array Array of TEC post IDs already imported.
	 */
	private static function get_imported_source_ids() {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$ids = $wpdb->get_col(
			"SELECT meta_value FROM {$wpdb->postmeta}
			 WHERE meta_key = '_tec_import_source_id'"
		);

		return array_map( 'intval', $ids );
	}
}
