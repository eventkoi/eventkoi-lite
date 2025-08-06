import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { showToast, showToastError } from "@/lib/toast";
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
          message: "API key regenerated successfully.",
        });
      } else {
        showToastError("Unexpected response.");
      }
    } catch (error) {
      showToastError(error?.message ?? "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      <div className="grid w-full">
        <Panel variant="header">
          <Heading level={3}>EventKoi API</Heading>
        </Panel>
        <Separator />
        <Panel className="gap-6">
          <div className="space-y-2">
            <Label>Developer API key</Label>
            <p className="text-sm text-muted-foreground">
              This key is kept private and is not displayed. You may regenerate
              it below if needed. The new key will be shown{" "}
              <strong>only once</strong>, so please copy it immediately.
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
              className="w-48"
            >
              {isSaving ? "Regenerating..." : "Regenerate API key"}
            </Button>
          </div>
        </Panel>
      </div>
    </Box>
  );
}
