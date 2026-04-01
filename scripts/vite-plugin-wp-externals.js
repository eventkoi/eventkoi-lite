import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

const WORDPRESS_NAMESPACE = '@wordpress/';

const BUNDLED_PACKAGES = [
	'@wordpress/dataviews',
	'@wordpress/dataviews/wp',
	'@wordpress/icons',
	'@wordpress/interface',
	'@wordpress/sync',
	'@wordpress/undo-manager',
	'@wordpress/upload-media',
	'@wordpress/fields',
];

function camelCaseDash( string ) {
	return string.replace( /-([a-z])/g, ( _, letter ) => letter.toUpperCase() );
}

function requestToExternal( request ) {
	switch ( request ) {
		case 'moment':
			return request;
		case '@babel/runtime/regenerator':
			return 'regeneratorRuntime';
		case 'lodash':
		case 'lodash-es':
			return 'lodash';
		case 'jquery':
			return 'jQuery';
		case 'react':
			return 'React';
		case 'react-dom':
		case 'react-dom/client':
			return 'ReactDOM';
		case 'react/jsx-runtime':
		case 'react/jsx-dev-runtime':
			return 'ReactJSXRuntime';
	}

	if ( BUNDLED_PACKAGES.includes( request ) ) {
		return undefined;
	}

	if ( request.startsWith( WORDPRESS_NAMESPACE ) ) {
		return [ 'wp', camelCaseDash( request.substring( WORDPRESS_NAMESPACE.length ) ) ];
	}
}

function requestToHandle( request ) {
	switch ( request ) {
		case '@babel/runtime/regenerator':
			return 'regenerator-runtime';
		case 'lodash-es':
			return 'lodash';
		case 'react-dom/client':
			return 'react-dom';
		case 'react/jsx-runtime':
		case 'react/jsx-dev-runtime':
			return 'react-jsx-runtime';
	}

	if ( request.startsWith( WORDPRESS_NAMESPACE ) ) {
		return 'wp-' + request.substring( WORDPRESS_NAMESPACE.length );
	}
}

function toGlobalExpr( ext ) {
	if ( Array.isArray( ext ) ) {
		return 'window.' + ext.join( '.' );
	}
	return 'window.' + ext;
}

/**
 * Resolve a file path trying common extensions.
 */
function resolveFile( filePath ) {
	for ( const suffix of [ '', '.js', '.mjs', '.cjs', '/index.js', '/index.mjs' ] ) {
		const full = filePath + suffix;
		try {
			if ( fs.existsSync( full ) && fs.statSync( full ).isFile() ) {
				return full;
			}
		} catch {
			continue;
		}
	}
	return null;
}

/**
 * Recursively collect named export identifiers from an ESM source file.
 */
function collectExports( filePath, visited ) {
	visited = visited || new Set();
	const resolved = resolveFile( filePath );
	if ( ! resolved || visited.has( resolved ) ) {
		return [];
	}
	visited.add( resolved );

	let content;
	try {
		content = fs.readFileSync( resolved, 'utf8' );
	} catch {
		return [];
	}

	const names = new Set();
	let m;

	// export { a, b as c } or export { a, b as c } from '...'
	const re1 = /export\s*\{([^}]+)\}/g;
	while ( ( m = re1.exec( content ) ) !== null ) {
		for ( const item of m[ 1 ].split( ',' ) ) {
			const asMatch = item.trim().match( /\S+\s+as\s+(\S+)/ );
			const name = asMatch ? asMatch[ 1 ] : item.trim();
			if ( name && name !== 'default' ) {
				names.add( name );
			}
		}
	}

	// export const/let/var/function/class name
	const re2 = /export\s+(?:const|let|var|function\*?|class)\s+(\w+)/g;
	while ( ( m = re2.exec( content ) ) !== null ) {
		if ( m[ 1 ] !== 'default' ) {
			names.add( m[ 1 ] );
		}
	}

	// export * from './...' — recurse into relative re-exports
	const re3 = /export\s*\*\s*from\s*['"]([^'"]+)['"]/g;
	while ( ( m = re3.exec( content ) ) !== null ) {
		if ( m[ 1 ].startsWith( '.' ) ) {
			const sub = path.resolve( path.dirname( resolved ), m[ 1 ] );
			for ( const n of collectExports( sub, visited ) ) {
				names.add( n );
			}
		}
	}

	return [ ...names ];
}

