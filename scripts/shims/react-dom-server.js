/**
 * Dev-mode shim for react-dom/server.
 *
 * WordPress does not ship ReactDOMServer as a window global, and Vite's
 * pre-bundled copy of react-dom/server inlines its own React which conflicts
 * with our window.React shims. This lightweight client-side implementation
 * provides renderToStaticMarkup / renderToString using the WP-provided
 * ReactDOM so the onboarding widgets can generate HTML strings.
 */
export function renderToStaticMarkup( element ) {
	const container = document.createElement( 'div' );

	if ( window.ReactDOM.createRoot ) {
		const root = window.ReactDOM.createRoot( container );
		window.ReactDOM.flushSync( () => root.render( element ) );
		const html = container.innerHTML;
		root.unmount();
		return html;
	}

	// Fallback for older React versions.
	window.ReactDOM.render( element, container );
	const html = container.innerHTML;
	window.ReactDOM.unmountComponentAtNode( container );
	return html;
}

export function renderToString( element ) {
	return renderToStaticMarkup( element );
}
