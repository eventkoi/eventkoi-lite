import { DataTable } from "@/components/data-table";
import { Heading } from "@/components/heading";
import { OrderStatus } from "@/components/order/OrderStatus";
import { SearchBox } from "@/components/search-box";
import { SortButton } from "@/components/sort-button";
import { Stat } from "@/components/stat";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { formatShortDate, formatWPtime } from "@/lib/date-utils";
import { callLocalApi } from "@/lib/remote";
import { BaseToast, showToast, showToastError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import apiRequest from "@wordpress/api-fetch";
import { __, sprintf } from "@wordpress/i18n";
import {
  ArrowDownToLine,
  ChevronDown,
  CircleCheck,
  CircleDotDashed,
  CircleMinus,
  CircleX,
  Check,
  Copy,
  EllipsisVertical,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { generateInstances } from "@/admin/events/edit/instances";
import { useSettings } from "@/hooks/SettingsContext";

const statusLabel = (status) => {
  switch (status) {
    case "going":
      return "Going";
    case "maybe":
      return "Maybe";
    case "not_going":
      return "Not going";
    case "cancelled":
      return "Cancelled";
    default:
      return "—";
  }
};

const statusSortOrder = {
  going: 0,
  maybe: 1,
  not_going: 2,
  cancelled: 3,
};

const multiColumnSearch = (row, columnId, filterValue) => {
  const codes = Array.isArray(row.original.checkin_codes) ? row.original.checkin_codes.join(" ") : "";
  const searchableRowContent = `${row.original.name || row.original.customer_name || ""} ${
    row.original.email || row.original.customer_email || ""
  } ${row.original.order_id || ""} ${row.original.checkin_token || row.original.master_checkin_code || ""} ${codes}`;
  return searchableRowContent.toLowerCase().includes(filterValue.toLowerCase());
};

const statusFilters = [
  { key: "all", title: "All" },
  { key: "going", title: "Going" },
  { key: "maybe", title: "Maybe" },
  { key: "not_going", title: "Not going" },
  { key: "cancelled", title: "Cancelled" },
];

const shortOrderId = (value) => {
  const orderId = String(value || "");
  if (!orderId) return "";
  if (!orderId.includes("-")) return orderId;
  return orderId.split("-")[0];
};

const isCompletedOrderStatus = (status) => {
  const normalized = String(status || "").toLowerCase();
  return (
    normalized === "complete" ||
    normalized === "completed" ||
    normalized === "succeeded"
  );
};

function BulkRsvpActions({ table, onComplete }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  const getIds = () =>
    table.getFilteredSelectedRowModel().rows.map((row) => row.original.id);

  const runAction = async (action, status = null) => {
    const ids = getIds();
    if (!ids.length) return;

    try {
      await apiRequest({
        path: `${eventkoi_params.api}/rsvps/bulk`,
        method: "POST",
        data: {
          ids,
          action,
          ...(status ? { status } : {}),
        },
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
      });

      table.setRowSelection({});
      onComplete?.();

      const message =
        action === "delete"
          ? sprintf(
              /* translators: %d: number of RSVPs */
              __("Deleted %d RSVP(s).", "eventkoi-lite"),
              ids.length,
            )
          : sprintf(
              /* translators: %d: number of RSVPs */
              __("Updated %d RSVP(s).", "eventkoi-lite"),
              ids.length,
            );

      showToast({ message });
    } catch (error) {
      console.error("RSVP bulk action error:", error);
      showToastError(__("Bulk action failed.", "eventkoi-lite"));
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
            <EllipsisVertical className="mr-2 h-4 w-4" />
            {__("Bulk actions", "eventkoi-lite")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={selectedCount === 0}>
              {__("Set status", "eventkoi-lite")}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => runAction("status", "going")}>
                  {__("Going", "eventkoi-lite")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => runAction("status", "maybe")}>
                  {__("Maybe", "eventkoi-lite")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => runAction("status", "not_going")}
                >
                  {__("Not going", "eventkoi-lite")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => runAction("status", "cancelled")}
                >
                  {__("Cancelled", "eventkoi-lite")}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={selectedCount === 0}>
              {__("Set check-in status", "eventkoi-lite")}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={() => runAction("checkin", "check_in")}
                >
                  {__("Check in", "eventkoi-lite")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => runAction("checkin", "checked_in")}
                >
                  {__("Checked in", "eventkoi-lite")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => runAction("checkin", "denied")}>
                  {__("Denied", "eventkoi-lite")}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem
            disabled={selectedCount === 0}
            onClick={() => setConfirmOpen(true)}
          >
            {__("Delete", "eventkoi-lite")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {__("Delete RSVPs?", "eventkoi-lite")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {sprintf(
                /* translators: %d: number of selected RSVPs */
                __("This will permanently delete %d RSVP(s).", "eventkoi-lite"),
                selectedCount,
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{__("Cancel", "eventkoi-lite")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                runAction("delete");
                setConfirmOpen(false);
              }}
            >
              {__("Delete", "eventkoi-lite")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RowRsvpActions({
  rsvpId,
  checkinToken,
  canCopyToken,
  canResend,
  onComplete,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const runAction = async (action, status = null) => {
    if (!rsvpId) return;
    const isResendEmail = action === "resend_email";
    const toastId = `attendees-rsvp-resend-${rsvpId}`;

    if (isResendEmail) {
      toast.custom(
        () => (
          <div className="flex items-center justify-between gap-4 rounded-md p-3 text-sm font-medium w-[280px] shadow-lg bg-neutral-900 text-white border border-neutral-800">
            <div className="flex min-w-0 items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span className="truncate">
                {__("Sending confirmation email...", "eventkoi-lite")}
              </span>
            </div>
          </div>
        ),
        { id: toastId, duration: Infinity }
      );
    }

    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/rsvps/bulk`,
        method: "POST",
        data: {
          ids: [rsvpId],
          action,
          ...(status ? { status } : {}),
        },
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
      });

      const updatedCount = Number(response?.count ?? 0);

      if (!isResendEmail) {
        onComplete?.();
      }

      if (!updatedCount) {
        if (isResendEmail) {
          toast.custom(
            () => (
              <BaseToast
                message={__("No email sent.", "eventkoi-lite")}
                variant="default"
              />
            ),
            { id: toastId, duration: 4000 }
          );
        } else {
          showToastError(__("No RSVP updated.", "eventkoi-lite"));
        }
        return;
      }

      const message =
        action === "delete"
          ? __("RSVP deleted.", "eventkoi-lite")
          : action === "resend_email"
          ? __("Confirmation email sent.", "eventkoi-lite")
          : __("RSVP updated.", "eventkoi-lite");

      if (isResendEmail) {
        toast.custom(
          () => <BaseToast message={message} variant="default" />,
          { id: toastId, duration: 3000 }
        );
      } else {
        showToast({ message });
      }
    } catch (error) {
      console.error("RSVP row action error:", error);
      if (isResendEmail) {
        toast.custom(
          () => (
            <BaseToast
              message={__("Action failed.", "eventkoi-lite")}
              variant="default"
            />
          ),
          { id: toastId, duration: 4000 }
        );
      } else {
        showToastError(__("Action failed.", "eventkoi-lite"));
      }
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={__("RSVP actions", "eventkoi-lite")}
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          <DropdownMenuItem
            onClick={() => runAction("resend_email")}
            disabled={!canResend}
          >
            {__("Resend confirmation", "eventkoi-lite")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {__("Delete RSVP?", "eventkoi-lite")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {__("This will permanently delete this RSVP.", "eventkoi-lite")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{__("Cancel", "eventkoi-lite")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                runAction("delete");
                setConfirmOpen(false);
              }}
            >
              {__("Delete", "eventkoi-lite")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RowTicketActions({ orderId, paymentStatus, onArchive }) {
  const canResend = !!orderId && isCompletedOrderStatus(paymentStatus);

  const handleResendConfirmation = async () => {
    if (!canResend) return;
    const toastId = `attendees-ticket-resend-${orderId}`;

    toast.custom(
      () => (
        <div className="flex items-center justify-between gap-4 rounded-md p-3 text-sm font-medium w-[280px] shadow-lg bg-neutral-900 text-white border border-neutral-800">
          <div className="flex min-w-0 items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span className="truncate">
              {__("Sending ticket confirmation...", "eventkoi-lite")}
            </span>
          </div>
        </div>
      ),
      { id: toastId, duration: Infinity }
    );

    try {
      await callLocalApi("tickets/orders/resend-confirmation", {
        method: "POST",
        data: {
          order_id: orderId,
        },
      });

      toast.custom(
        () => (
          <BaseToast
            message={__("Ticket confirmation sent.", "eventkoi-lite")}
            variant="default"
          />
        ),
        { id: toastId, duration: 3000 }
      );
    } catch (error) {
      console.error("Ticket resend confirmation failed:", error);
      toast.custom(
        () => (
          <BaseToast
            message={__("Failed to resend confirmation.", "eventkoi-lite")}
            variant="default"
          />
        ),
        { id: toastId, duration: 4000 }
      );
    }
  };

  const handleArchive = async () => {
    if (!orderId) return;
    const toastId = `attendees-ticket-archive-${orderId}`;

    try {
      await callLocalApi("tickets/orders/archive", {
        method: "POST",
        data: { order_id: orderId, mode: "archive" },
      });

      toast.custom(
        () => (
          <BaseToast
            message={__("Order archived.", "eventkoi-lite")}
            variant="default"
          />
        ),
        { id: toastId, duration: 3000 }
      );

      if (onArchive) onArchive();
    } catch (error) {
      console.error("Archive failed:", error);
      toast.custom(
        () => (
          <BaseToast
            message={__("Failed to archive order.", "eventkoi-lite")}
            variant="default"
          />
        ),
        { id: toastId, duration: 4000 }
      );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={__("Attendee actions", "eventkoi-lite")}
        >
          <EllipsisVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[190px]">
        <DropdownMenuItem
          onClick={handleResendConfirmation}
          disabled={!canResend}
        >
          {__("Resend confirmation", "eventkoi-lite")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleArchive}
          disabled={!orderId}
          className="text-destructive focus:text-destructive"
        >
          {__("Archive", "eventkoi-lite")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CheckinCountInput({ row, onSave, disabled = false }) {
  const guests = Number(row.guests) || 0;
  const defaultCount = 1 + guests;
  const storedCount = row.checked_in_count;
  const status = (row.checkin_status || "").toLowerCase();
  const checkedInAt = row.checked_in;
  const hasCheckedInTime =
    checkedInAt &&
    checkedInAt !== "0000-00-00 00:00:00" &&
    checkedInAt !== "0" &&
    checkedInAt !== 0;
  const isCheckedIn = status === "checked_in" || hasCheckedInTime;
  const resolvedCount = isCheckedIn
    ? storedCount !== null && storedCount !== undefined && storedCount !== ""
      ? Number(storedCount)
      : defaultCount
    : "";
  const [value, setValue] = useState(
    resolvedCount === "" ? "" : String(resolvedCount),
  );

  useEffect(() => {
    setValue(resolvedCount === "" ? "" : String(resolvedCount));
  }, [resolvedCount]);

  const commitValue = () => {
    if (disabled) {
      setValue("");
      return;
    }
    if (!isCheckedIn) {
      setValue("");
      return;
    }
    const parsed = value === "" ? 0 : Math.max(0, parseInt(value, 10) || 0);
    const capped = Math.min(parsed, defaultCount);
    if (capped === resolvedCount) {
      setValue(String(capped));
      return;
    }
    setValue(String(capped));
    onSave?.(capped);
  };

  return (
    <Input
      type="number"
      min={0}
      max={defaultCount}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commitValue}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      aria-label={__("Checked-in count", "eventkoi-lite")}
      className="h-9 w-14 px-2 text-center tabular-nums"
      disabled={disabled}
    />
  );
}

function CopyableCode({ code, index, copied, onCopy }) {
  const isCopied = copied === code;
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground shrink-0">
        {index}
      </span>
      <span className="font-mono text-[13px] tracking-wide text-foreground min-w-0 truncate">
        {code}
      </span>
      <button
        type="button"
        onClick={() => onCopy(code)}
        className="shrink-0 ml-auto inline-flex items-center justify-center h-7 w-7 rounded-md border-0 bg-transparent hover:bg-muted cursor-pointer transition-colors"
        aria-label={__("Copy code", "eventkoi-lite")}
      >
        {isCopied ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

function CheckinCodesDialog({ codes, masterCode, customerName, orderId, checkedInCount, children }) {
  const [copied, setCopied] = useState(null);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const handleCopyAll = () => {
    const allText = codes.join("\n");
    navigator.clipboard.writeText(allText).then(() => {
      setCopied("__all__");
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const wcMatch = orderId ? orderId.match(/^wc_(\d+)/) : null;
  const displayOrderId = wcMatch ? `#${wcMatch[1]}` : orderId;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[380px] p-0 gap-0 rounded-xl overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 space-y-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em]">
              {__("Check-in codes", "eventkoi-lite")}
            </DialogTitle>
            <span className="text-xs text-muted-foreground tabular-nums bg-muted px-2 py-0.5 rounded-full mr-6">
              {checkedInCount}/{codes.length} {__("checked in", "eventkoi-lite")}
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground !mt-1">
            {customerName}
            {displayOrderId ? <span className="text-muted-foreground/60"> · {displayOrderId}</span> : ""}
          </p>
        </DialogHeader>

        {masterCode && (
          <div className="px-5 pb-3">
            <div className="flex items-center justify-between rounded-lg bg-accent/60 px-4 py-3">
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest">
                  {__("Group check-in", "eventkoi-lite")}
                </span>
                <div className="font-mono text-[15px] font-semibold tracking-wide mt-0.5">
                  {masterCode}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(masterCode)}
                className="shrink-0 ml-3 inline-flex items-center justify-center h-8 w-8 rounded-md border-0 bg-transparent hover:bg-background/60 cursor-pointer transition-colors"
                aria-label={__("Copy group code", "eventkoi-lite")}
              >
                {copied === masterCode ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        )}

        <div className="px-5 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              {sprintf(__("%d individual codes", "eventkoi-lite"), codes.length)}
            </span>
            {codes.length > 1 && (
              <button
                type="button"
                onClick={handleCopyAll}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0 p-0 transition-colors"
              >
                {copied === "__all__" ? __("Copied!", "eventkoi-lite") : __("Copy all", "eventkoi-lite")}
              </button>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 grid gap-2 max-h-[45vh] overflow-y-auto">
          {codes.map((code, i) => (
            <CopyableCode key={code} code={code} index={i + 1} copied={copied} onCopy={handleCopy} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TicketCheckinCountInput({ row, onSave, disabled = false }) {
  const maxCount = Math.max(1, Number(row.quantity || 1) || 1);
  const storedCount = Number(row.checked_in_count || 0);
  const [value, setValue] = useState(storedCount > 0 ? String(storedCount) : "");

  useEffect(() => {
    setValue(storedCount > 0 ? String(storedCount) : "");
  }, [storedCount]);

  const commitValue = () => {
    const parsed = value === "" ? 0 : Math.max(0, parseInt(value, 10) || 0);
    const capped = Math.min(parsed, maxCount);
    if (capped === storedCount) {
      setValue(capped > 0 ? String(capped) : "");
      return;
    }
    setValue(capped > 0 ? String(capped) : "");
    onSave?.(capped);
  };

  return (
    <Input
      type="number"
      min={0}
      max={maxCount}
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "") {
          setValue("");
          return;
        }
        const num = Math.max(0, Math.min(maxCount, Number(v) || 0));
        setValue(String(num));
      }}
      onBlur={commitValue}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      disabled={disabled}
      placeholder="0"
      aria-label={__("Checked-in count", "eventkoi-lite")}
      className="h-9 w-14 px-2 text-center tabular-nums"
    />
  );
}

export function EventEditAttendees() {
  const { event, setEvent } = useEventEditContext();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine if we're viewing RSVP or Tickets attendees based on route
  const isTicketsAttendees = location.pathname.includes('/attendees') && event?.attendance_mode === 'tickets';
  
  const statusFilter = searchParams.get("status") || "all";

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [ticketsSoldTotal, setTicketsSoldTotal] = useState(0);
  const [instanceTs, setInstanceTs] = useState(null);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const workingDays = useMemo(() => {
    return Array.isArray(settings?.working_days)
      ? settings.working_days.map((v) => parseInt(v, 10))
      : [0, 1, 2, 3, 4];
  }, [settings?.working_days]);

  const instances = useMemo(() => {
    if (event?.date_type !== "recurring") {
      return [];
    }

    const overrideArray = event?.recurrence_overrides
      ? Object.entries(event.recurrence_overrides).map(
          ([timestamp, override]) => ({
            ...override,
            timestamp: Number(timestamp),
          }),
        )
      : [];

    return generateInstances(
      event?.recurrence_rules,
      event?.title,
      overrideArray,
      workingDays,
      event?.url,
      false,
      event?.timezone,
    );
  }, [
    event?.date_type,
    event?.recurrence_rules,
    event?.title,
    event?.recurrence_overrides,
    event?.url,
    event?.timezone,
    workingDays,
  ]);

  const groupedInstanceOptions = useMemo(() => {
    if (!instances.length) return { upcoming: [], past: [] };

    const MAX_OPTIONS = 50;
    const nowTs = Math.floor(Date.now() / 1000);

    const options = instances
      .map((instance) => {
        const timestamp = Math.floor(
          new Date(instance.start_date).getTime() / 1000,
        );
        const label = `${instance.title || "Instance"} • ${formatShortDate(
          instance.start_date,
        )}`;
        return { value: String(timestamp), label, timestamp };
      })
      .filter((option) => Number.isFinite(option.timestamp))
      .map((option) => ({
        ...option,
        isUpcoming: option.timestamp >= nowTs,
      }));

    const upcoming = options
      .filter((option) => option.isUpcoming)
      .sort((a, b) => a.timestamp - b.timestamp);

    const past = options
      .filter((option) => !option.isUpcoming)
      .sort((a, b) => b.timestamp - a.timestamp);

    const limited = [...upcoming, ...past].slice(0, MAX_OPTIONS);

    return {
      upcoming: limited.filter((option) => option.isUpcoming),
      past: limited.filter((option) => !option.isUpcoming),
    };
  }, [instances]);

  const instanceOptions = useMemo(
    () => [...groupedInstanceOptions.upcoming, ...groupedInstanceOptions.past],
    [groupedInstanceOptions],
  );

  useEffect(() => {
    if (event?.date_type !== "recurring") {
      setInstanceTs(null);
      return;
    }

    if (!instanceOptions.length) {
      setInstanceTs(null);
      return;
    }

    if (
      !instanceTs ||
      !instanceOptions.some((opt) => opt.value === instanceTs)
    ) {
      const firstOption =
        groupedInstanceOptions.upcoming[0] || groupedInstanceOptions.past[0];
      setInstanceTs(firstOption?.value || null);
    }
  }, [event?.date_type, instanceOptions, instanceTs, groupedInstanceOptions]);

  const filteredData = useMemo(() => {
    if (isTicketsAttendees) {
      return data;
    }
    if (statusFilter === "all") return data;
    return data.filter(
      (row) => (row.status || "").toLowerCase() === statusFilter,
    );
  }, [data, statusFilter, isTicketsAttendees]);

  const capacity = useMemo(() => {
    return Number(event?.rsvp_capacity || 0);
  }, [event?.rsvp_capacity]);

  const showRemaining = event?.rsvp_show_remaining !== false;

  const usedCapacity = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((total, row) => {
      if ((row.status || "").toLowerCase() !== "going") {
        return total;
      }
      return total + 1 + (Number(row.guests) || 0);
    }, 0);
  }, [data]);

  const checkedInCount = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((total, row) => {
      const rsvpStatus = (row.status || "").toLowerCase();
      if (rsvpStatus !== "going") {
        return total;
      }
      const status = (row.checkin_status || "").toLowerCase();
      const checkedInAt = row.checked_in;
      const hasCheckedInTime =
        checkedInAt &&
        checkedInAt !== "0000-00-00 00:00:00" &&
        checkedInAt !== "0" &&
        checkedInAt !== 0;
      if (status === "checked_in" || hasCheckedInTime) {
        const storedCount = row.checked_in_count;
        const defaultCount = 1 + (Number(row.guests) || 0);
        const count =
          storedCount !== null && storedCount !== undefined && storedCount !== ""
            ? Number(storedCount)
            : defaultCount;
        return total + count;
      }
      return total;
    }, 0);
  }, [data]);

  const remainingCapacity =
    capacity > 0 ? Math.max(capacity - usedCapacity, 0) : null;

  const usedPercent =
    capacity > 0
      ? Math.min(100, Math.round((usedCapacity / capacity) * 100))
      : 0;

  const enableRsvp = async () => {
    if (!event?.id || isEnabling) return;

    setIsEnabling(true);
    try {
      const eventToSave = {
        ...event,
        attendance_mode: 'rsvp',
        wp_status: event?.wp_status || "draft",
      };

      const response = await apiRequest({
        path: `${eventkoi_params.api}/update_event`,
        method: "POST",
        data: { event: eventToSave },
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });

      if (response?.id) {
        setEvent?.(response);
      }

      showToast({ message: __("RSVP enabled.", "eventkoi-lite") });
      navigate("../main");
    } catch (error) {
      console.error("Failed to enable RSVP:", error);
      showToastError(__("Failed to enable RSVP.", "eventkoi-lite"));
    } finally {
      setIsEnabling(false);
    }
  };

  const fetchResults = useCallback(async () => {
    if (!event?.id) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      let response;
      
      if (isTicketsAttendees) {
        // Fetch ticket attendees rows + stats from local DB.
        const params = new URLSearchParams({ event_id: String(event.id) });
        const [ordersResponse, combinedStats] = await Promise.all([
          apiRequest({
            path: `${eventkoi_params.api}/tickets/orders?${params.toString()}`,
            method: "GET",
            headers: {
              "EVENTKOI-API-KEY": eventkoi_params.api_key,
            },
          }),
          apiRequest({
            path: `${eventkoi_params.api}/tickets/combined-stats?event_id=${event.id}`,
            method: "GET",
            headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
          }).catch(() => null),
        ]);
        response = ordersResponse;
        setTicketsSoldTotal(Number(combinedStats?.tickets_sold || 0));
      } else {
        // Fetch RSVPs
        if (event?.date_type === "recurring" && !instanceTs) {
          setData([]);
          setIsLoading(false);
          return;
        }

        const params = new URLSearchParams({ event_id: String(event.id) });
        if (instanceTs) {
          params.set("instance_ts", String(instanceTs));
        }

        response = await apiRequest({
          path: `${eventkoi_params.api}/rsvps?${params.toString()}`,
          method: "GET",
          headers: {
            "EVENTKOI-API-KEY": eventkoi_params.api_key,
          },
        });
        setTicketsSoldTotal(0);
      }
      
      setData(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Fetch error:", error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [event?.id, event?.date_type, instanceTs, isTicketsAttendees]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const exportCsv = async (table, status) => {
    if (!event?.id) {
      showToastError(__("Missing event data.", "eventkoi-lite"));
      return;
    }

    if (event?.date_type === "recurring" && !instanceTs) {
      showToastError(__("Select an instance first.", "eventkoi-lite"));
      return;
    }

    const cols = table.getAllColumns();
    const defaultCol = cols[1]?.id;
    const searchValue = defaultCol
      ? table.getColumn(defaultCol)?.getFilterValue() ?? ""
      : "";

    const params = new URLSearchParams({
      event_id: String(event.id),
      instance_ts: String(instanceTs || 0),
      status,
    });

    if (searchValue) {
      params.set("search", String(searchValue));
    }

    setIsExporting(true);
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/rsvps/export?${params.toString()}`,
        method: "GET",
        parse: false,
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
          "X-WP-Nonce": eventkoi_params.nonce || "",
        },
      });

      if (!response?.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Export failed.");
      }

      const csvText = await response.text();
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
      const contentDisposition =
        response.headers.get("content-disposition") || "";
      const match = contentDisposition.match(/filename="([^"]+)"/);
      const filename =
        match?.[1] || `eventkoi-rsvps-${event.id}-${instanceTs || 0}.csv`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export CSV failed:", error);
      showToastError(__("Failed to export CSV.", "eventkoi-lite"));
    } finally {
      setIsExporting(false);
    }
  };

  const exportTicketAttendeesCsv = async (table) => {
    setIsExporting(true);
    try {
      const rows = table.getFilteredRowModel().rows || [];
      const csvRows = rows.map((row) => ({
        name: row.original.customer_name || "",
        email: row.original.customer_email || "",
        checkin_code:
          row.original.checkin_token || row.original.master_checkin_code || "",
        order_id: row.original.order_id || "",
        order_status: row.original.payment_status || "",
        quantity: Number(row.original.quantity || 0) || 0,
        order_date: row.original.created_at || "",
      }));

      const headers = [
        "Name",
        "Email",
        "Check-in code",
        "Order ID",
        "Order status",
        "Ticket quantity",
        "Order date",
      ];

      const escapeCsv = (value) => {
        const text = String(value ?? "");
        if (text.includes(",") || text.includes('"') || text.includes("\n")) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      };

      const lines = [
        headers.join(","),
        ...csvRows.map((item) =>
          [
            item.name,
            item.email,
            item.checkin_code,
            item.order_id,
            item.order_status,
            item.quantity,
            item.order_date,
          ]
            .map(escapeCsv)
            .join(",")
        ),
      ];

      const blob = new Blob([lines.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `eventkoi-ticket-attendees-${event?.id || "event"}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export ticket attendees failed:", error);
      showToastError(__("Failed to export CSV.", "eventkoi-lite"));
    } finally {
      setIsExporting(false);
    }
  };

  const updateRowStatus = useCallback(
    async (rsvpId, status) => {
      if (!rsvpId || !status) return;

      try {
        const response = await apiRequest({
          path: `${eventkoi_params.api}/rsvps/bulk`,
          method: "POST",
          data: {
            ids: [rsvpId],
            action: "status",
            status,
          },
          headers: {
            "EVENTKOI-API-KEY": eventkoi_params.api_key,
          },
        });

        const updatedCount = Number(response?.count ?? 0);

        if (!updatedCount) {
          showToastError(__("No RSVP updated.", "eventkoi-lite"));
          return;
        }

        showToast({ message: __("RSVP updated.", "eventkoi-lite") });
        fetchResults();
      } catch (error) {
        console.error("RSVP status update error:", error);
        showToastError(__("Failed to update RSVP.", "eventkoi-lite"));
      }
    },
    [fetchResults],
  );

  const updateRowCheckin = useCallback(
    async (rsvpId, status) => {
      if (!rsvpId || !status) return;

      try {
        const response = await apiRequest({
          path: `${eventkoi_params.api}/rsvps/bulk`,
          method: "POST",
          data: {
            ids: [rsvpId],
            action: "checkin",
            status,
          },
          headers: {
            "EVENTKOI-API-KEY": eventkoi_params.api_key,
          },
        });

        const updatedCount = Number(response?.count ?? 0);

        if (!updatedCount) {
          showToastError(__("No RSVP updated.", "eventkoi-lite"));
          return;
        }

        // Optimistic local update — avoid full table + stats refetch.
        setData((prev) =>
          prev.map((row) =>
            row.id === rsvpId
              ? {
                  ...row,
                  checkin_status: status,
                  checked_in: status === "checked_in" ? new Date().toISOString() : "",
                }
              : row
          )
        );
        showToast({ message: __("RSVP updated.", "eventkoi-lite") });
      } catch (error) {
        console.error("RSVP check-in update error:", error);
        showToastError(__("Failed to update RSVP.", "eventkoi-lite"));
      }
    },
    [],
  );

  const updateRowCheckinCount = useCallback(
    async (rsvpId, count) => {
      if (!rsvpId || count === null || count === undefined) return;

      try {
        const response = await apiRequest({
          path: `${eventkoi_params.api}/rsvps/bulk`,
          method: "POST",
          data: {
            ids: [rsvpId],
            action: "checkin_count",
            count,
          },
          headers: {
            "EVENTKOI-API-KEY": eventkoi_params.api_key,
          },
        });

        const updatedCount = Number(response?.count ?? 0);

        if (!updatedCount) {
          showToastError(__("No RSVP updated.", "eventkoi-lite"));
          return;
        }

        // Optimistic local update.
        setData((prev) =>
          prev.map((row) =>
            row.id === rsvpId ? { ...row, checked_in_count: count } : row
          )
        );
        showToast({ message: __("RSVP updated.", "eventkoi-lite") });
      } catch (error) {
        console.error("RSVP check-in count update error:", error);
        showToastError(__("Failed to update RSVP.", "eventkoi-lite"));
      }
    },
    [],
  );

  const updateTicketCheckin = useCallback(
    async (orderId, action) => {
      if (!orderId || !action) return;

      try {
        const response = await callLocalApi("tickets/orders/checkin", {
          method: "POST",
          data: {
            order_id: orderId,
            action,
          },
        });

        // Optimistic local update — avoid full table + stats refetch.
        const newCount = Number(response?.checked_in_count ?? 0);
        setData((prev) =>
          prev.map((row) =>
            row.order_id === orderId
              ? { ...row, checked_in_count: newCount, checked_in: newCount > 0 ? 1 : 0 }
              : row
          )
        );
        showToast({ message: __("Check-in updated.", "eventkoi-lite") });
      } catch (error) {
        console.error("Ticket check-in update error:", error);
        showToastError(__("Failed to update check-in.", "eventkoi-lite"));
      }
    },
    [],
  );

  const updateTicketCheckinCount = useCallback(
    async (orderId, count) => {
      if (!orderId || count === null || count === undefined) return;

      try {
        const response = await callLocalApi("tickets/orders/checkin", {
          method: "POST",
          data: {
            order_id: orderId,
            count,
          },
        });

        // Optimistic local update — avoid full table + stats refetch.
        const newCount = Number(response?.checked_in_count ?? count);
        setData((prev) =>
          prev.map((row) =>
            row.order_id === orderId
              ? { ...row, checked_in_count: newCount, checked_in: newCount > 0 ? 1 : 0 }
              : row
          )
        );
        showToast({ message: __("Check-in updated.", "eventkoi-lite") });
      } catch (error) {
        console.error("Ticket check-in count update error:", error);
        showToastError(__("Failed to update check-in.", "eventkoi-lite"));
      }
    },
    [],
  );

  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center min-h-6">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label="Select all"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center min-h-6">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <SortButton title="Name" column={column} />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="text-foreground truncate">
              {row.original.name || "—"}
            </div>
            <div
              className="text-xs text-muted-foreground truncate"
              title={row.original.email || ""}
            >
              {row.original.email || "—"}
            </div>
          </div>
        ),
        filterFn: multiColumnSearch,
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "checked_in",
        header: () => <div className="text-sm font-normal">Checked-in</div>,
        cell: ({ row }) => {
          const rsvpStatus = (row.original.status || "").toLowerCase();
          const rawStatus = (row.original.checkin_status || "").toLowerCase();
          const hasCheckedIn = Boolean(row.original.checked_in);
          const status =
            rawStatus || (hasCheckedIn ? "checked_in" : "check_in");
          const buttonLabel =
            status === "checked_in"
              ? __("Checked in", "eventkoi-lite")
              : status === "denied"
              ? __("Denied", "eventkoi-lite")
              : __("Check in", "eventkoi-lite");
          const nextStatus =
            status === "checked_in" || status === "denied"
              ? "check_in"
              : "checked_in";
          const checkedInClass =
            status === "checked_in"
              ? "bg-[#0D5342] text-white hover:bg-[#0D5342]/90 hover:text-white border-[#0D5342]"
              : "";
          const deniedClass =
            status === "denied"
              ? "bg-[#FBEFEE] text-[#52140F] hover:bg-[#FBEFEE]/80 hover:text-[#52140F] border-[#F5D6D3] hover:border-[#EBC7C3]"
              : "";
          const controlsDisabled = rsvpStatus !== "going";

          return (
            <div className="flex items-center gap-2">
              <CheckinCountInput
                row={row.original}
                disabled={controlsDisabled}
                onSave={(count) => updateRowCheckinCount(row.original.id, count)}
              />
              <div className="flex items-center gap-[1px]">
              <Button
                variant="outline"
                className={cn(
                  "h-9 px-3 rounded-r-none font-medium",
                  checkedInClass,
                  deniedClass,
                )}
                onClick={() => updateRowCheckin(row.original.id, nextStatus)}
                disabled={controlsDisabled}
              >
                {buttonLabel}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-8 rounded-l-none p-0",
                      checkedInClass,
                      deniedClass,
                    )}
                    aria-label={__("Check-in actions", "eventkoi-lite")}
                    disabled={controlsDisabled}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[140px]">
                  <DropdownMenuItem
                    onClick={() =>
                      updateRowCheckin(row.original.id, "check_in")
                    }
                    disabled={status === "check_in"}
                  >
                    {__("Check in", "eventkoi-lite")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      updateRowCheckin(row.original.id, "checked_in")
                    }
                    disabled={status === "checked_in"}
                  >
                    {__("Checked in", "eventkoi-lite")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => updateRowCheckin(row.original.id, "denied")}
                    disabled={status === "denied"}
                  >
                    {__("Denied", "eventkoi-lite")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>
          );
        },
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "checkin_token",
        header: ({ column }) => (
          <SortButton title="Check-in code" column={column} />
        ),
        cell: ({ row }) => (
          <div className="text-sm text-foreground truncate">
            {(row.original.status || "").toLowerCase() === "going"
              ? row.original.checkin_token || "—"
              : "—"}
          </div>
        ),
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "status",
        header: ({ column }) => <SortButton title="Status" column={column} />,
        cell: ({ row }) => {
          const status = (row.original.status || "").toLowerCase();
          const statusIcons = {
            going: CircleCheck,
            maybe: CircleDotDashed,
            not_going: CircleMinus,
            cancelled: CircleX,
          };
          const StatusIcon = statusIcons[status] || CircleDotDashed;
          const statusIconClasses = {
            going: "text-[#1AA684]",
            maybe: "text-[#808080]",
            not_going: "text-[#CC3325]",
            cancelled: "text-[#CC3325]",
          };
          const statusIconClass = statusIconClasses[status] || "text-[#808080]";
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 w-[140px] justify-between px-2 font-normal"
                >
                  <span className="flex items-center gap-2">
                    <StatusIcon className={`h-4 w-4 ${statusIconClass}`} />
                    {statusLabel(status)}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[140px]">
                <DropdownMenuItem
                  onClick={() => updateRowStatus(row.original.id, "going")}
                  disabled={status === "going"}
                >
                  <CircleCheck className="h-4 w-4 me-2 text-[#1AA684]" />
                  <span>{__("Going", "eventkoi-lite")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateRowStatus(row.original.id, "maybe")}
                  disabled={status === "maybe"}
                >
                  <CircleDotDashed className="h-4 w-4 me-2 text-[#808080]" />
                  <span>{__("Maybe", "eventkoi-lite")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateRowStatus(row.original.id, "not_going")}
                  disabled={status === "not_going"}
                >
                  <CircleMinus className="h-4 w-4 me-2 text-[#CC3325]" />
                  <span>{__("Not going", "eventkoi-lite")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateRowStatus(row.original.id, "cancelled")}
                  disabled={status === "cancelled"}
                >
                  <CircleX className="h-4 w-4 me-2 text-[#CC3325]" />
                  <span>{__("Cancelled", "eventkoi-lite")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        filterFn: multiColumnSearch,
        sortingFn: (rowA, rowB) => {
          const aStatus = String(rowA.original.status || "").toLowerCase();
          const bStatus = String(rowB.original.status || "").toLowerCase();
          const aOrder =
            typeof statusSortOrder[aStatus] === "number"
              ? statusSortOrder[aStatus]
              : 99;
          const bOrder =
            typeof statusSortOrder[bStatus] === "number"
              ? statusSortOrder[bStatus]
              : 99;
          return aOrder - bOrder;
        },
      },
      {
        accessorKey: "guests",
        header: ({ column }) => <SortButton title="Guests" column={column} />,
        cell: ({ row }) => (
          <div className="text-foreground">{row.original.guests ?? 0}</div>
        ),
        sortingFn: "alphanumeric",
      },
      {
        id: "rsvp_date",
        accessorFn: (row) => row.created,
        header: ({ column }) => (
          <SortButton title="RSVP date" column={column} />
        ),
        cell: ({ row }) => {
          const createdRaw = row.original.created;
          const created = createdRaw
            ? new Date(
                typeof createdRaw === "number"
                  ? createdRaw * 1000
                  : createdRaw.includes("T")
                  ? createdRaw
                  : `${createdRaw.replace(" ", "T")}Z`,
              ).toISOString()
            : "";
          return (
            <div className="text-foreground whitespace-pre-line">
              {formatWPtime(created)}
            </div>
          );
        },
        sortingFn: "alphanumeric",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <RowRsvpActions
              rsvpId={row.original.id}
              checkinToken={row.original.checkin_token}
              canCopyToken={
                (row.original.status || "").toLowerCase() === "going"
              }
              canResend={
                (row.original.status || "").toLowerCase() === "going" &&
                (settings?.rsvp_email_enabled === true ||
                  settings?.rsvp_email_enabled === "1" ||
                  settings?.rsvp_email_enabled === 1 ||
                  typeof settings?.rsvp_email_enabled === "undefined")
              }
              onComplete={fetchResults}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [fetchResults, updateRowCheckin, updateRowCheckinCount, updateRowStatus],
  );

  const base = event?.id ? `events/${event.id}/attendees` : "events";

  const ticketColumns = useMemo(
    () => {
      if (!isTicketsAttendees) return [];
      return [
        {
          id: "select",
          header: ({ table }) => (
            <div className="flex items-center justify-center min-h-6">
              <Checkbox
                checked={
                  table.getIsAllPageRowsSelected() ||
                  (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) =>
                  table.toggleAllPageRowsSelected(!!value)
                }
                aria-label="Select all"
              />
            </div>
          ),
          cell: ({ row }) => (
            <div className="flex items-center justify-center min-h-6">
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
              />
            </div>
          ),
          enableSorting: false,
          enableHiding: false,
        },
        {
          accessorKey: "customer_name",
          header: ({ column }) => <SortButton title="Name" column={column} />,
          cell: ({ row }) => (
            <div className="min-w-0">
              <div className="text-foreground truncate">
                {row.original.customer_name || ""}
              </div>
              <div
                className="text-xs text-muted-foreground truncate"
                title={row.original.customer_email || ""}
              >
                {row.original.customer_email || ""}
              </div>
            </div>
          ),
          filterFn: multiColumnSearch,
          sortingFn: "alphanumeric",
        },
        {
          accessorKey: "checked_in",
          header: () => <div className="text-sm font-normal">{__("Checked in", "eventkoi-lite")}</div>,
          cell: ({ row }) => {
            const checkedInCount = Number(row.original.checked_in_count || 0);
            const totalQty = Number(row.original.quantity || 1);
            const allCheckedIn = checkedInCount >= totalQty;
            const status = allCheckedIn ? "checked_in" : "check_in";
            const buttonLabel = allCheckedIn
              ? __("Checked in", "eventkoi-lite")
              : __("Check in", "eventkoi-lite");
            const nextAction = allCheckedIn ? "check_in" : "checked_in";
            const checkedInClass = allCheckedIn
              ? "bg-[#0D5342] text-white hover:bg-[#0D5342]/90 hover:text-white border-[#0D5342]"
              : "";
            const orderId = row.original.order_id || "";
            const controlsDisabled = !isCompletedOrderStatus(row.original.payment_status);

            return (
              <div className="flex items-center gap-2">
                <TicketCheckinCountInput
                  row={row.original}
                  onSave={(count) => updateTicketCheckinCount(orderId, count)}
                  disabled={controlsDisabled}
                />
                <div className="flex items-center gap-[1px]">
                  <Button
                    variant="outline"
                    className={cn("h-9 px-3 rounded-r-none font-medium", checkedInClass)}
                    onClick={() => updateTicketCheckin(orderId, nextAction)}
                    disabled={controlsDisabled}
                  >
                    {buttonLabel}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("h-9 w-8 rounded-l-none p-0", checkedInClass)}
                        aria-label={__("Check-in actions", "eventkoi-lite")}
                        disabled={controlsDisabled}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[140px]">
                      <DropdownMenuItem
                        onClick={() => updateTicketCheckin(orderId, "check_in")}
                        disabled={status === "check_in"}
                      >
                        {__("Check in", "eventkoi-lite")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => updateTicketCheckin(orderId, "checked_in")}
                        disabled={status === "checked_in"}
                      >
                        {__("Checked in", "eventkoi-lite")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          },
          sortingFn: "alphanumeric",
        },
        {
          accessorKey: "checkin_codes",
          header: () => <div className="text-sm font-normal">{__("Check-in codes", "eventkoi-lite")}</div>,
          cell: ({ row }) => {
            const codes = Array.isArray(row.original.checkin_codes)
              ? row.original.checkin_codes
              : [];
            const masterCode = row.original.master_checkin_code || "";
            const allCodes = codes.length > 0 ? codes : masterCode ? [masterCode] : [];

            if (allCodes.length === 0) return <div className="text-muted-foreground">—</div>;

            if (allCodes.length === 1) {
              return (
                <span className="font-mono text-xs text-foreground">{allCodes[0]}</span>
              );
            }

            return (
              <CheckinCodesDialog
                codes={allCodes}
                masterCode={masterCode}
                customerName={row.original.customer_name || ""}
                orderId={row.original.order_id || ""}
                checkedInCount={row.original.checked_in_count || 0}
              >
                <button
                  type="button"
                  className="text-xs cursor-pointer bg-transparent border-0 p-0 whitespace-nowrap"
                >
                  <span className="font-mono text-foreground">{allCodes[0]}</span>{" "}
                  <span className="text-muted-foreground hover:text-foreground">+{allCodes.length - 1}</span>
                </button>
              </CheckinCodesDialog>
            );
          },
          sortingFn: "alphanumeric",
        },
        {
          accessorKey: "order_id",
          header: ({ column }) => <SortButton title="Order ID" column={column} />,
          cell: ({ row }) => {
            const orderId = row.original.order_id || "";
            if (!orderId) return <div className="text-foreground" />;

            // WC orders link to WooCommerce admin order page.
            const wcMatch = orderId.match(/^wc_(\d+)/);
            if (wcMatch) {
              return (
                <div className="text-foreground">
                  <a
                    href={`${window.location.origin}/wp-admin/admin.php?page=wc-orders&action=edit&id=${wcMatch[1]}`}
                    className="font-medium hover:underline hover:decoration-dotted underline-offset-4"
                    title={`WooCommerce Order #${wcMatch[1]}`}
                    target="_self"
                  >
                    #{wcMatch[1]}
                  </a>
                </div>
              );
            }

            return (
              <div className="text-foreground">
                <Link
                  to={`/tickets/orders/${encodeURIComponent(orderId)}`}
                  className="font-medium hover:underline hover:decoration-dotted underline-offset-4"
                  title={orderId}
                >
                  {shortOrderId(orderId)}
                </Link>
              </div>
            );
          },
          filterFn: multiColumnSearch,
          sortingFn: "alphanumeric",
        },
        {
          accessorKey: "payment_status",
          header: ({ column }) => <SortButton title="Order Status" column={column} />,
          cell: ({ row }) => <OrderStatus order={row.original} />,
          sortingFn: "alphanumeric",
        },
        {
          accessorKey: "quantity",
          header: ({ column }) => <SortButton title="Ticket quantity" column={column} />,
          cell: ({ row }) => (
            <div className="text-foreground">{row.original.quantity || 0}</div>
          ),
          sortingFn: "alphanumeric",
        },
        {
          id: "order_date",
          accessorFn: (row) => row.created_at,
          header: ({ column }) => (
            <SortButton title="Order date" column={column} />
          ),
          cell: ({ row }) => {
            const created = row.original.created_at
              ? new Date(row.original.created_at).toISOString()
              : "";
            return (
              <div className="text-foreground whitespace-pre-line">
                {formatWPtime(created)}
              </div>
            );
          },
          sortingFn: "alphanumeric",
        },
        {
          id: "actions",
          header: "",
          cell: ({ row }) => (
            <div className="flex justify-end">
              <RowTicketActions
                orderId={row.original.order_id || ""}
                paymentStatus={row.original.payment_status || ""}
                onArchive={fetchResults}
              />
            </div>
          ),
          enableSorting: false,
          enableHiding: false,
        },
      ];
    },
    [isTicketsAttendees, fetchResults, updateTicketCheckin, updateTicketCheckinCount]
  );

  // Show "Enable RSVP" message only when viewing RSVP attendees and RSVP is not enabled
  if (!isTicketsAttendees && event?.attendance_mode !== 'rsvp') {
    return (
      <div className="flex flex-col w-full min-w-0 gap-8">
        <div className="flex-1 flex items-center justify-center px-4 min-h-[50vh]">
          <div className="w-full max-w-md text-center">
            <h2 className="text-lg font-semibold text-foreground mb-1">
              {__("RSVP is turned off", "eventkoi-lite")}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {__(
                "Enable RSVP for this event to start collecting attendees.",
                "eventkoi-lite",
              )}
            </p>
            <Button
              variant="outline"
              onClick={enableRsvp}
              disabled={isEnabling}
            >
              {isEnabling
                ? __("Enabling...", "eventkoi-lite")
                : __("Enable RSVP", "eventkoi-lite")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show ticket attendees table
  if (isTicketsAttendees) {
    return (
      <div className="flex flex-col w-full min-w-0 gap-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Heading>{__("Attendees", "eventkoi-lite")}</Heading>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-sm text-card-foreground shadow-sm w-full overflow-x-auto py-3 flex gap-4">
          <div className="min-w-[16px]"></div>
          <div className="grid grid-cols-1 grow">
            <Stat
              className="border-l-0 pl-0"
              labelClassName="normal-case"
              line1={__("Checked-in/Total tickets sold", "eventkoi-lite")}
              line2={
                isLoading ? (
                  <Skeleton className="h-5 w-16" />
                ) : (
                  `${data.reduce(
                    (sum, row) => sum + (Number(row.checked_in_count) || 0),
                    0
                  )}/${ticketsSoldTotal}`
                )
              }
            />
          </div>
        </div>

        <DataTable
          data={filteredData}
          columns={ticketColumns}
          empty={__("No attendees yet.", "eventkoi-lite")}
          base={base}
          tableLayout="fixed"
          tableClassName="min-w-0 overflow-x-auto"
          hideDateRange
          hideCategories
          isLoading={isLoading}
          fetchResults={fetchResults}
          customTopLeft={() => null}
          customTopRight={(table) => (
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <SearchBox table={table} />
              <Button
                variant="outline"
                disabled={isExporting}
                onClick={() => exportTicketAttendeesCsv(table)}
              >
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                {isExporting
                  ? __("Exporting...", "eventkoi-lite")
                  : __("Export", "eventkoi-lite")}
              </Button>
            </div>
          )}
          hideFiltersControl
          hideBottomSelected
          defaultSort={[{ id: "order_date", desc: true }]}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-w-0 gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Heading>Attendees</Heading>
            {event?.date_type === "recurring" && (
              <Select
                value={instanceTs || ""}
                onValueChange={(value) => setInstanceTs(value)}
              >
                <SelectTrigger className="w-full sm:w-[320px]">
                  <SelectValue placeholder="Select instance" />
                </SelectTrigger>
                <SelectContent>
                  {groupedInstanceOptions.upcoming.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>{__("Upcoming", "eventkoi-lite")}</SelectLabel>
                      {groupedInstanceOptions.upcoming.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {groupedInstanceOptions.upcoming.length > 0 &&
                    groupedInstanceOptions.past.length > 0 && (
                      <SelectSeparator />
                    )}
                  {groupedInstanceOptions.past.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>
                        {__("Past instances", "eventkoi-lite")}
                      </SelectLabel>
                      {groupedInstanceOptions.past.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 w-full sm:w-auto"></div>
      </div>

      <div className="rounded-lg border bg-card text-sm text-card-foreground shadow-sm w-full overflow-x-auto py-3 flex gap-4">
        <div className="min-w-[16px]"></div>
        <div className="grid grid-cols-2 grow">
          <Stat
            className="border-l-0 pl-0"
            labelClassName="normal-case"
            line1={__('RSVP "Going"', "eventkoi-lite")}
            line2={
              isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : capacity > 0 ? (
                `${usedCapacity}/${capacity}`
              ) : (
                usedCapacity
              )
            }
          />
          <Stat
            labelClassName="normal-case"
            line1={__("Check-ins", "eventkoi-lite")}
            line2={
              isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : usedCapacity > 0 ? (
                `${checkedInCount}/${usedCapacity}`
              ) : (
                checkedInCount
              )
            }
          />
        </div>
      </div>

      <DataTable
        data={filteredData}
        columns={columns}
        empty={"No RSVPs are found."}
        base={base}
        tableLayout="fixed"
        tableClassName="min-w-0 overflow-x-auto"
        hideDateRange
        hideCategories
        isLoading={isLoading}
        fetchResults={fetchResults}
        statusFilters={statusFilters}
        customTopLeft={(table) => (
          <BulkRsvpActions table={table} onComplete={fetchResults} />
        )}
        customTopRight={(table) => (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <SearchBox table={table} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting}>
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  {isExporting
                    ? __("Exporting...", "eventkoi-lite")
                    : __("Export", "eventkoi-lite")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[140px]">
                <DropdownMenuItem onClick={() => exportCsv(table, "going")}>
                  {__("Going", "eventkoi-lite")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCsv(table, "maybe")}>
                  {__("Maybe", "eventkoi-lite")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCsv(table, "not_going")}>
                  {__("Not going", "eventkoi-lite")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCsv(table, "cancelled")}>
                  {__("Cancelled", "eventkoi-lite")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCsv(table, "all")}>
                  {__("All", "eventkoi-lite")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        hideFiltersControl
        hideBottomSelected
        defaultSort={[{ id: "status", desc: false }]}
      />
    </div>
  );
}
