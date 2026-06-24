<?php
/**
 * User permissions handler.
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
 * Per-role capability layer for EventKoi.
 *
 * Maps the site owner's role → permission selections (stored in
 * eventkoi_settings.user_permissions) into WP virtual capabilities via
 * the user_has_cap filter. Admins always pass; non-admins inherit the
 * union of caps granted to any role they have.
 */
class Permissions {

	const SETTINGS_KEY = 'user_permissions';
	const ACCESS_CAP   = 'eventkoi_access';

	/**
	 * Per-request cache of resolved caps, keyed by user ID.
	 *
	 * @var array<int, array<string,bool>>
	 */
	private static $cache = array();

	/**
	 * Re-entry guard for the user_has_cap filter.
	 *
	 * Some downstream code paths invoked while resolving the permission map
	 * (option loaders, role objects) can themselves trigger capability checks.
	 * Without this guard a cap check re-enters our filter and recurses forever.
	 *
	 * @var bool
	 */
	private static $resolving = false;

	/**
	 * Wire the WP capability filter.
	 */
	public function __construct() {
		add_filter( 'user_has_cap', array( __CLASS__, 'filter_user_has_cap' ), 10, 4 );
		add_action( 'updated_option', array( __CLASS__, 'flush_cache_on_settings_change' ), 10, 1 );
	}

	/**
	 * Canonical capability catalog with translated labels.
	 *
	 * Only call this after the init action — it runs translation functions,
	 * which would trigger _load_textdomain_just_in_time too early otherwise.
	 * For cap-key lookups during early hooks (e.g. user_has_cap), use
	 * cap_keys() — it is i18n-free.
	 *
	 * @return array
	 */
	public static function all_caps(): array {
		return array(
			'events'    => array(
				'label' => __( 'Events', 'eventkoi-lite' ),
				'caps'  => array(
					'eventkoi_events_add'  => __( 'Add new events', 'eventkoi-lite' ),
					'eventkoi_events_edit' => __( 'Edit existing events', 'eventkoi-lite' ),
				),
			),
			'calendars' => array(
				'label' => __( 'Calendars', 'eventkoi-lite' ),
				'caps'  => array(
					'eventkoi_calendars_add'  => __( 'Add new calendars', 'eventkoi-lite' ),
					'eventkoi_calendars_edit' => __( 'Edit existing calendars', 'eventkoi-lite' ),
				),
			),
			'attendees' => array(
				'label' => __( 'Tickets & RSVP', 'eventkoi-lite' ),
				'caps'  => array(
					'eventkoi_attendees_checkin' => __( 'Check-in attendees', 'eventkoi-lite' ),
					'eventkoi_attendees_view'    => __( 'View attendees', 'eventkoi-lite' ),
					'eventkoi_attendees_manage'  => __( 'Manage attendees', 'eventkoi-lite' ),
					'eventkoi_orders_view'       => __( 'View ticket sales and orders', 'eventkoi-lite' ),
					'eventkoi_orders_manage'     => __( 'Manage ticket sales and orders (including refunds)', 'eventkoi-lite' ),
				),
			),
			'settings'  => array(
				'label' => __( 'EventKoi settings', 'eventkoi-lite' ),
				'caps'  => array(
					'eventkoi_settings_defaults'     => __( 'View & manage default settings', 'eventkoi-lite' ),
					'eventkoi_settings_fields'       => __( 'View & manage custom fields', 'eventkoi-lite' ),
					'eventkoi_settings_emails'       => __( 'View & manage emails', 'eventkoi-lite' ),
					'eventkoi_settings_payments'     => __( 'View & manage payments', 'eventkoi-lite' ),
					'eventkoi_settings_integrations' => __( 'View & manage API & integrations', 'eventkoi-lite' ),
					'eventkoi_settings_import'       => __( 'View & manage import', 'eventkoi-lite' ),
					'eventkoi_settings_license'      => __( 'View & manage license activation', 'eventkoi-lite' ),
				),
			),
		);
	}

	/**
	 * Flat list of every cap key. Hardcoded (no i18n calls) so it is safe
	 * to call during early hooks like user_has_cap, well before init.
	 *
	 * Must stay in sync with all_caps() — there's a self-test in
	 * cap_keys_match_catalog() to fail loudly during dev if they drift.
	 *
	 * @return string[]
	 */
	public static function cap_keys(): array {
		return array(
			'eventkoi_events_add',
			'eventkoi_events_edit',
			'eventkoi_calendars_add',
			'eventkoi_calendars_edit',
			'eventkoi_attendees_checkin',
			'eventkoi_attendees_view',
			'eventkoi_attendees_manage',
			'eventkoi_orders_view',
			'eventkoi_orders_manage',
			'eventkoi_settings_defaults',
			'eventkoi_settings_fields',
			'eventkoi_settings_emails',
			'eventkoi_settings_payments',
			'eventkoi_settings_integrations',
			'eventkoi_settings_import',
			'eventkoi_settings_license',
		);
	}

