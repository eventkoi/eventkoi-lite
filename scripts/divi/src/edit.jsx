import { useEffect, useRef, useState } from 'react';
import { ModuleContainer, StyleContainer, CssStyle, textOptionsClassnames } from '@divi/module';

import { getBuilderData } from './data';

const ModuleStyles = ( { attrs, settings, orderClass, mode, state, noStyleTag, elements, defaultPrintedStyleAttrs } ) => (
	<StyleContainer mode={ mode } state={ state } noStyleTag={ noStyleTag }>
		{ elements.style( {
			attrName: 'module',
			styleProps: {
				defaultPrintedStyleAttrs: defaultPrintedStyleAttrs?.module?.decoration,
				disabledOn: {
					disabledModuleVisibility: settings?.disabledModuleVisibility,
				},
				advancedStyles: [
					{
						componentName: 'divi/text',
						props: {
							selector: orderClass,
							attr: attrs?.module?.advanced?.text,
							defaultPrintedStyleAttr: defaultPrintedStyleAttrs?.module?.advanced?.text,
						},
					},
				],
			},
		} ) }
		<CssStyle selector={ orderClass } attr={ attrs?.css } cssFields={ {} } />
	</StyleContainer>
);

const ModuleScriptData = ( { elements } ) => (
	<React.Fragment>
		{ elements.scriptData( { attrName: 'module' } ) }
	</React.Fragment>
);

const moduleClassnames = ( { classnamesInstance, attrs } ) => {
	classnamesInstance.add( textOptionsClassnames( attrs?.module?.advanced?.text ) );
};

// Only the content settings change the markup; design settings are applied
// by Divi through generated CSS.
const contentAttrs = ( attrs ) => {
	const out = {};
	Object.keys( attrs || {} ).forEach( ( key ) => {
		if ( 'module' !== key && 'css' !== key ) {
			out[ key ] = attrs[ key ];
		}
	} );
	return out;
};

/**
 * Server rendered preview. The markup is produced by the same PHP that
 * renders the front end, so what the builder shows is what visitors get.
 */
const ServerPreview = ( { module, attrs } ) => {
	const data = getBuilderData();
	const i18n = data.i18n || {};
	const payload = JSON.stringify( contentAttrs( attrs ) );
	const [ state, setState ] = useState( { html: '', loading: true, error: false } );
	const container = useRef( null );

	useEffect( () => {
		if ( ! data.restUrl ) {
			setState( { html: '', loading: false, error: true } );
			return undefined;
		}

		let cancelled = false;
		const controller = new AbortController();
		const timer = setTimeout( () => {
			window
				.fetch( data.restUrl, {
					method: 'POST',
					credentials: 'same-origin',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce': data.nonce || '',
					},
					body: JSON.stringify( { module, attrs: JSON.parse( payload ), post: data.postId || 0 } ),
					signal: controller.signal,
				} )
				.then( ( response ) => ( response.ok ? response.json() : Promise.reject( new Error( response.statusText ) ) ) )
				.then( ( json ) => {
					if ( ! cancelled ) {
						setState( { html: ( json && json.html ) || '', loading: false, error: false } );
					}
				} )
				.catch( ( error ) => {
					if ( ! cancelled && 'AbortError' !== error.name ) {
						setState( { html: '', loading: false, error: true } );
					}
				} );
		}, 250 );

		return () => {
			cancelled = true;
			controller.abort();
			clearTimeout( timer );
		};
	}, [ module, payload ] );

	useEffect( () => {
		if ( ! state.loading && state.html && 'function' === typeof window.eventkoiInitCalendars ) {
			window.eventkoiInitCalendars();
		}
	}, [ state ] );

	if ( state.loading && ! state.html ) {
		return <div className="eventkoi-divi5-preview eventkoi-divi5-preview--notice">{ i18n.loading || 'Loading…' }</div>;
	}

	if ( ! state.html ) {
		return (
			<div className="eventkoi-divi5-preview eventkoi-divi5-preview--notice">
				{ state.error ? i18n.error || 'The preview could not be loaded.' : i18n.empty || 'Nothing to show yet.' }
			</div>
		);
	}

	return <div ref={ container } className="eventkoi-divi5-preview" dangerouslySetInnerHTML={ { __html: state.html } } />;
};

export const makeEdit = ( module ) => {
	const Edit = ( { attrs, id, name, elements, isLooped, loopIndex } ) => (
		<ModuleContainer
			attrs={ attrs }
			elements={ elements }
			id={ id }
			name={ name }
			stylesComponent={ ModuleStyles }
			classnamesFunction={ moduleClassnames }
			scriptDataComponent={ ModuleScriptData }
			isLooped={ isLooped }
			loopIndex={ loopIndex }
		>
			{ elements.styleComponents( { attrName: 'module' } ) }
			<ServerPreview module={ module } attrs={ attrs } />
		</ModuleContainer>
	);

	Edit.displayName = `EventKoi${ module.charAt( 0 ).toUpperCase() }${ module.slice( 1 ) }Edit`;

	return Edit;
};
