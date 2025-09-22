import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSettings } from "@/hooks/SettingsContext";
import { showToast, showToastError } from "@/lib/toast";
import apiRequest from "@wordpress/api-fetch";
import { CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";

export function SettingsLicensing() {
  const { settings, refreshSettings } = useSettings();

  const [licenseKey, setLicenseKey] = useState(settings?.license_key ?? "");
  const [isActivating, setIsActivating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

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

  const isLicenseValid = settings?.license_status === "valid";

  return (
    <div className="grid gap-8">
      {/* License Key Panel */}
      <Box>
        <div className="grid w-full">
          <Panel variant="header">
            <Heading level={3}>License Activation</Heading>
          </Panel>
          <Separator />
          <Panel className="gap-6">
            <div className="grid gap-2 max-w-md">
              <Label htmlFor="ek-license-key">License Key</Label>
              <Input
                type="text"
                id="ek-license-key"
                autoFocus={!licenseKey}
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
              />
            </div>

            {settings?.license_status && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Status:</span>
                {isLicenseValid ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    <CheckCircle className="h-3 w-3" />
                    Activated
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    <XCircle className="h-3 w-3" />
                    Not Activated
                  </span>
                )}
                {isLicenseValid && settings.license_expires && (
                  <span className="text-sm text-muted-foreground">
                    —{" "}
                    {settings.license_expires === "lifetime" ? (
                      <>Lifetime license, no renewal required.</>
                    ) : (
                      <>
                        Expires on{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }).format(new Date(settings.license_expires))}
                      </>
                    )}
                  </span>
                )}
              </div>
            )}

            <div className="inline-flex items-center gap-6">
              <Button
                onClick={() => handleLicenseAction("activate")}
                disabled={isActivating || !licenseKey}
              >
                {isActivating ? "Activating…" : "Activate License"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleLicenseAction("deactivate")}
                disabled={isDeactivating || !licenseKey || !isLicenseValid}
              >
                {isDeactivating ? "Deactivating…" : "Deactivate"}
              </Button>
              <a
                href="https://pro.eventkoi.com/account"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline text-foreground hover:text-foreground/90"
              >
                Go to My Account
              </a>
            </div>
          </Panel>
        </div>
      </Box>
    </div>
  );
}
