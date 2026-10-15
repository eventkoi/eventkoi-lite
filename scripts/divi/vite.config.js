import { defineConfig } from 'vite';
import path from 'path';

// Everything the bundle needs already lives on the visual builder window:
// React under window.vendor, WordPress hooks under window.vendor.wp and the
// Divi packages under window.divi. They are mapped to those globals instead
// of being bundled, the same way Divi's own extension examples do it.
const GLOBALS = {
	react: 'vendor.React',
	'react-dom': 'vendor.ReactDOM',
	'@wordpress/hooks': 'vendor.wp.hooks',
	'@divi/module': 'divi.module',
	'@divi/module-library': 'divi.moduleLibrary',
	'@divi/module-utils': 'divi.moduleUtils',
	'@divi/rest': 'divi.rest',
	'@divi/icon-library': 'divi.iconLibrary',
};

export default defineConfig( {
	esbuild: {
		jsx: 'transform',
		jsxFactory: 'React.createElement',
		jsxFragment: 'React.Fragment',
		jsxInject: "import React from 'react'",
	},
	build: {
		outDir: 'build',
		emptyOutDir: true,
		sourcemap: false,
		target: 'es2019',
		rollupOptions: {
			input: path.resolve( __dirname, 'src/index.jsx' ),
			external: Object.keys( GLOBALS ),
			output: {
				format: 'iife',
				name: 'eventkoiDivi5',
				entryFileNames: 'index.js',
				assetFileNames: 'index.css',
				globals: GLOBALS,
			},
		},
	},
} );
