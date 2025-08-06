import { useOutletContext } from "react-router-dom";

import { SettingsAPI } from "@/components/settings/api";
import { SettingsGoogleMaps } from "@/components/settings/google-maps";

export function SettingsIntegrations() {
  const [settings, setSettings] = useOutletContext();

  return (
    <div className="grid gap-8">
      <SettingsAPI settings={settings} setSettings={setSettings} />
      {/* <SettingsStripe settings={settings} setSettings={setSettings} /> */}
      <SettingsGoogleMaps settings={settings} setSettings={setSettings} />
    </div>
  );
}
