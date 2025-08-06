import { Outlet } from "react-router-dom";

import { Subnav } from "@/components/sub-nav";
import { Wrapper } from "@/components/wrapper";

export function Dashboard() {
  return (
    <>
      <Subnav root="dashboard" />
      <Wrapper>
        <Outlet />
      </Wrapper>
    </>
  );
}
