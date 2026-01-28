import { Box } from "@/components/box";
import { EventRsvpSettings } from "@/components/event/event-rsvp";
import { Panel } from "@/components/panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { cn } from "@/lib/utils";
import { __ } from "@wordpress/i18n";
import { Ticket, TicketCheck } from "lucide-react";

export function EventEditRsvp() {
  const { event, setEvent } = useEventEditContext();
  const tabValue = "rsvp";

  return (
    <div className="flex flex-col w-full gap-8">
      <Box container>
        <Panel className="gap-3 p-0">
          <Tabs value={tabValue} className="w-full">
            <TabsList className="h-auto w-full flex flex-col lg:flex-row space-y-5 lg:space-y-0 [&>*]:w-full lg:space-x-5 p-0 bg-white">
              <TabsTrigger
                value="rsvp"
                className={cn(
                  "flex justify-start py-6 px-4 space-x-5 bg-white border-border border rounded-2xl",
                  "data-[state=active]:shadow-[inset_0_0_0_1px_black] data-[state=active]:border-primary"
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-md flex items-center justify-center",
                    tabValue === "rsvp"
                      ? "bg-primary text-white"
                      : "bg-muted text-primary"
                  )}
                >
                  <TicketCheck size={20} />
                </div>
                <div className="space-y-1 text-left">
                  <div className="text-black text-base">
                    {__("RSVP", "eventkoi-lite")}
                  </div>
                  <p className="text-sm text-muted-foreground font-normal">
                    {__("Track who is coming to the event.", "eventkoi-lite")}
                  </p>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="tickets"
                disabled
                className={cn(
                  "flex justify-start py-6 px-4 space-x-5 bg-white border-border border rounded-2xl",
                  "data-[state=active]:shadow-[inset_0_0_0_1px_black] data-[state=active]:border-primary",
                  "disabled:opacity-100 border-muted text-muted-foreground"
                )}
              >
                <div className="w-9 h-9 rounded-md flex items-center justify-center bg-muted text-primary">
                  <Ticket size={20} />
                </div>
                <div className="space-y-1 text-left">
                  <div className="flex items-center gap-2 text-base text-muted-foreground">
                    {__("Tickets", "eventkoi-lite")}
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-foreground">
                      {__("Coming soon!", "eventkoi-lite")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-normal">
                    {__("Sell tickets to the event.", "eventkoi-lite")}
                  </p>
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rsvp" className="mt-6">
              <EventRsvpSettings event={event} setEvent={setEvent} />
            </TabsContent>
          </Tabs>
        </Panel>
      </Box>
    </div>
  );
}
