import { describe, expect, it } from 'vitest';
import * as backend from '../../scripts/backend/src/lib/date-utils.js';
import * as frontend from '../../scripts/frontend/src/lib/date-utils.js';
import {
	ADMIN_CALENDAR_INPUTS,
	FRONTEND_CALENDAR_INPUTS,
	PARITY_CONFIGS,
	describeDateUtils,
	safely,
} from './date-utils.cases.js';

/*
 * Both bundles ship their own copy of these helpers and the copies have
 * drifted. Pinning each separately means a change to either one is caught,
 * and the two snapshot blocks show exactly where they disagree.
 */
describeDateUtils('admin bundle (scripts/backend)', backend);
describeDateUtils('frontend bundle (scripts/frontend)', frontend);

describe('getInitialCalendarDate (signatures differ per bundle)', () => {
	it('admin copy, snake_case calendar row', () => {
		const out = {};
		for (const input of ADMIN_CALENDAR_INPUTS) {
			out[JSON.stringify(input) ?? 'undefined'] = safely(() =>
				backend.getInitialCalendarDate(input)
			);
		}
		expect(out).toMatchSnapshot();
	});

	it('frontend copy, camelCase props', () => {
		const out = {};
		for (const input of FRONTEND_CALENDAR_INPUTS) {
			out[JSON.stringify(input)] = safely(() =>
				frontend.getInitialCalendarDate(input)
			);
		}
		expect(out).toMatchSnapshot();
	});
});

/*
 * getInitialDate in the admin bundle carries a comment stating it matches the
 * frontend's getInitialCalendarDate "so the editor preview reflects what
 * visitors actually see". If these ever diverge, a calendar block would open
 * on a different month in the editor than on the live site.
 */
describe('editor preview matches the public calendar', () => {
	for (const config of PARITY_CONFIGS) {
		it(`lands on the same month: ${config.label}`, () => {
			const editor = backend.getInitialDate({
				timeframe: config.timeframe,
				default_month: config.month,
				default_year: config.year,
			});

			const site = frontend.getInitialCalendarDate({
				context: 'block',
				timeframe: config.timeframe,
				defaultMonth: config.month,
				defaultYear: config.year,
			});

			expect(editor).toBe(site);
		});
	}
});
