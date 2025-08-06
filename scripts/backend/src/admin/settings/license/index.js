import { SettingsLicensing } from "@/components/settings/licensing";
import { useOutletContext } from "react-router-dom";

export function SettingsLicense() {
  const [settings, setSettings] = useOutletContext();

  return (
    <div className="grid gap-8">
      <SettingsLicensing settings={settings} setSettings={setSettings} />
    </div>
  );
}
