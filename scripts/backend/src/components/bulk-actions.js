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
import { showToast, showToastError } from "@/lib/toast";

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

    try {
      const response = await apiRequest({
        path: apiURL,
        method: "post",
        data: data,
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
      });
      table.setRowSelection({});
      fetchResults(response?.success);
      if (refreshCounts) {
        refreshCounts();
      }
    } catch (error) {
      // The previous .catch(() => {}) swallowed every failure — table didn't
      // refresh, selection stayed, user kept clicking with no feedback.
      const fallback =
        action === "restore"
          ? __("Failed to restore selected items.", "eventkoi-lite")
          : action === "remove"
          ? __("Failed to permanently delete selected items.", "eventkoi-lite")
          : action === "delete"
          ? __("Failed to move selected items to trash.", "eventkoi-lite")
          : action === "duplicate"
          ? __("Failed to duplicate selected items.", "eventkoi-lite")
          : __("Bulk action failed.", "eventkoi-lite");
      showToastError(String(error?.message || "").trim() || fallback);
      fetchResults?.();
    }
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
                setConfirmAction("restore");
                setConfirmOpen(true);
              }}
            >
              <span>{__("Restore", "eventkoi-lite")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={selectedCount == 0}
              onClick={() => {
                setConfirmAction("remove");
                setConfirmOpen(true);
              }}
            >
              <span>{__("Delete permanently", "eventkoi-lite")}</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            {base !== "calendars" && (
              <DropdownMenuItem
                disabled={selectedCount == 0}
                onClick={() => {
                  setConfirmAction("duplicate");
                  setConfirmOpen(true);
                }}
              >
                <span>{__("Duplicate", "eventkoi-lite")}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              disabled={selectedCount == 0}
              onClick={() => {
                setConfirmAction("delete");
                setConfirmOpen(true);
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
                    <DropdownMenuCheckboxItem>{__("Panel", "eventkoi-lite")}</DropdownMenuCheckboxItem>
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
    {!isOrders && ["delete","remove","restore","duplicate"].includes(confirmAction) && (
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        icon={confirmAction === "remove" ? "delete" : "default"}
        title={
          confirmAction === "remove"
            ? __("Delete permanently?", "eventkoi-lite")
            : confirmAction === "delete"
            ? __("Move to trash?", "eventkoi-lite")
            : confirmAction === "restore"
            ? __("Restore?", "eventkoi-lite")
            : __("Duplicate?", "eventkoi-lite")
        }
        description={
          confirmAction === "remove"
            ? sprintf(__("%d item(s) will be permanently deleted. This cannot be undone.", "eventkoi-lite"), selectedCount)
            : confirmAction === "delete"
            ? sprintf(__("%d item(s) will be moved to trash. You can restore them later.", "eventkoi-lite"), selectedCount)
            : confirmAction === "restore"
            ? sprintf(__("%d item(s) will be restored from trash.", "eventkoi-lite"), selectedCount)
            : sprintf(__("%d duplicate item(s) will be created as drafts.", "eventkoi-lite"), selectedCount)
        }
        confirmLabel={
          confirmAction === "remove"
            ? __("Delete permanently", "eventkoi-lite")
            : confirmAction === "delete"
            ? __("Move to trash", "eventkoi-lite")
            : confirmAction === "restore"
            ? __("Restore", "eventkoi-lite")
            : __("Duplicate", "eventkoi-lite")
        }
        onConfirm={() => runAction(confirmAction)}
      />
    )}
    </>
  );
}
