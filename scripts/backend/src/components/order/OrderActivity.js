// components/order/OrderActivity.jsx
import { Button } from "@/components/ui/button";
import { RefundStatusIcon } from "@/components/icons/refund-status-icon";
import { formatWPtime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { __ } from "@wordpress/i18n";
import { AnimatePresence, motion } from "framer-motion";
import { SquareCheck, SquareDot, SquareX } from "lucide-react";

function getNoteUI(note) {
  const key = note.note_key;
  const val = note.note_value;

  if (key === "admin_note") {
    return (
      <span className="text-foreground">
        <span className="font-medium">{__("Admin note:", "eventkoi")}</span>{" "}
        <span className="font-normal">{val}</span>
      </span>
    );
  }

  if (key === "order_started") {
    return (
      <span className="font-normal">{__("Checkout started", "eventkoi")}</span>
    );
  }

  if (key === "order_awaiting_payment") {
    return (
      <span className="font-normal">
        {__("Awaiting payment", "eventkoi")}
      </span>
    );
  }

  if (key === "order_failed") {
    return (
      <span className="font-normal">
        {__("Payment failed", "eventkoi")}
        {val ? `: ${val}` : ""}
      </span>
    );
  }

  if (key === "order_completed") {
    return (
      <span className="font-normal">{__("Completed", "eventkoi")}</span>
    );
  }

  if (key === "order_refunded") {
    return <span className="font-normal">{__("Refunded", "eventkoi")}</span>;
  }

  if (key === "order_partially_refunded") {
    return (
      <span className="font-normal">
        {__("Partially refunded", "eventkoi")}
      </span>
    );
  }

  if (key === "ticket_confirmation_sent") {
    return (
      <span className="font-medium">
        {__("Ticket confirmation sent.", "eventkoi")}
      </span>
    );
  }

  const statusMap = {
    pending_payment: {
      icon: <SquareDot aria-hidden="true" className="w-4 h-4 text-yellow-600 mr-1 -mt-0.5" />,
      text: __("Pending payment", "eventkoi"),
    },
    complete: {
      icon: <SquareCheck aria-hidden="true" className="w-4 h-4 text-green-600 mr-1 -mt-0.5" />,
      text: __("Completed", "eventkoi"),
    },
    failed: {
      icon: <SquareX aria-hidden="true" className="w-4 h-4 text-red-600 mr-1 -mt-0.5" />,
      text: __("Failed", "eventkoi"),
    },
    refunded: {
      icon: <RefundStatusIcon aria-hidden="true" className="w-4 h-4 text-muted-foreground mr-1 -mt-0.5" />,
      text: __("Refunded", "eventkoi"),
    },
    partially_refunded: {
      icon: <RefundStatusIcon aria-hidden="true" className="w-4 h-4 text-muted-foreground mr-1 -mt-0.5" />,
      text: __("Partially refunded", "eventkoi"),
    },
  };

  const status = statusMap[key];

  if (status) {
    return (
      <span className="flex items-center font-normal">
        <span className="font-medium mr-1">
          {__("Order status:", "eventkoi")}
        </span>
        {status.icon}
        {status.text}
      </span>
    );
  }

  return null;
}

export function OrderActivity({
  order,
  newNote,
  setNewNote,
  handleAddNote,
  submittingNote,
}) {
  return (
    <div className="rounded-xl border bg-white p-6 flex flex-col h-full">
      <h3 className="text-base font-medium mb-4">
        {__("Activity", "eventkoi")}
      </h3>
      <div className="grow overflow-y-auto text-sm pr-1">
        <AnimatePresence initial={false}>
          {[...order.notes].reverse().map((note, index) => {
            const content = getNoteUI(note);
            if (!content) return null;
            const isLatest = index === 0;

            return (
              <motion.div
                key={note.id}
                className="relative pl-6 mb-4"
                initial={{ opacity: 0, translateY: 4 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: -4 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className={cn(
                    "absolute left-0 top-0 w-1 h-1 rounded-full bg-muted-foreground z-10",
                    !isLatest && "opacity-50"
                  )}
                />
                <div
                  className={cn(
                    "absolute left-[1px] top-[8px] bottom-0 w-[2px] bg-muted-foreground/10",
                    !isLatest && "opacity-50"
                  )}
                />
                <div className="flex items-center text-sm text-foreground pt-1">
                  {content}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatWPtime(note.created_at).replace(/\n/g, " ")}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="mt-auto">
        <textarea
          placeholder={__("Add note...", "eventkoi")}
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
          rows={3}
          aria-label={__("Add order note", "eventkoi")}
        />
        <AnimatePresence initial={false}>
          {newNote.trim() && (
            <motion.div
              key="add-note-button"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 0, transition: { duration: 0 } }}
              transition={{ duration: 0.2 }}
              className="mt-2"
            >
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={submittingNote}
                className="font-normal"
              >
                {submittingNote
                  ? __("Saving...", "eventkoi")
                  : __("Add note", "eventkoi")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
