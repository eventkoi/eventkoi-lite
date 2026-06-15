import apiFetch from "@wordpress/api-fetch";
import { useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { createRoot } from "react-dom/client";

function AutoUpdateToggle() {
  const [enabled, setEnabled] = useState(eventkoiAutoUpdate.enabled);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const result = await apiFetch({
        url: eventkoiAutoUpdate.restUrl,
        method: "POST",
        headers: {
          "X-WP-Nonce": eventkoiAutoUpdate.nonce,
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        },
        data: { enabled: !enabled },
      });
      if (result.success) setEnabled(result.enabled);
    } catch (err) {
      console.error(err);
      alert(__("Error toggling auto-updates.", "eventkoi-lite"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        if (!loading) toggle();
      }}
      style={{ opacity: loading ? 0.6 : 1 }}
    >
      {loading
        ? __("Updating…", "eventkoi-lite")
        : enabled
        ? __("Disable auto-updates", "eventkoi-lite")
        : __("Enable auto-updates", "eventkoi-lite")}
    </a>
  );
}

document.addEventListener("DOMContentLoaded", () => {
  const mount = document.getElementById("eventkoi-auto-update-toggle");
  if (mount && typeof eventkoiAutoUpdate !== "undefined") {
    const root = createRoot(mount);
    root.render(<AutoUpdateToggle />);
  }
});
