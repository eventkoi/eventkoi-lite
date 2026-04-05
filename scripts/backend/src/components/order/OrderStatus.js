import { Badge } from "@/components/ui/badge";
import { RefundStatusIcon } from "@/components/icons/refund-status-icon";
import { cn, getStatusLabel } from "@/lib/utils";
import { SquareCheck, SquareDot, SquareX } from "lucide-react";

export function OrderStatus({ order }) {
  const status = order?.is_archived
    ? "archived"
    : String(order?.payment_status || order?.status || "").toLowerCase();

  const isPending = status === "pending" || status === "pending_payment";
  const isComplete =
    status === "complete" || status === "completed" || status === "succeeded";
  const isArchived = status === "archived";
  const isRefunded =
    status === "refunded" || status === "partially_refunded";
  const isErrorLike =
    status === "failed" ||
    status === "cancelled";

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal border py-1 px-2 inline-flex items-center whitespace-nowrap",
        isPending &&
          "text-yellow-800 border-yellow-400/20 bg-[#FDF8E8]",
        isComplete &&
          "text-green-800 border-green-400/20 bg-[#E8FDF0]",
        isArchived &&
          "text-muted-foreground border-border bg-muted/40",
        isRefunded &&
          "text-foreground border-transparent bg-foreground/[0.08]",
        isErrorLike &&
          "text-[#CC3325] border-[#CC3325]/20 bg-[#FDF2F1]"
      )}
    >
      {isPending && (
        <SquareDot className="w-3.5 h-3.5 mr-1.5 shrink-0 text-yellow-600" />
      )}
      {isComplete && (
        <SquareCheck className="w-3.5 h-3.5 mr-1.5 shrink-0 text-green-600" />
      )}
      {isRefunded && (
        <RefundStatusIcon className="w-3.5 h-3.5 mr-1.5 shrink-0 text-muted-foreground" />
      )}
      {isErrorLike && (
        <SquareX className="w-3.5 h-3.5 mr-1.5 shrink-0 text-[#CC3325]" />
      )}
      {isArchived && (
        <SquareDot className="w-3.5 h-3.5 mr-1.5 shrink-0 text-muted-foreground" />
      )}
      {getStatusLabel(status)}
    </Badge>
  );
}
