<?php // phpcs:ignoreFile WordPress.Files.FileName.InvalidClassFileName -- PHPUnit integration test filename follows the existing tests suite convention.
/**
 * Integration tests for calendar visible-views sanitizing (PROD-556).
 *
 * @package EventKoi
 */

declare(strict_types=1);

namespace EventKoi\Tests\Integration;

use EventKoi\Tests\TestCase;

/**
 * The visible-views setting must never break existing embeds: anything
 * invalid or empty falls back to every view.
 */
class CalendarVisibleViewsTest extends TestCase {
	/**
	 * Valid subsets pass through in canonical order; junk falls back to all.
	 *
	 * @return void
	 */
	public function test_sanitize_calendar_views(): void {
		$all = array( 'month', 'week', 'list' );

		$this->assertSame( $all, eventkoi_sanitize_calendar_views( '' ) );
		$this->assertSame( $all, eventkoi_sanitize_calendar_views( null ) );
		$this->assertSame( $all, eventkoi_sanitize_calendar_views( 'bogus,nope' ) );
		$this->assertSame( $all, eventkoi_sanitize_calendar_views( 42 ) );
		$this->assertSame( $all, eventkoi_sanitize_calendar_views( 'month,week,list' ) );
		$this->assertSame( array( 'month', 'list' ), eventkoi_sanitize_calendar_views( 'month,list' ) );
		$this->assertSame( array( 'month', 'list' ), eventkoi_sanitize_calendar_views( ' list , month ' ), 'Order is canonical, whitespace tolerated.' );
		$this->assertSame( array( 'week' ), eventkoi_sanitize_calendar_views( 'week' ) );
		$this->assertSame( array( 'week' ), eventkoi_sanitize_calendar_views( array( 'week', 'junk' ) ) );
	}

	/**
	 * The rendered calendar container always carries the attribute, defaulting
	 * to all views so pre-existing embeds are untouched.
	 *
	 * @return void
	 */
	public function test_calendar_content_emits_visible_views_attribute(): void {
		$calendar_id = $this->create_calendar( 'Views Test Calendar' );

		$default = eventkoi_get_calendar_content( $calendar_id, 'calendar', array() );
		$this->assertStringContainsString( 'data-visible-views="month,week,list"', $default );

		$restricted = eventkoi_get_calendar_content( $calendar_id, 'calendar', array( 'views' => 'month,list' ) );
		$this->assertStringContainsString( 'data-visible-views="month,list"', $restricted );
	}
}
