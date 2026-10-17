<?php
/**
 * Event reminder emails.
 *
 * Emails everyone holding a Going RSVP or a paid ticket the day before their
 * event (or their instance of a recurring event) starts. The template lives
 * in Settings > Emails next to the other attendee emails.
 *
 * @package EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Reminder_Emails.
 */
class Reminder_Emails {

	/**
	 * Cron hook that sends due reminders.
	 */
	public const CRON_HOOK = 'eventkoi_send_event_reminders';

	/**
	 * Transient that throttles the no-cron fallback.
	 */
	public const FALLBACK_TRANSIENT = 'eventkoi_reminders_checked';

	/**
	 * Transient that stops two runs overlapping.
	 */
	public const LOCK_TRANSIENT = 'eventkoi_reminders_lock';

	/**
	 * Event meta that records who already got a reminder, keyed by start time.
	 */
	public const SENT_META = 'eventkoi_reminders_sent';

	/**
	 * Order statuses that count as a paid ticket.
	 *
	 * @var string[]
	 */
	private const PAID_STATUSES = array( 'complete', 'completed', 'succeeded', 'paid', 'partially_refunded' );

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'init', array( __CLASS__, 'maybe_schedule' ) );
		add_action( 'init', array( __CLASS__, 'maybe_run_fallback' ) );
		add_action( self::CRON_HOOK, array( __CLASS__, 'run' ) );
		add_action( 'update_option_eventkoi_settings', array( __CLASS__, 'maybe_schedule' ) );
	}

	/**
	 * Whether reminders are switched on. Unlike the other emails this one is
	 * off until an admin enables it, so updating never starts mailing attendees.
	 *
	 * @return bool
	 */
	public static function is_enabled() {
		$settings = Settings::get();
		$value    = $settings['reminder_email_enabled'] ?? null;

		if ( null === $value || '' === $value ) {
			return false;
		}

		return filter_var( $value, FILTER_VALIDATE_BOOLEAN );
	}

	/**
	 * How long before the start the reminder goes out.
	 *
	 * @return int Seconds.
	 */
	public static function lead_seconds() {
		return max( HOUR_IN_SECONDS, absint( apply_filters( 'eventkoi_reminder_email_lead_time', DAY_IN_SECONDS ) ) );
	}

	/**
	 * Keep the hourly cron in sync with the toggle.
	 *
	 * @return void
	 */
	public static function maybe_schedule() {
		$enabled   = self::is_enabled();
		$scheduled = wp_next_scheduled( self::CRON_HOOK );

		if ( $enabled && ! $scheduled ) {
			wp_schedule_event( time() + 5 * MINUTE_IN_SECONDS, 'hourly', self::CRON_HOOK );
		}

		if ( ! $enabled && $scheduled ) {
			wp_clear_scheduled_hook( self::CRON_HOOK );
		}
	}

	/**
	 * Send reminders on shutdown when WP-Cron is not firing on this site.
	 *
	 * Low-traffic and fully cached sites rarely spawn cron, so once every two
	 * hours a normal request picks the job up after the response is sent.
	 *
	 * @return void
	 */
	public static function maybe_run_fallback() {
		if ( wp_doing_cron() || wp_doing_ajax() || ! self::is_enabled() ) {
			return;
		}

		if ( false !== get_transient( self::FALLBACK_TRANSIENT ) ) {
			return;
		}

		set_transient( self::FALLBACK_TRANSIENT, 1, 2 * HOUR_IN_SECONDS );
		add_action( 'shutdown', array( __CLASS__, 'run' ) );
	}

	/**
	 * Send every reminder that is due.
	 *
	 * @param int $now Unix timestamp to treat as now. Defaults to the current time.
	 * @return int Number of reminders sent.
	 */
	public static function run( $now = 0 ) {
		if ( ! self::is_enabled() ) {
			return 0;
		}

		if ( false !== get_transient( self::LOCK_TRANSIENT ) ) {
			return 0;
		}
		set_transient( self::LOCK_TRANSIENT, 1, 5 * MINUTE_IN_SECONDS );

		$now  = absint( $now );
		$now  = $now ? $now : time();
		$lead = self::lead_seconds();
		$sent = 0;

		try {
			$groups = self::group_attendees( self::collect_attendees( $now, $now + $lead ) );

			foreach ( $groups as $event_id => $instances ) {
				if ( 'publish' !== get_post_status( $event_id ) ) {
					continue;
				}

				$log     = get_post_meta( $event_id, self::SENT_META, true );
				$log     = is_array( $log ) ? $log : array();
				$changed = false;

				foreach ( $instances as $instance_ts => $attendees ) {
					$start_ts = self::resolve_start( $event_id, $instance_ts );
					if ( $start_ts < $now || $start_ts > $now + $lead ) {
						continue;
					}

					$key = (string) $start_ts;
					if ( ! isset( $log[ $key ] ) || ! is_array( $log[ $key ] ) ) {
						$log[ $key ] = array();
					}

					foreach ( $attendees as $attendee ) {
						$hash = md5( strtolower( $attendee['email'] ) );
						if ( in_array( $hash, $log[ $key ], true ) ) {
							continue;
						}

						// Someone who booked inside the final day just got a
						// confirmation with the same details. Log them so they
						// are not reconsidered every hour.
						if ( $attendee['created_ts'] > $start_ts - $lead ) {
							$log[ $key ][] = $hash;
							$changed       = true;
							continue;
						}

						$attendee['start_ts'] = $start_ts;
						if ( Ticket_Emails::send_reminder( $attendee ) ) {
							++$sent;
						}

						// A failed send is logged too: retrying every hour
						// would only hammer a broken mailer.
						$log[ $key ][] = $hash;
						$changed       = true;
					}
				}

				if ( $changed ) {
					update_post_meta( $event_id, self::SENT_META, self::prune_log( $log, $now ) );
				}
			}
		} finally {
			delete_transient( self::LOCK_TRANSIENT );
		}

		return $sent;
	}

	/**
	 * Drop log entries for starts that are more than a week in the past.
	 *
	 * @param array $log Log keyed by start timestamp.
	 * @param int   $now Current time.
	 * @return array
	 */
	private static function prune_log( array $log, $now ) {
		foreach ( array_keys( $log ) as $start_ts ) {
			if ( (int) $start_ts < $now - WEEK_IN_SECONDS ) {
				unset( $log[ $start_ts ] );
			}
		}

		return $log;
	}

	/**
	 * Going RSVPs and paid ticket rows that may start inside the window.
	 *
	 * The SQL casts a wide net on instance_ts and the event start meta; the
	 * exact start is resolved per instance in PHP so rescheduled events and
	 * per-instance date overrides are honoured.
	 *
	 * @param int $from Window start (now).
	 * @param int $to   Window end (now + lead).
	 * @return array<int,array<string,mixed>>
	 */
	private static function collect_attendees( $from, $to ) {
		global $wpdb;

		$rsvps_table  = $wpdb->prefix . 'eventkoi_rsvps';
		$orders_table = $wpdb->prefix . 'eventkoi_ticket_orders';
		$slack        = WEEK_IN_SECONDS;
		$rows         = array();

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		if ( self::table_exists( $rsvps_table ) ) {
			$rsvps = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT r.event_id, r.instance_ts, r.name, r.email, r.checkin_token, r.created
					   FROM {$rsvps_table} r
					   INNER JOIN {$wpdb->posts} p ON p.ID = r.event_id AND p.post_status = 'publish'
					   LEFT JOIN {$wpdb->postmeta} pm ON pm.post_id = r.event_id AND pm.meta_key = 'start_timestamp'
					  WHERE r.status = 'going'
					    AND ( r.instance_ts BETWEEN %d AND %d OR CAST( pm.meta_value AS UNSIGNED ) BETWEEN %d AND %d )",
					$from - $slack,
					$to + $slack,
					$from - $slack,
					$to + $slack
				),
				ARRAY_A
			);

			foreach ( (array) $rsvps as $row ) {
				$rows[] = array(
					'type'        => 'rsvp',
					'event_id'    => absint( $row['event_id'] ),
					'instance_ts' => absint( $row['instance_ts'] ),
					'name'        => (string) $row['name'],
					'email'       => (string) $row['email'],
					'token'       => (string) $row['checkin_token'],
					'created_ts'  => self::utc_to_ts( $row['created'] ),
				);
			}
		}

		if ( self::table_exists( $orders_table ) ) {
			$instance_column = self::column_exists( $orders_table, 'instance_ts' ) ? 't.instance_ts' : '0';
			$status_list     = "'" . implode( "','", array_map( 'esc_sql', self::PAID_STATUSES ) ) . "'";
			$orders          = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT t.event_id, {$instance_column} AS instance_ts, t.order_id, t.customer_name, t.customer_email, t.created_at
					   FROM {$orders_table} t
					   INNER JOIN {$wpdb->posts} p ON p.ID = t.event_id AND p.post_status = 'publish'
					   LEFT JOIN {$wpdb->postmeta} pm ON pm.post_id = t.event_id AND pm.meta_key = 'start_timestamp'
					  WHERE t.status = 'active'
					    AND t.payment_status IN ({$status_list})
					    AND ( {$instance_column} BETWEEN %d AND %d OR CAST( pm.meta_value AS UNSIGNED ) BETWEEN %d AND %d )",
					$from - $slack,
					$to + $slack,
					$from - $slack,
					$to + $slack
				),
				ARRAY_A
			);

			foreach ( (array) $orders as $row ) {
				$rows[] = array(
					'type'        => 'ticket',
					'event_id'    => absint( $row['event_id'] ),
					'instance_ts' => absint( $row['instance_ts'] ),
					'name'        => (string) $row['customer_name'],
					'email'       => (string) $row['customer_email'],
					'token'       => '',
					'order_id'    => (string) $row['order_id'],
					'created_ts'  => self::utc_to_ts( $row['created_at'] ),
				);
			}
		}
		// phpcs:enable

		return $rows;
	}

	/**
	 * Group rows by event, then instance, keeping one entry per email.
	 *
	 * A ticket order has one row per ticket; the buyer still gets one email.
	 *
	 * @param array $rows Attendee rows.
	 * @return array<int,array<int,array<string,array>>>
	 */
	private static function group_attendees( array $rows ) {
		$groups = array();

		foreach ( $rows as $row ) {
			$email = sanitize_email( $row['email'] );
			if ( ! $row['event_id'] || ! is_email( $email ) ) {
				continue;
			}

			$row['email'] = $email;
			$key          = strtolower( $email );
			$existing     = $groups[ $row['event_id'] ][ $row['instance_ts'] ][ $key ] ?? null;

			// Keep the earliest booking so a later extra ticket does not hide
			// the fact that this person was already on the list.
			if ( null === $existing || $row['created_ts'] < $existing['created_ts'] ) {
				$groups[ $row['event_id'] ][ $row['instance_ts'] ][ $key ] = $row;
			}
		}

		return $groups;
	}

	/**
	 * The real start of the instance an attendee holds a place for.
	 *
	 * @param int $event_id    Event ID.
	 * @param int $instance_ts Stored instance timestamp (0 for single events).
	 * @return int Unix timestamp, 0 when it cannot be resolved.
	 */
	public static function resolve_start( $event_id, $instance_ts ) {
		$event_id    = absint( $event_id );
		$instance_ts = absint( $instance_ts );

		new Event( $event_id );
		$date_type = Event::get_date_type();

		if ( 'recurring' === $date_type ) {
			if ( ! $instance_ts ) {
				return 0;
			}

			$context = method_exists( Event::class, 'get_recurring_instance_context' )
				? Event::get_recurring_instance_context( $instance_ts )
				: null;

			return is_array( $context ) && ! empty( $context['start_ts'] ) ? absint( $context['start_ts'] ) : $instance_ts;
		}

		if ( 'selected' === Event::get_standard_type() && $instance_ts ) {
			return $instance_ts;
		}

		return absint( get_post_meta( $event_id, 'start_timestamp', true ) );
	}

	/**
	 * Parse a stored UTC datetime.
	 *
	 * @param string $value MySQL datetime.
	 * @return int
	 */
	private static function utc_to_ts( $value ) {
		$value = trim( (string) $value );
		if ( '' === $value || '0000-00-00 00:00:00' === $value ) {
			return 0;
		}

		$ts = strtotime( $value . ' UTC' );

		return $ts ? (int) $ts : 0;
	}

	/**
	 * Whether a table exists (cached per request).
	 *
	 * @param string $table Table name.
	 * @return bool
	 */
	private static function table_exists( $table ) {
		static $cache = array();

		if ( ! isset( $cache[ $table ] ) ) {
			global $wpdb;
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$cache[ $table ] = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) === $table;
		}

		return $cache[ $table ];
	}

	/**
	 * Whether a column exists (cached per request).
	 *
	 * @param string $table  Table name.
	 * @param string $column Column name.
	 * @return bool
	 */
	private static function column_exists( $table, $column ) {
		static $cache = array();

		$key = $table . '.' . $column;
		if ( ! isset( $cache[ $key ] ) ) {
			global $wpdb;
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$cache[ $key ] = (bool) $wpdb->get_var( $wpdb->prepare( "SHOW COLUMNS FROM `{$table}` LIKE %s", $column ) );
		}

		return $cache[ $key ];
	}
}
