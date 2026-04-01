import { defineConfig } from 'vite';
import path from 'path';
import postcssImport from 'postcss-import';
import autoprefixer from 'autoprefixer';
import { jsxInJs, wpExternals } from '../vite-plugin-wp-externals.js';

const shimDir = path.resolve( __dirname, '../shims' );

export default defineConfig( ( { command } ) => {
	const aliases = {};

	if ( command === 'serve' ) {
		Object.assign( aliases, {
			'react/jsx-runtime': path.join( shimDir, 'react-jsx-runtime.js' ),
			'react/jsx-dev-runtime': path.join( shimDir, 'react-jsx-runtime.js' ),
			'react-dom/client': path.join( shimDir, 'react-dom-client.js' ),
			'react-dom/server': path.join( shimDir, 'react-dom-server.js' ),
			'react-dom': path.join( shimDir, 'react-dom.js' ),
			'react': path.join( shimDir, 'react.js' ),
		} );
	}

	aliases[ '@' ] = path.resolve( __dirname, 'src' );

	return {
		plugins: [ jsxInJs(), wpExternals() ],
		esbuild: {
			jsx: 'automatic',
			jsxDev: false,
		},
		resolve: {
			alias: aliases,
		},
		css: {
			postcss: {
				plugins: [ postcssImport(), autoprefixer() ],
			},
		},
		server: {
			port: 5174,
			strictPort: true,
			cors: true,
			origin: 'http://localhost:5174',
		},
		build: {
			outDir: 'build',
			emptyOutDir: false,
			sourcemap: false,
			chunkSizeWarningLimit: 1000,
			rollupOptions: {
				input: path.resolve( __dirname, 'src/index.js' ),
				output: {
					format: 'iife',
					name: 'eventkoiFrontend',
					entryFileNames: 'index.js',
					assetFileNames: 'index.css',
				},
				onwarn( warning, warn ) {
					if ( warning.code === 'MODULE_LEVEL_DIRECTIVE' ) return;
					warn( warning );
				},
			},
			cssCodeSplit: false,
		},
	};
} );
