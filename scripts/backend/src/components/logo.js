import { cn } from "@/lib/utils";

import { LogoIcon } from "@/components/logo-icon";
import { Link } from "react-router-dom";

export function Logo({ invisible = false }) {
  return (
    <div className="flex items-center">
      <Link
        to="dashboard"
        className={cn(
          "flex items-center gap-2 font-semibold text-sm hover:text-foreground",
          invisible && "opacity-0 pointer-events-none"
        )}
      >
        <LogoIcon />
        <span className="sr-only">EventKoi</span>
      </Link>
    </div>
  );
}
