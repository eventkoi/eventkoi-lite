import { ProBadge } from "@/components/pro-badge";
import { SideTabs } from "@/components/ui/side-tabs";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { useLocation } from "react-router-dom";

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
  let activeView = segments[3] || "main"; // Fallback to 'main'.

  // Handle redirect: if on /tickets, treat as /manage-tickets for active state
  if (activeView === "tickets") {
    activeView = "manage-tickets";
  }

  const attendanceMode = event?.attendance_mode || 'none';

  const rsvpChildTabs = {
    rsvp: [
      { key: "attendees", label: "Attendees", to: "attendees" },
    ],
  };

  const ticketsChildTabs = {
    tickets: [
      { key: "manage-tickets", label: "Add tickets", to: "manage-tickets" },
      { key: "attendees", label: "Attendees", to: "attendees" },
      { key: "sales-history", label: "Sales history", to: "sales-history" },
    ],
  };

  const tabs = [
    { name: "main", title: "Main" },
    ...(event?.date_type === "recurring"
      ? [{ name: "instances", title: "Recurring instances" }]
      : []),
    ...(attendanceMode === 'rsvp'
      ? [{
          name: "rsvp",
          title: "RSVP",
          children: rsvpChildTabs.rsvp,
        }]
      : attendanceMode === 'tickets'
      ? [{
          name: "manage-tickets",
          title: "Tickets",
          children: ticketsChildTabs.tickets,
        }]
      : [] // No attendance tabs when mode is 'none'
    ),
  ];

  const items = tabs.map( ( tab ) => ({
    key: tab.name,
    to: tab.name,
    label: tab.title,
    disabled: tab.disabled,
    children: tab.children,
  }) );

  return (
    <div className="grid gap-2 text-sm text-muted-foreground">
      {items.map((item) => {
        const isActiveView = activeView === item.key ||
          (item.key === "rsvp" && activeView === "attendees") ||
          (item.key === "manage-tickets" && ["manage-tickets", "attendees", "sales-history"].includes(activeView));

        const showChildren = (item.key === "rsvp" && attendanceMode === 'rsvp' && (activeView === "rsvp" || activeView === "attendees")) ||
          (item.key === "manage-tickets" && attendanceMode === 'tickets' && ["manage-tickets", "attendees", "sales-history"].includes(activeView));

        const childItems = showChildren ? item.children || [] : [];

        return (
          <div key={item.key} className="grid gap-1">
            <SideTabs
              items={[{
                key: item.key,
                to: `./${item.to}`,
                label: item.key === "instances" ? (
                  <span className="inline-flex items-center gap-2">
                    {item.label}
                    <ProBadge className="ml-0" />
                  </span>
                ) : item.label,
                disabled: item.disabled,
              }]}
              isActive={(tabItem) => isActiveView}
            />
            {showChildren && childItems.length > 0 && (
              <SideTabs
                items={childItems.map(child => ({
                  ...child,
                  to: `./${child.to}`
                }))}
                isActive={(childItem) => activeView === childItem.key}
                className="grid gap-1 ml-4 mb-1"
                as="div"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
