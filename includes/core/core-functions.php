<?php
/**
 * Core functions.
 *
 * @package    EventKoi
 * @subpackage EventKoi\Core
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use EKLIB\RRule\RRule;
use EventKoi\Core\Settings;

/**
 * Retrieve the current instance ID from pretty permalink or query param.
 *
 * Public endpoint: instance param is used on frontend URLs for recurring events.
 * Nonce verification is intentionally not applied here, since the parameter
 * must be publicly accessible. Input is strictly sanitized with absint().
 *
 * @return int Instance timestamp.
 */
function eventkoi_get_instance_id() {
	$instance_ts = absint( get_query_var( 'instance' ) );

	if ( 0 === $instance_ts ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- public URL param, sanitized with absint()
		$instance_ts = isset( $_GET['instance'] ) ? absint( wp_unslash( $_GET['instance'] ) ) : 0;
	}

	return $instance_ts;
}

/**
 * Get the plugin directory name (i.e. the base name of the main plugin file without the `.php` extension).
 *
 * Useful for referencing the plugin folder or textdomain dynamically.
 *
 * @since 1.0.0
 *
 * @return string Plugin name/folder.
 */
function eventkoi_plugin_name() {
	return str_replace( '.php', '', basename( EVENTKOI_PLUGIN_FILE ) );
}

/**
 * Get the URL for a template asset within the plugin.
 *
 * @since 1.0.0
 *
 * @param string $asset Relative path to the asset file.
 * @return string Full URL to the asset.
 */
function eventkoi_get_template_asset( $asset ) {
	$url = trailingslashit( EVENTKOI_PLUGIN_URL ) . 'templates/assets/' . ltrim( $asset, '/' );

	/**
	 * Filter the template asset URL.
	 *
	 * @since 1.0.0
	 *
	 * @param string $url   Full URL to the asset.
	 * @param string $asset Relative path to the asset.
	 */
	return apply_filters( 'eventkoi_get_template_asset', $url, $asset );
}

/**
 * Get the rendered header block template content.
 *
 * This function loads the header template part using the block editor system,
 * typically used in block themes or full site editing (FSE).
 *
 * @since 1.0.0
 *
 * @return string Rendered header HTML.
 */
function eventkoi_get_header() {
	$content = '<!-- wp:template-part {"slug":"header","area":"header","tagName":"header"} /-->';

	/**
	 * Filter the block template content for the header.
	 *
	 * @since 1.0.0
	 *
	 * @param string $content Raw block template markup for the header.
	 */
	return do_blocks( apply_filters( 'eventkoi_get_header', $content ) );
}

/**
 * Get the rendered footer block template content.
 *
 * This function loads the footer template part using the block editor system,
 * typically used in block themes or full site editing (FSE).
 *
 * @since 1.0.0
 *
 * @return string Rendered footer HTML.
 */
function eventkoi_get_footer() {
	$content = '<!-- wp:template-part {"slug":"footer","area":"footer","tagName":"footer"} /-->';

	/**
	 * Filter the block template content for the footer.
	 *
	 * @since 1.0.0
	 *
	 * @param string $content Raw block template markup for the footer.
	 */
	return do_blocks( apply_filters( 'eventkoi_get_footer', $content ) );
}

/**
 * Get template content.
 */
function eventkoi_get_content() {

	$template = get_post( get_option( 'eventkoi_default_template_id' ) );

	$blocks = new \EventKoi\Core\Blocks();

	if ( ! wp_is_block_theme() ) {
		$page_id = (int) get_option( 'eventkoi_template_page_id' );
		if ( $page_id ) {
			$page = get_post( $page_id );
			if ( $page && ! empty( $page->post_content ) ) {
				return do_blocks(
					apply_filters( 'eventkoi_get_content', $page->post_content )
				);
			}
		}
	}

	if ( ! empty( $template ) && ! empty( $template->post_content ) ) {
		$event_template = $template->post_content;
	} else {
		$event_template = $blocks::get_default_template();
	}

	return do_blocks( apply_filters( 'eventkoi_get_content', $event_template ) );
}