/**
 * Discover all named exports of an installed npm package by parsing its entry.
 */
function discoverPackageExports( pkgName ) {
	try {
		const parts = pkgName.split( '/' );
		const pkgDir = parts[ 0 ].startsWith( '@' )
			? path.join( process.cwd(), 'node_modules', parts[ 0 ], parts[ 1 ] )
			: path.join( process.cwd(), 'node_modules', parts[ 0 ] );
		const pkgJsonPath = path.join( pkgDir, 'package.json' );
		if ( ! fs.existsSync( pkgJsonPath ) ) {
			return [];
		}
		const pkgJson = JSON.parse( fs.readFileSync( pkgJsonPath, 'utf8' ) );
		const entry = pkgJson.module || pkgJson.main || 'index.js';
		return collectExports( path.join( pkgDir, entry ) );
	} catch {
		return [];
	}
}

/**
 * Vite's build-import-analysis uses es-module-lexer which can't parse JSX.
 * This plugin pre-transforms .js files containing JSX via esbuild before
 * the import scanner runs.
 */
export function jsxInJs() {
	return {
		name: 'vite-plugin-jsx-in-js',
		enforce: 'pre',
		config() {
			return {
				optimizeDeps: {
					esbuildOptions: {
						loader: { '.js': 'jsx' },
					},
				},
			};
		},
		async transform( code, id ) {
			if ( ! /\/src\//.test( id ) ) {
				return null;
			}

			// Strip "use client" directives from source files to avoid
			// Rollup MODULE_LEVEL_DIRECTIVE warnings and associated
			// sourcemap resolution noise during production builds.
			let stripped = false;
			if ( /^["']use client["'];?\s*$/m.test( code ) ) {
				code = code.replace( /^["']use client["'];?\s*\n?/m, '' );
				stripped = true;
			}

			// Only .js files need the JSX-in-JS esbuild transform.
			if ( /\.js$/.test( id ) && ( /<[A-Z]/.test( code ) || /<\//.test( code ) ) ) {
				const { transformWithEsbuild } = await import( 'vite' );
				return transformWithEsbuild( code, id, {
					loader: 'jsx',
					jsx: 'automatic',
				} );
			}

			if ( stripped ) {
				return { code, map: null };
			}
			return null;
		},
	};
}

/**
 * WordPress externals plugin.
 *
 * Build mode: marks externals in Rollup, maps globals, generates index.asset.php.
 * Dev mode: transforms import statements to read from window globals,
 *           writes .vite-hot file for PHP detection, generates dev index.asset.php.
 */
export function wpExternals() {
	const detectedExternals = new Set();
	// Quick check: does the file contain any external package reference?
	const HAS_EXTERNAL_RE = /['"](react(?:\/jsx-(?:dev-)?runtime)?|react-dom(?:\/client)?|@wordpress\/[\w-]+|moment|lodash(?:-es)?|jquery)['"]/;
	// Import statement regex (handles multi-line named imports but won't span across statements).
	const IMPORT_RE = /import\s+((?:\*\s+as\s+\w+|\w+(?:\s*,\s*\{[^}]*\})?|\{[^}]*\}))\s+from\s+['"](react(?:\/jsx-(?:dev-)?runtime)?|react-dom(?:\/client)?|@wordpress\/[\w-]+|moment|lodash(?:-es)?|jquery)['"]\s*;?/g;

	let isBuild = true;

	return {
		name: 'vite-plugin-wp-externals',
		enforce: 'pre',

		// ── Config ──

		config( _, { command } ) {
			isBuild = command === 'build';

			if ( ! isBuild ) {
				// Dev mode: mark non-bundled @wordpress/*, moment, lodash, jquery
				// as external during esbuild pre-bundling so pre-bundled packages
				// (like @wordpress/icons) don't pull in full copies.
				return {
					optimizeDeps: {
						esbuildOptions: {
							plugins: [ {
								name: 'wp-externals-esbuild',
								setup( build ) {
									build.onResolve( { filter: /^@wordpress\// }, ( args ) => {
										if ( BUNDLED_PACKAGES.includes( args.path ) ) {
											return null;
										}
										return { path: args.path, external: true };
									} );
									build.onResolve( { filter: /^(moment|lodash(-es)?|jquery)$/ }, () => {
										return { path: 'wp-external-stub', namespace: 'wp-ext' };
									} );
									build.onLoad( { filter: /.*/, namespace: 'wp-ext' }, () => {
										return { contents: 'module.exports = {};', loader: 'js' };
									} );
								},
							} ],
						},
					},
				};
			}

			// Build mode: Rollup externals + globals.
			return {
				build: {
					rollupOptions: {
						external( id ) {
							const ext = requestToExternal( id );
							if ( ext !== undefined ) {
								detectedExternals.add( id );
								return true;
							}
							return false;
						},
						output: {
							globals( id ) {
								const ext = requestToExternal( id );
								if ( ext !== undefined ) {
									return Array.isArray( ext ) ? ext.join( '.' ) : ext;
								}
								return id;
							},
						},
					},
				},
			};
		},

		// ── Dev mode: resolve externals to virtual modules ──

		resolveId( source ) {
			if ( isBuild ) {
				return null;
			}
			// React/ReactDOM handled by resolve.alias → shim files.
			if ( source === 'react' || source.startsWith( 'react/' ) ||
				source === 'react-dom' || source.startsWith( 'react-dom/' ) ) {
				return null;
			}
			const ext = requestToExternal( source );
			if ( ext !== undefined ) {
				return '\0wp-external:' + source;
			}
			return null;
		},

		load( id ) {
			if ( ! id.startsWith( '\0wp-external:' ) ) {
				return null;
			}
			const source = id.slice( '\0wp-external:'.length );
			const ext = requestToExternal( source );
			const global = toGlobalExpr( ext );

			const exports = discoverPackageExports( source );
			let code = `const _g = ${ global } || {};\nexport default _g;\n`;
			if ( exports.length > 0 ) {
				code += `export const { ${ exports.join( ', ' ) } } = _g;\n`;
			}
			return code;
		},

		generateBundle( _options, bundle ) {
			const handles = new Set();

			for ( const id of detectedExternals ) {
				const handle = requestToHandle( id ) || id;
				handles.add( handle );
			}

			const sortedDeps = [ ...handles ].sort();

			let mainCode = '';
			for ( const chunk of Object.values( bundle ) ) {
				if ( chunk.type === 'chunk' && chunk.isEntry ) {
					mainCode = chunk.code;
					break;
				}
			}

			const hash = createHash( 'md5' ).update( mainCode ).digest( 'hex' ).slice( 0, 20 );
			const depsPhp = sortedDeps.map( ( d ) => `'${ d }'` ).join( ', ' );

			this.emitFile( {
				type: 'asset',
				fileName: 'index.asset.php',
				source: `<?php return array('dependencies' => array(${ depsPhp }), 'version' => '${ hash }');\n`,
			} );
		},

		// ── Dev mode: transform imports + hot file ──

		configureServer( server ) {
			const outDir = server.config.build.outDir || 'build';
			const resolvedOut = path.resolve( server.config.root, outDir );
			const hotFile = path.join( resolvedOut, '.vite-hot' );

			// Ensure build dir exists.
			fs.mkdirSync( resolvedOut, { recursive: true } );

			server.httpServer?.once( 'listening', () => {
				const address = server.httpServer.address();
				const port = typeof address === 'object' ? address.port : server.config.server.port;
				const url = `http://localhost:${ port }`;
				fs.writeFileSync( hotFile, url );
			} );

			// Also write a dev index.asset.php by scanning entry source.
			server.httpServer?.once( 'listening', () => {
				const entryFile = server.config.build?.rollupOptions?.input;
				if ( ! entryFile || ! fs.existsSync( entryFile ) ) {
					return;
				}
				try {
					const handles = new Set();
					const scanDir = path.dirname( entryFile );
					scanSourcesForExternals( scanDir, handles );
					const sortedDeps = [ ...handles ].sort();
					const depsPhp = sortedDeps.map( ( d ) => `'${ d }'` ).join( ', ' );
					const assetFile = path.join( resolvedOut, 'index.asset.php' );
					fs.writeFileSync(
						assetFile,
						`<?php return array('dependencies' => array(${ depsPhp }), 'version' => 'dev');\n`
					);
				} catch {
					// Non-fatal: PHP will use last build's asset file.
				}
			} );

			const cleanup = () => {
				try {
					if ( fs.existsSync( hotFile ) ) {
						fs.unlinkSync( hotFile );
					}
				} catch {
					// ignore
				}
			};

			server.httpServer?.on( 'close', cleanup );
			process.on( 'exit', cleanup );
			process.on( 'SIGINT', () => {
				cleanup();
				process.exit();
			} );
			process.on( 'SIGTERM', () => {
				cleanup();
				process.exit();
			} );
		},

		// In dev mode, replace import statements for externals with window global access.
		transform( code, id ) {
			// Only run in dev/serve mode, not during builds.
			if ( isBuild ) {
				return null;
			}
			if ( ! /\/src\//.test( id ) ) {
				return null;
			}
			if ( ! HAS_EXTERNAL_RE.test( code ) ) {
				return null;
			}

			let modified = false;
			const result = code.replace( IMPORT_RE, ( match, clause, source ) => {
				const ext = requestToExternal( source );
				if ( ext === undefined ) {
					return match;
				}

				const global = toGlobalExpr( ext );
				const c = clause.trim();
				modified = true;

				// import * as X from '...'
				if ( c.startsWith( '*' ) ) {
					const name = c.replace( /^\*\s*as\s*/, '' ).trim();
					return `const ${ name } = ${ global };`;
				}

				// Check for named imports { ... }
				const braceStart = c.indexOf( '{' );
				const parts = [];

				if ( braceStart > 0 ) {
					// Default + named: import Foo, { bar } from '...'
					const def = c.slice( 0, braceStart ).replace( /,\s*$/, '' ).trim();
					const named = c.slice( braceStart ).trim().replace( /\bas\b/g, ':' );
					parts.push( `const ${ def } = ${ global };` );
					parts.push( `const ${ named } = ${ global };` );
				} else if ( braceStart === 0 ) {
					// Named only: import { bar, baz } from '...'
					parts.push( `const ${ c.replace( /\bas\b/g, ':' ) } = ${ global };` );
				} else {
					// Default only: import Foo from '...'
					parts.push( `const ${ c } = ${ global };` );
				}

				return parts.join( ' ' );
			} );

			if ( modified ) {
				return { code: result, map: null };
			}
			return null;
		},
	};
}

/**
 * Recursively scan .js/.jsx source files for external import sources
 * and collect their WP script handles.
 */
function scanSourcesForExternals( dir, handles ) {
	let entries;
	try {
		entries = fs.readdirSync( dir, { withFileTypes: true } );
	} catch {
		return;
	}
	for ( const entry of entries ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() && entry.name !== 'node_modules' ) {
			scanSourcesForExternals( full, handles );
		} else if ( /\.[jt]sx?$/.test( entry.name ) ) {
			try {
				const src = fs.readFileSync( full, 'utf8' );
				const re = /from\s+['"](react(?:\/jsx-(?:dev-)?runtime)?|react-dom(?:\/client)?|@wordpress\/[\w-]+|moment|lodash(?:-es)?|jquery)['"]/g;
				let m;
				while ( ( m = re.exec( src ) ) !== null ) {
					const ext = requestToExternal( m[ 1 ] );
					if ( ext !== undefined ) {
						const handle = requestToHandle( m[ 1 ] ) || m[ 1 ];
						handles.add( handle );
					}
				}
			} catch {
				// skip unreadable files
			}
		}
	}
}
