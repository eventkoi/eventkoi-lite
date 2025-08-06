<?php
/**
 * WP-CLI support for EventKoi.
 *
 * @package    EventKoi
 * @subpackage EventKoi\CLI
 */

namespace EventKoi\CLI;

use WP_CLI;
use EventKoi\Core\Event as SingleEvent;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Class Commands
 */
class Commands {

	/**
	 * Register WP-CLI commands.
	 */
	public static function init() {
		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			WP_CLI::add_command( 'eventkoi event', array( static::class, 'get_event' ) );
		}
	}

	/**
	 * Fetch and display a single event by ID.
	 *
	 * @param array $args        Command arguments.
	 * @param array $assoc_args  Associative arguments.
	 */
	public static function get_event( $args, $assoc_args ) {
		$event_id = absint( $args[0] ?? 0 );

		if ( ! $event_id ) {
			WP_CLI::error( 'You must provide a valid event ID.' );
		}

		$post = get_post( $event_id );
		if ( ! $post || 'event' !== $post->post_type ) {
			WP_CLI::error( "No EventKoi event found with ID {$event_id}." );
		}

		$event  = new \EventKoi\Core\Event( $event_id );
		$data   = $event::get_meta();
		$format = $assoc_args['format'] ?? 'table';

		$valid_formats = array( 'table', 'json', 'yaml', 'csv' );
		if ( ! in_array( $format, $valid_formats, true ) ) {
			WP_CLI::error( "Invalid format '{$format}'. Valid formats are: " . implode( ', ', $valid_formats ) . '.' );
		}

		$datetime   = $event::get_first_start_end_datetime();
		$type_label = ( $data['date_type'] ?? '' ) === 'recurring' ? 'Recurring' : 'Standard';

		$summary = array(
			'ID'         => $event_id,
			'Title'      => $data['title'] ?? '(no title)',
			'Type'       => $type_label,
			'Start Date' => ! empty( $datetime['start'] ) ? wp_date( 'Y-m-d H:i', strtotime( $datetime['start'] ) ) : 'N/A',
			'End Date'   => ! empty( $datetime['end'] ) ? wp_date( 'Y-m-d H:i', strtotime( $datetime['end'] ) ) : 'N/A',
		);

		self::output_event_summary( $summary, $format );
	}

	/**
	 * Output event summary in requested format.
	 *
	 * @param array  $summary Summary array.
	 * @param string $format  Format string.
	 */
	private static function output_event_summary( array $summary, string $format ) {
		if ( in_array( $format, array( 'table', 'json', 'yaml', 'csv' ), true ) ) {
			WP_CLI\Utils\format_items( $format, array( $summary ), array_keys( $summary ) );
		} else {
			foreach ( $summary as $key => $value ) {
				WP_CLI::line( "{$key}: {$value}" );
			}
		}
	}
}