	/**
	 * Map of settings-payload keys to the cap that gates them. Keys not in
	 * this map fall through to eventkoi_settings_defaults.
	 *
	 * @return array<string,string>
	 */
	public static function settings_key_caps(): array {
		return array(
			// Payments.
			'ticket_checkout_method'     => 'eventkoi_settings_payments',
			'stripe'                     => 'eventkoi_settings_payments',
			'currency'                   => 'eventkoi_settings_payments',

			// Emails — templates + per-email sender + enable toggles.
			'rsvp_email_template'        => 'eventkoi_settings_emails',
			'ticket_email_template'      => 'eventkoi_settings_emails',
			'refund_email_template'      => 'eventkoi_settings_emails',
			'rsvp_email_enabled'         => 'eventkoi_settings_emails',
			'ticket_email_enabled'       => 'eventkoi_settings_emails',
			'refund_email_enabled'       => 'eventkoi_settings_emails',
			'rsvp_email_sender_email'    => 'eventkoi_settings_emails',
			'rsvp_email_sender_name'     => 'eventkoi_settings_emails',
			'ticket_email_sender_email'  => 'eventkoi_settings_emails',
			'ticket_email_sender_name'   => 'eventkoi_settings_emails',
			'refund_email_sender_email'  => 'eventkoi_settings_emails',
			'refund_email_sender_name'   => 'eventkoi_settings_emails',
			'admin_email_enabled'        => 'eventkoi_settings_emails',
			'admin_email_recipient'      => 'eventkoi_settings_emails',
			'admin_rsvp_email_enabled'   => 'eventkoi_settings_emails',
			'admin_rsvp_email_recipient' => 'eventkoi_settings_emails',

			// Integrations.
			'api_key'                    => 'eventkoi_settings_integrations',
			'gmap_api_key'               => 'eventkoi_settings_integrations',
			'gmap_connection_status'     => 'eventkoi_settings_integrations',

			// License (kept here for completeness; license fields live in
			// dedicated options and are written via class-license.php anyway).
			'license_key'                => 'eventkoi_settings_license',
			'license_status'             => 'eventkoi_settings_license',
			'license_expires'            => 'eventkoi_settings_license',

			// Permissions panel itself — the master switch needs admin-level
			// settings access.
			self::SETTINGS_KEY           => 'eventkoi_settings_defaults',

			// Custom PHP date/time formats — live in the Default settings tab.
			'date_format'                => 'eventkoi_settings_defaults',
			'time_format_string'         => 'eventkoi_settings_defaults',
			'permalinks'                 => 'eventkoi_settings_defaults',
		);
	}

	/**
	 * Resolve the cap required to write a given settings key.
	 *
	 * @param string $key Settings key.
	 * @return string Capability name.
	 */
	public static function cap_for_settings_key( string $key ): string {
		$map = self::settings_key_caps();
		return $map[ $key ] ?? 'eventkoi_settings_defaults';
	}

	/**
	 * Read the per-role permission map from settings.
	 *
	 * @return array<string, array<string,bool>>
	 */
	public static function get_map(): array {
		$settings = Settings::get();
		$map      = isset( $settings[ self::SETTINGS_KEY ] ) && is_array( $settings[ self::SETTINGS_KEY ] )
			? $settings[ self::SETTINGS_KEY ]
			: array();
		// Never let the stored map override Administrator behavior.
		unset( $map['administrator'] );
		return $map;
	}

