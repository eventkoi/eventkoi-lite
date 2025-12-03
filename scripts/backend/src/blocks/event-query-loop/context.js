import { createContext, useContext } from "@wordpress/element";

/**
 * Event context holds both the event data and active-state flag.
 */
export const EventContext = createContext({
	event: null,
	isActive: false,
});

/**
 * Optional prefetched event for editor previews.
 */
export const PrefetchedEventContext = createContext(null);

/**
 * Hook to access the current event context.
 *
 * @return {{event: Object|null, isActive: boolean}}
 */
export const useEvent = () => {
	const context = useContext(EventContext);

	// Provide safe defaults to prevent undefined errors.
	return context || { event: null, isActive: false };
};

/**
 * Hook to access a prefetched event (if provided by a parent preview wrapper).
 *
 * @return {Object|null}
 */
export const usePrefetchedEvent = () => {
	return useContext(PrefetchedEventContext);
};