/**
 * Get calendar template content.
 *
 * @param int    $calendar_id Calendar ID.
 * @param string $display Display mode ('display' or 'list').
 * @param array  $args Additional options for the calendar.
 *
 * @return string Rendered calendar content.
 */
function eventkoi_get_calendar_content( $calendar_id = 0, $display = '', $args = array() ) {
	$term    = get_queried_object();
	$term_id = ( ! empty( $term->term_id ) ) ? $term->term_id : (int) $calendar_id;

	if ( $calendar_id > 0 ) {
		$term_id = (int) $calendar_id;
	}

	$calendar = new \EventKoi\Core\Calendar( $term_id );

	if ( $calendar::is_invalid() ) {
		return '<div class="wp-block-group eventkoi-front"><p>' . esc_html__( 'Invalid calendar. Please check the calendar ID.', 'eventkoi-lite' ) . '</p></div>';
	}

	// Use calendar settings if no display mode is specified.
	if ( empty( $display ) ) {
		$display = $calendar::get_display();
	}

	// Extract arguments safely.
	$calendars        = ! empty( $args['calendars'] ) ? implode( ',', array_map( 'intval', (array) $args['calendars'] ) ) : '';
	$startday         = isset( $args['startday'] ) ? sanitize_text_field( $args['startday'] ) : '';
	$timeframe        = isset( $args['timeframe'] ) ? sanitize_text_field( $args['timeframe'] ) : '';
	$color            = isset( $args['color'] ) ? sanitize_hex_color( $args['color'] ) : '';
	$show_image       = isset( $args['show_image'] ) ? esc_attr( $args['show_image'] ) : 'yes';
	$show_location    = isset( $args['show_location'] ) ? esc_attr( $args['show_location'] ) : 'yes';
	$show_description = isset( $args['show_description'] ) ? esc_attr( $args['show_description'] ) : 'yes';
	$border_style     = isset( $args['border_style'] ) ? esc_attr( $args['border_style'] ) : 'dotted';
	$border_size      = isset( $args['border_size'] ) ? esc_attr( $args['border_size'] ) : '2px';
	$default_month    = isset( $args['default_month'] ) ? sanitize_text_field( $args['default_month'] ) : '';
	$default_year     = isset( $args['default_year'] ) ? sanitize_text_field( $args['default_year'] ) : '';
	$container_id     = 'eventkoi-calendar-' . uniqid();
	$content_size     = ! empty( $args['layout']['contentSize'] ) ? $args['layout']['contentSize'] : '1100px';
	$wide_size        = ! empty( $args['layout']['wideSize'] ) ? $args['layout']['wideSize'] : '1100px';

	$style = 'max-width:' . esc_attr( $content_size ) . ';margin-left:auto;margin-right:auto;';

	$calendar_template = sprintf(
		'<!-- wp:group {"className":"eventkoi-front"} -->
		<div class="wp-block-group eventkoi-front" style="%13$s">
			<div id="%12$s"
				data-calendar-id="%1$d"
				data-calendars="%2$s"
				data-display="%3$s"
				data-startday="%4$s"
				data-timeframe="%5$s"
				data-color="%6$s"
				data-show-image="%7$s"
				data-show-location="%8$s"
				data-show-description="%9$s"
				data-border-style="%10$s"
				data-border-size="%11$s"
				data-context="%14$s"
				data-default-month="%15$s"
				data-default-year="%16$s">
			</div>
		</div>
	<!-- /wp:group -->',
		absint( $calendar::get_id() ),
		esc_attr( $calendars ),
		esc_attr( $display ),
		esc_attr( $startday ),
		esc_attr( $timeframe ),
		esc_attr( $color ),
		esc_attr( $show_image ),
		esc_attr( $show_location ),
		esc_attr( $show_description ),
		esc_attr( $border_style ),
		esc_attr( $border_size ),
		esc_attr( $container_id ),
		esc_attr( $style ),
		esc_attr( $args['context'] ?? 'frontend' ), // %14$s
		esc_attr( $args['default_month'] ?? '' ),   // %15$s
		esc_attr( $args['default_year'] ?? '' )     // %16$s
	);

	$output = do_blocks( apply_filters( 'eventkoi_get_calendar_content', $calendar_template ) );

	// Only wrap when viewing a calendar term page.
	if ( is_tax( 'event_cal' ) ) {
		$title = sprintf(
			'<!-- wp:group {"className":"eventkoi-title"} -->
		<div class="wp-block-group eventkoi-title" style="%2$s">
			<!-- wp:post-title {"level":1} -->
			<h1 class="wp-block-post-title">%1$s</h1>
			<!-- /wp:post-title -->
		</div>
		<!-- /wp:group -->',
			esc_html( $term->name ),
			esc_attr( $style )
		);

		$output = '<main class="eventkoi-main wp-block-group has-global-padding">'
			. $title
			. $output
			. '</main>';
	}

	return $output;
}

