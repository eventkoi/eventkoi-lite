import { useLocation } from "react-router-dom";

import { Logo } from "@/components/logo";
import { Navbar } from "@/components/nav-bar";

import { tabs } from "@/data/tabs";

export function Subnav({ root }) {
  const location = useLocation();
  const ticketsEnabled = !!window?.eventkoi_params?.tickets_feature_enabled;

  if (!tabs[root] || tabs[root].length === 0) {
    return null;
  }

  if (root === "tickets" && !ticketsEnabled) {
    return null;
  }

  const split = location.pathname.split("events/");
  if (split[1] && (parseInt(split[1]) > 0 || split[1].includes("add"))) {
    return null;
  }

  return (
    <div className="flex text-sm h-12 items-center border-b gap-6 px-4">
      <Logo invisible />
      <Navbar tabs={tabs[root]} isSub />
    </div>
  );
}
