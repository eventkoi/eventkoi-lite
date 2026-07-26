import path from 'node:path';
import { defineConfig } from 'vitest/config';

/*
 * Characterization tests for the date/time helpers.
 *
 * These live at the repo root rather than under scripts/ because the release
 * zip rsyncs the whole scripts folder, and test code must not ship.
 *
 * The two bundles each carry their own copy of lib/date-utils.js and the
 * copies have drifted, so both are pinned separately. The snapshots record
 * what the code does TODAY, whatever that is. A failing snapshot means
 * behaviour changed, not that it is wrong.
 */
export default defineConfig({
	resolve: {
		alias: [
			{
				find: '@wordpress/i18n',
				replacement: path.resolve(__dirname, 'tests/js/stubs/wp-i18n.js'),
			},
			{
				find: '@/hooks/SettingsContext',
				replacement: path.resolve(
					__dirname,
					'tests/js/stubs/settings-context.js'
				),
			},
		],
	},
	test: {
		include: ['tests/js/**/*.test.js'],
		environment: 'node',
		setupFiles: ['tests/js/setup.js'],
	},
});
