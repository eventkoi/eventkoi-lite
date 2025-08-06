import { Wrapper } from "@/components/wrapper";
import { Outlet, useMatch } from "react-router-dom";

export function Calendars() {
  // Match /calendars/:id or /calendars/add
  const isEditView = useMatch("/calendars/:id/*") || useMatch("/calendars/add");

  if (isEditView) {
    return <Outlet />;
  }

  return (
    <Wrapper>
      <Outlet />
    </Wrapper>
  );
}
