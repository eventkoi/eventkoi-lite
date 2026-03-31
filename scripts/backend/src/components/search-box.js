import { Input } from "@/components/ui/input";
import { __ } from "@wordpress/i18n";
import { Search } from "lucide-react";

export function SearchBox(props) {
  const { table } = props;

  const cols = table.getAllColumns();
  const defaultCol = cols[1]["id"];

  return (
    <div className="relative w-full sm:w-auto">
      <Search className="absolute left-2.5 top-3 w-4 h-4 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        aria-label={__("Search", "eventkoi-lite")}
        placeholder={__("Search...", "eventkoi-lite")}
        className="w-full rounded-lg bg-background pl-8 w-full sm:w-[250px] placeholder:text-muted-foreground/70 shadow-sm"
        value={table.getColumn(defaultCol)?.getFilterValue() ?? ""}
        onChange={(event) =>
          table.getColumn(defaultCol)?.setFilterValue(event.target.value)
        }
      />
    </div>
  );
}
