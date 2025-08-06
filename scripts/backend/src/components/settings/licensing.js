import apiRequest from "@wordpress/api-fetch";
import { CheckCircle, RefreshCcw } from "lucide-react";
import { useState } from "react";

import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/SettingsContext";
import { showToast, showToastError } from "@/lib/toast";

const currentVersion = eventkoi_params.version;

export function SettingsLicensing() {
  const { settings, refreshSettings } = useSettings();

  const [licenseKey, setLicenseKey] = useState(settings?.license_key ?? "");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  const saveSetting = async (updated) => {
    try {
      setIsSavingSettings(true);
      const response = await apiRequest({
        path: `${eventkoi_params.api}/settings`,
        method: "POST",
        data: updated,
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
      });

      await refreshSettings();
      showToast({ ...response, message: "Settings updated." });
    } catch (error) {
      showToastError(error?.message ?? "Failed to update setting.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleLicenseAction = async (action) => {
    const setLoading =
      action === "activate" ? setIsActivating : setIsDeactivating;
    setLoading(true);

    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/license`,
        method: "POST",
        data: {
          license_key: licenseKey,
          license_action: action,
        },
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
      });

      await refreshSettings();

      const status = response?.status ?? "unknown";
      const isValid = status === "valid";

      showToast({
        ...response,
        message: isValid
          ? "License successfully activated."
          : "License is invalid.",
      });
    } catch (error) {
      showToastError(error?.message ?? "Failed to update license.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/check-updates`,
        method: "POST",
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
      });

      setUpdateInfo(response);

      if (response?.new_version && response.new_version !== currentVersion) {
        showToast({
          message: `Version ${response.new_version} is available.`,
        });
      } else {
        showToast({ message: "Plugin is up to date." });
      }
    } catch (error) {
      showToastError("Failed to check for updates.");
    } finally {
      setCheckingUpdate(false);
    }
  };

  const isLicenseValid = settings?.license_status === "valid";
  const isLicenseInvalid = settings?.license_status === "invalid";

  return (
    <div className="grid gap-8">
      {/* Auto Update + Check Panel */}
      <Box>
        <div className="grid w-full">
          <Panel variant="header">
            <Heading level={3}>Plugin Updates</Heading>
          </Panel>
          <Separator />
          <Panel className="gap-6">
            <div className="flex gap-6 items-start">
              <Switch
                id="auto-updates-toggle"
                checked={
                  settings?.auto_updates_enabled === true ||
                  settings?.auto_updates_enabled === "1"
                }
                onCheckedChange={(val) =>
                  saveSetting({ auto_updates_enabled: val ? "1" : "0" })
                }
                disabled={isSavingSettings || !isLicenseValid}
              />
              <div className="grid gap-2 pt-0.5">
                <Label htmlFor="auto-updates-toggle">
                  Enable automatic plugin updates
                </Label>
                <p className="text-sm text-muted-foreground max-w-[560px]">
                  When enabled, EventKoi will automatically install new plugin
                  versions when available. A valid license is required.
                </p>
                {!isLicenseValid && (
                  <p className="text-sm text-muted-foreground italic">
                    A valid license is required to enable automatic updates.
                  </p>
                )}
              </div>
            </div>

            {/* Manual Check for Updates Button */}
            <div className="grid gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={handleCheckForUpdates}
                disabled={checkingUpdate || !isLicenseValid}
                className="w-max"
              >
                {checkingUpdate ? "Checking for Updates…" : "Check for Updates"}
              </Button>

              {!checkingUpdate && updateInfo && (
                <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                  {updateInfo?.new_version &&
                  updateInfo.new_version !== currentVersion ? (
                    <>
                      <RefreshCcw className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>
                        <span className="font-medium text-foreground">
                          New version available:
                        </span>{" "}
                        {updateInfo.new_version} (Current: {currentVersion})
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>Plugin is up to date.</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </Box>
    </div>
  );
}
