<?php
/**
 * Class to generate iCal download.
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
 * ICal class to handle iCal file generation.
 */
class ICal {

	/**
	 * Initialize hooks.
	 */
	public function __construct() {
		add_action( 'template_redirect', array( $this, 'generate_ics_download' ) );
	}

	/**
	 * Generate .ics file and force download.
	 */
	public function generate_ics_download() {
		$ical        = filter_input( INPUT_GET, 'ical', FILTER_DEFAULT );
		$instance_ts = eventkoi_get_instance_id();
		$ical        = sanitize_text_field( $ical );

		if ( empty( $ical ) ) {
			return;
		}

		$event_id = absint( get_the_ID() );
		if ( ! $event_id ) {
			wp_die( esc_html__( 'Invalid event ID.', 'eventkoi' ), 400 );
		}

		$event = new Event( $event_id );

		if ( $instance && 'recurring' === $event::get_date_type() ) {
			// Build dynamic single-instance iCal.
			$rule  = $event::get_recurrence_rules()[0] ?? null;
			$start = (int) $instance;
			$end   = $start;

			if ( ! empty( $rule['start_date'] ) && ! empty( $rule['end_date'] ) ) {
				$duration = strtotime( $rule['end_date'] ) - strtotime( $rule['start_date'] );
				if ( $duration > 0 ) {
					$end = $start + $duration;
				}
			} else {
				$end = $start + HOUR_IN_SECONDS;
			}

			$vevent = $this->build_vevent(
				$start,
				$end,
				(bool) ( $rule['all_day'] ?? false ),
				$event->get_title(),
				$this->clean_description( $event->get_summary() ),
				$this->get_location( $event )
			);

			$content  = "BEGIN:VCALENDAR\nVERSION:2.0\nMETHOD:PUBLISH\n";
			$content .= $vevent . "\nEND:VCALENDAR\n";

			$this->send_headers(
				sanitize_title_with_dashes( $event->get_title() ) . '-' . $start . '.ics'
			);
			echo wp_kses_post( trim( $content ) );
			exit;
		}

		// Fallback to legacy logic for standard or recurring (no instance).
		$this->output_ics_file( $event );
	}

	/**
	 * Output .ics file content.
	 *
	 * @param Event $event Event object.
	 */
	private function output_ics_file( $event ) {
		$filename = sanitize_title_with_dashes( $event->get_title() ) . '-' . bin2hex( random_bytes( 2 ) ) . '.ics';

		$vevents = array();
		$type    = $event::get_date_type();

		if ( 'recurring' === $type ) {
			$rules = $event::get_recurrence_rules();

			foreach ( $rules as $rule ) {
				if ( empty( $rule['start_date'] ) ) {
					continue;
				}

				$start_ts = strtotime( $rule['start_date'] );
				$end_ts   = ! empty( $rule['end_date'] ) ? strtotime( $rule['end_date'] ) : false;
				$all_day  = ! empty( $rule['all_day'] );

				if ( false === $end_ts || $end_ts < $start_ts ) {
					$end_ts = $all_day ? $start_ts : $start_ts + HOUR_IN_SECONDS;
				}

				$vevents[] = $this->build_vevent(
					$start_ts,
					$end_ts,
					$all_day,
					$event->get_title(),
					$this->clean_description( $event->get_summary() ),
					$this->get_location( $event )
				);
			}
		} else {
			$instance = $event::get_first_instance();
			$start_ts = strtotime( $instance['start_date'] );
			$end_ts   = ! empty( $instance['end_date'] ) ? strtotime( $instance['end_date'] ) : false;
			$all_day  = ! empty( $instance['all_day'] );

			if ( false === $end_ts || $end_ts < $start_ts ) {
				$end_ts = $all_day ? $start_ts : $start_ts + HOUR_IN_SECONDS;
			}

			$vevents[] = $this->build_vevent(
				$start_ts,
				$end_ts,
				$all_day,
				$event->get_title(),
				$this->clean_description( $event->get_summary() ),
				$this->get_location( $event )
			);
		}

		$content  = "BEGIN:VCALENDAR\nVERSION:2.0\nMETHOD:PUBLISH\n";
		$content .= implode( "\n", $vevents );
		$content .= "\nEND:VCALENDAR\n";

		$this->send_headers( $filename );

		echo wp_kses_post( trim( $content ) );
		exit;
	}

