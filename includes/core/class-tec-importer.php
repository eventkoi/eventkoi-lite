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
					'message'   => __( 'The Events Calendar plugin is not active.', 'eventkoi-lite' ),
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
		$data          = $request->get_json_params();
		$event_ids     = ! empty( $data['event_ids'] ) && is_array( $data['event_ids'] ) ? array_map( 'absint', $data['event_ids'] ) : array();
		$import_images = ! empty( $data['import_images'] );

		if ( ! self::is_tec_active() ) {
			return new WP_Error( 'tec_not_active', __( 'The Events Calendar plugin is not active.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		// If no specific IDs, import all events directly via SQL to bypass TEC date filters.
		if ( empty( $event_ids ) ) {
			global $wpdb;

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$event_ids = $wpdb->get_col(
				"SELECT ID FROM {$wpdb->posts}
				 WHERE post_type = 'tribe_events'
				 AND post_status IN ('publish','draft','pending','future','private')"
			);
			$event_ids = array_map( 'absint', $event_ids );
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
			return new WP_Error( 'invalid_event', __( 'TEC event not found.', 'eventkoi-lite' ) );
		}

		$title       = $post->post_title;
		$status      = $post->post_status;

		// Date/time.
		$start_date = get_post_meta( $tec_id, '_EventStartDate', true );
		$end_date   = get_post_meta( $tec_id, '_EventEndDate', true );
		$timezone   = get_post_meta( $tec_id, '_EventTimezone', true );
		$all_day    = self::is_all_day( $tec_id );

		if ( empty( $start_date ) ) {
			return new WP_Error( 'no_start_date', __( 'Event has no start date.', 'eventkoi-lite' ) );
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

		// Location from venue. Map TEC _EventShowMap into the per-location embed flag.
		$show_map  = '1' === get_post_meta( $tec_id, '_EventShowMap', true );
		$locations = self::build_locations( $tec_id, $show_map );

		// TEC's _EventURL is the "Event Website" link. Promote it to a structured virtual
		// location so it lands in EventKoi's multi-location UI and JSON-LD instead of being
		// stuffed into the description.
		$event_url = (string) get_post_meta( $tec_id, '_EventURL', true );
		if ( '' !== $event_url ) {
			$locations[] = self::build_virtual_location( $event_url );
		}

		$event_type = ! empty( $locations ) ? self::infer_type_from_locations( $locations ) : 'inperson';

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

		// Try to map TEC cost to a real EventKoi ticket. If we create one, the cost line is
		// omitted from the description tail (the ticket card carries the price).
		$cost_raw        = get_post_meta( $tec_id, '_EventCost', true );
		$currency_symbol = get_post_meta( $tec_id, '_EventCurrencySymbol', true );
		$currency_pos    = get_post_meta( $tec_id, '_EventCurrencyPosition', true );
		$currency_code   = get_post_meta( $tec_id, '_EventCurrencyCode', true );
		$ticket_id       = self::maybe_create_ticket_from_cost( $new_post_id, $cost_raw, $currency_symbol, $currency_code );
		$attendance_mode = $ticket_id ? 'tickets' : 'none';

		// Build description: run TEC body through wpautop to preserve paragraphs, then append
		// website/organizer/cost in their own paragraph blocks.
		$description    = wpautop( (string) $post->post_content );
		$organizer_data = self::get_organizer_data( $tec_id );
		$tail           = array();

		if ( $organizer_data && ! empty( $organizer_data['name'] ) ) {
			$lines = array( '<strong>' . esc_html__( 'Organizer', 'eventkoi-lite' ) . ':</strong> ' . esc_html( $organizer_data['name'] ) );
			if ( ! empty( $organizer_data['email'] ) ) {
				$lines[] = esc_html__( 'Email', 'eventkoi-lite' ) . ': <a href="mailto:' . esc_attr( $organizer_data['email'] ) . '">' . esc_html( $organizer_data['email'] ) . '</a>';
			}
			if ( ! empty( $organizer_data['phone'] ) ) {
				$lines[] = esc_html__( 'Phone', 'eventkoi-lite' ) . ': ' . esc_html( $organizer_data['phone'] );
			}
			if ( ! empty( $organizer_data['website'] ) ) {
				$lines[] = esc_html__( 'Website', 'eventkoi-lite' ) . ': <a href="' . esc_url( $organizer_data['website'] ) . '">' . esc_html( $organizer_data['website'] ) . '</a>';
			}
			$tail[] = '<p>' . implode( '<br>', $lines ) . '</p>';
		}

		// Surface cost only when we couldn't map it to a real ticket (free / non-numeric).
		if ( ! $ticket_id && '' !== (string) $cost_raw ) {
			$cost_display = self::format_cost_display( $cost_raw, $currency_symbol, $currency_pos );
			$tail[]       = '<p><strong>' . esc_html__( 'Cost', 'eventkoi-lite' ) . ':</strong> ' . esc_html( $cost_display ) . '</p>';
		}

		if ( ! empty( $tail ) ) {
			$description .= "\n" . implode( "\n", $tail );
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
		update_post_meta( $new_post_id, 'embed_gmap', $show_map );

		// Mirror first virtual URL into legacy top-level meta so EK's get_virtual_url() picks it up.
		$virtual_url_legacy = '';
		foreach ( $locations as $loc ) {
			if ( in_array( ( $loc['type'] ?? '' ), array( 'virtual', 'online' ), true ) && ! empty( $loc['virtual_url'] ) ) {
				$virtual_url_legacy = (string) $loc['virtual_url'];
				break;
			}
		}
		update_post_meta( $new_post_id, 'virtual_url', $virtual_url_legacy );
		update_post_meta( $new_post_id, 'recurrence_rules', $recurrence_rules );
		update_post_meta( $new_post_id, 'attendance_mode', $attendance_mode );
		update_post_meta( $new_post_id, 'tickets_enabled', (bool) $ticket_id );
		update_post_meta( $new_post_id, 'timezone_display', false );

		if ( ! empty( $end_iso ) ) {
			update_post_meta( $new_post_id, 'end_date', $end_iso );
			update_post_meta( $new_post_id, 'end_timestamp', strtotime( $end_iso ) );
		}

		if ( ! empty( $timezone ) ) {
			update_post_meta( $new_post_id, 'timezone', $timezone );
		}

		// Structured organizer postmeta (queryable, future templates can render natively).
		if ( $organizer_data ) {
			update_post_meta( $new_post_id, 'organizer_name', sanitize_text_field( $organizer_data['name'] ) );
			update_post_meta( $new_post_id, 'organizer_email', sanitize_email( $organizer_data['email'] ) );
			update_post_meta( $new_post_id, 'organizer_phone', sanitize_text_field( $organizer_data['phone'] ) );
			update_post_meta( $new_post_id, 'organizer_website', esc_url_raw( $organizer_data['website'] ) );
		}

		// Legacy top-level location fields kept in sync with the primary location entry.
		if ( ! empty( $locations[0] ) ) {
			$primary = $locations[0];
			update_post_meta( $new_post_id, 'location', $primary );
			update_post_meta( $new_post_id, 'address1', (string) ( $primary['address1'] ?? '' ) );
			update_post_meta( $new_post_id, 'address2', (string) ( $primary['address2'] ?? '' ) );
			update_post_meta( $new_post_id, 'address3', (string) ( $primary['address3'] ?? '' ) );
			update_post_meta( $new_post_id, 'latitude', (string) ( $primary['latitude'] ?? '' ) );
			update_post_meta( $new_post_id, 'longitude', (string) ( $primary['longitude'] ?? '' ) );
			update_post_meta( $new_post_id, 'gmap_link', (string) ( $primary['gmap_link'] ?? '' ) );
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
	 * EventKoi splits address into three lines + structured city/state/zip/country fields.
	 * address1 is street only — never the full concatenated address (which would render
	 * thrice once EventKoi also displays city/zip and country).
	 *
	 * @param int  $tec_id   The TEC event post ID.
	 * @param bool $show_map Whether the TEC source asked for the map to be shown.
	 * @return array Locations array.
	 */
	private static function build_locations( $tec_id, $show_map = false ) {
		$venue_id = get_post_meta( $tec_id, '_EventVenueID', true );

		if ( empty( $venue_id ) ) {
			return array();
		}

		$venue = get_post( $venue_id );
		if ( ! $venue ) {
			return array();
		}

		$address = (string) get_post_meta( $venue_id, '_VenueAddress', true );
		$city    = (string) get_post_meta( $venue_id, '_VenueCity', true );
		$state   = (string) get_post_meta( $venue_id, '_VenueState', true );
		$zip     = (string) get_post_meta( $venue_id, '_VenueZip', true );
		$country = (string) get_post_meta( $venue_id, '_VenueCountry', true );
		$lat     = (string) get_post_meta( $venue_id, '_VenueLat', true );
		$lng     = (string) get_post_meta( $venue_id, '_VenueLng', true );

		// address3 = "City, State, Zip, Country" — matches EventKoi's manual-entry shape.
		$address3 = implode( ', ', array_filter( array( $city, $state, $zip, $country ) ) );

		// gmap_link: prefer lat/lng, else fall back to text address.
		$gmap_link = '';
		if ( '' !== $lat && '' !== $lng ) {
			$gmap_link = 'https://www.google.com/maps?q=' . rawurlencode( $lat . ',' . $lng );
		} else {
			$full = trim( $address . ', ' . $address3, ', ' );
			if ( '' !== $full ) {
				$gmap_link = 'https://www.google.com/maps?q=' . rawurlencode( $full );
			}
		}

		return array(
			array(
				'id'          => wp_generate_uuid4(),
				'type'        => 'physical',
				'name'        => $venue->post_title,
				'address1'    => $address,
				'address2'    => '',
				'address3'    => $address3,
				'city'        => $city,
				'state'       => $state,
				'country'     => $country,
				'zip'         => $zip,
				'embed_gmap'  => (bool) $show_map,
				'gmap_link'   => $gmap_link,
				'virtual_url' => '',
				'latitude'    => $lat,
				'longitude'   => $lng,
			),
		);
	}

	/**
	 * Extract structured organizer data from a TEC event.
	 *
	 * @param int $tec_id The TEC event post ID.
	 * @return array|null Associative array (name/email/phone/website) or null when no organizer.
	 */
	private static function get_organizer_data( $tec_id ) {
		$organizer_id = get_post_meta( $tec_id, '_EventOrganizerID', true );
		if ( empty( $organizer_id ) ) {
			return null;
		}
		$organizer = get_post( $organizer_id );
		if ( ! $organizer ) {
			return null;
		}
		return array(
			'name'    => (string) $organizer->post_title,
			'email'   => (string) get_post_meta( $organizer_id, '_OrganizerEmail', true ),
			'phone'   => (string) get_post_meta( $organizer_id, '_OrganizerPhone', true ),
			'website' => (string) get_post_meta( $organizer_id, '_OrganizerWebsite', true ),
		);
	}

	/**
	 * Format a TEC cost value for inline display when no ticket was created.
	 *
	 * @param string $cost_raw        Raw _EventCost value.
	 * @param string $currency_symbol _EventCurrencySymbol.
	 * @param string $currency_pos    _EventCurrencyPosition ('prefix' or 'suffix').
	 * @return string
	 */
	private static function format_cost_display( $cost_raw, $currency_symbol, $currency_pos ) {
		if ( '' === $currency_symbol ) {
			return (string) $cost_raw;
		}
		return ( 'suffix' === $currency_pos )
			? $cost_raw . $currency_symbol
			: $currency_symbol . $cost_raw;
	}

	/**
	 * Map a currency symbol (£, $, €, ¥…) to an ISO 4217 code.
	 *
	 * @param string $code_meta Raw _EventCurrencyCode meta (may be empty).
	 * @param string $symbol    _EventCurrencySymbol.
	 * @return string Three-letter ISO code; falls back to USD.
	 */
	private static function infer_currency_code( $code_meta, $symbol ) {
		if ( '' !== (string) $code_meta ) {
			return strtoupper( substr( sanitize_text_field( (string) $code_meta ), 0, 3 ) );
		}
		$map = array(
			'$'   => 'USD',
			'£'   => 'GBP',
			'€'   => 'EUR',
			'¥'   => 'JPY',
			'₹'   => 'INR',
			'₩'   => 'KRW',
			'C$'  => 'CAD',
			'A$'  => 'AUD',
			'kr'  => 'SEK',
			'CHF' => 'CHF',
			'R$'  => 'BRL',
		);
		$trim = trim( (string) $symbol );
		return $map[ $trim ] ?? 'USD';
	}

	/**
	 * Create a single EventKoi ticket from TEC's free-text cost field, when the cost
	 * is a positive numeric value and the tickets feature is enabled.
	 *
	 * @param int    $event_id        EventKoi event post ID.
	 * @param string $cost_raw        Raw _EventCost.
	 * @param string $currency_symbol _EventCurrencySymbol.
	 * @param string $currency_code   _EventCurrencyCode.
	 * @return int|false Ticket ID on creation; false when no ticket was created.
	 */
	private static function maybe_create_ticket_from_cost( $event_id, $cost_raw, $currency_symbol, $currency_code ) {
		if ( '' === (string) $cost_raw ) {
			return false;
		}
		if ( ! function_exists( 'eventkoi_is_tickets_feature_enabled' ) || ! eventkoi_is_tickets_feature_enabled() ) {
			return false;
		}
		// Extract the first numeric run — handles "12", "12.50", "£12", "$25 USD", etc.
		if ( ! preg_match( '/\d+(?:\.\d+)?/', (string) $cost_raw, $m ) ) {
			return false; // Non-numeric: "Free", "Donation", "TBD" — caller falls back to text.
		}
		$price = (float) $m[0];
		if ( $price <= 0 ) {
			return false;
		}

		global $wpdb;
		$table = $wpdb->prefix . 'eventkoi_tickets';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$ok = $wpdb->insert(
			$table,
			array(
				'event_id'    => $event_id,
				'name'        => __( 'General admission', 'eventkoi-lite' ),
				'description' => '',
				'price'       => $price,
				'currency'    => self::infer_currency_code( $currency_code, $currency_symbol ),
				'status'      => 'active',
				'sort_order'  => 0,
			),
			array( '%d', '%s', '%s', '%f', '%s', '%s', '%d' )
		);
		return $ok ? (int) $wpdb->insert_id : false;
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
			if ( empty( $rule['type'] ) ) {
				continue;
			}

			// TEC stores custom recurrence with type 'Custom' and actual frequency in custom.type.
			$rule_type = $rule['type'];
			if ( 'Custom' === $rule_type ) {
				$rule_type = $rule['custom']['type'] ?? '';
			}

			$frequency = $freq_map[ $rule_type ] ?? '';
			if ( empty( $frequency ) ) {
				continue;
			}

			$start_iso = self::to_iso_date( $start_date, $timezone );
			$end_iso   = ! empty( $end_date ) ? self::to_iso_date( $end_date, $timezone ) : '';

			$interval = ! empty( $rule['custom']['interval'] ) ? (int) $rule['custom']['interval'] : 1;

			$ek_rule = array(
				'start_date'        => $start_iso,
				'end_date'          => $end_iso,
				'frequency'         => $frequency,
				'every'             => $interval,
				'all_day'           => false,
				'working_days_only' => false,
				'weekdays'          => array(),
				'months'            => array(),
				'month_day_rule'    => 'day-of-month',
				'month_day_value'   => 1,
				'ends'              => 'never',
				'ends_after'        => 30,
				'ends_on'           => '',
			);

			// Set default month/day from start date.
			try {
				$start_dt                   = new \DateTime( $start_iso );
				$ek_rule['months']          = array( (int) $start_dt->format( 'n' ) - 1 );
				$ek_rule['month_day_value'] = (int) $start_dt->format( 'j' );
			} catch ( \Exception $e ) {
				unset( $e );
			}

			// Weekly: map day numbers.
			if ( 'week' === $frequency && ! empty( $rule['custom']['week']['day'] ) ) {
				$tec_days = $rule['custom']['week']['day'];
				$ek_days  = array();

				foreach ( $tec_days as $d ) {
					$d = (int) $d;
					// TEC uses 1=Mon..7=Sun, EK uses 0=Sun..6=Sat.
					$ek_days[] = ( 7 === $d ) ? 0 : $d;
				}

				$ek_rule['weekdays'] = $ek_days;
			}

			// End recurrence handling.
			if ( ! empty( $rule['end-type'] ) ) {
				if ( 'After' === $rule['end-type'] && ! empty( $rule['end-count'] ) ) {
					$ek_rule['ends']       = 'after';
					$ek_rule['ends_after'] = (int) $rule['end-count'];
				} elseif ( 'On' === $rule['end-type'] && ! empty( $rule['end'] ) ) {
					$ek_rule['ends']    = 'on';
					$ek_rule['ends_on'] = self::to_iso_date( $rule['end'], $timezone );
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
			$all_day = self::is_all_day( $post->ID );

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
	 * Check whether a TEC event is marked as all-day.
	 *
	 * Modern TEC stores '1' while legacy stores 'yes'.
	 *
	 * @param int $tec_id TEC event post ID.
	 * @return bool
	 */
	private static function is_all_day( $tec_id ) {
		$raw = get_post_meta( $tec_id, '_EventAllDay', true );
		return in_array( $raw, array( 'yes', '1', 1, true ), true );
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
	 * Returns EventKoi canonical values: 'inperson', 'online', or 'mixed'.
	 *
	 * @param array $locations Locations array.
	 * @return string
	 */
	private static function infer_type_from_locations( $locations ) {
		$has_physical = false;
		$has_virtual  = false;

		foreach ( $locations as $loc ) {
			$type = sanitize_key( (string) ( $loc['type'] ?? 'physical' ) );
			if ( in_array( $type, array( 'physical', 'inperson' ), true ) ) {
				$has_physical = true;
			} elseif ( in_array( $type, array( 'virtual', 'online' ), true ) ) {
				$has_virtual = true;
			}
		}

		if ( $has_physical && $has_virtual ) {
			return 'mixed';
		}

		return $has_physical ? 'inperson' : 'online';
	}

	/**
	 * Build a virtual-location entry for an event URL.
	 *
	 * @param string $url The virtual/meeting/website URL.
	 * @return array Location row.
	 */
	private static function build_virtual_location( $url ) {
		$host = (string) wp_parse_url( $url, PHP_URL_HOST );
		$name = '' !== $host ? $host : __( 'Event website', 'eventkoi-lite' );
		return array(
			'id'          => wp_generate_uuid4(),
			'type'        => 'virtual',
			'name'        => $name,
			'address1'    => '',
			'address2'    => '',
			'address3'    => '',
			'city'        => '',
			'state'       => '',
			'country'     => '',
			'zip'         => '',
			'embed_gmap'  => false,
			'gmap_link'   => '',
			'virtual_url' => esc_url_raw( $url ),
			'latitude'    => '',
			'longitude'   => '',
		);
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
