/**
 * Shared portal host for EventKoi overlays.
 *
 * The frontend tailwind bundle is scoped to `.eventkoi-front`, but Radix
 * portals (dialogs, popovers, selects, drawers) mount into document.body by
 * default, outside every scoped wrapper. All portals mount into this shared
 * host instead so overlay content keeps its utility styling.
 */
export function getEventkoiPortalContainer() {
	if ( typeof document === 'undefined' ) {
		return undefined;
	}

	let host = document.getElementById( 'eventkoi-portal-host' );

	if ( ! host ) {
		host = document.createElement( 'div' );
		host.id = 'eventkoi-portal-host';
		host.className = 'eventkoi-front';
		document.body.appendChild( host );
	}

	return host;
}