/**
 * Get the permalink structure for EventKoi.
 *
 * This merges stored permalink settings with defaults,
 * sanitizes slugs, and ensures rewrite slugs are generated.
 *
 * @since 1.0.0
 *
 * @return array {
 *     The permalink structure.
 *
 *     @type string $event_base             Raw slug for events.
 *     @type string $category_base          Raw slug for categories/calendars.
 *     @type bool   $use_verbose_page_rules Whether verbose rules are used.
 *     @type string $event_rewrite_slug     Sanitized and formatted event slug.
 *     @type string $category_rewrite_slug  Sanitized and formatted category slug.
 * }
 */
function eventkoi_get_permalink_structure() {
	$saved_permalinks = (array) get_option( 'eventkoi_permalinks', array() );

	$default_permalinks = array(
		'event_base'             => _x( 'event', 'slug', 'eventkoi-lite' ),
		'category_base'          => _x( 'calendar', 'slug', 'eventkoi-lite' ),
		'use_verbose_page_rules' => false,
	);

	// Merge and sanitize.
	$permalinks = wp_parse_args( array_filter( $saved_permalinks ), $default_permalinks );

	// Save only if values have changed.
	if ( $saved_permalinks !== $permalinks ) {
		update_option( 'eventkoi_permalinks', $permalinks );
	}

	// Sanitize and set rewrite slugs.
	$permalinks['event_rewrite_slug']    = untrailingslashit( sanitize_title_with_dashes( $permalinks['event_base'] ) );
	$permalinks['category_rewrite_slug'] = untrailingslashit( sanitize_title_with_dashes( $permalinks['category_base'] ) );

	return $permalinks;
}

/**
 * Check if the current theme supports the block editor or full site editing (FSE).
 *
 * @since 1.0.0
 *
 * @return bool True if the theme supports block editor or FSE, false otherwise.
 */
function eventkoi_current_theme_support() {
	$support = false;

	if ( function_exists( 'wp_is_block_theme' ) && wp_is_block_theme() ) {
		$support = true;
	} elseif ( function_exists( 'gutenberg_is_fse_theme' ) && gutenberg_is_fse_theme() ) {
		$support = true;
	}

	/**
	 * Filter the theme support detection result.
	 *
	 * @since 1.0.0
	 *
	 * @param bool $support Whether the theme supports the block editor or FSE.
	 */
	return apply_filters( 'eventkoi_current_theme_support', $support );
}

/**
 * Get the default date format for EventKoi.
 *
 * @return string Date format string.
 */
