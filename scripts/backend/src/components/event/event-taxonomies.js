import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { ShortcodeBox } from "@/components/ShortcodeBox";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { __, sprintf } from "@wordpress/i18n";
import { useState } from "react";

// Terms above this count get a filter field. Below it the list is short enough
// to read at a glance, and an extra input would just be noise.
const FILTER_THRESHOLD = 12;

// Third-party taxonomies registered for events (e.g. a site's Places or
// Activities), assignable without leaving the EventKoi editor. EventKoi's
// own calendar taxonomy is excluded server-side.
export function EventTaxonomies({ showAttributes = false }) {
  const { event, setEvent } = useEventEditContext();
  const [filters, setFilters] = useState({});
  // Only surface taxonomies that actually have terms; an empty one would render
  // a labeled box with nothing assignable inside it.
  const taxonomies = (
    Array.isArray(event?.custom_taxonomies) ? event.custom_taxonomies : []
  ).filter((item) => Array.isArray(item.terms) && item.terms.length > 0);

  if (!taxonomies.length) {
    return null;
  }

  // Toggling one term touches only that id, so terms the editor never received
  // (a taxonomy larger than the 500-term preload) keep their assignment.
  const toggleTerm = (taxonomy, termId, checked) => {
    setEvent((prev) => ({
      ...prev,
      custom_taxonomies: (prev.custom_taxonomies || []).map((item) => {
        if (item.taxonomy !== taxonomy) return item;
        const assigned = new Set((item.assigned || []).map(Number));
        if (checked) {
          assigned.add(Number(termId));
        } else {
          assigned.delete(Number(termId));
        }
        return { ...item, assigned: Array.from(assigned) };
      }),
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

  // Filtering a tree on the matches alone strands children under a parent that
  // is no longer on screen, which is what made the term impossible to place.
  // Keep every ancestor of a match so each row still reads in context.
  const visibleTerms = (ordered, query) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return ordered;

    const byId = new Map(ordered.map((term) => [Number(term.id), term]));
    const keep = new Set();

    ordered.forEach((term) => {
      if (!String(term.name || "").toLowerCase().includes(needle)) return;
      keep.add(Number(term.id));
      let parent = Number(term.parent) || 0;
      while (parent && byId.has(parent) && !keep.has(parent)) {
        keep.add(parent);
        parent = Number(byId.get(parent).parent) || 0;
      }
    });

    return ordered.filter((term) => keep.has(Number(term.id)));
  };

  return (
    <>
      {taxonomies.map((item) => {
        const ordered = orderedTerms(item);
        const query = filters[item.taxonomy] || "";
        const shown = visibleTerms(ordered, query);
        const assigned = new Set((item.assigned || []).map(Number));

        return (
          <Box container key={item.taxonomy} className="gap-4">
            {/* Each taxonomy is its own container titled with its own name:
                someone who went to the trouble of building "Locations" is
                looking for Locations, not a generic "Taxonomies" box. */}
            <Heading level={3}>{item.label}</Heading>
            {ordered.length > FILTER_THRESHOLD && (
              <Input
                type="search"
                value={query}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    [item.taxonomy]: e.target.value,
                  }))
                }
                placeholder={sprintf(
                  /* translators: %s: taxonomy plural label, lowercase */
                  __("Search %s...", "eventkoi-lite"),
                  String(item.label || "").toLowerCase()
                )}
              />
            )}
            <div className="max-h-64 overflow-y-auto rounded-md border border-input p-3 flex flex-col gap-1.5">
              {shown.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  {__("No terms found.", "eventkoi-lite")}
                </span>
              )}
              {shown.map((term) => (
                <label
                  key={term.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                  // Real indentation: a depth carried in the label text
                  // collapses to a single space in HTML, so the tree read flat.
                  style={{ paddingLeft: `${term.depth * 18}px` }}
                >
                  <Checkbox
                    checked={assigned.has(Number(term.id))}
                    onCheckedChange={(checked) =>
                      toggleTerm(item.taxonomy, term.id, !!checked)
                    }
                  />
                  <span>{term.name}</span>
                </label>
              ))}
            </div>
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
