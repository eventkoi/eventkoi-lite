import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { EllipsisVertical } from "lucide-react";

export function BulkActions({ table, base, fetchResults, addTo, queryStatus }) {
  const runAction = async (action) => {
    let selectedRows = table.getFilteredSelectedRowModel().rows;

    let ids = [];
    selectedRows.forEach((item, index) => {
      ids.push(item.original.id);
    });

    let data = {
      ids: ids,
      action: action,
      base: base,
    };

    const apiURL = `${eventkoi_params.api}/${action}_${base}`;

    await apiRequest({
      path: apiURL,
      method: "post",
      data: data,
      headers: {
        "EVENTKOI-API-KEY": eventkoi_params.api_key,
      },
    })
      .then((response) => {
        table.setRowSelection({});
        fetchResults(response.success);
      })
      .catch((error) => {});
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="ml-auto flex font-normal">
          <EllipsisVertical className="mr-2 h-4 w-4" aria-hidden="true" />
          {__("Bulk actions", "eventkoi")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[180px]">
        {queryStatus == "trash" ? (
          <>
            <DropdownMenuItem
              disabled={table.getFilteredSelectedRowModel().rows.length == 0}
              onClick={() => {
                runAction("restore");
              }}
            >
              <span>{__("Restore", "eventkoi")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={table.getFilteredSelectedRowModel().rows.length == 0}
              onClick={() => {
                runAction("remove");
              }}
            >
              <span>{__("Delete permanently", "eventkoi")}</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              disabled={table.getFilteredSelectedRowModel().rows.length == 0}
              onClick={() => {
                runAction("duplicate");
              }}
            >
              <span>{__("Duplicate", "eventkoi")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={table.getFilteredSelectedRowModel().rows.length == 0}
              onClick={() => {
                runAction("delete");
              }}
            >
              <span>
                {["categories"].includes(base)
                  ? __("Delete", "eventkoi")
                  : __("Move to trash", "eventkoi")}
              </span>
            </DropdownMenuItem>
            {addTo && table.getFilteredSelectedRowModel().rows.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <span>{addTo}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuCheckboxItem>
                      {__("Panel", "eventkoi")}
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}

            {addTo && table.getFilteredSelectedRowModel().rows.length == 0 && (
              <DropdownMenuItem
                disabled={table.getFilteredSelectedRowModel().rows.length == 0}
              >
                <span>{addTo}</span>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
