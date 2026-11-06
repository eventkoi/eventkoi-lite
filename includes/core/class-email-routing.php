<?php
/**
 * Who an EventKoi email comes from and who it goes to.
 *
 * Each email has its own sender, or shares one global default sender, and its
 * own recipients, Cc and Bcc. The default recipient is written as a token, so it
 * can be removed or added to like any other address.
 *
 * @package EventKoi\Core
 */

namespace EventKoi\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Class Email_Routing.
 */
class Email_Routing {

	/**
	 * Setting holding the global default sender name.
	 *
	 * @var string
	 */
	const GLOBAL_NAME_KEY = 'email_sender_global_name';

	/**
	 * Setting holding the global default sender email.
	 *
	 * @var string
	 */
	const GLOBAL_EMAIL_KEY = 'email_sender_global_email';

	/**
	 * Tokens that stand for the person an email normally goes to.
	 *
	 * @var string[]
	 */
	const DEFAULT_TOKENS = array( '[attendee_email]', '[admin_email]', '[submitter_email]' );

	/**
	 * Whether an email uses the global default sender. An email that already had
	 * its own sender before this setting existed keeps it.
	 *
	 * @param string $prefix   Email setting prefix.
	 * @param array  $settings Plugin settings.
	 * @return bool
	 */
	public static function uses_global_sender( $prefix, $settings ) {
		$flag = $settings[ $prefix . '_email_sender_global' ] ?? '';

		if ( '' !== (string) $flag ) {
			return '1' === (string) $flag;
		}

		return '' === trim( (string) ( $settings[ $prefix . '_email_sender_name' ] ?? '' ) )
			&& '' === trim( (string) ( $settings[ $prefix . '_email_sender_email' ] ?? '' ) );
	}

	/**
	 * The sender for an email.
	 *
	 * @param string $prefix          Email setting prefix.
	 * @param array  $settings        Plugin settings.
	 * @param string $fallback_prefix Email whose sender applies when this one never saved its own.
	 * @return array{name:string,email:string}
	 */
	public static function get_sender( $prefix, $settings, $fallback_prefix = '' ) {
		$own_saved = isset( $settings[ $prefix . '_email_sender_email' ] ) || isset( $settings[ $prefix . '_email_sender_name' ] );

		if ( '' !== $fallback_prefix && ! $own_saved && ! isset( $settings[ $prefix . '_email_sender_global' ] ) ) {
			$prefix = $fallback_prefix;
		}

		if ( self::uses_global_sender( $prefix, $settings ) ) {
			$name  = $settings[ self::GLOBAL_NAME_KEY ] ?? '';
			$email = $settings[ self::GLOBAL_EMAIL_KEY ] ?? '';
		} else {
			$name  = $settings[ $prefix . '_email_sender_name' ] ?? '';
			$email = $settings[ $prefix . '_email_sender_email' ] ?? '';
		}

		return array(
			'name'  => sanitize_text_field( (string) $name ),
			'email' => sanitize_email( (string) $email ),
		);
	}

	/**
	 * Turn a comma separated list into valid addresses, replacing default tokens.
	 *
	 * @param string $list       Addresses and tokens.
	 * @param string $default_to The person the email normally goes to.
	 * @return string[]
	 */
	public static function parse_addresses( $list, $default_to ) {
		$addresses = array();

		foreach ( explode( ',', (string) $list ) as $item ) {
			$item = trim( $item );

			if ( in_array( $item, self::DEFAULT_TOKENS, true ) ) {
				$addresses = array_merge( $addresses, self::parse_addresses( $default_to, '' ) );
				continue;
			}

			// Anything sanitizing would alter is not an address.
			if ( sanitize_email( $item ) === $item && is_email( $item ) ) {
				$addresses[] = $item;
			}
		}

		return array_values( array_unique( $addresses ) );
	}

	/**
	 * Send an EventKoi email with its configured sender and recipients.
	 *
	 * @param string $prefix     Email setting prefix.
	 * @param string $default_to The person the email normally goes to.
	 * @param string $subject    Subject.
	 * @param string $body       HTML body.
	 * @param array  $settings   Plugin settings.
	 * @param array  $args       {
	 *     Optional.
	 *     @type string $fallback_prefix Email whose sender applies when this one never saved its own.
	 *     @type bool   $personal        One person's own copy: only they get it, no Cc or Bcc.
	 * }
	 * @return bool Whether the email was sent.
	 */
	public static function send( $prefix, $default_to, $subject, $body, $settings, $args = array() ) {
		$personal = ! empty( $args['personal'] );
		$stored   = $settings[ $prefix . '_email_recipients' ] ?? null;
		$to       = ( $personal || null === $stored )
			? self::parse_addresses( $default_to, '' )
			: self::parse_addresses( (string) $stored, $default_to );

		if ( empty( $to ) ) {
			return false;
		}

		$headers = array( 'Content-Type: text/html; charset=UTF-8' );
		$sender  = self::get_sender( $prefix, $settings, (string) ( $args['fallback_prefix'] ?? '' ) );

		$from_email_hook = null;
		$from_name_hook  = null;

		if ( '' !== $sender['email'] ) {
			$sender_email    = $sender['email'];
			$headers[]       = 'From: ' . ( '' !== $sender['name'] ? sprintf( '%s <%s>', $sender['name'], $sender_email ) : $sender_email );
			$from_email_hook = static function () use ( $sender_email ) {
				return $sender_email;
			};
			add_filter( 'wp_mail_from', $from_email_hook );
		}

		if ( '' !== $sender['name'] ) {
			$sender_name    = $sender['name'];
			$from_name_hook = static function () use ( $sender_name ) {
				return $sender_name;
			};
			add_filter( 'wp_mail_from_name', $from_name_hook );
		}

		if ( ! $personal ) {
			$cc  = array_diff( self::parse_addresses( (string) ( $settings[ $prefix . '_email_cc' ] ?? '' ), $default_to ), $to );
			$bcc = array_diff( self::parse_addresses( (string) ( $settings[ $prefix . '_email_bcc' ] ?? '' ), $default_to ), $to, $cc );

			if ( ! empty( $cc ) ) {
				$headers[] = 'Cc: ' . implode( ', ', $cc );
			}
			if ( ! empty( $bcc ) ) {
				$headers[] = 'Bcc: ' . implode( ', ', $bcc );
			}
		}

		$sent = wp_mail( $to, $subject, $body, $headers );

		if ( $from_email_hook ) {
			remove_filter( 'wp_mail_from', $from_email_hook );
		}
		if ( $from_name_hook ) {
			remove_filter( 'wp_mail_from_name', $from_name_hook );
		}

		return (bool) $sent;
	}

	/**
	 * Settings keys this class reads, for the permissions map.
	 *
	 * @return array<string,string> Key => capability.
	 */
	public static function settings_key_caps() {
		$caps = array(
			self::GLOBAL_NAME_KEY  => 'eventkoi_settings_emails',
			self::GLOBAL_EMAIL_KEY => 'eventkoi_settings_emails',
		);

		foreach ( array( 'rsvp', 'ticket', 'reminder', 'refund', 'admin_rsvp', 'admin_sale', 'admin_submission', 'submitter_submission' ) as $prefix ) {
			foreach ( array( 'recipients', 'cc', 'bcc', 'sender_global', 'sender_name', 'sender_email' ) as $suffix ) {
				$caps[ $prefix . '_email_' . $suffix ] = 'eventkoi_settings_emails';
			}
		}

		return $caps;
	}
}