function eventkoi_get_default_date_format() {
	static $date_format = null;

	if ( null === $date_format ) {
		// Allow override via constant or use fallback format.
		if ( defined( 'EVENTKOI_DATE_FORMAT' ) && EVENTKOI_DATE_FORMAT ) {
			$date_format = EVENTKOI_DATE_FORMAT;
		} else {
			// Customize this if you prefer WordPress settings: get_option( 'date_format' ).
			$date_format = 'Y-m-d h:i A';
		}
	}

	/**
	 * Filter the default date format used across EventKoi.
	 *
	 * @param string $date_format The date format string.
	 */
	return apply_filters( 'eventkoi_get_default_date_format', $date_format );
}

/**
 * Get GMT time from date given.
 *
 * @param string $date A date.
 */
function eventkoi_get_gmt_from_date( $date ) {
	if ( ! $date ) {
		return '';
	}

	return get_gmt_from_date( $date, eventkoi_get_default_date_format() );
}

/**
 * Return a formatted date based on a given date string or timestamp.
 *
 * @param string|int $date A date string or Unix timestamp.
 * @param bool       $gmt  Optional. If true, use GMT timezone. Default false.
 * @return string           Formatted date string.
 */
function eventkoi_date_i18n( $date, $gmt = false ) {
	$format = eventkoi_get_default_date_format();

	// Convert to timestamp if needed.
	if ( ! is_numeric( $date ) ) {
		$date = strtotime( $date );
	}

	// Fallback to now if conversion fails.
	if ( false === $date ) {
		$date = time();
	}

	$timezone = true === $gmt ? new DateTimeZone( 'GMT' ) : wp_timezone();

	return gmdate( $format, (int) $date );
}

/**
 * Get the default calendar URL.
 *
 * Returns the permalink for the default event calendar, or an empty string if none is set.
 * Falls back to the main events archive if the default calendar is not valid.
 *
 * @return string Default calendar URL.
 */
function eventkoi_get_default_calendar_url() {
	$default_cal_id = (int) get_option( 'eventkoi_default_event_cal', 0 );

	if ( $default_cal_id <= 0 ) {
		// Fallback to events archive if no default calendar is set.
		$archive_url = get_post_type_archive_link( 'event' );
		return $archive_url ? esc_url( $archive_url ) : '';
	}

	$default_cal = get_term_by( 'id', $default_cal_id, 'event_cal' );

	if ( ! $default_cal || is_wp_error( $default_cal ) ) {
		// Fallback to events archive if the term is invalid.
		$archive_url = get_post_type_archive_link( 'event' );
		return $archive_url ? esc_url( $archive_url ) : '';
	}

	$cal_url = get_term_link( $default_cal, 'event_cal' );

	if ( is_wp_error( $cal_url ) ) {
		return '';
	}

	return esc_url( trailingslashit( $cal_url ) );
}

/**
 * Returns current date based on GMT and specific format.
 *
 * @param string $format Optional. A date format. Default is the plugin's default format.
 * @return string Current GMT date/time.
 */
function eventkoi_gmt_date( $format = '' ) {
	if ( '' === $format ) {
		$format = eventkoi_get_default_date_format();
	}

	return gmdate( $format );
}

/**
 * Get human-readable timezone.
 *
 * Returns a named timezone (e.g. 'Africa/Egypt') or a UTC offset (e.g. 'UTC+2').
 *
 * @return string Timezone string.
 */
function eventkoi_timezone() {
	$timezone_string = wp_timezone_string();

	if ( ! empty( $timezone_string ) && false === strpos( $timezone_string, '+' ) && false === strpos( $timezone_string, '-' ) ) {
		// Named timezone like 'Africa/Egypt'.
		$timezone = $timezone_string;
	} else {
		// Fallback to UTC offset if not a named timezone.
		$offset = get_option( 'gmt_offset', 0 );

		if ( 0 === (float) $offset ) {
			$timezone = 'UTC';
		} else {
			$sign    = ( 0 <= $offset ) ? '+' : '-';
			$hours   = (int) $offset;
			$minutes = abs( ( $offset - $hours ) * 60 );

			if ( 0 === $minutes ) {
				$timezone = sprintf( 'UTC%s%d', $sign, abs( $hours ) );
			} else {
				$timezone = sprintf( 'UTC%s%d:%02d', $sign, abs( $hours ), $minutes );
			}
		}
	}

	return apply_filters( 'eventkoi_timezone', $timezone );
}

