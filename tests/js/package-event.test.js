import { describe, expect, it } from 'vitest';
import { isSinglePackageEligible } from '../../scripts/backend/src/lib/package-event.js';

/*
 * The editor gate has to agree with Event::is_package() in PHP, which requires
 * date_type standard + standard_type selected + more than one day row. PROD-554:
 * switching an event to recurring leaves standard_type and event_days in meta,
 * so an event that was once standard/selected kept showing the toggle while a
 * natively recurring event did not.
 */
const twoDays = [
	{ start_date: '2026-08-20T07:00:00Z', end_date: '2026-08-20T08:00:00Z' },
	{ start_date: '2026-08-22T07:00:00Z', end_date: '2026-08-22T08:00:00Z' },
];

describe('isSinglePackageEligible', () => {
	it('accepts a multi-day selected-dates standard event', () => {
		expect(
			isSinglePackageEligible({
				date_type: 'standard',
				standard_type: 'selected',
				event_days: twoDays,
			})
		).toBe(true);
	});

	it('treats a missing date_type as standard, like the date picker does', () => {
		expect(
			isSinglePackageEligible({
				standard_type: 'selected',
				event_days: twoDays,
			})
		).toBe(true);
	});

	it('rejects a recurring event carrying stale standard-mode meta', () => {
		expect(
			isSinglePackageEligible({
				date_type: 'recurring',
				standard_type: 'selected',
				event_days: twoDays,
			})
		).toBe(false);
	});

	it('rejects a continuous standard event', () => {
		expect(
			isSinglePackageEligible({
				date_type: 'standard',
				standard_type: 'continuous',
				event_days: twoDays,
			})
		).toBe(false);
	});

	it('rejects a single-day selected-dates event', () => {
		expect(
			isSinglePackageEligible({
				date_type: 'standard',
				standard_type: 'selected',
				event_days: [twoDays[0]],
			})
		).toBe(false);
	});

	it('rejects missing or malformed day rows', () => {
		expect(isSinglePackageEligible(null)).toBe(false);
		expect(
			isSinglePackageEligible({
				date_type: 'standard',
				standard_type: 'selected',
			})
		).toBe(false);
		expect(
			isSinglePackageEligible({
				date_type: 'standard',
				standard_type: 'selected',
				event_days: 'nope',
			})
		).toBe(false);
	});
});
