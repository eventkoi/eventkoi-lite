import { useOutletContext } from "react-router-dom";

import { SettingsCheckoutMethod } from "@/components/settings/checkout-method";

export function SettingsPayments() {
  const [settings, setSettings] = useOutletContext();
  const ticketsEnabled = !!window?.eventkoi_params?.tickets_feature_enabled;

  return (
    <div className="grid gap-8">
      {ticketsEnabled && (
        <SettingsCheckoutMethod
          settings={settings}
          setSettings={setSettings}
        />
      )}
    </div>
  );
}
