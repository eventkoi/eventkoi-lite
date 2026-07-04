import { Heading } from "@/components/heading";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useEventEditContext } from "@/hooks/EventEditContext";

// Third-party taxonomies registered for events (e.g. a site's Places or
// Activities), assignable without leaving the EventKoi editor. EventKoi's
// own calendar taxonomy is excluded server-side.
export function EventTaxonomies() {
  const { event, setEvent } = useEventEditContext();
  const taxonomies = Array.isArray(event?.custom_taxonomies)
    ? event.custom_taxonomies
    : [];

  if (!taxonomies.length) {
    return null;
  }

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

  return (
    <div className="flex flex-col gap-6">
      {taxonomies.map((item) => {
        const assigned = new Set((item.assigned || []).map(Number));
        return (
          <div key={item.taxonomy} className="flex flex-col gap-2">
            <Heading level={4}>{item.label}</Heading>
            <div className="max-h-52 overflow-y-auto rounded-md border border-border p-3 flex flex-col gap-1.5">
              {orderedTerms(item).map((term) => (
                <label
                  key={term.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
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
          </div>
        );
      })}
    </div>
  );
}
