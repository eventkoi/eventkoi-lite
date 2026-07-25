import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';

/*
 * Report-only lint config. Nothing here runs at build time or in CI, and no
 * rule rewrites source. Rules are limited to correctness checks that map to a
 * real runtime failure; stylistic rules are deliberately omitted.
 */
export default [
	{
		ignores: [ 'build/**', 'node_modules/**', '**/*.min.js', 'scripts/**' ],
	},
	js.configs.recommended,
	{
		files: [ 'src/**/*.js', 'src/**/*.jsx' ],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			parserOptions: {
				ecmaFeatures: { jsx: true },
			},
			globals: {
				...globals.browser,
				...globals.es2021,
				wp: 'readonly',
				jQuery: 'readonly',
				elementor: 'readonly',
				elementorFrontend: 'readonly',
				eventkoi_params: 'readonly',
				eventkoi_admin_params: 'readonly',
				// Injected by wp_localize_script / wp_add_inline_script.
				eventkoiAutoUpdate: 'readonly',
				eventkoiQuickStart: 'readonly',
				// Google Maps JS API, loaded via its own script tag.
				google: 'readonly',
				// Externalized to window globals by vite-plugin-wp-externals.
				React: 'readonly',
				ReactDOM: 'readonly',
			},
		},
		plugins: {
			react,
			'react-hooks': reactHooks,
			import: importPlugin,
		},
		settings: {
			react: { version: 'detect' },
			'import/resolver': {
				alias: {
					map: [ [ '@', './src' ] ],
					extensions: [ '.js', '.jsx', '.json', '.css', '.scss' ],
				},
			},
			// Provided by WordPress at runtime via the wpExternals Vite plugin,
			// so they are intentionally absent from node_modules.
			'import/core-modules': [
				'@wordpress/api-fetch',
				'@wordpress/block-editor',
				'@wordpress/blocks',
				'@wordpress/components',
				'@wordpress/compose',
				'@wordpress/data',
				'@wordpress/date',
				'@wordpress/dom-ready',
				'@wordpress/element',
				'@wordpress/hooks',
				'@wordpress/html-entities',
				'@wordpress/i18n',
				'@wordpress/icons',
				'@wordpress/media-utils',
				'@wordpress/primitives',
			],
		},
		rules: {
			// Identifiers used but never imported or defined.
			'no-undef': 'error',
			'react/jsx-no-undef': 'error',
			'react/jsx-uses-react': 'error',
			'react/jsx-uses-vars': 'error',

			// Import paths that do not resolve.
			'import/no-unresolved': 'error',
			'import/named': 'warn',
			'import/no-duplicates': 'warn',

			// Hook misuse: crashes and stale-state bugs.
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn',

			// JSX correctness.
			'react/jsx-key': 'warn',
			'react/jsx-no-duplicate-props': 'error',
			'react/no-children-prop': 'warn',
			'react/no-direct-mutation-state': 'error',

			// Dead or suspicious code.
			'no-unused-vars': [ 'warn', { args: 'none', varsIgnorePattern: '^_' } ],
		},
	},
];