	/**
	 * Clean and escape description.
	 *
	 * @param string $description Raw text.
	 * @return string Cleaned text.
	 */
	private function clean_description( $description ) {
		$description = wp_strip_all_tags( $description );
		$description = preg_replace( '/\s+/', ' ', $description );
		$description = trim( $description );

		return str_replace( array( "\r", "\n" ), '\n', $description );
	}

	/**
	 * Build a single VEVENT block.
	 *
	 * @param int    $start_ts   Start timestamp.
	 * @param int    $end_ts     End timestamp.
	 * @param bool   $all_day    All-day flag.
	 * @param string $summary    Event title.
	 * @param string $description Event description.
	 * @param string $location   Event location.
	 * @return string VEVENT block.
	 */
	private function build_vevent( $start_ts, $end_ts, $all_day, $summary, $description, $location ) {
		if ( $all_day ) {
			$start   = gmdate( 'Ymd', $start_ts );
			$end     = gmdate( 'Ymd', $end_ts + DAY_IN_SECONDS ); // End is exclusive for all-day.
			$dtstart = "DTSTART;VALUE=DATE:{$start}";
			$dtend   = "DTEND;VALUE=DATE:{$end}";
		} else {
			$start   = gmdate( 'Ymd\THis\Z', $start_ts );
			$end     = gmdate( 'Ymd\THis\Z', $end_ts );
			$dtstart = "DTSTART:{$start}";
			$dtend   = "DTEND:{$end}";
		}

		return "BEGIN:VEVENT\n"
			. "{$dtstart}\n"
			. "{$dtend}\n"
			. 'UID:' . wp_generate_uuid4() . "\n"
			. 'DTSTAMP:' . gmdate( 'Ymd\THis\Z' ) . "\n"
			. 'SUMMARY:' . $summary . "\n"
			. 'DESCRIPTION:' . $description . "\n"
			. 'LOCATION:' . $location . "\n"
			. "TRANSP:OPAQUE\n"
			. "SEQUENCE:0\n"
			. "PRIORITY:1\n"
			. "CLASS:PUBLIC\n"
			. "BEGIN:VALARM\n"
			. "TRIGGER:-PT10080M\n"
			. "ACTION:DISPLAY\n"
			. "DESCRIPTION:Reminder\n"
			. "END:VALARM\n"
			. 'END:VEVENT';
	}

	/**
	 * Get formatted location.
	 *
	 * @param Event $event Event object.
	 * @return string Location string.
	 */
	private function get_location( $event ) {
		$locations = $event::get_locations();

		if ( empty( $locations ) || ! is_array( $locations ) ) {
			return '';
		}

		$primary = $locations[0];

		if ( ! is_array( $primary ) || empty( $primary['type'] ) ) {
			return '';
		}

		if ( in_array( $primary['type'], array( 'virtual', 'online' ), true ) ) {
			return esc_url( $primary['virtual_url'] ?? '' );
		}

		$parts = array(
			$primary['name'] ?? '',
			$primary['address1'] ?? '',
			$primary['address2'] ?? '',
			implode(
				', ',
				array_filter(
					array(
						$primary['city'] ?? '',
						$primary['state'] ?? '',
						$primary['zip'] ?? '',
					)
				)
			),
			$primary['country'] ?? '',
		);

		return esc_html( implode( ', ', array_filter( $parts ) ) );
	}

	/**
	 * Send HTTP headers for file download.
	 *
	 * @param string $filename File name.
	 */
	private function send_headers( $filename ) {
		header( 'Content-Type: text/calendar; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="' . esc_attr( $filename ) . '"' );
		header( 'Connection: close' );
	}
}
