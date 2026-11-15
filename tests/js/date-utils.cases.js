import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

/*
 * One shared case list, run against both copies of date-utils.
 *
 * These are characterization tests: they assert nothing about what the output
 * SHOULD be, only that it does not change. The snapshots also make the drift
 * between the admin and frontend copies visible, since both are fed identical
 * input.
 */

const TIMEZONES = [
	'UTC',
	'utc',
	'America/New_York',
	'Africa/Cairo',
	'Australia/Adelaide',
	'+02:00',
	'-05:30',
	'GMT+2',
	'UTC+3',
	'Etc/GMT-2',
	'',
	null,
	undefined,
	'Not/AZone',
];

const PHP_FORMATS = [
	'F j, Y',
	'Y-m-d',
	'd/m/Y',
	'l, F jS, Y',
	'g:i a',
	'H:i',
	'D, d M Y H:i:s',
	'M j',
	'',
];

const SHIFT_CASES = [
	['2026-08-11', '8am', 'America/New_York'],
	['2026-08-11', '8:30pm', 'Africa/Cairo'],
	['2026-01-05', '12am', 'Australia/Adelaide'],
	['2026-01-05', '12pm', 'UTC'],
	['2026-08-11', '8am', false],
	['2026-08-11', '8am', 'utc'],
	['', '8am', 'UTC'],
	['2026-08-11', '', 'UTC'],
	['2026-08-11', 'not-a-time', 'UTC'],
];

/*
 * The two copies of getInitialCalendarDate take DIFFERENT shapes despite the
 * shared name: the admin copy reads snake_case default_month/default_year off
 * a calendar row, the frontend copy destructures camelCase props. Each is
 * therefore exercised against its own signature rather than a shared list.
 */
export const ADMIN_CALENDAR_INPUTS = [
	undefined,
	null,
	{},
	{ default_month: 'March' },
	{ default_month: 'March', default_year: 2030 },
	{ default_month: 'march', default_year: '2030' },
	{ default_month: 'Nonsense', default_year: 2030 },
	{ default_year: 'current' },
	{ default_month: '', default_year: '' },
];

export const FRONTEND_CALENDAR_INPUTS = [
	{},
	{ timeframe: 'week' },
	{ context: 'block' },
	{ context: 'block', defaultMonth: 'March' },
	{ context: 'block', defaultMonth: 'March', defaultYear: 2030 },
	{ context: 'block', defaultMonth: 'march', defaultYear: '2030' },
	{ context: 'block', defaultMonth: 'Nonsense', defaultYear: 2030 },
	{ context: 'block', defaultMonth: 'March', timeframe: 'week' },
	{ context: 'admin', defaultMonth: 'March', defaultYear: 2030 },
];

/*
 * Configurations used to check that the block editor preview lands on the same
 * month as the public calendar. getInitialDate carries a comment promising it
 * matches the frontend's getInitialCalendarDate; this is that promise pinned.
 */
export const PARITY_CONFIGS = [
	{ label: 'no defaults', month: '', year: '', timeframe: 'month' },
	{ label: 'month only', month: 'March', year: '', timeframe: 'month' },
	{ label: 'month + year', month: 'March', year: 2030, timeframe: 'month' },
	{ label: 'lowercase month', month: 'march', year: '2030', timeframe: 'month' },
	{ label: 'unknown month', month: 'Nonsense', year: 2030, timeframe: 'month' },
	{ label: 'week view', month: 'March', year: 2030, timeframe: 'week' },
	{ label: 'year only', month: '', year: 2030, timeframe: 'month' },
];

const TIMELINE_EVENTS = [
	{
		label: 'tbc event',
		event: { tbc: true, tbc_note: 'To be announced' },
	},
	{
		label: 'tbc event without note',
		event: { tbc: true },
	},
	{
		label: 'single timed event',
		event: {
			date_type: 'standard',
			standard_type: 'single',
			start_date: '2026-08-11T09:00:00Z',
			end_date: '2026-08-11T11:00:00Z',
			timezone: 'UTC',
		},
	},
	{
		label: 'all day event',
		event: {
			date_type: 'standard',
			standard_type: 'single',
			all_day: true,
			start_date: '2026-08-11T00:00:00Z',
			end_date: '2026-08-11T23:59:59Z',
			timezone: 'UTC',
		},
	},
	{
		label: 'multi day event',
		event: {
			date_type: 'standard',
			standard_type: 'single',
			start_date: '2026-08-11T09:00:00Z',
			end_date: '2026-08-14T17:00:00Z',
			timezone: 'Africa/Cairo',
		},
	},
	{
		label: 'empty event',
		event: {},
	},
];

/**
 * Run the shared case list against one copy of date-utils.
 *
 * @param {string} label Human name for the copy under test.
 * @param {object} mod   The imported module namespace.
 */
