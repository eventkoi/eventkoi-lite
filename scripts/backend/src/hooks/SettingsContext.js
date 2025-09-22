import apiRequest from "@wordpress/api-fetch";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

let latestSettings = null; // global copy of settings

const SettingsContext = createContext({
  settings: null,
  refreshSettings: () => Promise.resolve(null),
});

export const useSettings = () => useContext(SettingsContext);

// Non-hook accessor for utilities (usable outside React)
export function getSettings() {
  return latestSettings;
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);

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

  useEffect(() => {
    fetchSettings(); // Load once on mount
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
