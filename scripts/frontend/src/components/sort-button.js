import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";

export function SortButton({ title, column }) {
  return (
    <Button
      variant="ghost"
      className="p-0 hover:bg-[transparent]"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      <ChevronsUpDown className="ml-1 h-3.5 w-3.5" />
    </Button>
  );
}
