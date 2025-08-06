import { BulkActions } from "@/components/bulk-actions";
import { Filters } from "@/components/filters";
import { Pagination } from "@/components/pagination";
import { RowsPerPage } from "@/components/rows-per-page";
import { StatusFilters } from "@/components/status-filters";
import { TablePage } from "@/components/table-page";
import { TableSelectedRows } from "@/components/table-selected-rows";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

export function DataTable({
  data,
  columns,
  empty,
  hideStatusFilters,
  hideDateRange,
  hideCategories,
  hideBottomBar,
  hideBottomSelected,
  gap,
  base,
  compact,
  isLoading,
  fetchResults,
  activeId,
  statusFilters,
  filterName,
  addTo,
  queryStatus,
  eventStatus,
  calStatus,
  from,
  to,
  defaultSort,
  customTopLeft,
  hideTableBorder = false,
  tableClassName = "",
  hideSearchBox = false,
}) {
  const [sorting, setSorting] = useState(defaultSort);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [searchParams] = useSearchParams();

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className={cn("w-full grid self-start", gap ? `gap-${gap}` : "gap-6")}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          {customTopLeft ? (
            typeof customTopLeft === "function" ? (
              customTopLeft(table)
            ) : (
              customTopLeft
            )
          ) : (
            <BulkActions
              table={table}
              base={base}
              fetchResults={fetchResults}
              addTo={addTo}
              queryStatus={queryStatus}
            />
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:space-x-4">
          <Filters
            base={base}
            table={table}
            hideDateRange={hideDateRange}
            hideCategories={hideCategories}
            filterName={filterName}
            queryStatus={queryStatus}
            eventStatus={searchParams.get("event_status")}
            calStatus={calStatus}
            from={from}
            to={to}
            statusFilters={statusFilters}
            hideSearchBox={hideSearchBox}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        {!hideStatusFilters && (
          <div className="flex flex-wrap items-center text-sm gap-x-4 gap-y-2">
            <StatusFilters
              statusFilters={statusFilters}
              base={base}
              data={data}
            />
          </div>
        )}
        <div className="text-sm text-muted-foreground">
          <TableSelectedRows table={table} compact={compact} />
        </div>
      </div>

      <div
        className={cn(
          "rounded-lg bg-card text-sm text-card-foreground shadow-sm w-full overflow-x-auto",
          !hideTableBorder && "border",
          hideTableBorder && "rounded-none shadow-none border-none",
          tableClassName
        )}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "h-10",
                        "font-normal",
                        header.id === "select" &&
                          (tableClassName.includes("no-checkbox-padding")
                            ? "w-[36px] pl-0"
                            : "w-[50px]"),
                        [
                          "start_date",
                          "end_date",
                          "created",
                          "created_at",
                          "status",
                          "quantity",
                          "total",
                          "amount_total",
                          "calendar",
                        ].includes(header.id) && "w-[15%]",
                        ["id"].includes(header.id) && "w-[8%]",
                        [
                          "created",
                          "created_at",
                          "modified_date",
                          "count",
                        ].includes(header.id) && "text-right",
                        ["count", "modified_date"].includes(header.id) &&
                          "w-auto",
                        ["title", "name", "shortcode"].includes(header.id) &&
                          "w-[30%]"
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Show skeleton rows during initial load
              [...Array(6)].map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((col, j) => (
                    <TableCell key={`skeleton-${i}-${j}`}>
                      <div className="flex items-center">
                        <Skeleton className="h-4 w-full rounded" />
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="group"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.id === "select" &&
                          tableClassName.includes("no-checkbox-padding") &&
                          "pl-0 w-[36px]",
                        activeId == row.original.id &&
                          cell.id.indexOf("name") >= 1 &&
                          "font-medium underline decoration-dotted",
                        cell.id.indexOf("modified") >= 1 && "text-right",
                        cell.id.indexOf("created") >= 1 && "text-right"
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-40 text-center text-muted-foreground text-sm"
                >
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!hideBottomBar && table.getRowModel().rows?.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
          <div className="text-sm text-muted-foreground">
            {!hideBottomSelected && (
              <TableSelectedRows table={table} compact={compact} />
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-12 text-foreground">
            <RowsPerPage table={table} />
            <div className="flex gap-4">
              <TablePage table={table} />
              <Pagination table={table} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
