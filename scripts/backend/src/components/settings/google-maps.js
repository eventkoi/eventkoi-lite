import { useState } from "react";

import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { showToast, showToastError } from "@/lib/toast";
import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";
import { Info } from "lucide-react";

export function SettingsGoogleMaps({ settings, setSettings }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const supportDocUrl =
    "https://developers.google.com/maps/documentation/javascript/get-api-key";

  const verifyApiKey = async (apiKey) => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=New+York&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== "OK") {
      throw new Error(data?.error_message ?? "Invalid API Key.");
    }
    return data;
  };

  const connectGMap = async () => {
    try {
      setIsSaving(true);

      await verifyApiKey(settings?.gmap_api_key);

      const response = await apiRequest({
        path: `${eventkoi_params.api}/settings`,
        method: "post",
        data: {
          gmap_api_key: settings?.gmap_api_key,
          gmap_connection_status: true,
        },
        headers: {
          "EVENTKOI-API-KEY": settings?.api_key,
        },
      });

      setSettings(response.settings);
      setIsSaving(false);
      showToast({ ...response, message: "API successfully connected." });
    } catch (error) {
      showToastError(error?.message ?? "Something wrong.");
    } finally {
      setIsSaving(false);
    }
  };

  const disconnectGMap = async () => {
    try {
      setIsLoading(true);

      const response = await apiRequest({
        path: `${eventkoi_params.api}/settings`,
        method: "post",
        data: {
          gmap_api_key: null,
          gmap_connection_status: false,
        },
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
      });

      setSettings(response.settings);
      setIsLoading(false);
      showToast({ ...response, message: "API key removed." });
    } catch (error) {
      showToastError(error?.message ?? "Something wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  let connectionBtnText;
  if (settings?.gmap_connection_status) {
    connectionBtnText = isSaving ? "Testing..." : "Test connection";
  } else {
    connectionBtnText = isSaving ? "Connecting..." : "Connect";
  }

  return (
    <Box>
      <div className="grid w-full">
        <Panel variant="header">
          <Heading level={3}>Google maps</Heading>
        </Panel>
        <Separator />
        <Panel className="gap-6">
          <Alert className="flex items-center gap-x-4 bg-gray-50 border-border">
            <div className="shrink-0">
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            <AlertDescription className="flex-1">
              {__(
                "You need an API key from Google to integrate Google Maps.",
                "eventkoi-lite"
              )}
            </AlertDescription>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              <a
                href={supportDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline"
              >
                {__("View docs", "eventkoi-lite")}
              </a>
            </Button>
          </Alert>

          <div className="flex flex-col items-start gap-1.5">
            <Label htmlFor="ek-gmap-api-key">Google API key</Label>
            <Input
              type="password"
              id={"ek-gmap-api-key"}
              value={settings?.gmap_api_key ?? ""}
              placeholder={"Enter your API key"}
              disabled={settings?.gmap_connection_status}
              className=""
              onChange={(e) => {
                setSettings((prevState) => ({
                  ...prevState,
                  gmap_api_key: e.target.value,
                }));
              }}
            />
          </div>

          <div className="inline-flex gap-2">
            <Button
              variant="default"
              onClick={connectGMap}
              disabled={isSaving || !settings?.gmap_api_key || isLoading}
              className="w-40"
            >
              {connectionBtnText}
            </Button>

            {settings?.gmap_connection_status && (
              <Button
                variant="link"
                onClick={disconnectGMap}
                disabled={isLoading || isSaving}
                className="w-40"
              >
                {isLoading ? "Removing..." : "Remove API Key"}
              </Button>
            )}
          </div>
        </Panel>
      </div>
    </Box>
  );
}
