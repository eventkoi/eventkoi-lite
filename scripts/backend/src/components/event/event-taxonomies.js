import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { ShortcodeBox } from "@/components/ShortcodeBox";
import { MultiSelect } from "@/components/ui/multiselect";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { __, sprintf } from "@wordpress/i18n";

// Third-party taxonomies registered for events (e.g. a site's Places or
// Activities), assignable without leaving the EventKoi editor. EventKoi's
// own calendar taxonomy is excluded server-side. Terms are picked with the
// same multi-select search dropdown as the event calendar.
export function EventTaxonomies({ showAttributes = false }) {
  const { event, setEvent } = useEventEditContext();
  // Only surface taxonomies that actually have terms; an empty one would render
  // a labeled box with nothing assignable inside it.
  const taxonomies = (
    Array.isArray(event?.custom_taxonomies) ? event.custom_taxonomies : []
  ).filter((item) => Array.isArray(item.terms) && item.terms.length > 0);

  if (!taxonomies.length) {
    return null;
  }

  const setAssigned = (taxonomy, selection) => {
    const next = selection.map((s) => Number(s.id));

    setEvent((prev) => {
      const current = (prev.custom_taxonomies || []).find(
        (item) => item.taxonomy === taxonomy
      );
      // MultiSelect reports its selection on mount as well; writing an
      // identical assignment back would mark the event dirty for nothing.
      const same =
        current &&
        JSON.stringify((current.assigned || []).map(Number)) ===
          JSON.stringify(next);

      if (same) return prev;

      return {
        ...prev,
        custom_taxonomies: (prev.custom_taxonomies || []).map((item) =>
          item.taxonomy === taxonomy ? { ...item, assigned: next } : item
        ),
      };
    });
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

  return (
    <>
      {taxonomies.map((item) => {
        const ordered = orderedTerms(item);
        const options = ordered.map((term) => ({
          id: Number(term.id),
          name: term.name,
          depth: term.depth,
        }));
        const byId = new Map(options.map((option) => [option.id, option]));
        // Assignments outside the preloaded term set (a taxonomy larger than
        // the 500-term preload) must stay in the selection, or saving would
        // silently drop them.
        const selected = (item.assigned || []).map(Number).map(
          (id) => byId.get(id) || { id, name: `#${id}` }
        );
        const lower = String(item.label || "").toLowerCase();

        return (
          <Box container key={item.taxonomy} className="gap-4">
            {/* Each taxonomy is its own container titled with its own name:
                someone who went to the trouble of building "Locations" is
                looking for Locations, not a generic "Taxonomies" box. */}
            <Heading level={3}>{item.label}</Heading>
            <MultiSelect
              options={options}
              placeholder={sprintf(
                /* translators: %s: taxonomy plural label, lowercase */
                __("Select %s", "eventkoi-lite"),
                lower
              )}
              noItems={__("No terms found.", "eventkoi-lite")}
              searchPlaceholder={sprintf(
                /* translators: %s: taxonomy plural label, lowercase */
                __("Search %s", "eventkoi-lite"),
                lower
              )}
              value={selected}
              onSelectionChange={(selection) =>
                setAssigned(item.taxonomy, selection)
              }
            />
            {showAttributes && (
              <ShortcodeBox
                attribute={`event_tax_${item.taxonomy}`}
                data={`tax_${item.taxonomy}`}
                eventId={event?.id}
              />
            )}
          </Box>
        );
      })}
    </>
  );
}
