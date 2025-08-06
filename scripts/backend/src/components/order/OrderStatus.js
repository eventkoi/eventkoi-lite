import { Badge } from "@/components/ui/badge";
import { cn, getStatusLabel } from "@/lib/utils";
import { SquareCheck, SquareDot } from "lucide-react";

export function OrderStatus({ order }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal border py-1 px-2 inline-flex items-center",
        order.status === "pending" &&
          "text-yellow-800 border-yellow-400/20 bg-[#FDF8E8]",
        order.status === "complete" &&
          "text-green-800 border-green-400/20 bg-[#E8FDF0]"
      )}
    >
      {order.status === "pending" && (
        <SquareDot className="w-3.5 h-3.5 mr-1.5 text-yellow-600" />
      )}
      {order.status === "complete" && (
        <SquareCheck className="w-3.5 h-3.5 mr-1.5 text-green-600" />
      )}
      {getStatusLabel(order?.status)}
    </Badge>
  );
}
