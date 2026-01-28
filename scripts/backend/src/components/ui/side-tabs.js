import { createElement } from "react";
import { Link } from "react-router-dom";

export const SIDE_TABS_CONTAINER_CLASS = "grid gap-2 text-sm text-muted-foreground";
export const SIDE_TABS_ITEM_CLASS = "font-medium px-3 py-2 rounded-lg";
export const SIDE_TABS_ACTIVE_SUFFIX = " text-foreground bg-foreground/5";

export function getSideTabClasses( isActive, baseClass = SIDE_TABS_ITEM_CLASS ) {
	return isActive ? `${baseClass}${SIDE_TABS_ACTIVE_SUFFIX}` : baseClass;
}

export function SideTabs({
	items,
	isActive,
	className = SIDE_TABS_CONTAINER_CLASS,
	itemClassName = SIDE_TABS_ITEM_CLASS,
	as = "nav",
}) {
	if (!Array.isArray(items) || items.length === 0) {
		return null;
	}

	return createElement(
		as,
		{ className },
		items.map( ( item ) => {
			const active = isActive ? isActive( item ) : false;
			const base = item.itemClassName || itemClassName;
			const classes = getSideTabClasses( active, base );
			const disabled = item.disabled === true;
			const finalClass = disabled
				? `${classes} opacity-50 cursor-not-allowed pointer-events-none`
				: classes;

			if (disabled) {
				return (
					<span
						key={item.key || item.to}
						className={finalClass}
						aria-disabled="true"
					>
						{item.label}
					</span>
				);
			}

			return (
				<Link key={item.key || item.to} to={item.to} className={finalClass}>
					{item.label}
				</Link>
			);
		} )
	);
}
