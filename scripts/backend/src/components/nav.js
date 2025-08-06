import { cn } from "@/lib/utils";
import { useState } from "react";
import { useLocation } from "react-router-dom";

import { Logo } from "@/components/logo";
import { Navbar } from "@/components/nav-bar";

import { tabs } from "@/data/tabs";
import { BookOpen, Inbox, Menu, X } from "lucide-react";

export function Nav({ isEvent = false, isCalendar = false }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const event = location.pathname.split("events/");
  if (event[1] && (parseInt(event[1]) > 0 || event[1].includes("add"))) {
    isEvent = true;
  }

  if (isEvent) return null;

  const calendar = location.pathname.split("calendars/");
  if (
    calendar[1] &&
    (parseInt(calendar[1]) > 0 || calendar[1].includes("add"))
  ) {
    isCalendar = true;
  }

  if (isCalendar) return null;

  return (
    <header
      className={cn(
        "relative bg-white shadow-sm md:shadow-none md:bg-transparent border-b px-4 py-4 md:py-2 text-sm",
        isEvent && "sticky top-8 z-[500] bg-muted h-20 shadow-sm border-none"
      )}
    >
      {/* Top row */}
      <div className="flex items-center justify-between md:justify-start gap-6">
        <Logo />
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-muted-foreground focus:outline-none"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Desktop Nav */}
        <div className="hidden md:flex">
          <Navbar tabs={tabs["main"]} />
        </div>

        {/* Desktop right links */}
        <div className="hidden md:flex ml-auto items-center gap-2">
          <a
            href="https://eventkoi.com/docs/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Read docs</span>
          </a>
          <a
            href="https://eventkoi.com/docs/request-support/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Inbox className="w-4 h-4" />
            <span>Request support</span>
          </a>
        </div>
      </div>

      {/* Mobile menu content */}
      {open && (
        <div className="md:hidden mt-4 space-y-4">
          <Navbar tabs={tabs["main"]} />
          <div className="flex flex-col gap-2 pt-4 border-t">
            <a
              href="https://eventkoi.com/docs/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-0 md:px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Read docs</span>
            </a>
            <a
              href="https://eventkoi.com/docs/request-support/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-0 md:px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Inbox className="w-4 h-4" />
              <span>Request support</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
