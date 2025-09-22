import { Heading } from "@/components/heading";

import { QuickLinks } from "@/components/dashboard/quick-links";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";

export function DashboardOverview() {
  return (
    <div className="flex flex-col gap-8">
      <div className="mx-auto flex w-full gap-2 justify-between">
        <Heading>Dashboard</Heading>
      </div>
      <div className="grid">
        <UpcomingEvents />
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <QuickLinks />
      </div>
    </div>
  );
}
