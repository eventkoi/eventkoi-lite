import {
  SIDE_TABS_ITEM_CLASS,
  SideTabs,
  getSideTabClasses,
} from "@/components/ui/side-tabs";
import { ProBadge } from "@/components/pro-badge";

const tabs = [
  { key: "default", label: "Default settings", to: "default", cap: "eventkoi_settings_defaults" },
  {
    key: "fields",
    label: (
      <span className="inline-flex items-center gap-2">
        Custom fields
        <ProBadge />
      </span>
    ),
    to: "fields",
    cap: "eventkoi_settings_fields",
  },
  { key: "emails", label: "Emails", to: "emails", cap: "eventkoi_settings_emails" },
  { key: "payments", label: "Payments", to: "payments", cap: "eventkoi_settings_payments" },
  { key: "integrations", label: "API & integrations", to: "integrations", cap: "eventkoi_settings_integrations" },
  { key: "import", label: "Import", to: "import", cap: "eventkoi_settings_import" },
  { key: "permissions", label: "User permissions", to: "permissions", cap: "eventkoi_settings_defaults" },
];

export function SettingsTabs({ settings, setSettings, location }) {
  const ticketsEnabled = !!window?.eventkoi_params?.tickets_feature_enabled;
  const caps = window?.eventkoi_params?.caps || {};
  const visibleTabs = tabs.filter((item) => {
    if (item.key === "payments" && !ticketsEnabled) return false;
    return !item.cap || caps[item.cap];
  });
  const segments = location.pathname?.split("/").filter(Boolean) || [];
  const view = segments[1]; // /settings/<view>/...

  return (
    <div className="grid gap-2 text-sm text-muted-foreground">
      {visibleTabs.map((item) => {
        const isActiveView =
          (view && view === item.to) || (!view && item.key === "default");
        const classes = getSideTabClasses(isActiveView);

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
              isActive={() => isActiveView}
              className="grid"
              itemClassName={SIDE_TABS_ITEM_CLASS}
              as="div"
            />
          </div>
        );
      })}
    </div>
  );
}
