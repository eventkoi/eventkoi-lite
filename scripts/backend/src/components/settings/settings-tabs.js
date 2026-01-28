import {
  SIDE_TABS_ITEM_CLASS,
  SideTabs,
  getSideTabClasses,
} from "@/components/ui/side-tabs";
import { ProBadge } from "@/components/pro-badge";

const tabs = [
  { key: "default", label: "Default settings", to: "default" },
  {
    key: "fields",
    label: (
      <span className="inline-flex items-center gap-2">
        Custom fields
        <ProBadge />
      </span>
    ),
    to: "fields",
  },
  { key: "emails", label: "Emails", to: "emails" },
  { key: "integrations", label: "API & integrations", to: "integrations" },
];

export function SettingsTabs({ settings, setSettings, location }) {
  const segments = location.pathname?.split("/").filter(Boolean) || [];
  const view = segments[1]; // /settings/<view>/...

  return (
    <div className="grid gap-2 text-sm text-muted-foreground">
      {tabs.map((item) => {
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