	/**
	 * True if the user is treated as a full EventKoi admin.
	 *
	 * Reads role capabilities directly rather than going through user_can(),
	 * so it never re-enters the user_has_cap filter this class also registers.
	 *
	 * @param int|null $user_id User ID, defaults to current.
	 * @return bool
	 */
	public static function is_admin( ?int $user_id = null ): bool {
		$user_id = $user_id ?? get_current_user_id();
		if ( ! $user_id ) {
			return false;
		}
		$user = get_userdata( $user_id );
		if ( ! $user || empty( $user->roles ) ) {
			return false;
		}
		$roles = wp_roles();
		foreach ( (array) $user->roles as $role_slug ) {
			$role = $roles->get_role( $role_slug );
			if ( $role && ! empty( $role->capabilities['manage_options'] ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Capability check for an EventKoi cap (or any string accepted by the
	 * underlying user_has_cap pipeline).
	 *
	 * @param string   $cap     Capability name.
	 * @param int|null $user_id User ID, defaults to current.
	 * @return bool
	 */
	public static function user_can( string $cap, ?int $user_id = null ): bool {
		$user_id = $user_id ?? get_current_user_id();
		if ( ! $user_id ) {
			return false;
		}
		if ( self::is_admin( $user_id ) ) {
			return true;
		}
		$caps = self::user_caps( $user_id );
		return ! empty( $caps[ $cap ] );
	}

	/**
	 * Flat capability map for one user: union of caps from every role they
	 * hold. Cached per request.
	 *
	 * @param int|null $user_id User ID, defaults to current.
	 * @return array<string,bool>
	 */
	public static function user_caps( ?int $user_id = null ): array {
		$user_id = $user_id ?? get_current_user_id();
		if ( ! $user_id ) {
			return array();
		}
		if ( isset( self::$cache[ $user_id ] ) ) {
			return self::$cache[ $user_id ];
		}

		// Admins get the full catalog as truthy + the access cap.
		if ( self::is_admin( $user_id ) ) {
			$caps = array();
			foreach ( self::cap_keys() as $key ) {
				$caps[ $key ] = true;
			}
			$caps[ self::ACCESS_CAP ] = true;
			self::$cache[ $user_id ]  = $caps;
			return $caps;
		}

		$user = get_userdata( $user_id );
		if ( ! $user || empty( $user->roles ) ) {
			self::$cache[ $user_id ] = array();
			return array();
		}

		$map  = self::get_map();
		$caps = array();
		foreach ( (array) $user->roles as $role ) {
			$role_caps = isset( $map[ $role ] ) && is_array( $map[ $role ] ) ? $map[ $role ] : array();
			foreach ( $role_caps as $cap_key => $granted ) {
				if ( $granted ) {
					$caps[ $cap_key ] = true;
				}
			}
		}

		if ( ! empty( $caps ) ) {
			$caps[ self::ACCESS_CAP ] = true;
		}

		self::$cache[ $user_id ] = $caps;
		return $caps;
	}

	/**
	 * Merge our virtual caps into WordPress's allcaps array. Admins are
	 * untouched; non-admins gain the caps the site owner granted to their
	 * role(s).
	 *
	 * @param array         $allcaps Existing caps.
	 * @param array         $caps    Caps being requested. Unused.
	 * @param array         $args    Args from current_user_can. Unused.
	 * @param \WP_User|null $user The user object.
	 * @return array
	 */
	public static function filter_user_has_cap( $allcaps, $caps, $args, $user ) {
		unset( $caps, $args );
		if ( self::$resolving ) {
			return $allcaps;
		}
		if ( ! $user instanceof \WP_User || ! $user->ID ) {
			return $allcaps;
		}
		// Admins already have manage_options in $allcaps — inject every
		// EventKoi cap as truthy and return.
		if ( ! empty( $allcaps['manage_options'] ) ) {
			foreach ( self::cap_keys() as $key ) {
				$allcaps[ $key ] = true;
			}
			$allcaps[ self::ACCESS_CAP ] = true;
			return $allcaps;
		}
		self::$resolving = true;
		try {
			$map = self::get_map();
			foreach ( (array) $user->roles as $role ) {
				$role_caps = isset( $map[ $role ] ) && is_array( $map[ $role ] ) ? $map[ $role ] : array();
				foreach ( $role_caps as $cap_key => $granted ) {
					if ( $granted ) {
						$allcaps[ $cap_key ]         = true;
						$allcaps[ self::ACCESS_CAP ] = true;
					}
				}
			}
		} finally {
			self::$resolving = false;
		}
		return $allcaps;
	}

	/**
	 * List of WP roles available to the permissions panel, with admin
	 * excluded (admin always has everything).
	 *
	 * @return array<int, array{slug:string,label:string}>
	 */
	public static function roles_catalog(): array {
		if ( ! function_exists( 'wp_roles' ) ) {
			return array();
		}
		$out = array();
		foreach ( wp_roles()->get_names() as $slug => $label ) {
			if ( 'administrator' === $slug ) {
				continue;
			}
			$out[] = array(
				'slug'  => (string) $slug,
				'label' => (string) translate_user_role( $label ),
			);
		}
		return $out;
	}

	/**
	 * Drop settings-payload keys the user is not allowed to write.
	 *
	 * Returns the filtered payload. Existing settings are not loaded here —
	 * the caller (class-settings.php REST handler) merges the filtered
	 * payload over the current settings array as it always has.
	 *
	 * @param array    $incoming Raw incoming payload.
	 * @param int|null $user_id  User ID, defaults to current.
	 * @return array
	 */
	public static function filter_settings_payload( array $incoming, ?int $user_id = null ): array {
		if ( self::is_admin( $user_id ) ) {
			return $incoming;
		}
		$filtered = array();
		foreach ( $incoming as $key => $value ) {
			$required_cap = self::cap_for_settings_key( (string) $key );
			if ( self::user_can( $required_cap, $user_id ) ) {
				$filtered[ $key ] = $value;
			}
		}
		return $filtered;
	}

	/**
	 * Invalidate the per-request cache when the eventkoi_settings option is
	 * updated (covers the permission map write path).
	 *
	 * @param string $option Option name.
	 */
	public static function flush_cache_on_settings_change( $option ): void {
		if ( 'eventkoi_settings' === $option ) {
			self::$cache = array();
		}
	}
}
