import { DataTable } from "@/components/data-table";
import { Heading } from "@/components/heading";
import { OrderStatus } from "@/components/order/OrderStatus";
import { SearchBox } from "@/components/search-box";
import { SortButton } from "@/components/sort-button";
import { Stat } from "@/components/stat";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
import { Label } from "@/components/ui/label";
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
import { __, _n, sprintf } from "@wordpress/i18n";
import {
  ArrowDownToLine,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleDotDashed,
  CircleMinus,
  CircleX,
  Check,
  Copy,
  EllipsisVertical,
  Loader2,
  Plus,
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
  } ${row.original.attendee_name || ""} ${row.original.attendee_email || ""} ${row.original.ticket_name || ""} ${
    row.original.order_id || ""
  } ${row.original.checkin_token || ""} ${row.original.checkin_code || ""} ${row.original.master_checkin_code || ""} ${codes}`;
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
              _n("Deleted %d RSVP.", "Deleted %d RSVPs.", ids.length, "eventkoi-lite"),
              ids.length,
            )
          : sprintf(
              /* translators: %d: number of RSVPs */
              _n("Updated %d RSVP.", "Updated %d RSVPs.", ids.length, "eventkoi-lite"),
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

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        icon="delete"
        title={__("Delete RSVPs?", "eventkoi-lite")}
        description={sprintf(
          /* translators: %d: number of selected RSVPs */
          _n("This will permanently delete %d RSVP.", "This will permanently delete %d RSVPs.", selectedCount, "eventkoi-lite"),
          selectedCount,
        )}
        confirmLabel={__("Delete", "eventkoi-lite")}
        onConfirm={() => {
          runAction("delete");
          setConfirmOpen(false);
        }}
      />
    </>
  );
}

function EditGuestDialog({ guest, onSaved, children }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(guest?.name || "");
    setEmail(guest?.email || "");
  }, [open, guest]);

  const handleSave = async () => {
    if (!guest?.id) return;
    setSaving(true);
    try {
      await apiRequest({
        path: `${eventkoi_params.api}/rsvps/bulk`,
        method: "POST",
        data: { ids: [guest.id], action: "guest_update", name: name.trim(), email: email.trim() },
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      showToast({ message: __("Guest updated.", "eventkoi-lite") });
      setOpen(false);
      onSaved?.();
    } catch (error) {
      console.error("Guest update failed:", error);
      showToastError(error?.message || __("Failed to update guest.", "eventkoi-lite"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{__("Edit guest", "eventkoi-lite")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`edit-guest-name-${guest?.id}`}>{__("Name", "eventkoi-lite")}</Label>
            <Input
              id={`edit-guest-name-${guest?.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-guest-email-${guest?.id}`}>{__("Email", "eventkoi-lite")}</Label>
            <Input
              id={`edit-guest-email-${guest?.id}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {__("Cancel", "eventkoi-lite")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? __("Saving...", "eventkoi-lite") : __("Save", "eventkoi-lite")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RowGuestActions({ guest, onComplete }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const removeGuest = async () => {
    try {
      await apiRequest({
        path: `${eventkoi_params.api}/rsvps/bulk`,
        method: "POST",
        data: { ids: [guest.id], action: "guest_remove" },
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      showToast({ message: __("Guest removed.", "eventkoi-lite") });
      onComplete?.();
    } catch (error) {
      console.error("Guest remove failed:", error);
      showToastError(__("Failed to remove guest.", "eventkoi-lite"));
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
            aria-label={__("Guest actions", "eventkoi-lite")}
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          <EditGuestDialog guest={guest} onSaved={onComplete}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              {__("Edit guest", "eventkoi-lite")}
            </DropdownMenuItem>
          </EditGuestDialog>
          <DropdownMenuItem
            onClick={() => setConfirmOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            {__("Remove guest", "eventkoi-lite")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        icon="delete"
        title={__("Remove guest?", "eventkoi-lite")}
        description={__("The guest is taken off this RSVP and the guest count goes down by one.", "eventkoi-lite")}
        confirmLabel={__("Remove", "eventkoi-lite")}
        onConfirm={() => {
          removeGuest();
          setConfirmOpen(false);
        }}
      />
    </>
  );
}

function RowRsvpActions({
  rsvpId,
  checkinToken,
  canCopyToken,
  canResend,
  onComplete,
  partySize = 1,
  partyCheckedIn = 0,
  canCheckInParty = false,
  onPartyCheckin,
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
        <DropdownMenuContent align="end" className="w-[200px]">
          {partySize > 1 ? (
            <DropdownMenuItem
              onClick={() =>
                onPartyCheckin?.(partyCheckedIn >= partySize ? "check_in" : "checked_in")
              }
              disabled={!canCheckInParty}
            >
              {partyCheckedIn >= partySize
                ? __("Undo party check-in", "eventkoi-lite")
                : __("Check in whole party", "eventkoi-lite")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() => runAction("resend_email")}
            disabled={!canResend}
          >
            {__("Resend confirmation", "eventkoi-lite")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        icon="delete"
        title={__("Delete RSVP?", "eventkoi-lite")}
        description={__("This will permanently delete this RSVP.", "eventkoi-lite")}
        confirmLabel={__("Delete", "eventkoi-lite")}
        onConfirm={() => {
          runAction("delete");
          setConfirmOpen(false);
        }}
      />
    </>
  );
}

function AddAttendeeDialog({ event, instanceTs, onAdded }) {
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sendEmail, setSendEmail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !event?.id) return undefined;
    let cancelled = false;
    (async () => {
      setIsLoadingTickets(true);
      try {
        const response = await apiRequest({
          path: `${eventkoi_params.api}/events/${event.id}/tickets`,
          method: "GET",
          headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
        });
        if (cancelled) return;
        const list = Array.isArray(response?.tickets) ? response.tickets : [];
        const active = list.filter(
          (ticket) => (ticket.status || "active") === "active"
        );
        setTickets(active);
        if (active.length === 1) {
          setTicketId(String(active[0].id));
        }
      } catch (error) {
        if (!cancelled) setTickets([]);
      } finally {
        if (!cancelled) setIsLoadingTickets(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, event?.id]);

  const hasEmail = email.trim() !== "";
  const willSendEmail = sendEmail && hasEmail;

  const resetForm = () => {
    setTicketId("");
    setName("");
    setEmail("");
    setQuantity("1");
    setSendEmail(false);
  };

  const handleSubmit = async () => {
    if (!ticketId || !name.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/tickets/orders/add-attendee`,
        method: "POST",
        data: {
          event_id: event.id,
          ticket_id: Number(ticketId),
          name: name.trim(),
          email: email.trim(),
          quantity: Math.max(1, parseInt(quantity, 10) || 1),
          send_email: willSendEmail,
          ...(instanceTs ? { instance_ts: Number(instanceTs) } : {}),
        },
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      if (response?.email_requested && response?.email_sent) {
        showToast({
          message: __(
            "Attendee added and confirmation email sent.",
            "eventkoi-lite"
          ),
        });
      } else if (response?.email_requested) {
        showToast({
          message: __(
            "Attendee added, but the confirmation email could not be sent.",
            "eventkoi-lite"
          ),
        });
      } else {
        showToast({ message: __("Attendee added.", "eventkoi-lite") });
      }
      setOpen(false);
      resetForm();
      onAdded?.();
    } catch (error) {
      console.error("Add attendee failed:", error);
      showToastError(
        error?.message || __("Failed to add attendee.", "eventkoi-lite")
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          {__("Add attendee", "eventkoi-lite")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{__("Add attendee", "eventkoi-lite")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">
              {__("Ticket type", "eventkoi-lite")}
            </span>
            <Select
              value={ticketId}
              onValueChange={setTicketId}
              disabled={isLoadingTickets}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingTickets
                      ? __("Loading...", "eventkoi-lite")
                      : __("Select a ticket", "eventkoi-lite")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {tickets.map((ticket) => (
                  <SelectItem key={ticket.id} value={String(ticket.id)}>
                    {ticket.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">
              {__("Name", "eventkoi-lite")}
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={__("Attendee name", "eventkoi-lite")}
            />
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">
              {__("Email (optional)", "eventkoi-lite")}
            </span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">
              {__("Quantity", "eventkoi-lite")}
            </span>
            <Input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-24"
            />
          </div>
          <label
            className={cn(
              "flex items-start gap-3 text-sm leading-6 text-foreground",
              !hasEmail && "text-muted-foreground"
            )}
          >
            <Checkbox
              className="mt-1"
              checked={willSendEmail}
              disabled={!hasEmail}
              onCheckedChange={(next) => setSendEmail(!!next)}
            />
            <span>
              {__(
                "Send purchase confirmation email with check-in code",
                "eventkoi-lite"
              )}
            </span>
          </label>
          <p className="text-xs text-muted-foreground">
            {__(
              "Added as a free, completed order with its own check-in code.",
              "eventkoi-lite"
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSaving}
            >
              {__("Cancel", "eventkoi-lite")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving || !ticketId || !name.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {__("Adding...", "eventkoi-lite")}
                </>
              ) : (
                __("Add attendee", "eventkoi-lite")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RowTicketActions({ row, orderId, paymentStatus, onArchive, onAttendeeSaved }) {
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
        {row ? (
          <EditAttendeeDialog row={row} onSaved={onAttendeeSaved}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              {__("Edit attendee", "eventkoi-lite")}
            </DropdownMenuItem>
          </EditAttendeeDialog>
        ) : null}
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
          {__("Archive order", "eventkoi-lite")}
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

function EditAttendeeDialog({ row, onSaved, children }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(row?.has_attendee ? row.attendee_name || "" : "");
    setEmail(row?.has_attendee ? row.attendee_email || "" : "");
  }, [open, row]);

  const handleSave = async () => {
    if (!row?.id) return;
    setSaving(true);
    try {
      const response = await callLocalApi("tickets/attendees/update", {
        method: "POST",
        data: {
          id: row.id,
          attendee_name: name.trim(),
          attendee_email: email.trim(),
        },
      });
      onSaved?.(response?.attendee);
      showToast({ message: __("Attendee updated.", "eventkoi-lite") });
      setOpen(false);
    } catch (error) {
      console.error("Attendee update failed:", error);
      showToastError(
        error?.message || __("Failed to update attendee.", "eventkoi-lite"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{__("Edit attendee", "eventkoi-lite")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            {sprintf(
              /* translators: 1: ticket name, 2: buyer name */
              __("%1$s, ordered by %2$s. Leave both fields empty to fall back to the buyer.", "eventkoi-lite"),
              row?.ticket_name || __("Ticket", "eventkoi-lite"),
              row?.customer_name || "",
            )}
          </p>
          <div className="grid gap-2">
            <Label htmlFor={`edit-attendee-name-${row?.id}`}>{__("Name", "eventkoi-lite")}</Label>
            <Input
              id={`edit-attendee-name-${row?.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={row?.customer_name || ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-attendee-email-${row?.id}`}>{__("Email", "eventkoi-lite")}</Label>
            <Input
              id={`edit-attendee-email-${row?.id}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={row?.customer_email || ""}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {__("Cancel", "eventkoi-lite")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? __("Saving...", "eventkoi-lite") : __("Save", "eventkoi-lite")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
            path: `${eventkoi_params.api}/tickets/attendees?${params.toString()}`,
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
    if (!event?.id) {
      showToastError(__("Missing event data.", "eventkoi-lite"));
      return;
    }

    // Built server-side so custom checkout fields registered through the
    // eventkoi_checkout_fields filter come through as extra columns.
    const cols = table.getAllColumns();
    const defaultCol = cols[1]?.id;
    const searchValue = defaultCol
      ? table.getColumn(defaultCol)?.getFilterValue() ?? ""
      : "";

    const params = new URLSearchParams({
      event_id: String(event.id),
      instance_ts: String(instanceTs || 0),
    });

    if (searchValue) {
      params.set("search", String(searchValue));
    }

    setIsExporting(true);
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/tickets/attendees/export?${params.toString()}`,
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
        match?.[1] || `eventkoi-ticket-attendees-${event.id}.csv`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
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

  const updatePartyCheckin = useCallback(
    async (rsvpId, status) => {
      if (!rsvpId || !status) return;
      try {
        await apiRequest({
          path: `${eventkoi_params.api}/rsvps/bulk`,
          method: "POST",
          data: { ids: [rsvpId], action: "checkin_party", status },
          headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
        });
        showToast({ message: __("Check-in updated.", "eventkoi-lite") });
        fetchResults();
      } catch (error) {
        console.error("Party check-in error:", error);
        showToastError(__("Failed to update check-in.", "eventkoi-lite"));
      }
    },
    [fetchResults],
  );

  const updateGuestCheckin = useCallback(
    async (guestId, status) => {
      if (!guestId || !status) return;
      try {
        await apiRequest({
          path: `${eventkoi_params.api}/rsvps/bulk`,
          method: "POST",
          data: { ids: [guestId], action: "checkin", status },
          headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
        });
        showToast({ message: __("Check-in updated.", "eventkoi-lite") });
        fetchResults();
      } catch (error) {
        console.error("Guest check-in error:", error);
        showToastError(__("Failed to update check-in.", "eventkoi-lite"));
      }
    },
    [fetchResults],
  );

  const replaceAttendeeRow = useCallback((attendee) => {
    if (!attendee?.id) return;
    setData((prev) =>
      prev.map((row) => (row.id === attendee.id ? { ...row, ...attendee } : row)),
    );
  }, []);

  const updateTicketCheckin = useCallback(
    async (rowId, action) => {
      if (!rowId || !action) return;

      try {
        const response = await callLocalApi("tickets/attendees/checkin", {
          method: "POST",
          data: { id: rowId, action },
        });
        replaceAttendeeRow(response?.attendee);
        showToast({ message: __("Check-in updated.", "eventkoi-lite") });
      } catch (error) {
        console.error("Ticket check-in update error:", error);
        showToastError(
          error?.message || __("Failed to update check-in.", "eventkoi-lite"),
        );
      }
    },
    [replaceAttendeeRow],
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
              aria-label={__("Select all", "eventkoi-lite")}
            />
          </div>
        ),
        cell: ({ row }) =>
          row.original.is_guest ? null : (
            <div className="flex items-center justify-center min-h-6">
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label={__("Select row", "eventkoi-lite")}
              />
            </div>
          ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <SortButton title={__("Name", "eventkoi-lite")} column={column} />,
        cell: ({ row }) => {
          const isGuest = !!row.original.is_guest;
          const guestCount = Array.isArray(row.original.guest_rows)
            ? row.original.guest_rows.length
            : 0;
          return (
            <div className={cn("flex min-w-0 items-start gap-2", isGuest && "pl-7")}>
              {!isGuest && guestCount > 0 ? (
                <button
                  type="button"
                  onClick={row.getToggleExpandedHandler()}
                  aria-label={row.getIsExpanded() ? __("Hide guests", "eventkoi-lite") : __("Show guests", "eventkoi-lite")}
                  className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {row.getIsExpanded() ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : null}
              <div className="min-w-0">
                <div className="text-foreground truncate">
                  {row.original.name || (isGuest ? __("Guest", "eventkoi-lite") : "—")}
                </div>
                <div
                  className="text-xs text-muted-foreground truncate"
                  title={row.original.email || ""}
                >
                  {row.original.email || (isGuest ? __("No email", "eventkoi-lite") : "—")}
                </div>
                {!isGuest && guestCount > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    {sprintf(
                      /* translators: %d: number of guests */
                      _n("%d guest", "%d guests", guestCount, "eventkoi-lite"),
                      guestCount,
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          );
        },
        filterFn: multiColumnSearch,
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "checked_in",
        header: () => <div className="text-sm font-normal">{__("Checked-in", "eventkoi-lite")}</div>,
        cell: ({ row }) => {
          if (row.original.is_guest) {
            const guestStatus = (row.original.checkin_status || "").toLowerCase();
            const guestIn = guestStatus === "checked_in";
            const canToggle = (row.original.status || "").toLowerCase() === "going";
            return (
              <Button
                variant="outline"
                className={cn(
                  "h-8 px-3 font-medium",
                  guestIn && "bg-[#0D5342] text-white hover:bg-[#0D5342]/90 hover:text-white border-[#0D5342]",
                )}
                onClick={() => updateGuestCheckin(row.original.id, guestIn ? "check_in" : "checked_in")}
                disabled={!canToggle}
              >
                {guestIn ? __("Checked in", "eventkoi-lite") : __("Check in", "eventkoi-lite")}
              </Button>
            );
          }
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
          const partySize = 1 + (Array.isArray(row.original.guest_rows) ? row.original.guest_rows.length : 0);
          const partyCheckedIn = Number(row.original.checked_in_count || 0);
          const hasParty = partySize > 1;
          // With guests, the main button checks the whole party in or out;
          // the guest rows below handle one person at a time.
          const onMainClick = () =>
            hasParty
              ? updatePartyCheckin(row.original.id, nextStatus === "checked_in" ? "checked_in" : "check_in")
              : updateRowCheckin(row.original.id, nextStatus);

          return (
            <div className="flex items-center gap-2">
              {hasParty ? (
                <span
                  className="inline-flex h-9 min-w-[3.25rem] items-center justify-center rounded-md border border-input px-2 text-sm tabular-nums text-muted-foreground"
                  title={__("Checked in / party size", "eventkoi-lite")}
                >
                  {partyCheckedIn}/{partySize}
                </span>
              ) : (
                <CheckinCountInput
                  row={row.original}
                  disabled={controlsDisabled}
                  onSave={(count) => updateRowCheckinCount(row.original.id, count)}
                />
              )}
              <div className="flex items-center gap-[1px]">
              <Button
                variant="outline"
                className={cn(
                  "h-9 px-3 rounded-r-none font-medium",
                  checkedInClass,
                  deniedClass,
                )}
                onClick={onMainClick}
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
                      hasParty
                        ? updatePartyCheckin(row.original.id, "check_in")
                        : updateRowCheckin(row.original.id, "check_in")
                    }
                    disabled={status === "check_in"}
                  >
                    {__("Check in", "eventkoi-lite")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      hasParty
                        ? updatePartyCheckin(row.original.id, "checked_in")
                        : updateRowCheckin(row.original.id, "checked_in")
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
          <SortButton title={__("Check-in code", "eventkoi-lite")} column={column} />
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
        header: ({ column }) => <SortButton title={__("Status", "eventkoi-lite")} column={column} />,
        cell: ({ row }) => {
          const status = (row.original.status || "").toLowerCase();
          if (row.original.is_guest) {
            return (
              <div className="text-sm text-muted-foreground">
                {sprintf(
                  /* translators: %s: name of the person who RSVPd */
                  __("Guest of %s", "eventkoi-lite"),
                  row.original.guest_of || "",
                )}
              </div>
            );
          }
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
        header: ({ column }) => <SortButton title={__("Guests", "eventkoi-lite")} column={column} />,
        cell: ({ row }) => (
          <div className="text-foreground">
            {row.original.is_guest ? "" : row.original.guests ?? 0}
          </div>
        ),
        sortingFn: "alphanumeric",
      },
      {
        id: "rsvp_date",
        accessorFn: (row) => row.created,
        header: ({ column }) => (
          <SortButton title={__("RSVP date", "eventkoi-lite")} column={column} />
        ),
        cell: ({ row }) => {
          if (row.original.is_guest) return null;
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
        cell: ({ row }) =>
          row.original.is_guest ? (
            <div className="flex justify-end">
              <RowGuestActions guest={row.original} onComplete={fetchResults} />
            </div>
          ) : (
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
                partySize={1 + (Array.isArray(row.original.guest_rows) ? row.original.guest_rows.length : 0)}
                partyCheckedIn={Number(row.original.checked_in_count || 0)}
                canCheckInParty={(row.original.status || "").toLowerCase() === "going"}
                onPartyCheckin={(status) => updatePartyCheckin(row.original.id, status)}
                onComplete={fetchResults}
              />
            </div>
          ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [fetchResults, updateRowCheckin, updateRowCheckinCount, updateRowStatus, updatePartyCheckin, updateGuestCheckin],
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
                aria-label={__("Select all", "eventkoi-lite")}
              />
            </div>
          ),
          cell: ({ row }) => (
            <div className="flex items-center justify-center min-h-6">
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label={__("Select row", "eventkoi-lite")}
              />
            </div>
          ),
          enableSorting: false,
          enableHiding: false,
        },
        {
          accessorKey: "attendee_name",
          header: ({ column }) => <SortButton title={__("Name", "eventkoi-lite")} column={column} />,
          cell: ({ row }) => {
            const attendee = row.original;
            const showBuyer =
              attendee.has_attendee &&
              attendee.customer_name &&
              attendee.customer_name !== attendee.attendee_name;
            return (
              <div className="min-w-0">
                <div className="text-foreground truncate">
                  {attendee.attendee_name || attendee.customer_name || ""}
                </div>
                <div
                  className="text-xs text-muted-foreground truncate"
                  title={attendee.attendee_email || ""}
                >
                  {attendee.attendee_email || ""}
                </div>
                {showBuyer ? (
                  <div className="text-xs text-muted-foreground truncate">
                    {sprintf(
                      /* translators: %s: buyer name */
                      __("Ordered by %s", "eventkoi-lite"),
                      attendee.customer_name,
                    )}
                  </div>
                ) : null}
              </div>
            );
          },
          filterFn: multiColumnSearch,
          sortingFn: "alphanumeric",
        },
        {
          accessorKey: "ticket_name",
          header: ({ column }) => <SortButton title={__("Ticket", "eventkoi-lite")} column={column} />,
          cell: ({ row }) => (
            <div className="text-foreground truncate">{row.original.ticket_name || ""}</div>
          ),
          sortingFn: "alphanumeric",
        },
        {
          accessorKey: "checked_in",
          header: () => <div className="text-sm font-normal">{__("Checked in", "eventkoi-lite")}</div>,
          cell: ({ row }) => {
            const isCheckedIn = Number(row.original.checked_in || 0) > 0;
            const status = isCheckedIn ? "checked_in" : "check_in";
            const buttonLabel = isCheckedIn
              ? __("Checked in", "eventkoi-lite")
              : __("Check in", "eventkoi-lite");
            const nextAction = isCheckedIn ? "check_in" : "checked_in";
            const checkedInClass = isCheckedIn
              ? "bg-[#0D5342] text-white hover:bg-[#0D5342]/90 hover:text-white border-[#0D5342]"
              : "";
            const rowId = row.original.id;
            const controlsDisabled =
              !row.original.checkin_eligible || !!row.original.is_archived;

            return (
              <div className="flex items-center gap-[1px]">
                <Button
                  variant="outline"
                  className={cn("h-9 px-3 rounded-r-none font-medium", checkedInClass)}
                  onClick={() => updateTicketCheckin(rowId, nextAction)}
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
                      onClick={() => updateTicketCheckin(rowId, "check_in")}
                      disabled={status === "check_in"}
                    >
                      {__("Check in", "eventkoi-lite")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => updateTicketCheckin(rowId, "checked_in")}
                      disabled={status === "checked_in"}
                    >
                      {__("Checked in", "eventkoi-lite")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          },
          sortingFn: "alphanumeric",
        },
        {
          accessorKey: "checkin_code",
          header: () => <div className="text-sm font-normal">{__("Check-in code", "eventkoi-lite")}</div>,
          cell: ({ row }) => {
            const code = row.original.checkin_code || "";
            const masterCode = row.original.master_checkin_code || "";
            if (!code) return <div className="text-muted-foreground">—</div>;
            return (
              <div className="min-w-0">
                <span className="font-mono text-xs text-foreground">{code}</span>
                {masterCode && masterCode !== code ? (
                  <div
                    className="text-xs text-muted-foreground truncate"
                    title={__("Group check-in code for the whole order", "eventkoi-lite")}
                  >
                    {sprintf(
                      /* translators: %s: group check-in code */
                      __("Group %s", "eventkoi-lite"),
                      masterCode,
                    )}
                  </div>
                ) : null}
              </div>
            );
          },
          sortingFn: "alphanumeric",
        },
        {
          accessorKey: "order_id",
          header: ({ column }) => <SortButton title={__("Order ID", "eventkoi-lite")} column={column} />,
          cell: ({ row }) => {
            const orderId = row.original.order_id || "";
            if (!orderId) return <div className="text-foreground" />;

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

            const displayId = row.original.display_id;
            const label = displayId ? `#${displayId}` : shortOrderId(orderId);
            const routeId = displayId ? String(displayId) : orderId;

            return (
              <div className="text-foreground">
                <Link
                  to={`/tickets/orders/${encodeURIComponent(routeId)}`}
                  className="font-medium hover:underline hover:decoration-dotted underline-offset-4"
                  title={label}
                >
                  {label}
                </Link>
              </div>
            );
          },
          filterFn: multiColumnSearch,
          sortingFn: "alphanumeric",
        },
        {
          accessorKey: "payment_status",
          header: ({ column }) => <SortButton title={__("Order Status", "eventkoi-lite")} column={column} />,
          cell: ({ row }) => <OrderStatus order={row.original} />,
          sortingFn: "alphanumeric",
        },
        {
          id: "order_date",
          accessorFn: (row) => row.created_at,
          header: ({ column }) => (
            <SortButton title={__("Order date", "eventkoi-lite")} column={column} />
          ),
          cell: ({ row }) => {
            // created_at may arrive as either UTC ISO or a zone-less MySQL
            // datetime; normalize to UTC before formatting. Garbage input
            // renders an empty cell instead of crashing the table.
            const raw = String(row.original.created_at || "");
            let created = "";
            if (raw) {
              const iso = /Z$|[+-]\d{2}:?\d{2}$/.test(raw)
                ? raw
                : raw.replace(" ", "T") + "Z";
              const d = new Date(iso);
              if (Number.isFinite(d.getTime())) {
                created = d.toISOString();
              }
            }
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
                row={row.original}
                orderId={row.original.order_id || ""}
                paymentStatus={row.original.payment_status || ""}
                onArchive={fetchResults}
                onAttendeeSaved={replaceAttendeeRow}
              />
            </div>
          ),
          enableSorting: false,
          enableHiding: false,
        },
      ];
    },
    [isTicketsAttendees, fetchResults, updateTicketCheckin, replaceAttendeeRow]
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
                    (sum, row) => sum + (Number(row.checked_in) > 0 ? 1 : 0),
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
              <AddAttendeeDialog
                event={event}
                instanceTs={instanceTs || null}
                onAdded={fetchResults}
              />
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
            <Heading>{__("Attendees", "eventkoi-lite")}</Heading>
            {event?.date_type === "recurring" && (
              <Select
                value={instanceTs || ""}
                onValueChange={(value) => setInstanceTs(value)}
              >
                <SelectTrigger className="w-full sm:w-[320px]">
                  <SelectValue placeholder={__("Select instance", "eventkoi-lite")} />
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
        getSubRows={(row) =>
          row.is_guest
            ? undefined
            : (row.guest_rows || []).map((guest) => ({
                ...guest,
                is_guest: true,
                guest_of: row.name || "",
                guests: 0,
                created: row.created,
              }))
        }
        rowClassName={(row) => (row.original.is_guest ? "bg-muted/30" : "")}
        enableRowSelection={(row) => !row.original.is_guest}
        empty={__("No RSVPs are found.", "eventkoi-lite")}
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
