<?php
/**
 * ICS / iCal File Importer.
 *
 * Parses .ics files and imports events into EventKoi.
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
 * Class ICS_Importer
 *
 * Handles parsing ICS files and importing events.
 */
class ICS_Importer {

	/**
	 * Constructor — registers REST routes.
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Register REST API routes.
	 *
	 * @return void
	 */
	public static function register_routes() {
		register_rest_route(
			EVENTKOI_API,
			'/ics-import/parse',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'parse' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);

		register_rest_route(
			EVENTKOI_API,
			'/ics-import/run',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'run_import' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);
	}

	/**
	 * Parse uploaded ICS content and return event preview.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function parse( WP_REST_Request $request ) {
		$data        = json_decode( $request->get_body(), true );
		$ics_content = $data['content'] ?? '';

		if ( empty( $ics_content ) ) {
			return new WP_Error( 'no_content', __( 'No ICS content provided.', 'eventkoi' ), array( 'status' => 400 ) );
		}

		$events = self::parse_ics( $ics_content );

		if ( empty( $events ) ) {
			return rest_ensure_response(
				array(
					'total_in_file' => 0,
					'events_count'  => 0,
					'skipped'       => 0,
					'events'        => array(),
					'cache_key'     => '',
				)
			);
		}

		// Filter out already-imported events (dedup by UID).
		$already_imported = self::get_imported_uids();
		$new_events       = array();

		foreach ( $events as $event ) {
			$uid = $event['uid'] ?? '';
			if ( ! empty( $uid ) && in_array( $uid, $already_imported, true ) ) {
				continue;
			}
			$new_events[] = $event;
		}

		// Store parsed events in a transient for the import step.
		$cache_key = 'ek_ics_' . wp_generate_password( 12, false, false );
		set_transient( $cache_key, $new_events, HOUR_IN_SECONDS );

		// Build preview list.
		$preview = array();
		foreach ( $new_events as $ev ) {
			$preview[] = array(
				'uid'        => $ev['uid'] ?? '',
				'title'      => $ev['summary'] ?? __( 'Untitled Event', 'eventkoi' ),
				'start_date' => $ev['dtstart'] ?? '',
				'end_date'   => $ev['dtend'] ?? '',
				'all_day'    => $ev['all_day'] ?? false,
				'location'   => $ev['location'] ?? '',
				'recurring'  => ! empty( $ev['rrule'] ),
			);
		}

		return rest_ensure_response(
			array(
				'total_in_file' => count( $events ),
				'events_count'  => count( $new_events ),
				'skipped'       => count( $events ) - count( $new_events ),
				'events'        => $preview,
				'cache_key'     => $cache_key,
			)
		);
	}

	/**
	 * Run the import from previously parsed data.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function run_import( WP_REST_Request $request ) {
		$data      = json_decode( $request->get_body(), true );
		$cache_key = $data['cache_key'] ?? '';

		if ( empty( $cache_key ) ) {
			return new WP_Error( 'no_cache', __( 'No parsed data found.', 'eventkoi' ), array( 'status' => 400 ) );
		}

		$events = get_transient( $cache_key );
		delete_transient( $cache_key );

		if ( empty( $events ) || ! is_array( $events ) ) {
			return new WP_Error( 'expired', __( 'Parsed data has expired. Please upload the file again.', 'eventkoi' ), array( 'status' => 400 ) );
		}

		$results  = array();
		$imported = 0;
		$skipped  = 0;
		$errors   = 0;

		foreach ( $events as $event ) {
			$result = self::import_single_event( $event );

			if ( is_wp_error( $result ) ) {
				++$errors;
				$results[] = array(
					'title'   => $event['summary'] ?? '',
					'success' => false,
					'error'   => $result->get_error_message(),
				);
			} elseif ( false === $result ) {
				++$skipped;
			} else {
				++$imported;
				$results[] = array(
					'title'    => $result['title'],
					'success'  => true,
					'event_id' => $result['event_id'],
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
	 * Import a single parsed ICS event into EventKoi.
	 *
	 * @param array $event Parsed event data.
	 * @return array|WP_Error|false Array with event_id/title on success, WP_Error on failure, false if skipped.
	 */
	private static function import_single_event( $event ) {
		$uid = $event['uid'] ?? '';

		// Dedup by UID.
		if ( ! empty( $uid ) ) {
			$existing = get_posts(
				array(
					'post_type'      => 'eventkoi_event',
					'post_status'    => 'any',
					'meta_key'       => '_ics_import_source_uid', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
					'meta_value'     => $uid, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
					'posts_per_page' => 1,
					'fields'         => 'ids',
				)
			);

			if ( ! empty( $existing ) ) {
				return false;
			}
		}

		$title       = $event['summary'] ?? __( 'Untitled Event', 'eventkoi' );
		$description = $event['description'] ?? '';
		$location    = $event['location'] ?? '';
		$start       = $event['dtstart'] ?? '';
		$end         = $event['dtend'] ?? '';
		$all_day     = $event['all_day'] ?? false;
		$rrule       = $event['rrule'] ?? '';
		$url         = $event['url'] ?? '';
		$timezone    = $event['timezone'] ?? '';

		if ( empty( $start ) ) {
			return new WP_Error( 'no_start', __( 'Event has no start date.', 'eventkoi' ) );
		}

		// Convert to ISO 8601.
		$start_iso = self::to_iso_date( $start, $timezone );
		$end_iso   = ! empty( $end ) ? self::to_iso_date( $end, $timezone ) : '';

		// Build event_days for standard events.
		$event_days = array(
			array(
				'start_date' => $start_iso,
				'end_date'   => $end_iso,
				'all_day'    => $all_day,
			),
		);

		// Location.
		$locations   = array();
		$event_type  = 'inperson';
		$virtual_url = '';

		if ( ! empty( $location ) ) {
			$locations[] = array(
				'type'     => 'physical',
				'name'     => $location,
				'address1' => $location,
				'address2' => '',
				'address3' => '',
				'lat'      => '',
				'lng'      => '',
			);
		}

		if ( ! empty( $url ) && empty( $locations ) ) {
			$virtual_url = $url;
			$event_type  = 'virtual';
		}

		// Recurrence.
		$date_type        = 'standard';
		$recurrence_rules = array();

		if ( ! empty( $rrule ) ) {
			$converted = self::convert_rrule( $rrule, $start_iso, $end_iso, $timezone );
			if ( ! empty( $converted ) ) {
				$date_type        = 'recurring';
				$recurrence_rules = array( $converted );
				$event_days       = array();
			}
		}

		// Create the EventKoi event post.
		$new_post_id = wp_insert_post(
			array(
				'post_type'   => 'eventkoi_event',
				'post_status' => 'publish',
				'post_title'  => $title,
				'post_name'   => sanitize_title_with_dashes( $title, '', 'save' ),
				'post_author' => get_current_user_id(),
			),
			true
		);

		if ( is_wp_error( $new_post_id ) ) {
			return $new_post_id;
		}

		// Set meta.
		update_post_meta( $new_post_id, 'description', wp_kses_post( $description ) );
		update_post_meta( $new_post_id, 'date_type', $date_type );
		update_post_meta( $new_post_id, 'start_date', $start_iso );
		update_post_meta( $new_post_id, 'start_timestamp', strtotime( $start_iso ) );
		update_post_meta( $new_post_id, 'event_days', $event_days );
		update_post_meta( $new_post_id, 'locations', $locations );
		update_post_meta( $new_post_id, 'type', $event_type );
		update_post_meta( $new_post_id, 'standard_type', 'selected' );
		update_post_meta( $new_post_id, 'embed_gmap', false );
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

		// Legacy location fields.
		if ( ! empty( $locations[0] ) ) {
			$primary = $locations[0];
			update_post_meta( $new_post_id, 'location', $primary );
			update_post_meta( $new_post_id, 'address1', $primary['address1'] ?? '' );
		}

		// Store UID for dedup.
		if ( ! empty( $uid ) ) {
			update_post_meta( $new_post_id, '_ics_import_source_uid', $uid );
		}

		// Assign default calendar.
		$default_cal = (int) get_option( 'eventkoi_default_event_cal', 0 );
		if ( $default_cal ) {
			wp_set_post_terms( $new_post_id, array( $default_cal ), 'event_cal' );
		}

		return array(
			'event_id' => $new_post_id,
			'title'    => $title,
		);
	}

