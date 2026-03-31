import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";

export function SortButton({ title, column }) {
  const sortState = column.getIsSorted();
  const isSorted = sortState === "asc" || sortState === "desc";

  return (
    <Button
      variant="ghost"
      className="group p-0 hover:bg-[transparent] font-normal"
      onClick={() => column.toggleSorting(sortState === "asc")}
      aria-label={`${title}, ${sortState === "asc" ? "sorted ascending" : sortState === "desc" ? "sorted descending" : "not sorted"}`}
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