/**
 * Define a constant if it is not already defined.
 *
 * @since 1.0.0
 *
 * @param string $name  Constant name.
 * @param mixed  $value Constant value.
 * @return void
 */
function eventkoi_maybe_define_constant( $name, $value ) {
	if ( ! defined( $name ) ) {
		define( $name, $value );
	}
}

/**
 * Get the default calendar color.
 *
 * @since 1.0.0
 *
 * @return string Hex color string.
 */
function eventkoi_default_calendar_color() {
	/**
	 * Filter the default calendar color.
	 *
	 * @since 1.0.0
	 *
	 * @param string $color Default calendar color in hex format.
	 */
	return apply_filters( 'eventkoi_default_calendar_color', '#578CA7' );
}

/**
 * Get a human-readable label for a given status.
 *
 * @since 1.0.0
 *
 * @param string $status A given status.
 * @return string Localized human-readable label.
 */
function eventkoi_get_status_title( $status = '' ) {
	$map = array(
		'complete'           => __( 'Completed', 'eventkoi-lite' ),
		'succeeded'          => __( 'Completed', 'eventkoi-lite' ),
		'refunded'           => __( 'Refunded', 'eventkoi-lite' ),
		'partially_refunded' => __( 'Partially refunded', 'eventkoi-lite' ),
		'failed'             => __( 'Failed', 'eventkoi-lite' ),
		'pending'            => __( 'Pending payment', 'eventkoi-lite' ),
	);

	$label = $map[ $status ] ?? __( 'Incomplete', 'eventkoi-lite' );

	/**
	 * Filter the human-readable label for a status.
	 *
	 * @since 1.0.0
	 *
	 * @param string $label  The human-readable label.
	 * @param string $status The original status.
	 */
	return apply_filters( 'eventkoi_get_status_title', $label, $status );
}

/**
 * Checks if live mode is enabled for eCommerce/purchase.
 *
 * @return bool True if live mode is enabled, false otherwise.
 */
function eventkoi_live_mode_enabled() {
	$settings = \EventKoi\Core\Settings::get();
	$live     = ( ! empty( $settings['mode'] ) && 'live' === $settings['mode'] );

	/**
	 * Filter whether live mode is enabled.
	 *
	 * @param bool $live True if live mode is enabled, false otherwise.
	 */
	return apply_filters( 'eventkoi_live_mode_enabled', $live );
}

/**
 * Format a UTC datetime string for use with Google Calendar.
 *
 * Google Calendar expects timestamps in the format: `Ymd\THis\Z` (e.g., 20250330T130000Z).
 *
 * @since 1.0.0
 *
 * @param string $datetime A UTC datetime string (e.g., '2025-03-30 13:00:00').
 * @return string Formatted string for Google Calendar, or an empty string on failure.
 */
function eventkoi_format_gcal_datetime( $datetime ) {
	if ( empty( $datetime ) ) {
		return '';
	}

	try {
		$utc = new DateTime( $datetime, new DateTimeZone( 'UTC' ) );

		// Format as required by Google Calendar (e.g., 20250330T130000Z).
		return $utc->format( 'Ymd\THis\Z' );
	} catch ( Exception $e ) {
		// Log or handle the exception if needed.
		return '';
	}
}

/**
 * Get the client's IP address from server headers.
 *
 * Supports Cloudflare and other proxy headers.
 *
 * @return string The sanitized IP address.
 */
