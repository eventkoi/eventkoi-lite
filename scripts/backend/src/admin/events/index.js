import { Outlet, useMatch } from "react-router-dom";

import { Subnav } from "@/components/sub-nav";
import { Wrapper } from "@/components/wrapper";

export function Events() {
  // Match /events/:id/* or /events/add
  const isEditView = useMatch("/events/:id/*") || useMatch("/events/add");

  if (isEditView) {
    return <Outlet />;
  }

  return (
    <>
      <Subnav root="events" />
      <Wrapper>
        <Outlet />
      </Wrapper>
    </>
  );
}
