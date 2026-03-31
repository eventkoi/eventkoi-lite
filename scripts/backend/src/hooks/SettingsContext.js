import apiRequest from "@wordpress/api-fetch";
import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

const inlinedSettings = window.eventkoi_params?.settings || null;
let latestSettings = inlinedSettings; // global copy of settings

const SettingsContext = createContext({
  settings: inlinedSettings,
  setSettings: () => {},
  refreshSettings: () => Promise.resolve(null),
});

export const useSettings = () => useContext(SettingsContext);

// Non-hook accessor for utilities (usable outside React)
export function getSettings() {
  return latestSettings;
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(inlinedSettings);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/settings`,
        method: "get",
        headers: {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
      });

      setSettings(response);
      latestSettings = response; // keep global copy in sync

      return response; // return fetched settings
    } catch (error) {
      console.error("Failed to load settings:", error);
      return null;
    }
  }, []);

  const updateSettings = useCallback((next) => {
    setSettings((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      latestSettings = value;
      return value;
    });
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setSettings: updateSettings,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