function eventkoi_get_client_ip() {
	$raw_ip = '';

	if ( isset( $_SERVER['HTTP_CF_CONNECTING_IP'] ) ) {
		$raw_ip = sanitize_text_field( wp_unslash( $_SERVER['HTTP_CF_CONNECTING_IP'] ) );
	} elseif ( isset( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
		$forwarded_ips = explode( ',', sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) );
		$raw_ip        = trim( $forwarded_ips[0] );
	} elseif ( isset( $_SERVER['REMOTE_ADDR'] ) ) {
		$raw_ip = sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) );
	}

	// Normalize IPv6 localhost.
	if ( '::1' === $raw_ip ) {
		$raw_ip = '127.0.0.1';
	}

	/**
	 * Filter the sanitized client IP address.
	 *
	 * @param string $raw_ip The sanitized IP string.
	 */
	return apply_filters( 'eventkoi_raw_client_ip', $raw_ip );
}

/**
 * Get the appropriate date format for a given database timestamp field.
 *
 * @param string $field Field name (e.g., 'created', 'last_updated').
 * @return string Date format string.
 */
function eventkoi_get_field_date_format( $field ) {
	// Define custom formats for specific fields.
	$formats = array(
		'last_updated' => 'j F Y, g:ia',
		// Add other custom formats here if needed.
	);

	// Use custom format if defined, otherwise fallback to default.
	$format = isset( $formats[ $field ] )
		? $formats[ $field ]
		: eventkoi_get_default_date_format();

	/**
	 * Filter the date format used for a specific field.
	 *
	 * @param string $format The date format string.
	 * @param string $field  The field name (e.g., 'created', 'last_updated').
	 */
	return apply_filters( 'eventkoi_field_date_format', $format, $field );
}

/**
 * Generate recurring instance start timestamps based on rule.
 *
 * @param array $rule  Recurrence rule.
 * @param int   $limit Maximum number of instances.
 * @return array Array of UNIX timestamps.
 */
function eventkoi_generate_instance_starts( $rule, $limit = 500 ) {
	$instances = array();

	if ( empty( $rule['start_date'] ) || empty( $rule['frequency'] ) ) {
		return $instances;
	}

	$start_ts     = strtotime( $rule['start_date'] );
	$frequency    = $rule['frequency'];
	$interval     = isset( $rule['every'] ) ? max( 1, intval( $rule['every'] ) ) : 1;
	$ends_type    = isset( $rule['ends'] ) ? $rule['ends'] : 'never';
	$ends_after   = isset( $rule['ends_after'] ) ? intval( $rule['ends_after'] ) : 0;
	$ends_on      = ! empty( $rule['ends_on'] ) ? strtotime( $rule['ends_on'] ) : null;
	$instance_max = ( 'after' === $ends_type && 0 < $ends_after ) ? $ends_after : $limit;

	$count   = 0;
	$current = $start_ts;

	if ( 'week' === $frequency && ! empty( $rule['weekdays'] ) ) {
		while ( $count < $instance_max ) {
			foreach ( $rule['weekdays'] as $weekday ) {
				$weekday   = intval( $weekday ); // 0 = Monday.
				$week_base = strtotime( 'monday this week', $current );
				$day_ts    = strtotime( '+' . $weekday . ' days', $week_base );

				if ( $day_ts < $start_ts ) {
					continue;
				}

				if ( 'on' === $ends_type && null !== $ends_on && $day_ts > $ends_on ) {
					break 2;
				}

				$instances[] = $day_ts;
				++$count;

				if ( $count >= $instance_max ) {
					break 2;
				}
			}

			$current = strtotime( '+' . $interval . ' weeks', $current );
		}
	} elseif ( 'month' === $frequency ) {
		$month_rule = isset( $rule['month_day_rule'] ) ? $rule['month_day_rule'] : 'day-of-month';
		$base_date  = new DateTimeImmutable( gmdate( 'Y-m-d', $start_ts ) );

		while ( $count < $instance_max ) {
			if ( 'on' === $ends_type && null !== $ends_on && $base_date->getTimestamp() > $ends_on ) {
				break;
			}

			if ( 'day-of-month' === $month_rule ) {
				$instance = $base_date->format( 'Y-m-' ) . $base_date->format( 'd' );
				$ts       = strtotime( $instance );
			} elseif ( 'weekday-of-month' === $month_rule ) {
				$weekday = (int) $base_date->format( 'N' );
				$nth     = (int) ceil( $base_date->format( 'j' ) / 7 );

				$month_year  = $base_date->format( 'F Y' );
				$weekday_str = jddayofweek( $weekday % 7, 1 );
				$nth_label   = $nth . ' ' . $weekday_str;

				$ts = strtotime( $nth_label . ' of ' . $month_year );
			} else {
				$ts = $base_date->getTimestamp();
			}

			if ( $ts >= $start_ts ) {
				$instances[] = $ts;
				++$count;
			}

			$base_date = $base_date->modify( '+' . $interval . ' months' );
		}
	} else { // Daily fallback.
		while ( $count < $instance_max ) {
			if ( 'on' === $ends_type && null !== $ends_on && $current > $ends_on ) {
				break;
			}

			$instances[] = $current;
			++$count;
			$current = strtotime( '+' . $interval . ' days', $current );
		}
	}

	return $instances;
}

