import { __ } from "@wordpress/i18n";

import { Box } from "@/components/box";
import { ProLaunch } from "@/components/dashboard/pro-launch";
import { Heading } from "@/components/heading";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";

export function SettingsSubmissions() {
  return (
    <div className="grid gap-8">
      <ProLaunch
        headline={__("Upgrade to access Frontend Submissions", "eventkoi-lite")}
        minimal
      />

      <Box className="gap-0">
        <Panel variant="header">
          <Heading level={3}>{__("Frontend submissions", "eventkoi-lite")}</Heading>
          <p className="text-sm text-muted-foreground">
            {__(
              "Preview of Pro Frontend Submissions. Upgrade to enable.",
              "eventkoi-lite"
            )}
          </p>
        </Panel>

        <Panel className="pt-0 pb-6">
          <div
            className="grid gap-8 opacity-60 select-none pointer-events-none"
            aria-hidden="true"
          >
            <div className="grid gap-3">
              <Heading level={4} className="text-base">
                {__("What you'll get", "eventkoi-lite")}
              </Heading>
              <ul className="grid gap-2 text-sm text-muted-foreground list-disc pl-5">
                <li>{__("Logged-in users submit events from the frontend via block or shortcode.", "eventkoi-lite")}</li>
                <li>{__("Choose which roles can submit (subscriber, contributor, author, editor).", "eventkoi-lite")}</li>
                <li>{__("Auto-publish or hold as Pending Review for admin approval.", "eventkoi-lite")}</li>
                <li>{__("Same rich text editor as the admin event editor (B/I/U, headings, lists, link).", "eventkoi-lite")}</li>
                <li>{__("Featured image upload with drag-and-drop.", "eventkoi-lite")}</li>
                <li>{__("Recurring events (daily, weekly, monthly, yearly) with end conditions.", "eventkoi-lite")}</li>
                <li>{__("Calendar pre-assign or let submitter pick.", "eventkoi-lite")}</li>
                <li>{__("Honeypot + inline validation + custom success heading/message.", "eventkoi-lite")}</li>
                <li>{__("Submitters can edit their own pending events before approval.", "eventkoi-lite")}</li>
                <li>{__("Admin notification email (templated from Emails tab).", "eventkoi-lite")}</li>
              </ul>
            </div>

            <div className="grid gap-3">
              <Heading level={4} className="text-base">
                {__("Form preview", "eventkoi-lite")}
              </Heading>
              <div className="grid gap-4 rounded-md border border-input p-5 bg-background">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">
                    {__("Event title", "eventkoi-lite")} <span className="text-destructive">*</span>
                  </label>
                  <div className="h-10 rounded-md border border-input bg-muted/30" />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">
                    {__("Event description", "eventkoi-lite")}
                  </label>
                  <div className="h-7 rounded-t-md border border-input bg-muted/40 flex items-center gap-2 px-3 text-xs text-muted-foreground">
                    <span>B</span><span><em>I</em></span><span><u>U</u></span><span>|</span><span>H1</span><span>H2</span><span>|</span><span>•</span><span>1.</span><span>|</span><span>🔗</span>
                  </div>
                  <div className="h-24 -mt-px rounded-b-md border border-input border-t-0 bg-background" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium">
                      {__("Starts", "eventkoi-lite")} <span className="text-destructive">*</span>
                    </label>
                    <div className="h-10 rounded-md border border-input bg-muted/30" />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium">
                      {__("Ends", "eventkoi-lite")}
                    </label>
                    <div className="h-10 rounded-md border border-input bg-muted/30" />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <div className="h-4 w-4 rounded border border-input" />
                  <span>{__("All-day event", "eventkoi-lite")}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <div className="h-4 w-4 rounded border border-input" />
                  <span>{__("Recurring event", "eventkoi-lite")}</span>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">{__("Location", "eventkoi-lite")}</label>
                  <div className="h-10 rounded-md border border-input bg-muted/30" />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">{__("Featured image", "eventkoi-lite")}</label>
                  <div className="min-h-20 rounded-md border border-dashed border-input flex items-center justify-center text-sm text-muted-foreground">
                    {__("Click to choose an image, or drop one here", "eventkoi-lite")}
                  </div>
                </div>

                <div>
                  <Button disabled className="bg-foreground text-background">
                    {__("Submit event", "eventkoi-lite")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </Box>
    </div>
  );
}
