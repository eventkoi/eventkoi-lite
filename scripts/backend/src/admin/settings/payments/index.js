import { useOutletContext } from "react-router-dom";

import { SettingsCheckoutMethod } from "@/components/settings/checkout-method";
import { SettingsCurrency } from "@/components/settings/currency";
import { SettingsStripe } from "@/components/settings/stripe";

export function SettingsPayments() {
  const [settings, setSettings] = useOutletContext();
  const ticketsEnabled = !!window?.eventkoi_params?.tickets_feature_enabled;
  const checkoutMethod = settings?.ticket_checkout_method || "stripe";

  return (
    <div className="grid gap-8">
      {ticketsEnabled && (
        <SettingsCheckoutMethod
          settings={settings}
          setSettings={setSettings}
        />
      )}
      {checkoutMethod !== "woocommerce" && <SettingsCurrency />}
      {ticketsEnabled && checkoutMethod === "stripe" && (
        <SettingsStripe settings={settings} setSettings={setSettings} />
      )}
    </div>
  );
}
