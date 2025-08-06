import apiRequest from "@wordpress/api-fetch";
import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { SettingsTabs } from "@/components/settings/settings-tabs";
import { Subnav } from "@/components/sub-nav";
import { Wrapper } from "@/components/wrapper";

export function Settings() {
  const location = useLocation();
  const [settings, setSettings] = useState(null);

  const getSettings = async () => {
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/settings`,
        method: "get",
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
      });
      setSettings(response);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  useEffect(() => {
    getSettings();
  }, []);

  const contextValue = useMemo(() => [settings, setSettings], [settings]);

  return (
    <>
      <Subnav root="settings" />
      <Wrapper className="max-w-[1180px]">
        <div className="w-full mx-auto items-start gap-6 md:flex-1 md:gap-[80px] grid grid-cols-1 md:grid-cols-[200px_1fr]">
          <SettingsTabs
            settings={settings}
            setSettings={setSettings}
            location={location}
          />
          <div className="grid">
            {settings ? (
              <Outlet context={contextValue} />
            ) : (
              <div className="p-8 text-muted-foreground">Loading settings…</div>
            )}
          </div>
        </div>
        <div className="h-10" />
      </Wrapper>
    </>
  );
}
