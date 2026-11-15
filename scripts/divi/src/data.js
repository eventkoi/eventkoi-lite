// Divi localises our package data as <PascalCase handle>Data; keep a few
// spellings so a casing change on their side does not blank the modules.
const CANDIDATES = [ 'EventkoiDivi5Data', 'EventKoiDivi5Data', 'eventkoiDivi5Data' ];

export const getBuilderData = () => {
	for ( const key of CANDIDATES ) {
		if ( window[ key ] && 'object' === typeof window[ key ] ) {
			return window[ key ];
		}
	}
	return {};
};
