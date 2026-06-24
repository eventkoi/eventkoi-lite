import { Button } from "@/components/ui/button";
import { __ } from "@wordpress/i18n";
import { ArrowDown, ArrowUp } from "lucide-react";

export function SortButton({ title, column }) {
  const sortState = column.getIsSorted();
  const isSorted = sortState === "asc" || sortState === "desc";

  return (
    <Button
      variant="ghost"
      className="group p-0 hover:bg-[transparent] font-normal"
      onClick={() => column.toggleSorting(sortState === "asc")}
      aria-label={`${title}, ${sortState === "asc" ? __("sorted ascending", "eventkoi-lite") : sortState === "desc" ? __("sorted descending", "eventkoi-lite") : __("not sorted", "eventkoi-lite")}`}
    >
      {title}
      {sortState === "asc" && <ArrowUp className="ml-1 h-3.5 w-3.5" aria-hidden="true" />}
      {sortState === "desc" && <ArrowDown className="ml-1 h-3.5 w-3.5" aria-hidden="true" />}
      {!isSorted && (
        <ArrowUp className="ml-1 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
      )}
    </Button>
  );
}