	/**
	 * Parse ICS file content into an array of event data.
	 *
	 * @param string $content Raw ICS file content.
	 * @return array Parsed events.
	 */
	private static function parse_ics( $content ) {
		// Unfold lines per RFC 5545 (continuation lines start with space or tab).
		$content = str_replace( "\r\n", "\n", $content );
		$content = preg_replace( '/\n[ \t]/', '', $content );

		// Extract VEVENT blocks.
		preg_match_all( '/BEGIN:VEVENT(.*?)END:VEVENT/s', $content, $matches );

		if ( empty( $matches[1] ) ) {
			return array();
		}

		$events = array();

		foreach ( $matches[1] as $block ) {
			$event = self::parse_vevent( $block );
			if ( ! empty( $event['dtstart'] ) ) {
				$events[] = $event;
			}
		}

		return $events;
	}

	/**
	 * Parse a single VEVENT block into structured data.
	 *
	 * @param string $block VEVENT block content.
	 * @return array Parsed event data.
	 */
	private static function parse_vevent( $block ) {
		$lines = explode( "\n", trim( $block ) );
		$event = array(
			'uid'         => '',
			'summary'     => '',
			'description' => '',
			'dtstart'     => '',
			'dtend'       => '',
			'location'    => '',
			'rrule'       => '',
			'url'         => '',
			'all_day'     => false,
			'timezone'    => '',
		);

		foreach ( $lines as $line ) {
			$line = trim( $line );
			if ( empty( $line ) || strpos( $line, ':' ) === false ) {
				continue;
			}

			// Split property+params from value at the first colon.
			$colon_pos = strpos( $line, ':' );
			$prop_part = substr( $line, 0, $colon_pos );
			$value     = substr( $line, $colon_pos + 1 );

			// Separate property name from parameters (e.g. DTSTART;TZID=...).
			$semi_pos  = strpos( $prop_part, ';' );
			$prop_name = $semi_pos !== false ? substr( $prop_part, 0, $semi_pos ) : $prop_part;
			$params    = $semi_pos !== false ? substr( $prop_part, $semi_pos + 1 ) : '';

			$prop_name = strtoupper( $prop_name );

			switch ( $prop_name ) {
				case 'UID':
					$event['uid'] = $value;
					break;

				case 'SUMMARY':
					$event['summary'] = self::unescape_ics_text( $value );
					break;

				case 'DESCRIPTION':
					$event['description'] = self::unescape_ics_text( $value );
					break;

				case 'LOCATION':
					$event['location'] = self::unescape_ics_text( $value );
					break;

				case 'URL':
					$event['url'] = $value;
					break;

				case 'DTSTART':
					$event['dtstart']  = $value;
					$event['all_day']  = self::is_all_day( $value, $params );
					$event['timezone'] = self::extract_timezone( $params );
					break;

				case 'DTEND':
					$event['dtend'] = $value;
					break;

				case 'RRULE':
					$event['rrule'] = $value;
					break;
			}
		}

		return $event;
	}

