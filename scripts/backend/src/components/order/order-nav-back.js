import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

export function OrderNavBack({ order, setOrder }) {
  const { id } = useParams();

  const heading = id ? "Edit order" : "Add order";

  return (
    <div className="space-y-[1px]">
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
      <Heading level={3} className="pl-6">
        {heading}
      </Heading>
    </div>
  );
}
