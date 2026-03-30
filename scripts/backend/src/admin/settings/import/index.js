import { useState, useEffect, useCallback, useRef } from "react";
import { __ } from "@wordpress/i18n";
import apiRequest from "@wordpress/api-fetch";
import { useNavigate } from "react-router-dom";
import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { showToast, showToastError } from "@/lib/toast";
import { Loader2, Download, ArrowRight, CalendarDays, Upload } from "lucide-react";

const TEC_ICON_URL = `${eventkoi_params.plugin_url}templates/assets/tec-icon.png`;

export function SettingsImport() {
  const navigate = useNavigate();
  const icsFileRef = useRef(null);

  // TEC state.
  const [tecState, setTecState] = useState({
    loading: true,
    data: null,
    importing: false,
    result: null,
  });

  // ICS state.
  const [icsState, setIcsState] = useState({
    parsing: false,
    parsed: null,
    importing: false,
    result: null,
  });

  const detectTEC = useCallback(async () => {
    setTecState((s) => ({ ...s, loading: true }));
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/tec-import/detect`,
        method: "GET",
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      setTecState((s) => ({ ...s, loading: false, data: response }));
    } catch {
      setTecState((s) => ({ ...s, loading: false, data: null }));
    }
  }, []);

  useEffect(() => {
    detectTEC();
  }, [detectTEC]);

  const importTEC = async () => {
    setTecState((s) => ({ ...s, importing: true, result: null }));
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/tec-import/run`,
        method: "POST",
        data: { event_ids: [], import_images: true },
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      setTecState((s) => ({ ...s, importing: false, result: response }));
      if (response?.imported > 0) {
        showToast({
          message: `${response.imported} event${response.imported !== 1 ? "s" : ""} imported.`,
        });
      }
      if (response?.errors > 0) {
        showToastError(`${response.errors} event(s) failed.`);
      }
    } catch (err) {
      showToastError(err?.message ?? "Import failed.");
      setTecState((s) => ({ ...s, importing: false }));
    }
  };

  // ICS handlers.
  const handleICSUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    setIcsState((s) => ({ ...s, parsing: true, parsed: null, result: null }));

    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/ics-import/parse`,
        method: "POST",
        data: { content },
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      setIcsState((s) => ({ ...s, parsing: false, parsed: response }));
    } catch {
      showToastError(__("Failed to parse ICS file.", "eventkoi"));
      setIcsState((s) => ({ ...s, parsing: false }));
    }

    e.target.value = "";
  };

  const importICS = async () => {
    if (!icsState.parsed?.cache_key) return;
    setIcsState((s) => ({ ...s, importing: true, result: null }));

    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/ics-import/run`,
        method: "POST",
        data: { cache_key: icsState.parsed.cache_key },
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
      });
      setIcsState((s) => ({ ...s, importing: false, result: response, parsed: null }));
      if (response?.imported > 0) {
        showToast({
          message: `${response.imported} event${response.imported !== 1 ? "s" : ""} imported.`,
        });
      }
      if (response?.errors > 0) {
        showToastError(`${response.errors} event(s) failed.`);
      }
    } catch (err) {
      showToastError(err?.message ?? __("Import failed.", "eventkoi"));
      setIcsState((s) => ({ ...s, importing: false }));
    }
  };

  const { data: tec, loading: tecLoading, importing: tecImporting, result: tecResult } = tecState;
  const tecInstalled = tec?.installed;
  const tecAvailable = tecInstalled && tec?.events_count > 0;
  const tecDone = tecResult?.imported > 0;

  return (
    <div className="grid gap-5">
      <Heading level={3}>{__("Import events", "eventkoi")}</Heading>
      <p className="text-sm text-muted-foreground -mt-3">
        {__("Import events from other calendar plugins or ICS files.", "eventkoi")}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <IntegrationCard
          name="The Events Calendar"
          description="Import events, venues, organizers, and categories from TEC."
          icon={<img src={TEC_ICON_URL} alt="The Events Calendar" className="h-10 w-10 rounded-lg flex-shrink-0" />}
          loading={tecLoading}
          installed={tecInstalled}
          available={tecAvailable}
          importing={tecImporting}
          done={tecDone}
          count={tec?.events_count || 0}
          totalCount={tec?.total_events || 0}
          result={tecResult}
          onImport={importTEC}
          onViewEvents={() => navigate("/events")}
        />

        <ICSImportCard
          parsing={icsState.parsing}
          parsed={icsState.parsed}
          importing={icsState.importing}
          result={icsState.result}
          onUpload={() => icsFileRef.current?.click()}
          onImport={importICS}
          onViewEvents={() => navigate("/events")}
        />
      </div>

      <input
        ref={icsFileRef}
        type="file"
        accept=".ics,.ical,.ifb,.icalendar"
        className="hidden"
        onChange={handleICSUpload}
      />
    </div>
  );
}

