import { cn } from "@/lib/utils";

import { Logo } from "@/components/logo";
import { OrderNavBack } from "@/components/order/order-nav-back";

export function OrderHeader({ loading, setLoading, order, setOrder }) {
  return (
    <header
      className={cn(
        "flex text-sm h-12 items-center border-b gap-6 px-8",
        "sticky top-8 z-[500000] bg-muted h-20 shadow-sm border-b"
      )}
    >
      <Logo />
      <OrderNavBack order={order} setOrder={setOrder} />
      <div className="flex w-full justify-end"></div>
    </header>
  );
}
