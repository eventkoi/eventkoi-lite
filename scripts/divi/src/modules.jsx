import { elementsCallbacks } from '@divi/module-utils';

import calendarMetadata from '../../../includes/core/divi5/modules/calendar/module.json';
import calendarOutline from '../../../includes/core/divi5/modules/calendar/conversion-outline.json';
import eventMetadata from '../../../includes/core/divi5/modules/event/module.json';
import eventOutline from '../../../includes/core/divi5/modules/event/conversion-outline.json';

import { getBuilderData } from './data';
import { makeEdit } from './edit';

const SOURCES = {
	calendar: { metadata: calendarMetadata, outline: calendarOutline },
	event: { metadata: eventMetadata, outline: eventOutline },
};

const clone = ( value ) => JSON.parse( JSON.stringify( value ) );

const toSelectOptions = ( list ) => {
	const options = {};
	( list || [] ).forEach( ( { value, label } ) => {
		options[ value ] = { label };
	} );
	return options;
};

/**
 * Field settings for one taxonomy picker on the calendar module. The PHP
 * side registers the same attribute so saved values render on the front end.
 */
const taxonomyAttribute = ( definition, index ) => ( {
	type: 'object',
	default: { innerContent: { desktop: { value: [] } } },
	settings: {
		innerContent: {
			groupType: 'group-item',
			item: {
				groupSlug: 'content',
				priority: 100 + index * 10,
				render: true,
				attrName: `${ definition.attr }.innerContent`,
				label: definition.label,
				description: definition.description,
				features: { sticky: false, responsive: false, hover: false, dynamicContent: false },
				component: {
					name: 'divi/checkboxes',
					type: 'field',
					props: { options: definition.options || [] },
				},
			},
		},
	},
} );

/**
 * Fill the static module.json with site data: translated labels, the
 * calendars and events that exist on this site, and one picker per taxonomy.
 */
const prepareMetadata = ( slug, source, data ) => {
	const metadata = clone( source );
	const labels = ( data.labels && data.labels[ slug ] ) || {};
	const options = ( data.options && data.options[ slug ] ) || {};

	Object.keys( metadata.attributes ).forEach( ( attr ) => {
		const item = metadata.attributes[ attr ]?.settings?.innerContent?.item;
		if ( ! item ) {
			return;
		}
		if ( labels[ attr ]?.label ) {
			item.label = labels[ attr ].label;
		}
		if ( labels[ attr ]?.description ) {
			item.description = labels[ attr ].description;
		}
		if ( options[ attr ] && item.component?.name === 'divi/select' ) {
			item.component.props = { ...( item.component.props || {} ), options: toSelectOptions( options[ attr ] ) };
		}
	} );

	const groups = metadata.settings?.groups || {};
	Object.keys( groups ).forEach( ( groupSlug ) => {
		const key = groupSlug.endsWith( 'Query' ) ? 'queryGroup' : 'group';
		if ( labels[ key ]?.label && groups[ groupSlug ].component?.props ) {
			groups[ groupSlug ].component.props.groupLabel = labels[ key ].label;
		}
	} );

	if ( 'calendar' === slug ) {
		( data.taxonomies || [] ).forEach( ( definition, index ) => {
			metadata.attributes[ definition.attr ] = taxonomyAttribute( definition, index );
		} );
	}

	return metadata;
};

/**
 * Divi 4 to Divi 5 attribute map, extended with the taxonomy pickers so
 * pinned terms survive the conversion.
 */
const prepareOutline = ( slug, source, data ) => {
	const outline = clone( source );

	if ( 'calendar' === slug ) {
		( data.taxonomies || [] ).forEach( ( definition ) => {
			outline.module[ `eventkoi_tax_${ definition.slug }` ] = `${ definition.attr }.innerContent.*`;
		} );
	}

	return outline;
};

export const buildModuleDefinitions = () => {
	const data = getBuilderData();
	const slugs = Array.isArray( data.modules ) && data.modules.length ? data.modules : Object.keys( SOURCES );

	return slugs
		.filter( ( slug ) => SOURCES[ slug ] )
		.map( ( slug ) => ( {
			metadata: prepareMetadata( slug, SOURCES[ slug ].metadata, data ),
			conversionOutline: prepareOutline( slug, SOURCES[ slug ].outline, data ),
			placeholderContent: {},
			renderers: { edit: makeEdit( slug ) },
			callbacks: { content: { elements: elementsCallbacks } },
		} ) );
};
