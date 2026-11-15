/**
 * Scope Tailwind utilities to EventKoi containers.
 *
 * The frontend tailwind bundle loads on every page of the host site. Unscoped
 * utility classes like `.inline`, `.hidden` or `.container` collide with theme
 * markup that uses the same class names (helpdesk #MBQZOM7Y: Total theme
 * buttons carry `inline`, our `display:inline!important` shattered them).
 *
 * Every class rule is rewritten to only match inside `.eventkoi-front` (all
 * shortcode/block wrappers and the shared portal host carry that class), or on
 * an element carrying `.eventkoi-front` itself:
 *
 *   .inline{...}  ->  :where(.eventkoi-front) .inline, .inline:where(.eventkoi-front){...}
 *
 * `:where()` keeps each selector's specificity identical to the unscoped
 * original, so cascade order inside EventKoi UI is unchanged. Selectors that
 * already reference an eventkoi/ek scope and non-class selectors (tw vars on
 * `*`, `::backdrop`) pass through untouched.
 */

const parser = require( 'postcss-selector-parser' );

const SCOPE = ':where(.eventkoi-front)';

const prependScope = parser( ( selectors ) => {
	selectors.each( ( selector ) => {
		const first = selector.first;
		if ( ! first ) {
			return;
		}
		selector.insertBefore( first, parser.combinator( { value: ' ' } ) );
		selector.insertBefore( selector.first, parser.pseudo( { value: SCOPE } ) );
	} );
} );

const scopeFirstCompound = parser( ( selectors ) => {
	selectors.each( ( selector ) => {
		let lastSimple = null;
		for ( const node of selector.nodes ) {
			// Stop at the end of the first compound; keep the guard before any
			// pseudo class/element so `.foo:hover` becomes `.foo:where(...):hover`.
			if ( node.type === 'combinator' || node.type === 'pseudo' ) {
				break;
			}
			lastSimple = node;
		}
		if ( ! lastSimple ) {
			return;
		}
		selector.insertAfter( lastSimple, parser.pseudo( { value: SCOPE } ) );
	} );
} );

function shouldSkip( selector ) {
	if ( selector.includes( 'eventkoi' ) || selector.includes( '.ek-' ) ) {
		return true;
	}
	// Only scope selectors that start with a class.
	return ! selector.trimStart().startsWith( '.' );
}

module.exports = () => ( {
	postcssPlugin: 'postcss-scope-eventkoi',
	OnceExit( root ) {
		root.walkRules( ( rule ) => {
			if ( rule.parent && rule.parent.type === 'atrule' && /keyframes/i.test( rule.parent.name ) ) {
				return;
			}

			const out = [];
			for ( const sel of rule.selectors ) {
				if ( shouldSkip( sel ) ) {
					out.push( sel );
					continue;
				}
				out.push( prependScope.processSync( sel ) );
				out.push( scopeFirstCompound.processSync( sel ) );
			}
			rule.selectors = out;
		} );
	},
} );

module.exports.postcss = true;
