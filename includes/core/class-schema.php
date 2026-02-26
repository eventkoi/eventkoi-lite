<?php
/**
 * Schema.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Schema.
 */
class Schema {

	/**
	 * Init.
	 */
	public function __construct() {
		add_action( 'wp_head', array( __CLASS__, 'add_event_schema' ) );
	}

	/**
	 * Add event schema to wp_head.
	 */
	public static function add_event_schema() {
		if ( ! is_singular( 'eventkoi_event' ) ) {
			return;
		}

		$event  = new Event( get_the_ID() );
		$status = $event->get_status();

		$schema = array(
			'@context'            => 'https://schema.org',
			'@type'               => 'Event',
			'name'                => $event->get_title(),
			'url'                 => get_permalink( $event->get_id() ),
			'startDate'           => $event->get_start_date_iso(),
			'endDate'             => $event->get_end_date_iso(),
			'eventAttendanceMode' => 'virtual' === $event->get_type()
				? 'https://schema.org/OnlineEventAttendanceMode'
				: 'https://schema.org/OfflineEventAttendanceMode',
			'eventStatus'         => match ( $status ) {
				'completed' => 'https://schema.org/EventCompleted',
				'cancelled' => 'https://schema.org/EventCancelled',
				'live'      => 'https://schema.org/EventInProgress',
				default     => 'https://schema.org/EventScheduled',
			},
		);

		$type          = (string) $event->get_type();
		$location      = $event->get_location();
		$virtual_url   = trim( (string) $event->get_virtual_url() );
		$place_name    = isset( $location['name'] ) ? trim( (string) $location['name'] ) : '';
		$street_parts  = array_filter(
			array(
				isset( $location['address1'] ) ? trim( (string) $location['address1'] ) : '',
				isset( $location['address2'] ) ? trim( (string) $location['address2'] ) : '',
			)
		);
		$street_address = ! empty( $street_parts ) ? implode( ', ', $street_parts ) : '';

		$address = array_filter(
			array(
				'@type'           => 'PostalAddress',
				'streetAddress'   => $street_address,
				'addressLocality' => isset( $location['city'] ) ? trim( (string) $location['city'] ) : '',
				'addressRegion'   => isset( $location['state'] ) ? trim( (string) $location['state'] ) : '',
				'postalCode'      => isset( $location['zip'] ) ? trim( (string) $location['zip'] ) : '',
				'addressCountry'  => isset( $location['country'] ) ? trim( (string) $location['country'] ) : '',
			),
			static function ( $value ) {
				return '' !== (string) $value;
			}
		);

		$place = array_filter(
			array(
				'@type'   => 'Place',
				'name'    => $place_name,
				'address' => ( count( $address ) > 1 ? $address : null ),
			),
			static function ( $value ) {
				if ( null === $value ) {
					return false;
				}
				if ( is_array( $value ) ) {
					return ! empty( $value );
				}
				return '' !== (string) $value;
			}
		);
		$place_valid = ( count( $place ) > 1 );

		$virtual_location = array();
		if ( '' !== $virtual_url ) {
			$virtual_location = array(
				'@type' => 'VirtualLocation',
				'url'   => $virtual_url,
			);
		}

		$has_virtual_location = ! empty( $virtual_location );
		$has_both_locations   = ( $place_valid && $has_virtual_location );

		if ( 'mixed' === $type || $has_both_locations ) {
			$locations = array();
			if ( $place_valid ) {
				$locations[] = $place;
			}
			if ( $has_virtual_location ) {
				$locations[] = $virtual_location;
			}
			if ( 1 === count( $locations ) ) {
				$schema['location'] = $locations[0];
			} elseif ( count( $locations ) > 1 ) {
				$schema['location'] = $locations;
			}
		} elseif ( 'virtual' === $type ) {
			if ( $has_virtual_location ) {
				$schema['location'] = $virtual_location;
			}
		} elseif ( $place_valid ) {
			$schema['location'] = $place;
		}

		$schema['image']       = $event->get_image();
		$schema['description'] = $event->get_summary();

		// Allow developers to modify the schema.
		$schema = apply_filters( 'eventkoi_get_event_schema', $schema );

		echo '<script type="application/ld+json">' . wp_kses_post(
			wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE )
		) . '</script>';
	}
}
