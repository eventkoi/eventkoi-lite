import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

import { ChevronDown } from "lucide-react";

export function Navbar({ tabs, isSub, asDiv }) {
  const location = useLocation();

  var parent = location.pathname?.split("/");

  let page = parent ? parent[1] : null;

  let defaultRoute = "";

  if (parent[2] && isSub) {
    page = parent[2];
  }

  if (isSub) {
    if (!parent[2]) {
      page = defaultRoute;
    }
    if (parseInt(parent[2]) > 0) {
      page = defaultRoute;
    }
    if (["add"].includes(parent[2])) {
      page = defaultRoute;
    }
  }

  const Tag = asDiv ? `div` : `nav`;

  return (
    <Tag className="flex flex-row items-center text-sm gap-10">
      {tabs.map(function (item, i) {
        let current = page == item.href;

        return (
          <Link
            key={`tab-${i}`}
            to={item.href}
            className={cn(
              "flex items-center",
              current ? "text-foreground" : "text-muted-foreground",
              current &&
                "relative after:absolute after:bg-foreground after:w-full after:-bottom-[14px] after:left-[0px] after:h-[2px]",
              "transition-colors hover:text-foreground"
            )}
          >
            {item.title}
            {item.submenu && <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </Link>
        );
      })}
    </Tag>
  );
}
