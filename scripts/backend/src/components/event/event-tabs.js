import { ProBadge } from "@/components/pro-badge";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { Link, useLocation } from "react-router-dom";

/**
 * EventTabs navigation component.
 *
 * Uses context to determine if the event is recurring.
 *
 * @return {JSX.Element|null} Navigation tabs.
 */
export function EventTabs() {
  const { event } = useEventEditContext();
  const location = useLocation();

  const isEditingInstance = location.pathname.includes("/instances/edit/");
  if (isEditingInstance) {
    return null;
  }

  const segments = location.pathname.split("/");
  const activeView = segments[3] || "main"; // Fallback to 'main'.

  const tabs = [
    { name: "main", title: "Main" },
    ...(event?.date_type === "recurring"
      ? [{ name: "instances", title: "Recurring instances" }]
      : []),
  ];

  return (
    <nav className="grid gap-1 text-sm text-muted-foreground">
      {tabs.map((tab) => {
        const isActive = activeView === tab.name;
        return (
          <Link
            key={tab.name}
            to={tab.name}
            className={`font-medium px-3 py-3 rounded-lg ${
              isActive ? "text-foreground bg-foreground/5" : ""
            }`}
          >
            {tab.title}
            {tab.name === "instances" && <ProBadge className="ml-0" />}
          </Link>
        );
      })}
    </nav>
  );
}