function IntegrationCard({
  name,
  description,
  icon,
  loading,
  installed,
  available,
  importing,
  done,
  count,
  totalCount,
  result,
  onImport,
  onViewEvents,
}) {
  const inactive = !loading && !installed;

  return (
    <div className="group flex flex-col rounded-xl border bg-card shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-start gap-4 p-5 flex-1">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className="px-5 py-3 mt-auto border-t bg-muted/20 flex items-center justify-between gap-3" style={{ minHeight: 61 }}>
        {loading && (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {__("Detecting...", "eventkoi")}
          </span>
        )}

        {inactive && (
          <p className="text-xs text-muted-foreground">
            {__("Activate the plugin to import", "eventkoi")}
          </p>
        )}

        {!loading && installed && !available && !done && (
          <p className="text-xs text-muted-foreground">
            {totalCount > 0
              ? __("All events already imported", "eventkoi")
              : __("No events found", "eventkoi")}
          </p>
        )}

        {!loading && available && !done && !importing && (
          <>
            <span className="text-xs text-muted-foreground">
              {count} {count === 1 ? __("event", "eventkoi") : __("events", "eventkoi")} {__("available", "eventkoi")}
            </span>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 text-xs px-3.5">
                  <Download className="h-3.5 w-3.5" />
                  {__("Import", "eventkoi")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-1">
                    <img src={TEC_ICON_URL} alt="" className="h-8 w-8 rounded-lg" />
                    <DialogTitle className="text-base">
                      {__("Import from The Events Calendar", "eventkoi")}
                    </DialogTitle>
                  </div>
                  <DialogDescription className="text-sm leading-relaxed">
                    {__("This will import the following into EventKoi:", "eventkoi")}
                  </DialogDescription>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1.5 pl-1">
                    <li className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                      {`${count} event${count !== 1 ? "s" : ""}`}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                      {__("Venues, categories & featured images", "eventkoi")}
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground/70 mt-3">
                    {__("Previously imported events will be skipped.", "eventkoi")}
                  </p>
                </DialogHeader>
                <DialogFooter className="mt-2">
                  <DialogClose asChild>
                    <Button variant="outline" className="cursor-pointer shadow-none border-solid">
                      {__("Cancel", "eventkoi")}
                    </Button>
                  </DialogClose>
                  <Button onClick={onImport} className="gap-1.5 cursor-pointer shadow-none" style={{ border: "1px solid transparent" }}>
                    <Download className="h-3.5 w-3.5" />
                    {__("Import", "eventkoi")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}

        {!loading && importing && (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {__("Importing events...", "eventkoi")}
          </span>
        )}

        {!loading && done && (
          <>
            <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
              {result?.imported} {result?.imported === 1 ? __("event", "eventkoi") : __("events", "eventkoi")} {__("imported", "eventkoi")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewEvents}
              className="h-8 gap-1.5 text-xs"
            >
              {__("View events", "eventkoi")}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function ICSImportCard({
  parsing,
  parsed,
  importing,
  result,
  onUpload,
  onImport,
  onViewEvents,
}) {
  const count = parsed?.events_count || 0;
  const available = count > 0;
  const done = result?.imported > 0;

  return (
    <div className="group flex flex-col rounded-xl border bg-card shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-start gap-4 p-5 flex-1">
        <div className="flex-shrink-0">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {__("ICS / iCal File", "eventkoi")}
          </p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {__("Import from Google Calendar, Apple Calendar, Outlook, or any .ics file.", "eventkoi")}
          </p>
        </div>
      </div>

      <div className="px-5 py-3 mt-auto border-t bg-muted/20 flex items-center justify-between gap-3" style={{ minHeight: 61 }}>
        {parsing && (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {__("Parsing file...", "eventkoi")}
          </span>
        )}

        {!parsing && !available && !done && !importing && (
          <>
            <p className="text-xs text-muted-foreground">
              {parsed && parsed.events_count === 0
                ? parsed.skipped > 0
                  ? __("All events already imported", "eventkoi")
                  : __("No events found in file", "eventkoi")
                : __("Upload a .ics file to import", "eventkoi")}
            </p>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs px-3.5 flex-shrink-0" onClick={onUpload}>
              <Upload className="h-3.5 w-3.5" />
              {__("Upload", "eventkoi")}
            </Button>
          </>
        )}

        {!parsing && available && !done && !importing && (
          <>
            <span className="text-xs text-muted-foreground">
              {count} {count === 1 ? __("event", "eventkoi") : __("events", "eventkoi")} {__("found", "eventkoi")}
              {parsed?.skipped > 0 && (
                <span className="text-muted-foreground/60">
                  {" "}({parsed.skipped} {__("already imported", "eventkoi")})
                </span>
              )}
            </span>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 text-xs px-3.5">
                  <Download className="h-3.5 w-3.5" />
                  {__("Import", "eventkoi")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CalendarDays className="h-4 w-4 text-primary" />
                    </div>
                    <DialogTitle className="text-base">
                      {__("Import from ICS file", "eventkoi")}
                    </DialogTitle>
                  </div>
                  <DialogDescription className="text-sm leading-relaxed">
                    {__("This will import the following into EventKoi:", "eventkoi")}
                  </DialogDescription>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1.5 pl-1">
                    <li className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                      {`${count} event${count !== 1 ? "s" : ""}`}
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground/70 mt-3">
                    {__("Previously imported events will be skipped.", "eventkoi")}
                  </p>
                </DialogHeader>
                <DialogFooter className="mt-2">
                  <DialogClose asChild>
                    <Button variant="outline" className="cursor-pointer shadow-none border-solid">
                      {__("Cancel", "eventkoi")}
                    </Button>
                  </DialogClose>
                  <Button onClick={onImport} className="gap-1.5 cursor-pointer shadow-none" style={{ border: "1px solid transparent" }}>
                    <Download className="h-3.5 w-3.5" />
                    {__("Import", "eventkoi")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}

        {!parsing && importing && (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {__("Importing events...", "eventkoi")}
          </span>
        )}

        {!parsing && done && (
          <>
            <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
              {result?.imported} {result?.imported === 1 ? __("event", "eventkoi") : __("events", "eventkoi")} {__("imported", "eventkoi")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewEvents}
              className="h-8 gap-1.5 text-xs"
            >
              {__("View events", "eventkoi")}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
