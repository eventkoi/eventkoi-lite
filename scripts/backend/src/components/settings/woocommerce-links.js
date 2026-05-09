import { __ } from "@wordpress/i18n";

import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function SettingsWooCommerceLinks() {
  const adminBase =
    window?.eventkoi_params?.wc_settings_url ||
    "/wp-admin/admin.php?page=wc-settings";
  const paymentsUrl = `${adminBase}&tab=checkout`;
  const currencyUrl = `${adminBase}&tab=general`;

  return (
    <Box>
      <div className="grid w-full">
        <Panel variant="header">
          <Heading level={3}>{__("WooCommerce", "eventkoi-lite")}</Heading>
        </Panel>
        <Separator />
        <Panel className="gap-4">
          <p className="text-sm text-muted-foreground">
            {__(
              "Configure payments and currency directly in WooCommerce.",
              "eventkoi"
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <a href={paymentsUrl}>{__("Set up payments", "eventkoi-lite")}</a>
            </Button>
            <Button asChild variant="outline">
              <a href={currencyUrl}>
                {__("Set up currency options", "eventkoi-lite")}
              </a>
            </Button>
          </div>
        </Panel>
      </div>
    </Box>
  );
}
