import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

import { Logo } from "@/components/logo";
import { Navbar } from "@/components/nav-bar";

import { tabs } from "@/data/tabs";

export function Nav({ isEvent = false }) {
  const location = useLocation();

  const split = location.pathname.split("events/");
  if (split[1] && (parseInt(split[1]) > 0 || split[1].includes("add"))) {
    isEvent = true;
  }

  if (isEvent) {
    return null;
  }

  return (
    <header
      className={cn(
        "flex text-sm h-12 items-center border-b gap-6 px-8",
        isEvent && "sticky top-8 z-[500] bg-muted h-20 shadow-sm border-none"
      )}
    >
      <Logo />
      <Navbar tabs={tabs["main"]} />
      <div className="flex w-full justify-end">
        <Navbar tabs={tabs["side"]} asDiv />
      </div>
    </header>
  );
}
