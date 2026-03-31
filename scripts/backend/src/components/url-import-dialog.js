import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { __ } from "@wordpress/i18n";
import apiRequest from "@wordpress/api-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showToastError } from "@/lib/toast";
import { AlertCircle, Link2, Loader2 } from "lucide-react";

export function URLImportDialog({ open, onOpenChange, onImported }) {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setUrl("");
    setLoading(false);
    setError("");
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed || !trimmed.startsWith("http")) {
      setError(__("Please enter a valid URL.", "eventkoi-lite"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/url-import`,
        method: "POST",
        data: { url: trimmed },
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });

      if (response.already_imported) {
        setError(
          `${__("This event has already been imported.", "eventkoi-lite")} (${response.event_title})`
        );
        setLoading(false);
        return;
      }

      onImported?.(response.event_id);
      handleOpenChange(false);
      navigate(`/events/${response.event_id}/main`);
    } catch (err) {
      setError(
        err?.message || __("Could not import event from this URL.", "eventkoi-lite")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" aria-hidden="true" />
            {__("Import from URL", "eventkoi-lite")}
          </DialogTitle>
          <DialogDescription>
            {__(
              "Paste a link to any event page. A draft event will be created for you to review.",
              "eventkoi-lite"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="url-import-input">
              {__("Event page URL", "eventkoi-lite")}
            </Label>
            <Input
              id="url-import-input"
              type="url"
              placeholder="https://example.com/events/my-event"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) {
                  e.preventDefault();
                  handleImport();
                }
              }}
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div
              className="flex items-start gap-2 text-sm text-destructive"
              role="alert"
            >
              <AlertCircle
                className="h-4 w-4 mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            {__("Cancel", "eventkoi-lite")}
          </Button>
          <Button onClick={handleImport} disabled={loading || !url.trim()}>
            {loading ? (
              <>
                <Loader2
                  className="h-4 w-4 mr-2 animate-spin"
                  aria-hidden="true"
                />
                {__("Importing...", "eventkoi-lite")}
              </>
            ) : (
              __("Import", "eventkoi-lite")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