export function describeDateUtils(label, mod) {
	// Not every helper exists in every bundle or edition (Lite has no
	// resolveWpTimeFormat at all, and only its admin copy has
	// formatWpDateTime). Record that fact rather than a confusing TypeError.
	const probe = (name, build) =>
		typeof mod[name] === 'function' ? build() : '(not exported by this bundle)';

	describe(label, () => {
		it('normalizeTimeZone', () => {
			const out = probe('normalizeTimeZone', () => {
				const acc = {};
				for (const tz of TIMEZONES) {
					acc[String(tz)] = safely(() => mod.normalizeTimeZone(tz));
				}
				return acc;
			});
			expect(out).toMatchSnapshot();
		});

		it('safeNormalizeTimeZone', () => {
			const out = probe('safeNormalizeTimeZone', () => {
				const acc = {};
				for (const tz of TIMEZONES) {
					acc[String(tz)] = safely(() => mod.safeNormalizeTimeZone(tz));
				}
				return acc;
			});
			expect(out).toMatchSnapshot();
		});

		it('wpToLuxonFormat', () => {
			const out = probe('wpToLuxonFormat', () => {
				const acc = {};
				for (const fmt of PHP_FORMATS) {
					acc[fmt || '(empty)'] = safely(() => mod.wpToLuxonFormat(fmt));
				}
				return acc;
			});
			expect(out).toMatchSnapshot();
		});

		it('resolveWpTimeFormat', () => {
			const out = probe('resolveWpTimeFormat', () => ({
				'12': safely(() => mod.resolveWpTimeFormat('12')),
				'24': safely(() => mod.resolveWpTimeFormat('24')),
				custom: safely(() => mod.resolveWpTimeFormat('custom')),
				empty: safely(() => mod.resolveWpTimeFormat('')),
				nullArg: safely(() => mod.resolveWpTimeFormat(null)),
				withParams24: safely(() =>
					mod.resolveWpTimeFormat(null, { time_format: '24' })
				),
				withParamsCustom: safely(() =>
					mod.resolveWpTimeFormat(null, {
						time_format: 'custom',
						time_format_string: 'H\\hi',
					})
				),
			}));
			expect(out).toMatchSnapshot();
		});

		it('formatWpDateTime', () => {
			const out = probe('formatWpDateTime', () => {
				const dt = DateTime.fromISO('2026-08-11T14:05:00.000Z', {
					zone: 'utc',
				});
				const acc = {};
				for (const fmt of PHP_FORMATS) {
					acc[fmt || '(empty)'] = safely(() => mod.formatWpDateTime(dt, fmt));
				}
				acc.invalidInput = safely(() => mod.formatWpDateTime(null, 'F j, Y'));
				acc.invalidDateTime = safely(() =>
					mod.formatWpDateTime(DateTime.invalid('test'), 'F j, Y')
				);
				return acc;
			});
			expect(out).toMatchSnapshot();
		});

		it('formatTimezoneLabel', () => {
			const out = probe('formatTimezoneLabel', () => {
				const acc = {};
				for (const tz of ['UTC', 'America/New_York', 'Africa/Cairo']) {
					for (const fmt of ['12', '24', 'custom']) {
						acc[`${tz} | ${fmt}`] = safely(() =>
							mod.formatTimezoneLabel(tz, fmt)
						);
						acc[`${tz} | ${fmt} | noFormat`] = safely(() =>
							mod.formatTimezoneLabel(tz, fmt, false)
						);
					}
				}
				return acc;
			});
			expect(out).toMatchSnapshot();
		});

		it('shiftTime', () => {
			const out = probe('shiftTime', () => {
				const acc = {};
				for (const [date, time, zone] of SHIFT_CASES) {
					acc[`${date || '(empty)'} | ${time || '(empty)'} | ${zone}`] = safely(
						() => mod.shiftTime(date, time, zone)
					);
				}
				return acc;
			});
			expect(out).toMatchSnapshot();
		});

		it('buildTimeline', () => {
			const out = probe('buildTimeline', () => {
				const acc = {};
				for (const { label: name, event } of TIMELINE_EVENTS) {
					acc[name] = safely(() => mod.buildTimeline(event, 'UTC', '12'));
					acc[`${name} | Cairo 24h`] = safely(() =>
						mod.buildTimeline(event, 'Africa/Cairo', '24')
					);
				}
				return acc;
			});
			expect(out).toMatchSnapshot();
		});
	});
}

/**
 * Record thrown errors instead of failing, so the snapshot captures the real
 * current behaviour including the cases that blow up.
 */
export function safely(fn) {
	try {
		const value = fn();
		return value === undefined ? '(undefined)' : value;
	} catch (error) {
		return `THREW: ${error.name}: ${error.message}`;
	}
}
