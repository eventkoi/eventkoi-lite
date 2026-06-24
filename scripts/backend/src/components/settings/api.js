import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { showToast, showToastError } from "@/lib/toast";
import { __ } from "@wordpress/i18n";
import apiRequest from "@wordpress/api-fetch";
import { useState } from "react";

export function SettingsAPI() {
  const [isSaving, setIsSaving] = useState(false);
  const [newKey, setNewKey] = useState(null);

  const refreshKey = async () => {
    try {
      setIsSaving(true);

      const response = await apiRequest({
        path: `${eventkoi_params.api}/settings`,
        method: "POST",
        data: {
          api_key: "refresh",
        },
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
      });

      if (response?.api_key) {
        setNewKey(response.api_key);
        showToast({
          message: __("API key regenerated successfully.", "eventkoi-lite"),
        });
      } else {
        showToastError(__("Unexpected response.", "eventkoi-lite"));
      }
    } catch (error) {
      showToastError(error?.message ?? __("Something went wrong.", "eventkoi-lite"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      <div className="grid w-full">
        <Panel variant="header">
          <Heading level={3}>{__("EventKoi API", "eventkoi-lite")}</Heading>
        </Panel>
        <Separator />
        <Panel className="gap-6">
          <div className="space-y-2">
            <Label>{__("Site instance ID", "eventkoi-lite")}</Label>
            <p className="text-sm text-muted-foreground">
              {__("This uniquely identifies your site for EventKoi services.", "eventkoi-lite")}
            </p>
            <div className="bg-muted/40 border border-muted rounded px-3 py-2 w-fit">
              <code className="bg-transparent text-sm break-all">
                {eventkoi_params.instance_id}
              </code>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{__("Developer API key", "eventkoi-lite")}</Label>
            <p className="text-sm text-muted-foreground">
              {__("This key is kept private and is not displayed. You may regenerate it below if needed. The new key will be shown", "eventkoi-lite")}{" "}
              <strong>{__("only once", "eventkoi-lite")}</strong>
              {__(", so please copy it immediately.", "eventkoi-lite")}
            </p>
          </div>

          {newKey && (
            <div className="bg-muted/40 border border-muted rounded px-3 py-2">
              <code className="bg-transparent text-sm break-all">{newKey}</code>
            </div>
          )}

          <div className="inline-flex">
            <Button
              variant="default"
              onClick={refreshKey}
              disabled={isSaving}
              className="w-48 font-medium"
            >
              {isSaving ? __("Regenerating...", "eventkoi-lite") : __("Regenerate API key", "eventkoi-lite")}
            </Button>
          </div>
        </Panel>
      </div>
    </Box>
  );
}
