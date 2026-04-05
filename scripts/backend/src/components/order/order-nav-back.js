import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import { __ } from "@wordpress/i18n";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";

export function OrderNavBack({ order, setOrder }) {
  const { id } = useParams();
  const location = useLocation();
  const isRefundView = /\/tickets\/orders\/[^/]+\/refund$/.test(location.pathname);
  const heading = isRefundView
    ? __("Refund", "eventkoi")
    : id
      ? __("Edit order", "eventkoi")
      : __("Add order", "eventkoi");

  return (
    <div className="space-y-[1px]">
      {isRefundView && id ? (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Button
            variant="link"
            className="p-0 h-auto text-foreground font-normal"
            asChild
          >
            <Link to={`/tickets/orders/${id}`}>{__("Edit order", "eventkoi")}</Link>
          </Button>
          <ChevronRight className="h-4 w-4" />
          <span>{__("Refund", "eventkoi")}</span>
        </div>
      ) : (
        <Button
          variant="link"
          className="p-0 h-auto text-muted-foreground font-normal"
          asChild
        >
          <Link to="/tickets/orders">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to all orders
          </Link>
        </Button>
      )}
      <Heading level={3} className={isRefundView ? "" : "pl-6"}>
        {heading}
      </Heading>
    </div>
  );
}
