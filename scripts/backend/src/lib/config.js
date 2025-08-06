let configPromise = null;

export async function fetchPluginConfig() {
  if (globalThis.__eventkoi_config) return globalThis.__eventkoi_config;
  if (configPromise) return configPromise;

  const url = eventkoi_params?.supabase_config_url;
  if (!url) {
    throw new Error("Missing config URL in eventkoi_params");
  }

  console.log("Fetching plugin config...");

  configPromise = fetch(url)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error("Failed to load plugin config");
      }
      const json = await res.json();
      globalThis.__eventkoi_config = json;
      return json;
    })
    .catch((err) => {
      configPromise = null; // reset if fetch failed
      throw err;
    });

  return configPromise;
}
