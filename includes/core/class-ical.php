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
		$ical = isset( $_GET['ical'] ) ? absint( wp_unslash( $_GET['ical'] ) ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- public download, safe input
		if ( 1 !== $ical ) {
			return; // Ignore if not explicitly "1".
		}

		$instance_ts = eventkoi_get_instance_id();

		$event_id = absint( get_the_ID() );
		if ( ! $event_id ) {
			wp_die( esc_html__( 'Invalid event ID.', 'eventkoi-lite' ), 400 );
		}

		$event    = new Event( $event_id );
		$timezone = $this->get_download_timezone( $event );

		$selected_day_index = $this->get_selected_event_day_index();
		if (
			null !== $selected_day_index
			&& 'standard' === $event::get_date_type()
			&& 'selected' === $event::get_standard_type()
		) {
			$vevent = $this->build_selected_day_vevent( $event, $selected_day_index, $timezone );
			if ( '' === $vevent ) {
				wp_die(
					esc_html__( 'Invalid event instance.', 'eventkoi-lite' ),
					esc_html__( 'Invalid event instance.', 'eventkoi-lite' ),
					array( 'response' => 404 )
				);
			}

			$this->output_single_vevent( $event, $vevent );
		}

		if ( $instance_ts && 'recurring' === $event::get_date_type() ) {
			// Build dynamic single-instance iCal.
			$rule  = $event::get_recurrence_rules()[0] ?? null;
			$start = (int) $instance_ts;
			$end   = $start;

			if ( ! empty( $rule['start_date'] ) && ! empty( $rule['end_date'] ) ) {
				$duration = strtotime( $rule['end_date'] ) - strtotime( $rule['start_date'] );
				if ( $duration > 0 ) {
					$end = $start + $duration;
				}
			} else {
				$end = $start + HOUR_IN_SECONDS;
			}

			$all_day = (bool) ( $rule['all_day'] ?? false );
			$range   = is_array( $rule ) ? $rule : array();
			$range['start_date'] = gmdate( 'Y-m-d\TH:i:s\Z', (int) $start );
			$range['end_date']   = ! empty( $end ) ? gmdate( 'Y-m-d\TH:i:s\Z', (int) $end ) : '';

			$vevent_timezone = $all_day ? $this->get_all_day_timezone( $event, $range ) : $timezone;

			$vevent = $this->build_vevent(
				$start,
				$end,
				$all_day,
				$event->get_title(),
				$this->clean_description( $event->get_summary() ),
				$this->get_location( $event ),
				$vevent_timezone
			);

			$this->output_single_vevent( $event, $vevent );
		}

		// Fallback to legacy logic for standard or recurring (no instance).
		$this->output_ics_file( $event, $timezone );
	}

	/**
	 * Get the selected-date row index requested by a calendar occurrence.
	 *
	 * @return int|null
	 */
	private function get_selected_event_day_index() {
		$raw = filter_input( INPUT_GET, 'event_day', FILTER_DEFAULT );

		if ( null === $raw && isset( $_GET['event_day'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only download parameter.
			$raw = wp_unslash( $_GET['event_day'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only download parameter.
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
	 * Output a calendar containing a single VEVENT.
	 *
	 * @param Event  $event  Event object.
	 * @param string $vevent VEVENT content.
	 * @return void
	 */
	private function output_single_vevent( $event, $vevent ) {
		$this->send_headers(
			sanitize_title_with_dashes( $event->get_title() ) . '-' . bin2hex( random_bytes( 2 ) ) . '.ics'
		);
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- iCal text is RFC 5545-escaped + line-folded by build_vcalendar; wp_kses_post would mangle &, <, > in legitimate SUMMARY/DESCRIPTION/URL output.
		echo $this->build_vcalendar( array( $vevent ) );
		exit;
	}

	/**
	 * Output .ics file content.
	 *
	 * @param Event $event Event object.
	 */
	private function output_ics_file( $event, $timezone = null ) {
		$filename = sanitize_title_with_dashes( $event->get_title() ) . '-' . bin2hex( random_bytes( 2 ) ) . '.ics';
		$timezone = $timezone instanceof \DateTimeZone ? $timezone : $this->get_event_timezone( $event );

		$vevents = array();
		$type    = $event::get_date_type();

		if ( 'recurring' === $type ) {
			$rules = $event::get_recurrence_rules();

			foreach ( $rules as $rule ) {
				$vevent = $this->build_instance_vevent( $event, $rule, $timezone );
				if ( '' !== $vevent ) {
					$rrule = $this->build_rrule_line( $rule );
					if ( '' !== $rrule ) {
						$vevent = preg_replace( "/(\nEND:VEVENT)$/", "\n" . $rrule . '$1', $vevent, 1 );
					}
					$vevents[] = $vevent;
				}
			}
		} else {
			$vevents = $this->build_standard_vevents( $event, $timezone );
		}

		$this->send_headers( $filename );

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- iCal text is RFC 5545-escaped + line-folded by build_vcalendar; wp_kses_post would mangle &, <, > in legitimate SUMMARY/DESCRIPTION/URL output.
		echo $this->build_vcalendar( $vevents );
		exit;
	}

	/**
	 * Assemble a fully RFC 5545-compliant VCALENDAR around the given VEVENTs.
	 *
	 * Adds REQUIRED VERSION + PRODID + CALSCALE headers, applies RFC 5545
	 * line folding (each content line ≤75 octets), and joins with CRLF.
	 *
	 * @param string[] $vevents VEVENT blocks (each may use LF separators internally).
	 * @return string Fully assembled iCalendar payload.
	 */
	private function build_vcalendar( array $vevents ) {
		$version = function_exists( 'eventkoi_lite_version' ) ? eventkoi_lite_version() : ( defined( 'EVENTKOI_LITE_VERSION' ) ? EVENTKOI_LITE_VERSION : '1.0' );

		$lines = array(
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//EventKoi//EventKoi Lite ' . $version . '//EN',
			'CALSCALE:GREGORIAN',
			'METHOD:PUBLISH',
		);

		foreach ( $vevents as $vevent ) {
			$vevent = trim( (string) $vevent );
			if ( '' === $vevent ) {
				continue;
			}
			foreach ( preg_split( "/\r\n|\n|\r/", $vevent ) as $line ) {
				if ( '' === $line ) {
					continue;
				}
				$lines[] = $line;
			}
		}

		$lines[] = 'END:VCALENDAR';

		$folded = array();
		foreach ( $lines as $line ) {
			$folded[] = $this->fold_ical_line( $line );
		}

		return implode( "\r\n", $folded ) . "\r\n";
	}

	/**
	 * Fold a single content line per RFC 5545 §3.1.
	 *
	 * @param string $line Single content line (no embedded CR/LF).
	 * @return string Folded line, possibly multi-line.
	 */
	private function fold_ical_line( $line ) {
		if ( strlen( $line ) <= 75 ) {
			return $line;
		}

		$result    = '';
		$remaining = $line;
		$first     = true;
		while ( '' !== $remaining ) {
			$chunk_size = $first ? 75 : 74;
			$chunk      = substr( $remaining, 0, $chunk_size );
			$remaining  = substr( $remaining, $chunk_size );
			if ( $first ) {
				$result = $chunk;
				$first  = false;
			} else {
				$result .= "\r\n " . $chunk;
			}
			if ( false === $remaining ) {
				break;
			}
		}

		return $result;
	}

	/**
	 * Build an RFC 5545 RRULE line from an EventKoi recurrence rule.
	 *
	 * @param array $rule Recurrence rule.
	 * @return string RRULE:... line, or '' when the rule isn't representable.
	 */
	private function build_rrule_line( $rule ) {
		if ( ! is_array( $rule ) || empty( $rule['frequency'] ) ) {
			return '';
		}

		$interval = max( 1, absint( $rule['interval'] ?? 1 ) );
		$parts    = array();

		switch ( (string) $rule['frequency'] ) {
			case 'day':
			case 'working_day':
				$parts[] = 'FREQ=DAILY';
				break;
			case 'week':
				$parts[] = 'FREQ=WEEKLY';
				break;
			case 'month':
				$parts[] = 'FREQ=MONTHLY';
				break;
			case 'year':
				$parts[] = 'FREQ=YEARLY';
				break;
			default:
				return '';
		}

		if ( $interval > 1 ) {
			$parts[] = 'INTERVAL=' . $interval;
		}

		$byday_codes = array(
			0 => 'SU', 1 => 'MO', 2 => 'TU', 3 => 'WE',
			4 => 'TH', 5 => 'FR', 6 => 'SA',
		);
		$byday       = array();
		if ( 'working_day' === $rule['frequency'] ) {
			$byday = array( 'MO', 'TU', 'WE', 'TH', 'FR' );
		} elseif ( ! empty( $rule['weekdays'] ) && is_array( $rule['weekdays'] ) ) {
			foreach ( $rule['weekdays'] as $w ) {
				$wi = (int) $w;
				if ( isset( $byday_codes[ $wi ] ) ) {
					$byday[] = $byday_codes[ $wi ];
				}
			}
		}
		if ( ! empty( $byday ) ) {
			$parts[] = 'BYDAY=' . implode( ',', array_values( array_unique( $byday ) ) );
		}

		if ( ! empty( $rule['months'] ) && is_array( $rule['months'] ) ) {
			$months = array_values( array_filter( array_map( 'absint', $rule['months'] ) ) );
			if ( ! empty( $months ) ) {
				$parts[] = 'BYMONTH=' . implode( ',', $months );
			}
		}

		if ( ! empty( $rule['ends_after'] ) ) {
			$parts[] = 'COUNT=' . absint( $rule['ends_after'] );
		} elseif ( ! empty( $rule['ends_on'] ) ) {
			$until_ts = strtotime( (string) $rule['ends_on'] );
			if ( false !== $until_ts ) {
				$parts[] = 'UNTIL=' . gmdate( 'Ymd\THis\Z', $until_ts );
			}
		}

		return 'RRULE:' . implode( ';', $parts );
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
	 * Build VEVENT blocks for standard event dates.
	 *
	 * Selected-date events can contain multiple discrete dates. Export every
	 * selected date instead of collapsing the public multi-date display into
	 * a single calendar entry.
	 *
	 * @param Event         $event    Event object.
	 * @param \DateTimeZone $timezone Event/site timezone.
	 * @return string[]
	 */
	private function build_standard_vevents( $event, \DateTimeZone $timezone ) {
		$instances = array();

		if ( 'selected' === $event::get_standard_type() ) {
			$days = $event::get_event_days();
			if ( ! empty( $days ) && is_array( $days ) ) {
				$instances = $days;
			}
		}

		if ( empty( $instances ) ) {
			$instances = array( $event::get_first_instance() );
		}

		$vevents = array();
		foreach ( $instances as $instance ) {
			$vevent = $this->build_instance_vevent( $event, $instance, $timezone );
			if ( '' !== $vevent ) {
				$vevents[] = $vevent;
			}
		}

		return $vevents;
	}

	/**
	 * Build a VEVENT block for one selected-date event row.
	 *
	 * @param Event         $event     Event object.
	 * @param int           $day_index Selected event_days index.
	 * @param \DateTimeZone $timezone  Event/site timezone.
	 * @return string
	 */
	private function build_selected_day_vevent( $event, $day_index, \DateTimeZone $timezone ) {
		$days = $event::get_event_days();
		if ( ! is_array( $days ) || ! isset( $days[ $day_index ] ) || ! is_array( $days[ $day_index ] ) ) {
			return '';
		}

		return $this->build_instance_vevent( $event, $days[ $day_index ], $timezone );
	}

	/**
	 * Build a VEVENT block for a stored event date/rule.
	 *
	 * @param Event         $event    Event object.
	 * @param array         $instance Event date or recurrence rule.
	 * @param \DateTimeZone $timezone Event/site timezone.
	 * @return string
	 */
	private function build_instance_vevent( $event, $instance, \DateTimeZone $timezone ) {
		if ( empty( $instance['start_date'] ) ) {
			return '';
		}

		$start_ts = strtotime( (string) $instance['start_date'] );
		if ( false === $start_ts ) {
			return '';
		}

		$end_ts  = ! empty( $instance['end_date'] ) ? strtotime( (string) $instance['end_date'] ) : false;
		$all_day = ! empty( $instance['all_day'] );

		if ( false === $end_ts || $end_ts < $start_ts ) {
			$end_ts = $all_day ? $start_ts : $start_ts + HOUR_IN_SECONDS;
		}

		$vevent_timezone = $all_day ? $this->get_all_day_timezone( $event, $instance ) : $timezone;

		return $this->build_vevent(
			$start_ts,
			$end_ts,
			$all_day,
			$event->get_title(),
			$this->clean_description( $event->get_summary() ),
			$this->get_location( $event ),
			$vevent_timezone
		);
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
	private function build_vevent( $start_ts, $end_ts, $all_day, $summary, $description, $location, $timezone = null ) {
		if ( $all_day ) {
			list( $start, $end ) = $this->format_all_day_date_range( $start_ts, $end_ts, $timezone );
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
	 * Format all-day iCal dates in the event/site timezone.
	 *
	 * All-day event dates are saved as UTC instants but represent local calendar
	 * days. iCal VALUE=DATE must use those local dates, with DTEND exclusive.
	 *
	 * @param int                $start_ts Start timestamp.
	 * @param int                $end_ts   End timestamp.
	 * @param \DateTimeZone|null $timezone Event/site timezone.
	 * @return array{0:string,1:string} DTSTART and exclusive DTEND in Ymd format.
	 */
	private function format_all_day_date_range( $start_ts, $end_ts, $timezone = null ) {
		$timezone = $timezone instanceof \DateTimeZone ? $timezone : wp_timezone();
		$start_ts = (int) $start_ts;
		$end_ts   = (int) $end_ts;

		$start = ( new \DateTimeImmutable( '@' . $start_ts ) )->setTimezone( $timezone );
		$end   = $end_ts > $start_ts
			? ( new \DateTimeImmutable( '@' . $end_ts ) )->setTimezone( $timezone )
			: $start;

		$start_date = $start->format( 'Ymd' );

		if ( eventkoi_is_single_all_day_span( $start_ts, $end_ts ) ) {
			$end_exclusive = $start->modify( '+1 day' );
		} elseif ( $end > $start && '00:00:00' === $end->format( 'H:i:s' ) && $end->format( 'Ymd' ) !== $start_date ) {
			$end_exclusive = $end;
		} else {
			$end_exclusive = $end->modify( '+1 day' );
		}

		return array( $start_date, $end_exclusive->format( 'Ymd' ) );
	}

	/**
	 * Get event timezone with a site timezone fallback.
	 *
	 * @param Event $event Event object.
	 * @return \DateTimeZone
	 */
	private function get_event_timezone( $event ) {
		$timezone_string = $event::get_timezone();

		if ( ! empty( $timezone_string ) ) {
			try {
				return new \DateTimeZone( (string) $timezone_string );
			} catch ( \Exception $e ) {
				// Fall through to the WordPress timezone.
			}
		}

		return wp_timezone();
	}

	/**
	 * Get the source timezone for all-day calendar-date boundaries.
	 *
	 * Visitor-selected display timezones can shift UTC instants across calendar
	 * days. All-day iCal VALUE=DATE fields must use the event's source date.
	 *
	 * @param Event $event Event object.
	 * @return \DateTimeZone
	 */
	private function get_all_day_timezone( $event, $range = array() ) {
		$event_id = method_exists( $event, 'get_id' ) ? absint( $event::get_id() ) : absint( get_the_ID() );
		$start_raw = is_array( $range ) ? ( $range['start_date'] ?? '' ) : '';
		$end_raw   = is_array( $range ) ? ( $range['end_date'] ?? '' ) : '';
		$stored    = $event_id ? (string) get_post_meta( $event_id, 'timezone', true ) : '';
		$inferred  = is_array( $range ) && function_exists( 'eventkoi_infer_all_day_timezone_from_utc_range' )
			? eventkoi_infer_all_day_timezone_from_utc_range( $start_raw, $end_raw )
			: '';

		$candidates = array(
			is_array( $range ) ? (string) ( $range['all_day_timezone'] ?? '' ) : '',
			function_exists( 'eventkoi_all_day_timezone_should_prefer_stored' ) && eventkoi_all_day_timezone_should_prefer_stored( $stored, $inferred, $start_raw, $end_raw ) ? $stored : '',
			$inferred,
			$stored,
			method_exists( $event, 'get_timezone' ) ? (string) $event::get_timezone() : '',
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

		return wp_timezone();
	}

	/**
	 * Get the timezone to use for an iCal download.
	 *
	 * Frontend calendar controls can display timed events in a visitor-selected
	 * timezone. All-day VALUE=DATE exports use the source all-day timezone.
	 *
	 * @param Event $event Event object.
	 * @return \DateTimeZone
	 */
	private function get_download_timezone( $event ) {
		$fallback = $this->get_event_timezone( $event );
		$timezone = filter_input( INPUT_GET, 'tz', FILTER_DEFAULT );

		if ( null === $timezone && isset( $_GET['tz'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only download parameter.
			$timezone = wp_unslash( $_GET['tz'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only download parameter.
		}

		$timezone = sanitize_text_field( (string) $timezone );

		if ( '' === $timezone || 'local' === strtolower( $timezone ) ) {
			return $fallback;
		}

		$timezone = eventkoi_php_timezone( $timezone );

		try {
			return new \DateTimeZone( $timezone );
		} catch ( \Exception $e ) {
			return $fallback;
		}
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

		foreach ( $locations as $primary ) {
			if ( ! is_array( $primary ) ) {
				continue;
			}

			$location = $this->format_location_row( $primary );
			if ( '' !== $location ) {
				return $location;
			}
		}

		return '';
	}

	/**
	 * Format one location row.
	 *
	 * @param array $primary Location row.
	 * @return string
	 */
	private function format_location_row( array $primary ) {
		$type = $this->get_location_type( $primary, 'inperson' );

		if ( 'online' === $type ) {
			return esc_url( $this->get_location_virtual_url( $primary ) );
		}

		$address = isset( $primary['address'] ) && is_array( $primary['address'] ) ? $primary['address'] : array();
		$parts = array(
			$this->location_text_value( $primary, 'name' ),
			$this->first_location_text(
				$this->location_text_value( $primary, 'address1' ),
				$this->location_text_value( $address, 'streetAddress' )
			),
			$this->location_text_value( $primary, 'address2' ),
			$this->location_text_value( $primary, 'address3' ),
			implode(
				', ',
				array_filter(
					array(
						$this->first_location_text(
							$this->location_text_value( $primary, 'city' ),
							$this->location_text_value( $address, 'addressLocality' )
						),
						$this->first_location_text(
							$this->location_text_value( $primary, 'state' ),
							$this->location_text_value( $address, 'addressRegion' )
						),
						$this->first_location_text(
							$this->location_text_value( $primary, 'zip' ),
							$this->location_text_value( $address, 'postalCode' )
						),
					)
				)
			),
			$this->first_location_text(
				$this->location_text_value( $primary, 'country' ),
				$this->location_text_value( $address, 'addressCountry' )
			),
		);

		return esc_html( implode( ', ', array_filter( $parts ) ) );
	}

	/**
	 * Return the first non-empty location text.
	 *
	 * @param string ...$values Values.
	 * @return string
	 */
	private function first_location_text( ...$values ) {
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
	private function location_text_value( array $location, $key ) {
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
					$text = $this->location_scalar_text( $value[ $nested_key ] );
					if ( '' !== $text ) {
						return $text;
					}
				}
			}

			$texts = array();
			foreach ( $value as $nested_value ) {
				$text = $this->location_scalar_text( $nested_value );
				if ( '' !== $text ) {
					$texts[] = $text;
				}
			}

			return implode( ' ', array_unique( $texts ) );
		}

		return $this->location_scalar_text( $value );
	}

	/**
	 * Normalize a scalar location value to text.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	private function location_scalar_text( $value ) {
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
	private function get_location_type( array $location, $default = '' ) {
		$type = sanitize_key( $this->location_text_value( $location, 'type' ) );
		if ( 'physical' === $type ) {
			return 'inperson';
		}
		if ( 'virtual' === $type ) {
			return 'online';
		}
		if ( in_array( $type, array( 'inperson', 'online' ), true ) ) {
			return $type;
		}
		if ( str_contains( $type, 'virtuallocation' ) ) {
			return 'online';
		}
		if ( str_contains( $type, 'place' ) ) {
			return 'inperson';
		}

		$schema_type = strtolower( $this->location_text_value( $location, '@type' ) );
		if ( str_contains( $schema_type, 'virtuallocation' ) ) {
			return 'online';
		}
		if ( str_contains( $schema_type, 'place' ) ) {
			return 'inperson';
		}

		return sanitize_key( $default );
	}

	/**
	 * Get the virtual URL from supported location shapes.
	 *
	 * @param array $location Location row.
	 * @return string
	 */
	private function get_location_virtual_url( array $location ) {
		return $this->first_location_text(
			$this->location_text_value( $location, 'virtual_url' ),
			$this->location_text_value( $location, 'url' )
		);
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
