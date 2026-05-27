import { __ } from "@wordpress/i18n";

import { Box } from "@/components/box";
import { ProLaunch } from "@/components/dashboard/pro-launch";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

/**
 * Lite Settings → Frontend submissions
 *
 * Mirrors the live Pro page (Who can submit roles, Auto-publish toggle,
 * Allow recurring toggle, Notifications card) — all disabled. ProLaunch
 * hero on top points to the upgrade.
 */
export function SettingsSubmissions() {
  return (
    <div className="grid gap-8">
      <ProLaunch
        headline={__("Upgrade to access Frontend Submissions", "eventkoi-lite")}
        minimal
      />

      <Box>
        <div
          className="grid w-full opacity-60 select-none pointer-events-none"
          aria-hidden="true"
        >
          <Panel variant="header">
            <Heading level={3}>{__("Frontend submissions", "eventkoi-lite")}</Heading>
            <p className="text-muted-foreground text-sm mt-1">
              {__(
                "Let logged-in users submit events from the frontend with the EventKoi event submission block or [eventkoi_event_submission] shortcode.",
                "eventkoi-lite"
              )}
            </p>
          </Panel>

          <Separator />

          <Panel className="gap-10">
            <div className="grid gap-2">
              <Label>{__("Who can submit", "eventkoi-lite")}</Label>
              <div className="rounded-md border border-input bg-background min-h-10 flex flex-wrap items-center gap-1.5 p-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">
                  {__("Editor", "eventkoi-lite")}
                  <span className="text-muted-foreground">×</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">
                  {__("Author", "eventkoi-lite")}
                  <span className="text-muted-foreground">×</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">
                  {__("Contributor", "eventkoi-lite")}
                  <span className="text-muted-foreground">×</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">
                  {__("Subscriber", "eventkoi-lite")}
                  <span className="text-muted-foreground">×</span>
                </span>
              </div>
              <div className="text-muted-foreground text-sm">
                {__(
                  "Administrators always can. Pick which other roles can submit events.",
                  "eventkoi-lite"
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-start gap-3">
                <Switch checked={false} disabled />
                <div className="grid gap-1">
                  <Label className="cursor-pointer">
                    {__("Auto-publish submissions", "eventkoi-lite")}
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {__(
                      "When ON, submitted events go live immediately. When OFF, they are held as Pending Review until an admin approves them.",
                      "eventkoi-lite"
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-start gap-3">
                <Switch checked={false} disabled />
                <div className="grid gap-1">
                  <Label className="cursor-pointer">
                    {__("Allow recurring submissions", "eventkoi-lite")}
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {__(
                      "When ON, the submission form shows a Recurring section (daily/weekly/monthly/yearly with end conditions). When OFF, only single events can be submitted.",
                      "eventkoi-lite"
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </Box>

    </div>
  );
}
