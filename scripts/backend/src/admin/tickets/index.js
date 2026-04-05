import { Outlet, useMatch } from "react-router-dom";

import { Subnav } from "@/components/sub-nav";
import { Wrapper } from "@/components/wrapper";

export function Tickets() {
  // Match standalone ticket order routes.
  const isStandaloneOrder =
    useMatch("/tickets/orders/:id") ||
    useMatch("/tickets/orders/add") ||
    useMatch("/tickets/orders/:id/refund");

  if (isStandaloneOrder) {
    return <Outlet />;
  }

  return (
    <>
      <Subnav root="tickets" />
      <Wrapper>
        <Outlet />
      </Wrapper>
    </>
  );
}
