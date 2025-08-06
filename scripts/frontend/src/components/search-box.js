import { Input } from "@/components/ui/input";

import { Search } from "lucide-react";

export function SearchBox(props) {
  const { table } = props;

  const cols = table.getAllColumns();
  const defaultCol = cols[1]["id"];

  return (
    <div className="relative ml-auto">
      <Search className="absolute left-2.5 top-3 w-4 h-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search..."
        className="w-full rounded-lg bg-background pl-8 w-[250px] placeholder:text-muted-foreground/70 shadow-sm"
        value={table.getColumn(defaultCol)?.getFilterValue() ?? ""}
        onChange={(event) =>
          table.getColumn(defaultCol)?.setFilterValue(event.target.value)
        }
      />
    </div>
  );
}
