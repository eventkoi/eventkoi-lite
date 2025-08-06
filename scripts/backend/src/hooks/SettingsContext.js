import apiRequest from "@wordpress/api-fetch";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const SettingsContext = createContext({
  settings: null,
  refreshSettings: () => Promise.resolve(null),
});

export const useSettings = () => useContext(SettingsContext);

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

      return response; // ✅ Fix: return fetched settings
    } catch (error) {
      console.error("Failed to load settings:", error);
      return null; // ✅ Always return a value
    }
  }, []);

  useEffect(() => {
    fetchSettings(); // Load once on mount
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        refreshSettings: fetchSettings, // ✅ Now returns Promise<settings>
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
