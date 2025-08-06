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
		if ( ! is_singular( 'event' ) ) {
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

		if ( 'virtual' === $event->get_type() ) {
			$schema['location'] = array(
				'@type' => 'VirtualLocation',
				'url'   => $event->get_virtual_url(),
			);
		} else {
			$location = $event->get_location();

			$schema['location'] = array(
				'@type'   => 'Place',
				'name'    => $location['name'] ?? '',
				'address' => array(
					'@type'           => 'PostalAddress',
					'streetAddress'   => $location['street'] ?? '',
					'addressLocality' => $location['city'] ?? '',
					'addressRegion'   => $location['state'] ?? '',
					'postalCode'      => $location['zip'] ?? '',
					'addressCountry'  => $location['country'] ?? '',
				),
			);
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
