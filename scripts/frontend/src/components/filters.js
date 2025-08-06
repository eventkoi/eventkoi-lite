import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ListFilter } from "lucide-react";

import { DateWithRange } from "@/components/date-range";
import { SearchBox } from "@/components/search-box";

export function Filters(props) {
  const { table, hideDateRange, hideCategories, filterName } = props;

  return (
    <>
      {!hideCategories && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto flex font-normal">
              <ListFilter className="mr-2 h-4 w-4" />
              {filterName}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[150px]"
          ></DropdownMenuContent>
        </DropdownMenu>
      )}

      {!hideDateRange && <DateWithRange />}
      <SearchBox table={table} />
    </>
  );
}
