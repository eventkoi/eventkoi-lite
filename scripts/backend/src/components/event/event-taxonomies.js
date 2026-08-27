import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { MultiSelect } from "@/components/ui/multiselect";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { __, sprintf } from "@wordpress/i18n";

// Third-party taxonomies registered for events (e.g. a site's Places or
// Activities), assignable without leaving the EventKoi editor. EventKoi's
// own calendar taxonomy is excluded server-side.
export function EventTaxonomies() {
  const { event, setEvent } = useEventEditContext();
  // Only surface taxonomies that actually have terms; an empty one would render
  // a labeled box with nothing assignable inside it.
  const taxonomies = (
    Array.isArray(event?.custom_taxonomies) ? event.custom_taxonomies : []
  ).filter((item) => Array.isArray(item.terms) && item.terms.length > 0);

  if (!taxonomies.length) {
    return null;
  }

  const setAssigned = (taxonomy, ids) => {
    setEvent((prev) => ({
      ...prev,
      custom_taxonomies: (prev.custom_taxonomies || []).map((item) =>
        item.taxonomy === taxonomy ? { ...item, assigned: ids } : item
      ),
    }));
  };

  // Order terms parent-first so hierarchical taxonomies read as a tree.
  const orderedTerms = (item) => {
    const terms = Array.isArray(item.terms) ? item.terms : [];
    if (!item.hierarchical) return terms.map((t) => ({ ...t, depth: 0 }));
    const byParent = new Map();
    terms.forEach((t) => {
      const key = Number(t.parent) || 0;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(t);
    });
    const out = [];
    const walk = (parent, depth) => {
      (byParent.get(parent) || []).forEach((t) => {
        out.push({ ...t, depth });
        walk(Number(t.id), depth + 1);
      });
    };
    walk(0, 0);
    // Orphans (parent not in the fetched set) still need to show up.
    terms.forEach((t) => {
      if (!out.some((o) => o.id === t.id)) out.push({ ...t, depth: 0 });
    });
    return out;
  };

  // A dropdown has no room to indent a child row, so carry the depth in the
  // label itself the way core's category dropdowns do.
  const optionName = (term) =>
    `${" ".repeat(term.depth * 3)}${term.name}`;

  const sameIds = (a, b) =>
    a.length === b.length && a.every((id, i) => id === b[i]);

  return (
    <>
      {taxonomies.map((item) => {
        const options = orderedTerms(item).map((term) => ({
          id: Number(term.id),
          name: optionName(term),
        }));

        const assigned = (item.assigned || []).map(Number);
        const value = options.filter((option) => assigned.includes(option.id));

        return (
          <Box container key={item.taxonomy} className="gap-4">
            {/* Each taxonomy is its own container titled with its own name:
                someone who went to the trouble of building "Locations" is
                looking for Locations, not a generic "Taxonomies" box. */}
            <Heading level={3}>{item.label}</Heading>
            <MultiSelect
              options={options}
              value={value}
              placeholder={sprintf(
                /* translators: %s: taxonomy plural label, lowercase, e.g. "locations" */
                __("Select %s", "eventkoi-lite"),
                String(item.label || "").toLowerCase()
              )}
              searchPlaceholder={sprintf(
                /* translators: %s: taxonomy plural label, lowercase */
                __("Search %s...", "eventkoi-lite"),
                String(item.label || "").toLowerCase()
              )}
              noItems={__("No terms found.", "eventkoi-lite")}
              onSelectionChange={(selected) => {
                // MultiSelect reports its selection on mount as well, so a
                // straight write here would dirty an untouched event.
                const nextIds = (selected || []).map((option) =>
                  Number(option.id)
                );
                if (sameIds([...assigned].sort(), [...nextIds].sort())) {
                  return;
                }
                setAssigned(item.taxonomy, nextIds);
              }}
            />
          </Box>
        );
      })}
    </>
  );
}
