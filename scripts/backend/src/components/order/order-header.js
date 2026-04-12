import { cn } from "@/lib/utils";

import { Logo } from "@/components/logo";
import { OrderNavBack } from "@/components/order/order-nav-back";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { callLocalApi } from "@/lib/remote";
import { BaseToast, showStaticToast, showToastError } from "@/lib/toast";
import { __, sprintf } from "@wordpress/i18n";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function OrderHeader({ loading, setLoading, order, setOrder }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isRefundView = /\/tickets\/orders\/[^/]+\/refund$/.test(location.pathname);
  const paymentIntentId = order?.stripe_payment_intent_id || "";
  const orderStatus = String(order?.status || order?.payment_status || "").toLowerCase();
  const isCompletedOrder =
    orderStatus === "complete" ||
    orderStatus === "completed" ||
    orderStatus === "succeeded";
  const isArchived = order?.is_archived === true;
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);

  const handleResendReceipt = async () => {
    if (!order?.id) {
      showToastError(__("Cannot resend confirmation for this order.", "eventkoi"));
      return;
    }

    const toastId = `resend-receipt-${order.id}`;

    toast.custom(
      () => (
        <div className="flex items-center justify-between gap-4 rounded-md p-3 text-sm font-medium w-[280px] shadow-lg bg-neutral-900 text-white border border-neutral-800">
          <div className="flex min-w-0 items-center gap-2">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin shrink-0" />
            <span className="truncate">
              {__("Sending ticket confirmation...", "eventkoi")}
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
          order_id: order.id,
        },
      });

      setOrder?.((prev) => prev);
      toast.custom(() => (
        <BaseToast
          message={__("Ticket confirmation sent.", "eventkoi")}
          variant="default"
        />
      ), {
        id: toastId,
        duration: 3000,
      });
    } catch (error) {
      toast.custom(() => (
        <BaseToast
          message={__("Failed to resend confirmation.", "eventkoi")}
          variant="default"
        />
      ), {
        id: toastId,
        duration: 4000,
      });
    }
  };

  const handleRefund = () => {
    if (!order?.id) {
      showToastError(__("Cannot open refund flow for this order.", "eventkoi"));
      return;
    }

    navigate(`/tickets/orders/${encodeURIComponent(order.id)}/refund`);
  };

  const handleArchiveToggle = async () => {
    if (!order?.id) {
      return;
    }

    const mode = isArchived ? "unarchive" : "archive";

    try {
      setLoading?.(true);
      await callLocalApi("tickets/orders/archive", {
        method: "POST",
        data: {
          order_id: order.id,
          mode,
        },
      });

      if (mode === "archive") {
        showStaticToast(__("Order archived.", "eventkoi"));
        navigate("/tickets/orders");
      } else {
        setOrder?.({ ...order, is_archived: false });
        showStaticToast(__("Order unarchived.", "eventkoi"));
      }
    } catch (error) {
      showToastError(
        isArchived
          ? __("Failed to unarchive order.", "eventkoi")
          : __("Failed to archive order.", "eventkoi")
      );
    } finally {
      setLoading?.(false);
    }
  };

  return (
    <header
      className={cn(
        "flex text-sm h-12 items-center border-b gap-6 px-8",
        "sticky top-8 z-[100000] bg-muted h-20 shadow-sm border-b"
      )}
    >
      <Logo />
      <OrderNavBack order={order} setOrder={setOrder} />
      <div className="flex w-full justify-end items-center gap-6">
        {!isRefundView ? (
          <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="link"
              className="gap-2 font-normal text-foreground"
              disabled={!order?.id || loading}
            >
              {__("More actions", "eventkoi")}
              <ChevronDown aria-hidden="true" className="h-4 w-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 z-[100001]">
            <DropdownMenuItem onClick={() => setConfirmArchiveOpen(true)}>
              {isArchived ? __("Unarchive", "eventkoi") : __("Archive", "eventkoi")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isCompletedOrder ? (
          <>
            <Button
              variant="link"
              className="font-normal text-foreground"
              onClick={handleResendReceipt}
              disabled={!order?.id || loading}
            >
              {__("Resend receipt", "eventkoi")}
            </Button>

            <Button
              variant="link"
              className="font-normal text-foreground"
              onClick={handleRefund}
              disabled={!paymentIntentId || loading}
            >
              {__("Refund", "eventkoi")}
            </Button>
          </>
        ) : null}
          </>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmArchiveOpen}
        onOpenChange={setConfirmArchiveOpen}
        icon="archive"
        title={
          isArchived
            ? __("Unarchive order?", "eventkoi")
            : __("Archive order?", "eventkoi")
        }
        description={
          isArchived
            ? __("This will restore this order back to your order lists.", "eventkoi")
            : __("This order will be hidden from your order lists. Financial records remain unchanged.", "eventkoi")
        }
        confirmLabel={isArchived ? __("Unarchive", "eventkoi") : __("Archive", "eventkoi")}
        onConfirm={() => {
          setConfirmArchiveOpen(false);
          handleArchiveToggle();
        }}
      />
    </header>
  );
}