	/**
	 * Determine if a DTSTART value represents an all-day event.
	 *
	 * @param string $value  Date value.
	 * @param string $params Property parameters.
	 * @return bool
	 */
	private static function is_all_day( $value, $params ) {
		if ( stripos( $params, 'VALUE=DATE' ) !== false ) {
			return true;
		}
		$value = trim( $value );
		return strlen( $value ) === 8 && ctype_digit( $value );
	}

	/**
	 * Extract timezone identifier from property parameters.
	 *
	 * @param string $params Property parameters string.
	 * @return string Timezone identifier or empty.
	 */
	private static function extract_timezone( $params ) {
		if ( preg_match( '/TZID=([^;:]+)/i', $params, $m ) ) {
			return trim( $m[1] );
		}
		return '';
	}

	/**
	 * Convert an ICS date string to ISO 8601 format.
	 *
	 * Handles: VALUE=DATE (20250315), UTC (20250315T173000Z), with TZID (20250315T173000).
	 *
	 * @param string $ics_date ICS date string.
	 * @param string $timezone Timezone identifier.
	 * @return string ISO 8601 date string.
	 */
	private static function to_iso_date( $ics_date, $timezone = '' ) {
		$ics_date = trim( $ics_date );

		if ( empty( $ics_date ) ) {
			return '';
		}

		try {
			// All-day: 20250315.
			if ( strlen( $ics_date ) === 8 && ctype_digit( $ics_date ) ) {
				$dt = \DateTime::createFromFormat( 'Ymd', $ics_date, wp_timezone() );
				if ( $dt ) {
					$dt->setTime( 0, 0, 0 );
					return $dt->format( 'c' );
				}
			}

			// UTC: 20250315T173000Z.
			if ( substr( $ics_date, -1 ) === 'Z' ) {
				$clean = str_replace( array( 'T', 'Z' ), array( '', '' ), $ics_date );
				$dt    = \DateTime::createFromFormat( 'YmdHis', $clean, new \DateTimeZone( 'UTC' ) );
				if ( $dt ) {
					return $dt->format( 'c' );
				}
			}

			// With timezone: 20250315T173000.
			$clean = str_replace( 'T', '', $ics_date );
			$tz    = ! empty( $timezone ) ? new \DateTimeZone( $timezone ) : wp_timezone();
			$dt    = \DateTime::createFromFormat( 'YmdHis', $clean, $tz );
			if ( $dt ) {
				return $dt->format( 'c' );
			}
		} catch ( \Exception $e ) {
			// Fallback: return as-is.
		}

		return $ics_date;
	}