/**
 * Locate an EventKoi template.
 *
 * Looks in the theme first, then falls back to the plugin.
 *
 * @param string $template_name Template filename relative to eventkoi/ folder.
 * @param string $default_path  Fallback path in the plugin.
 * @return string Full path to the located template.
 */
function eventkoi_locate_template( $template_name, $default_path = '' ) {
	$default_path = $default_path ? $default_path : EVENTKOI_PLUGIN_DIR . 'templates/parts/';

	// Look inside the theme.
	$template = locate_template(
		array(
			'eventkoi/' . $template_name,
		)
	);

	// Allow developers to override via filter.
	$template = apply_filters( 'eventkoi_locate_template', $template, $template_name, $default_path );

	// Use plugin fallback if nothing found.
	if ( ! $template || ! file_exists( $template ) ) {
		$template = $default_path . $template_name;
	}

	return $template;
}

/**
 * EventKoi wrapper for wp_date() that respects settings->time_format.
 *
 * @param string                   $format     PHP date format string.
 * @param int|null                 $timestamp  Unix timestamp. Defaults to now.
 * @param DateTimeZone|string|null $timezone Optional. WP timezone by default.
 * @return string
 */
function eventkoi_date( $format, $timestamp = null, $timezone = null ) {
	$settings    = Settings::get();
	$time_format = ( ! empty( $settings['time_format'] ) && '24' === $settings['time_format'] ) ? '24' : '12';

	// If no timestamp, use current time.
	if ( null === $timestamp ) {
		$timestamp = time();
	}

	// Adjust format if user prefers 24h.
	if ( '24' === $time_format ) {
		$format = preg_replace( '/[gh]:i\s*[aA]/', 'H:i', $format );
		$format = preg_replace( '/[gh]:i/', 'H:i', $format );
		$format = str_replace( array( 'a', 'A' ), '', $format );
	}

	return wp_date( $format, $timestamp, $timezone );
}

/**
 * EventKoi wrapper for gmdate() that respects settings->time_format.
 *
 * @param string $format    PHP date format string.
 * @param int    $timestamp Unix timestamp. Defaults to now.
 * @return string
 */
function eventkoi_gmdate( $format, $timestamp = null ) {
	$settings    = Settings::get();
	$time_format = ( ! empty( $settings['time_format'] ) && '24' === $settings['time_format'] ) ? '24' : '12';

	// If no timestamp, use current time.
	if ( null === $timestamp ) {
		$timestamp = time();
	}

	// Adjust format if user prefers 24h.
	if ( '24' === $time_format ) {
		$format = preg_replace( '/[gh]:i\s*[aA]/', 'H:i', $format );
		$format = preg_replace( '/[gh]:i/', 'H:i', $format );
		$format = str_replace( array( 'a', 'A' ), '', $format );
	}

	return gmdate( $format, $timestamp );
}
