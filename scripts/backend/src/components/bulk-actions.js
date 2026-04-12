import apiRequest from "@wordpress/api-fetch";

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
import { ConfirmDialog } from "@/components/confirm-dialog";

import { EllipsisVertical } from "lucide-react";
import { __, sprintf } from "@wordpress/i18n";
import { useState } from "react";

export function BulkActions({
  table,
  base,
  fetchResults,
  addTo,
  queryStatus,
  refreshCounts,
}) {
  const basePath = String(base || "");
  const isOrders = basePath === "orders" || basePath === "tickets" || /\/sales-history$/.test(basePath);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState("archive");
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const isArchivedView = queryStatus === "archived";

  const runAction = async (action) => {
    let selectedRows = table.getFilteredSelectedRowModel().rows;

    let ids = [];
    selectedRows.forEach((item, index) => {
      ids.push(item.original.id);
    });

    if (isOrders) {
      if (!ids.length) {
        return;
      }

      if (action !== "archive" && action !== "unarchive" && action !== "delete") {
        return;
      }

      try {
        for (const orderId of ids) {
          await apiRequest({
            path: `${eventkoi_params.api}/tickets/orders/archive`,
            method: "POST",
            data: { order_id: orderId, mode: action },
            headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
          });
        }

        table.setRowSelection({});
        fetchResults?.();
      } catch (error) {
        console.error("Orders archive error:", error);
      }

      return;
    }

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
        if (refreshCounts) {
          refreshCounts();
        }
      })
      .catch((error) => {});
  };

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex font-normal w-full sm:w-auto justify-start sm:justify-center"
        >
          <EllipsisVertical className="mr-2 h-4 w-4" aria-hidden="true" />
          Bulk actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[180px]">
        {isOrders ? (
          <DropdownMenuItem
            disabled={selectedCount == 0}
            onClick={() => {
              setConfirmAction(isArchivedView ? "unarchive" : "archive");
              setConfirmOpen(true);
            }}
          >
            <span>
              {isArchivedView
                ? __("Unarchive", "eventkoi-lite")
                : __("Archive", "eventkoi-lite")}
            </span>
          </DropdownMenuItem>
        ) : queryStatus == "trash" ? (
          <>
            <DropdownMenuItem
              disabled={selectedCount == 0}
              onClick={() => {
                runAction("restore");
              }}
            >
              <span>Restore</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={selectedCount == 0}
              onClick={() => {
                runAction("remove");
              }}
            >
              <span>Delete permanently</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            {base !== "calendars" && (
              <DropdownMenuItem
                disabled={selectedCount == 0}
                onClick={() => {
                  runAction("duplicate");
                }}
              >
                <span>Duplicate</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              disabled={selectedCount == 0}
              onClick={() => {
                runAction("delete");
              }}
            >
              <span>
                {["calendars"].includes(base) ? "Delete" : "Move to trash"}
              </span>
            </DropdownMenuItem>
            {addTo && selectedCount > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <span>{addTo}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuCheckboxItem>Panel</DropdownMenuCheckboxItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}

            {addTo && selectedCount == 0 && (
              <DropdownMenuItem disabled>
                <span>{addTo}</span>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    {isOrders && (
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        icon="archive"
        title={
          confirmAction === "unarchive"
            ? __("Unarchive orders?", "eventkoi-lite")
            : __("Archive orders?", "eventkoi-lite")
        }
        description={
          confirmAction === "unarchive"
            ? sprintf(
                __("This will restore %d order(s) back to your order lists.", "eventkoi-lite"),
                selectedCount
              )
            : sprintf(
                __("%d order(s) will be hidden from your order lists. Financial records remain unchanged.", "eventkoi-lite"),
                selectedCount
              )
        }
        confirmLabel={
          confirmAction === "unarchive"
            ? __("Unarchive", "eventkoi-lite")
            : __("Archive", "eventkoi-lite")
        }
        onConfirm={() => runAction(confirmAction)}
      />
    )}
    </>
  );
}
