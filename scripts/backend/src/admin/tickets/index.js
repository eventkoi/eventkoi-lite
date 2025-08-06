import { Outlet, useMatch } from "react-router-dom";

import { Subnav } from "@/components/sub-nav";
import { Wrapper } from "@/components/wrapper";

export function Tickets() {
  // Match /tickets/orders/:id or /tickets/orders/add
  const isStandaloneOrder =
    useMatch("/tickets/orders/:id") || useMatch("/tickets/orders/add");

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
