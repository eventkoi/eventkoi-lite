import { __ } from "@wordpress/i18n";
import { Button } from "@/components/ui/button";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";

export function Pagination(props) {
  const { table } = props;

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        className="hidden h-8 w-8 p-0 lg:flex"
        onClick={() => table.setPageIndex(0)}
        disabled={!table.getCanPreviousPage()}
      >
        <span className="sr-only">{__("Go to first page", "eventkoi-lite")}</span>
        <DoubleArrowLeftIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        className="h-8 w-8 p-0"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        <span className="sr-only">{__("Go to previous page", "eventkoi-lite")}</span>
        <ChevronLeftIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        className="h-8 w-8 p-0"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        <span className="sr-only">{__("Go to next page", "eventkoi-lite")}</span>
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        className="hidden h-8 w-8 p-0 lg:flex"
        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
        disabled={!table.getCanNextPage()}
      >
        <span className="sr-only">{__("Go to last page", "eventkoi-lite")}</span>
        <DoubleArrowRightIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
