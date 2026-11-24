import { SIDE_TABS_ITEM_CLASS, SideTabs } from "@/components/ui/side-tabs";
import { ProBadge } from "@/components/pro-badge";
import { __ } from "@wordpress/i18n";

// Pro features show in Lite as locked previews, marked with the Pro badge.
const proLabel = (text) => (
  <span className="inline-flex items-center gap-2">
    {text}
    <ProBadge />
  </span>
);

const tabs = [
  { key: "default", label: __("Default settings", "eventkoi-lite"), to: "default", cap: "eventkoi_settings_defaults" },
  {
    key: "custom-data",
    label: proLabel(__("Custom data", "eventkoi-lite")),
    to: "fields",
    cap: "eventkoi_settings_fields",
    children: [
      {
        key: "fields",
        label: __("Custom fields", "eventkoi-lite"),
        to: "fields",
        children: [
          { key: "fields-index", label: __("Fields", "eventkoi-lite"), to: "fields" },
          { key: "fields-groups", label: __("Groups", "eventkoi-lite"), to: "fields/groups" },
        ],
      },
      { key: "attendee-fields", label: __("Tickets & RSVP fields", "eventkoi-lite"), to: "fields/attendees" },
      { key: "taxonomies", label: __("Taxonomies", "eventkoi-lite"), to: "taxonomies" },
    ],
  },
  {
    key: "submissions",
    label: proLabel(__("Frontend submissions", "eventkoi-lite")),
    to: "submissions",
    cap: "eventkoi_settings_fields",
  },
  { key: "emails", label: __("Emails", "eventkoi-lite"), to: "emails", cap: "eventkoi_settings_emails" },
  { key: "payments", label: __("Payments", "eventkoi-lite"), to: "payments", cap: "eventkoi_settings_payments" },
  { key: "integrations", label: __("API & integrations", "eventkoi-lite"), to: "integrations", cap: "eventkoi_settings_integrations" },
  { key: "import", label: __("Import", "eventkoi-lite"), to: "import", cap: "eventkoi_settings_import" },
  {
    key: "permissions",
    label: proLabel(__("User permissions", "eventkoi-lite")),
    to: "permissions",
    cap: "eventkoi_settings_defaults",
  },
];

// The first path segment of a tab's target ("fields/groups" lives under "fields").
const viewOf = (item) => String(item.to || "").split("/")[0];

// Every view a group covers, so the group knows when one of its screens is open.
const viewsUnder = (item) => {
  const views = [viewOf(item)];
  (item.children || []).forEach((child) => views.push(...viewsUnder(child)));
  return views;
};

export function SettingsTabs({ settings, setSettings, location }) {
  const ticketsEnabled = !!window?.eventkoi_params?.tickets_feature_enabled;
  const caps = window?.eventkoi_params?.caps || {};
  const visibleTabs = tabs.filter((item) => {
    if (item.key === "payments" && !ticketsEnabled) return false;
    return !item.cap || caps[item.cap];
  });
  const segments = location.pathname?.split("/").filter(Boolean) || [];
  const view = segments[1]; // /settings/<view>/...
  const child = segments[2];

  // A group is current whenever one of its own screens is open. A leaf has to
  // match the whole path, or "Fields" would stay lit while "Groups" is open.
  const isCurrent = (item) => {
    if (item.children) {
      return viewsUnder(item).includes(view);
    }

    const [leafView, leafChild = ""] = String(item.to || "").split("/");

    if (leafView !== view) {
      return !view && "default" === item.key;
    }

    return (child || "") === leafChild;
  };

  const renderItem = (item) => {
    const childItems = isCurrent(item) ? item.children || [] : [];

    return (
      <div key={item.key} className="grid gap-1">
        <SideTabs
          items={[
            {
              key: item.key,
              label: item.label,
              to: item.to,
              itemClassName: SIDE_TABS_ITEM_CLASS,
            },
          ]}
          isActive={() => isCurrent(item)}
          className="grid"
          itemClassName={SIDE_TABS_ITEM_CLASS}
          as="div"
        />
        {childItems.length > 0 && (
          <div className="grid gap-1 ml-4 mb-1">
            {childItems.map((childItem) => renderItem(childItem))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid gap-2 text-sm text-muted-foreground">
      {visibleTabs.map((item) => renderItem(item))}
    </div>
  );
}
