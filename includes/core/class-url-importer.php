<?php
/**
 * URL Event Importer.
 *
 * Fetches a URL, extracts JSON-LD / OG meta event data, and imports into EventKoi.
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
 * Class URL_Importer
 *
 * Handles extracting event data from URLs and importing events.
 */
class URL_Importer {

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
			'/url-import',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'import_from_url' ),
				'permission_callback' => array( REST::class, 'private_api' ),
			)
		);
	}

	/**
	 * Fetch a URL, extract event data, create a draft event, and return the ID.
	 *
	 * @param WP_REST_Request $request The REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function import_from_url( WP_REST_Request $request ) {
		$data = $request->get_json_params();
		$url  = isset( $data['url'] ) ? trim( $data['url'] ) : '';

		// Validate URL.
		if ( empty( $url ) || ! filter_var( $url, FILTER_VALIDATE_URL ) ) {
			return new WP_Error( 'invalid_url', __( 'Please enter a valid URL.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		if ( ! wp_http_validate_url( $url ) ) {
			return new WP_Error( 'invalid_url', __( 'Please enter a valid URL.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		// Check dedup.
		$source_uid       = hash( 'sha256', $url );
		$already_imported = self::find_existing_event( $source_uid );

		if ( $already_imported ) {
			return rest_ensure_response(
				array(
					'success'          => true,
					'already_imported' => true,
					'event_id'         => $already_imported,
					'event_title'      => get_the_title( $already_imported ),
				)
			);
		}

		// Fetch the page.
		$response = wp_safe_remote_get(
			$url,
			array(
				'timeout'    => 15,
				'user-agent' => 'EventKoi/' . EVENTKOI_VERSION . ' (WordPress; +' . home_url() . ')',
				'headers'    => array(
					'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'fetch_failed', __( 'Could not reach the URL.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		if ( $status_code < 200 || $status_code >= 400 ) {
			return new WP_Error(
				'fetch_failed',
				sprintf(
					/* translators: %d: HTTP status code */
					__( 'The page returned an error (HTTP %d).', 'eventkoi-lite' ),
					$status_code
				),
				array( 'status' => 400 )
			);
		}

		$html = wp_remote_retrieve_body( $response );
		if ( empty( $html ) ) {
			return new WP_Error( 'no_data', __( 'No event data found on this page.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		// Limit body size to 2MB.
		if ( strlen( $html ) > 2 * 1024 * 1024 ) {
			$html = substr( $html, 0, 2 * 1024 * 1024 );
		}

		// Parse event data.
		$event_data = self::parse_html( $html );

		if ( empty( $event_data ) || empty( $event_data['title'] ) ) {
			return new WP_Error( 'no_data', __( 'No event data found on this page.', 'eventkoi-lite' ), array( 'status' => 400 ) );
		}

		$event_data['source_url'] = $url;
		$event_data['source_uid'] = $source_uid;

		// Create the event as a draft.
		$result = self::create_event( $event_data );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response(
			array(
				'success'  => true,
				'event_id' => $result['event_id'],
				'title'    => $result['title'],
			)
		);
	}

	/**
	 * Parse HTML to extract event data from JSON-LD and OG meta tags.
	 *
	 * @param string $html The HTML content.
	 * @return array Parsed event data or empty array.
	 */
	private static function parse_html( $html ) {
		$prev = libxml_use_internal_errors( true );

		$doc = new \DOMDocument();
		$doc->loadHTML( '<?xml encoding="UTF-8">' . $html, LIBXML_NOWARNING | LIBXML_NOERROR );

		libxml_clear_errors();
		libxml_use_internal_errors( $prev );

		$xpath = new \DOMXPath( $doc );

		// Try JSON-LD first.
		$event_data = self::extract_json_ld( $xpath );

		// Fall back to OG meta tags.
		if ( empty( $event_data ) ) {
			$event_data = self::extract_og_meta( $xpath );
		} elseif ( empty( $event_data['image_url'] ) ) {
			// Supplement missing image from OG.
			$og = self::extract_og_meta( $xpath );
			if ( ! empty( $og['image_url'] ) ) {
				$event_data['image_url'] = $og['image_url'];
			}
		}

		return $event_data;
	}

	/**
	 * Extract event data from JSON-LD structured data.
	 *
	 * @param \DOMXPath $xpath The DOMXPath instance.
	 * @return array Parsed event data or empty array.
	 */
	private static function extract_json_ld( \DOMXPath $xpath ) {
		$scripts = $xpath->query( '//script[@type="application/ld+json"]' );

		if ( ! $scripts || 0 === $scripts->length ) {
			return array();
		}

		foreach ( $scripts as $script ) {
			$json = trim( $script->textContent );
			if ( empty( $json ) ) {
				continue;
			}

			$decoded = json_decode( $json, true );
			if ( ! is_array( $decoded ) ) {
				continue;
			}

			$event = self::find_event_in_json_ld( $decoded );
			if ( ! empty( $event ) ) {
				return self::map_schema_to_eventkoi( $event );
			}
		}

		return array();
	}

	/**
	 * Recursively find an Event object in JSON-LD data.
	 *
	 * Handles direct objects, arrays, and @graph patterns.
	 *
	 * @param array $data Decoded JSON-LD data.
	 * @return array|null The Event object or null.
	 */
	private static function find_event_in_json_ld( $data ) {
		if ( ! is_array( $data ) ) {
			return null;
		}

		// Check if this is directly an Event.
		if ( isset( $data['@type'] ) && self::is_event_type( $data['@type'] ) ) {
			return $data;
		}

		// Check @graph array.
		if ( isset( $data['@graph'] ) && is_array( $data['@graph'] ) ) {
			foreach ( $data['@graph'] as $item ) {
				if ( isset( $item['@type'] ) && self::is_event_type( $item['@type'] ) ) {
					return $item;
				}
			}
		}

		// Check if it's a plain array of items.
		if ( isset( $data[0] ) ) {
			foreach ( $data as $item ) {
				if ( is_array( $item ) && isset( $item['@type'] ) && self::is_event_type( $item['@type'] ) ) {
					return $item;
				}
			}
		}

		return null;
	}

	/**
	 * Check if a @type value represents a Schema.org Event.
	 *
	 * @param string|array $type The @type value.
	 * @return bool
	 */
	private static function is_event_type( $type ) {
		$event_types = array(
			'Event',
			'BusinessEvent',
			'ChildrensEvent',
			'ComedyEvent',
			'CourseInstance',
			'DanceEvent',
			'DeliveryEvent',
			'EducationEvent',
			'EventSeries',
			'ExhibitionEvent',
			'Festival',
			'FoodEvent',
			'Hackathon',
			'LiteraryEvent',
			'MusicEvent',
			'PublicationEvent',
			'SaleEvent',
			'ScreeningEvent',
			'SocialEvent',
			'SportsEvent',
			'TheaterEvent',
			'VisualArtsEvent',
		);

		if ( is_array( $type ) ) {
			foreach ( $type as $t ) {
				if ( in_array( $t, $event_types, true ) ) {
					return true;
				}
			}
			return false;
		}

		return in_array( $type, $event_types, true );
	}

	/**
	 * Map Schema.org Event data to EventKoi fields.
	 *
	 * @param array $event Schema.org Event object.
	 * @return array EventKoi-formatted event data.
	 */
	private static function map_schema_to_eventkoi( $event ) {
		$data = array(
			'title'            => '',
			'description'      => '',
			'start_date'       => '',
			'end_date'         => '',
			'timezone'         => '',
			'type'             => 'inperson',
			'image_url'        => '',
			'location_name'    => '',
			'location_address' => '',
			'location_city'    => '',
			'location_state'   => '',
			'location_country' => '',
			'location_zip'     => '',
			'virtual_url'      => '',
		);

		// Title.
		$data['title'] = sanitize_text_field( $event['name'] ?? '' );

		// Description.
		$desc = $event['description'] ?? '';
		if ( is_string( $desc ) ) {
			$data['description'] = wp_kses_post( $desc );
		}

		// Extract timezone from the raw source date before converting to UTC.
		$raw_start = $event['startDate'] ?? '';
		if ( ! empty( $raw_start ) ) {
			$data['timezone'] = self::extract_timezone_from_iso( $raw_start );
		}

		// Dates — converted to UTC for internal storage.
		$data['start_date'] = self::normalize_iso_date( $raw_start );
		$data['end_date']   = self::normalize_iso_date( $event['endDate'] ?? '' );

		// Image.
		$image = $event['image'] ?? '';
		if ( is_string( $image ) && ! empty( $image ) ) {
			$data['image_url'] = esc_url_raw( $image );
		} elseif ( is_array( $image ) ) {
			if ( isset( $image['url'] ) ) {
				$data['image_url'] = esc_url_raw( $image['url'] );
			} elseif ( isset( $image[0] ) ) {
				$first = $image[0];
				if ( is_string( $first ) ) {
					$data['image_url'] = esc_url_raw( $first );
				} elseif ( is_array( $first ) && isset( $first['url'] ) ) {
					$data['image_url'] = esc_url_raw( $first['url'] );
				}
			}
		}

		// Location.
		$location = $event['location'] ?? null;
		if ( is_array( $location ) ) {
			$locations = isset( $location['@type'] ) ? array( $location ) : ( isset( $location[0] ) ? $location : array( $location ) );

			foreach ( $locations as $loc ) {
				$loc_type = $loc['@type'] ?? '';

				if ( 'VirtualLocation' === $loc_type ) {
					$data['virtual_url'] = esc_url_raw( $loc['url'] ?? '' );
				} else {
					$data['location_name'] = sanitize_text_field( $loc['name'] ?? '' );

					$address = $loc['address'] ?? null;
					if ( is_string( $address ) ) {
						$data['location_address'] = sanitize_text_field( $address );
					} elseif ( is_array( $address ) ) {
						$data['location_address'] = sanitize_text_field( $address['streetAddress'] ?? '' );
						$data['location_city']    = sanitize_text_field( $address['addressLocality'] ?? '' );
						$data['location_state']   = sanitize_text_field( $address['addressRegion'] ?? '' );
						$data['location_country'] = sanitize_text_field( $address['addressCountry'] ?? '' );
						$data['location_zip']     = sanitize_text_field( $address['postalCode'] ?? '' );
					}
				}
			}
		} elseif ( is_string( $location ) && ! empty( $location ) ) {
			$data['location_name'] = sanitize_text_field( $location );
		}

		// Attendance mode.
		$attendance_mode = $event['eventAttendanceMode'] ?? '';
		if ( is_string( $attendance_mode ) ) {
			if ( false !== strpos( $attendance_mode, 'Online' ) ) {
				$data['type'] = 'virtual';
			} elseif ( false !== strpos( $attendance_mode, 'Mixed' ) ) {
				$data['type'] = 'hybrid';
			}
		}

		// If we have a virtual URL but type is still inperson, adjust.
		if ( ! empty( $data['virtual_url'] ) && 'inperson' === $data['type'] ) {
			$data['type'] = empty( $data['location_name'] ) ? 'virtual' : 'hybrid';
		}

		return $data;
	}

	/**
	 * Extract event data from OG meta tags as a fallback.
	 *
	 * @param \DOMXPath $xpath The DOMXPath instance.
	 * @return array Parsed event data or empty array.
	 */
	private static function extract_og_meta( \DOMXPath $xpath ) {
		$og = array();

		$metas = $xpath->query( '//meta[starts-with(@property,"og:")]' );
		if ( $metas ) {
			foreach ( $metas as $meta ) {
				$property = $meta->getAttribute( 'property' );
				$content  = $meta->getAttribute( 'content' );
				if ( ! empty( $property ) && ! empty( $content ) ) {
					$og[ $property ] = $content;
				}
			}
		}

		// Also check meta name tags for title/description.
		if ( empty( $og['og:title'] ) ) {
			$title_node = $xpath->query( '//title' );
			if ( $title_node && $title_node->length > 0 ) {
				$og['og:title'] = $title_node->item( 0 )->textContent;
			}
		}

		if ( empty( $og['og:title'] ) ) {
			return array();
		}

		return array(
			'title'            => sanitize_text_field( $og['og:title'] ?? '' ),
			'description'      => wp_kses_post( $og['og:description'] ?? '' ),
			'start_date'       => '',
			'end_date'         => '',
			'timezone'         => '',
			'type'             => 'inperson',
			'image_url'        => esc_url_raw( $og['og:image'] ?? '' ),
			'location_name'    => '',
			'location_address' => '',
			'location_city'    => '',
			'location_state'   => '',
			'location_country' => '',
			'location_zip'     => '',
			'virtual_url'      => '',
		);
	}

	/**
	 * Create an EventKoi event from extracted data.
	 *
	 * @param array $event_data Extracted event data.
	 * @return array|WP_Error Array with event_id/title on success, WP_Error on failure.
	 */
	private static function create_event( $event_data ) {
		$title       = $event_data['title'] ?? __( 'Untitled Event', 'eventkoi-lite' );
		$description = $event_data['description'] ?? '';
		$start_date  = $event_data['start_date'] ?? '';
		$end_date    = $event_data['end_date'] ?? '';
		$timezone    = $event_data['timezone'] ?? '';
		$event_type  = $event_data['type'] ?? 'inperson';
		$image_url   = $event_data['image_url'] ?? '';
		$source_url  = $event_data['source_url'] ?? '';
		$source_uid  = $event_data['source_uid'] ?? '';

		// Determine if this is a multi-day (continuous) or single-day (selected) event.
		$is_multi_day = false;
		if ( ! empty( $start_date ) && ! empty( $end_date ) ) {
			try {
				$start_dt = new \DateTime( $start_date );
				$end_dt   = new \DateTime( $end_date );
				$is_multi_day = $start_dt->format( 'Y-m-d' ) !== $end_dt->format( 'Y-m-d' );
			} catch ( \Exception $e ) {
				// Keep single-day.
			}
		}

		$standard_type = $is_multi_day ? 'continuous' : 'selected';

		// Build event_days only for single-day (selected) events.
		$event_days = array();
		if ( ! $is_multi_day && ! empty( $start_date ) ) {
			$event_days[] = array(
				'start_date' => $start_date,
				'end_date'   => ! empty( $end_date ) ? $end_date : $start_date,
				'all_day'    => false,
			);
		}

		// Build locations.
		$locations   = array();
		$virtual_url = $event_data['virtual_url'] ?? '';

		$loc_name    = $event_data['location_name'] ?? '';
		$loc_address = $event_data['location_address'] ?? '';

		if ( ! empty( $loc_name ) || ! empty( $loc_address ) ) {
			$locations[] = array(
				'id'          => wp_generate_uuid4(),
				'type'        => 'physical',
				'name'        => $loc_name,
				'address1'    => $loc_address,
				'address2'    => '',
				'city'        => $event_data['location_city'] ?? '',
				'state'       => $event_data['location_state'] ?? '',
				'country'     => $event_data['location_country'] ?? '',
				'zip'         => $event_data['location_zip'] ?? '',
				'embed_gmap'  => false,
				'gmap_link'   => '',
				'virtual_url' => '',
				'latitude'    => '',
				'longitude'   => '',
			);
		}

		if ( ! empty( $virtual_url ) ) {
			$locations[] = array(
				'id'          => wp_generate_uuid4(),
				'type'        => 'online',
				'name'        => __( 'Online', 'eventkoi-lite' ),
				'address1'    => '',
				'address2'    => '',
				'city'        => '',
				'state'       => '',
				'country'     => '',
				'zip'         => '',
				'embed_gmap'  => false,
				'gmap_link'   => '',
				'virtual_url' => $virtual_url,
				'latitude'    => '',
				'longitude'   => '',
			);
		}

		// Create the post as a draft so the user can review before publishing.
		$new_post_id = wp_insert_post(
			array(
				'post_type'   => 'eventkoi_event',
				'post_status' => 'draft',
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
		update_post_meta( $new_post_id, 'date_type', 'standard' );
		update_post_meta( $new_post_id, 'standard_type', $standard_type );
		update_post_meta( $new_post_id, 'event_days', $event_days );
		update_post_meta( $new_post_id, 'locations', $locations );
		update_post_meta( $new_post_id, 'type', $event_type );
		update_post_meta( $new_post_id, 'embed_gmap', false );
		update_post_meta( $new_post_id, 'virtual_url', sanitize_url( $virtual_url ) );
		update_post_meta( $new_post_id, 'recurrence_rules', array() );
		update_post_meta( $new_post_id, 'attendance_mode', 'none' );
		update_post_meta( $new_post_id, 'timezone_display', false );

		if ( ! empty( $start_date ) ) {
			update_post_meta( $new_post_id, 'start_date', $start_date );
			update_post_meta( $new_post_id, 'start_timestamp', strtotime( $start_date ) );
		}

		if ( ! empty( $end_date ) ) {
			update_post_meta( $new_post_id, 'end_date', $end_date );
			update_post_meta( $new_post_id, 'end_timestamp', strtotime( $end_date ) );
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

		// Store source for dedup.
		if ( ! empty( $source_uid ) ) {
			update_post_meta( $new_post_id, '_url_import_source_uid', $source_uid );
		}
		if ( ! empty( $source_url ) ) {
			update_post_meta( $new_post_id, '_url_import_source_url', esc_url_raw( $source_url ) );
		}

		// Assign default calendar.
		$default_cal = (int) get_option( 'eventkoi_default_event_cal', 0 );
		if ( $default_cal ) {
			wp_set_post_terms( $new_post_id, array( $default_cal ), 'event_cal' );
		}

		// Sideload image.
		if ( ! empty( $image_url ) && filter_var( $image_url, FILTER_VALIDATE_URL ) ) {
			self::sideload_image( $new_post_id, $image_url );
		}

		return array(
			'event_id' => $new_post_id,
			'title'    => $title,
		);
	}

	/**
	 * Sideload a remote image and set it as the event's featured image.
	 *
	 * @param int    $post_id   The post ID.
	 * @param string $image_url The remote image URL.
	 * @return void
	 */
	private static function sideload_image( $post_id, $image_url ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';

		$media_id = media_sideload_image( $image_url, $post_id, null, 'id' );

		if ( ! is_wp_error( $media_id ) ) {
			set_post_thumbnail( $post_id, $media_id );
			update_post_meta( $post_id, 'image', wp_get_attachment_url( $media_id ) );
			update_post_meta( $post_id, 'image_id', $media_id );
		}
	}

	/**
	 * Find an existing event by URL import source UID.
	 *
	 * @param string $source_uid The SHA-256 hash of the source URL.
	 * @return int|false Post ID if found, false otherwise.
	 */
	private static function find_existing_event( $source_uid ) {
		if ( empty( $source_uid ) ) {
			return false;
		}

		$existing = get_posts(
			array(
				'post_type'      => 'eventkoi_event',
				'post_status'    => 'any',
				'meta_key'       => '_url_import_source_uid', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'meta_value'     => $source_uid, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
				'posts_per_page' => 1,
				'fields'         => 'ids',
			)
		);

		return ! empty( $existing ) ? $existing[0] : false;
	}

	/**
	 * Normalize an ISO 8601 date string to UTC.
	 *
	 * EventKoi stores dates internally as UTC. This converts any
	 * timezone-aware date string to UTC ISO 8601 format.
	 *
	 * @param string $date The date string.
	 * @return string UTC ISO 8601 date or empty string.
	 */
	private static function normalize_iso_date( $date ) {
		if ( empty( $date ) || ! is_string( $date ) ) {
			return '';
		}

		try {
			// Use wp_timezone() as fallback for dates without an offset.
			$dt = new \DateTime( $date, wp_timezone() );
			$dt->setTimezone( new \DateTimeZone( 'UTC' ) );
			return $dt->format( 'Y-m-d\TH:i:s\Z' );
		} catch ( \Exception $e ) {
			return '';
		}
	}

	/**
	 * Extract timezone from an ISO 8601 date string.
	 *
	 * @param string $date ISO 8601 date string.
	 * @return string Timezone identifier or empty string.
	 */
	private static function extract_timezone_from_iso( $date ) {
		if ( empty( $date ) ) {
			return '';
		}

		try {
			$dt = new \DateTime( $date );
			$tz = $dt->getTimezone();
			if ( $tz ) {
				$tz_name = $tz->getName();
				// Skip generic offset-only timezones.
				if ( '+00:00' !== $tz_name && 'Z' !== $tz_name && ! preg_match( '/^[+-]\d{2}:\d{2}$/', $tz_name ) ) {
					return $tz_name;
				}
			}
		} catch ( \Exception $e ) {
			// Silence.
		}

		return '';
	}
}
