<?php
/**
 * Stats.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

namespace EventKoi\Core;

use EKLIB\StellarWP\DB\DB;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Stats Class.
 */
class Stats {

	/**
	 * Number formatter instance.
	 *
	 * @var \NumberFormatter
	 */
	private $formatter;

	/**
	 * Currency code.
	 *
	 * @var string
	 */
	private $currency;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->formatter = new \NumberFormatter( get_locale(), \NumberFormatter::CURRENCY );
		$this->currency  = apply_filters( 'eventkoi_currency', 'usd' );
	}

	/**
	 * Get overall stats.
	 *
	 * @return array
	 */
	public function get() {
		$stats = array(
			'total_orders'   => number_format_i18n( (int) $this->get_total_orders() ),
			'total_earnings' => $this->formatter->formatCurrency( max( 0, $this->get_total_earnings() - $this->get_total_refunded() ), $this->currency ),
			'tickets_sold'   => number_format_i18n( (int) $this->get_tickets_sold() ),
			'total_refunded' => $this->formatter->formatCurrency( max( 0, $this->get_total_refunded() ), $this->currency ),
		);

		return apply_filters( 'eventkoi_get_order_stats', $stats );
	}

	/**
	 * Get cached stats from the database.
	 *
	 * @param string $cache_key          Cache key.
	 * @param string $table              Database table name.
	 * @param string $column             Column to aggregate.
	 * @param string $aggregate_function Optional. Aggregate function to use (SUM or COUNT).
	 * @return mixed
	 */
	private function get_cached_stat( $cache_key, $table, $column, $aggregate_function = 'SUM' ) {
		$total = get_transient( $cache_key );

		if ( false === $total ) {
			$query = DB::table( $table )->where( 'live', eventkoi_live_mode_enabled() );

			// For stats that only make sense with successful/partial/refunded statuses.
			$should_filter_by_status = in_array( $column, array( 'quantity', 'net', 'amount_refunded', '*' ), true );

			if ( $should_filter_by_status ) {
				$query = $query->whereIn( 'status', array( 'succeeded', 'partially_refunded', 'refunded' ) );
			}

			if ( 'COUNT' === $aggregate_function ) {
				$total = (int) $query->count();
			} else {
				$total = (float) $query->sum( $column );
			}

			set_transient( $cache_key, $total, HOUR_IN_SECONDS );
		}

		return $total ?? 0;
	}

	/**
	 * Get total orders.
	 *
	 * @return int
	 */
	public function get_total_orders() {
		return $this->get_cached_stat( 'eventkoi_total_orders', 'eventkoi_charges', '*', 'COUNT' );
	}

	/**
	 * Get total earnings.
	 *
	 * @return float
	 */
	public function get_total_earnings() {
		return $this->get_cached_stat( 'eventkoi_total_earnings', 'eventkoi_charges', 'net' );
	}

	/**
	 * Get total tickets sold.
	 *
	 * @return int
	 */
	public function get_tickets_sold() {
		return $this->get_cached_stat( 'eventkoi_tickets_sold', 'eventkoi_charges', 'quantity' );
	}

	/**
	 * Get total refunded.
	 *
	 * @return float
	 */
	public function get_total_refunded() {
		return $this->get_cached_stat( 'eventkoi_total_refunded', 'eventkoi_charges', 'amount_refunded' );
	}
}
