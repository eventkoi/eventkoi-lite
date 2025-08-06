import { Link } from "react-router-dom";

const tabs = [
  { name: "default", title: "Default settings" },
  { name: "integrations", title: "API & integrations" },
];

export function SettingsTabs({ settings, setSettings, location }) {
  var parent = location.pathname?.split("/");
  var view = parent[2];

  const active =
    "font-medium px-3 py-3 rounded-lg text-foreground bg-foreground/5";

  return (
    <nav className="grid gap-1 text-sm text-muted-foreground">
      {tabs.map(function (item, i) {
        let activeTabClass = "font-medium px-3 py-3 rounded-lg";
        if (parent && view && view === item.name) {
          activeTabClass = active;
        }
        if (parent && !view && item.name === "default") {
          activeTabClass = active;
        }
        return (
          <Link
            key={`setting-tab-${i}`}
            to={item.name}
            className={activeTabClass}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
