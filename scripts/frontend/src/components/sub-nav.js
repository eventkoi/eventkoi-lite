import { useLocation } from "react-router-dom";

import { Logo } from "@/components/logo";
import { Navbar } from "@/components/nav-bar";

import { tabs } from "@/data/tabs";

export function Subnav({ root }) {
  const location = useLocation();

  if (!tabs[root]) {
    return null;
  }

  const split = location.pathname.split("events/");
  if (split[1] && (parseInt(split[1]) > 0 || split[1].includes("add"))) {
    return null;
  }

  return (
    <div className="flex text-sm h-12 items-center border-b gap-6 px-8">
      <Logo invisible />
      <Navbar tabs={tabs[root]} isSub />
    </div>
  );
}
