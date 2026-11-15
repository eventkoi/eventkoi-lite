import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { __ } from "@wordpress/i18n";

export function RowsPerPage({ table }) {
  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="rows_per_page" className="text-sm font-normal">
        {__("Rows per page", "eventkoi-lite")}
      </Label>
      <Select
        value={`${table.getState().pagination.pageSize}`}
        onValueChange={(value) => {
          table.setPageSize(Number(value));
        }}
      >
        <SelectTrigger
          id="rows_per_page"
          className="h-8 w-[70px]"
          isalternate="yes"
        >
          <SelectValue placeholder={table.getState().pagination.pageSize} />
        </SelectTrigger>
        <SelectContent>
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <SelectItem key={pageSize} value={`${pageSize}`}>
              {pageSize}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