	/**
	 * Convert an RRULE string to EventKoi recurrence_rules format.
	 *
	 * @param string $rrule_string RRULE value (e.g. FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10).
	 * @param string $start_iso    Start date in ISO format.
	 * @param string $end_iso      End date in ISO format.
	 * @param string $timezone     Timezone identifier.
	 * @return array EventKoi recurrence rule, or empty array.
	 */
	private static function convert_rrule( $rrule_string, $start_iso, $end_iso, $timezone ) {
		$parts = array();
		foreach ( explode( ';', $rrule_string ) as $part ) {
			$kv = explode( '=', $part, 2 );
			if ( count( $kv ) === 2 ) {
				$parts[ strtoupper( $kv[0] ) ] = $kv[1];
			}
		}

		$freq_map = array(
			'DAILY'   => 'day',
			'WEEKLY'  => 'week',
			'MONTHLY' => 'month',
			'YEARLY'  => 'year',
		);

		$freq = $parts['FREQ'] ?? '';
		if ( empty( $freq ) || ! isset( $freq_map[ $freq ] ) ) {
			return array();
		}

		$ek_rule = array(
			'start_date' => $start_iso,
			'end_date'   => $end_iso,
			'frequency'  => $freq_map[ $freq ],
			'all_day'    => false,
		);

		// BYDAY → weekdays.
		if ( ! empty( $parts['BYDAY'] ) ) {
			$day_map = array(
				'SU' => 0,
				'MO' => 1,
				'TU' => 2,
				'WE' => 3,
				'TH' => 4,
				'FR' => 5,
				'SA' => 6,
			);
			$days = array();
			foreach ( explode( ',', $parts['BYDAY'] ) as $d ) {
				$d = preg_replace( '/[^A-Z]/', '', strtoupper( $d ) );
				if ( isset( $day_map[ $d ] ) ) {
					$days[] = $day_map[ $d ];
				}
			}
			if ( ! empty( $days ) ) {
				$ek_rule['weekdays'] = $days;
			}
		}

		// COUNT.
		if ( ! empty( $parts['COUNT'] ) ) {
			$ek_rule['count'] = (int) $parts['COUNT'];
		}

		// UNTIL.
		if ( ! empty( $parts['UNTIL'] ) ) {
			$ek_rule['until'] = self::to_iso_date( $parts['UNTIL'], $timezone );
		}

		return $ek_rule;
	}

	/**
	 * Unescape ICS text values per RFC 5545.
	 *
	 * @param string $text Escaped ICS text.
	 * @return string Unescaped text.
	 */
	private static function unescape_ics_text( $text ) {
		$text = str_replace( '\\n', "\n", $text );
		$text = str_replace( '\\N', "\n", $text );
		$text = str_replace( '\\,', ',', $text );
		$text = str_replace( '\\;', ';', $text );
		$text = str_replace( '\\\\', '\\', $text );
		return $text;
	}

	/**
	 * Get UIDs that have already been imported.
	 *
	 * @return array Array of UID strings.
	 */
	private static function get_imported_uids() {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$uids = $wpdb->get_col(
			"SELECT meta_value FROM {$wpdb->postmeta}
			 WHERE meta_key = '_ics_import_source_uid'"
		);

		return $uids;
	}
}
