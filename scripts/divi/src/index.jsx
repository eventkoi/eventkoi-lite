import { addAction, addFilter } from '@wordpress/hooks';
import { registerModule } from '@divi/module-library';

import { icons } from './icons';
import { buildModuleDefinitions } from './modules';

// Module icons for the insert list and the layers panel.
addFilter( 'divi.iconLibrary.icon.map', 'eventkoi/divi5', ( map ) => ( { ...map, ...icons } ) );

let registered = false;

const register = () => {
	if ( registered ) {
		return;
	}
	registered = true;

	buildModuleDefinitions().forEach( ( { metadata, ...definition } ) => {
		registerModule( metadata, definition );
	} );
};

// Register the modules once Divi's module library store exists. The bundle
// is loaded in the footer next to Divi's packages, so the store usually
// exists already; the action covers the case where it does not yet.
addAction( 'divi.moduleLibrary.registerModuleLibraryStore.after', 'eventkoi/divi5', register );

try {
	if ( window.divi && window.divi.data && window.divi.data.select( 'divi/module-library' ) ) {
		register();
	}
} catch ( error ) {
	// The store is not there yet; the action above will fire.
}
