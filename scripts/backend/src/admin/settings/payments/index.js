import { useOutletContext } from "react-router-dom";

import { SettingsCheckoutMethod } from "@/components/settings/checkout-method";
import { SettingsWooCommerceLinks } from "@/components/settings/woocommerce-links";

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
      {ticketsEnabled && checkoutMethod === "woocommerce" && (
        <SettingsWooCommerceLinks />
      )}
    </div>
  );
}
