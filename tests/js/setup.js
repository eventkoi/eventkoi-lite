import { beforeAll, afterAll, vi } from 'vitest';

/*
 * date-utils reads a bare `eventkoi_params` global that WordPress localizes
 * into the page, and several helpers branch on the current time. Both are
 * pinned here so the snapshots are deterministic.
 */

const PARAMS = {
	timezone: 'UTC',
	time_format: '12',
	date_format: 'F j, Y',
	locale: 'en_US',
	start_of_week: 1,
	settings: {},
};

// A fixed instant, deliberately mid-year to avoid DST edges in the base case.
export const FROZEN_NOW = new Date('2026-06-15T12:00:00.000Z');

globalThis.eventkoi_params = PARAMS;
globalThis.window = globalThis.window || globalThis;
globalThis.window.eventkoi_params = PARAMS;
globalThis.__EK_TEST_SETTINGS__ = null;

beforeAll(() => {
	vi.useFakeTimers();
	vi.setSystemTime(FROZEN_NOW);
});

afterAll(() => {
	vi.useRealTimers();
});
