import { Heading } from "@/components/heading";
import { StripeConnectNotice } from "@/components/stripe-connect-notice";
import { TestModeNotice } from "@/components/test-mode-notice";

export function TicketsOverview() {
  return (
    <div className="flex flex-col gap-8">
      <div className="mx-auto flex w-full gap-2 justify-between">
        <Heading>Tickets</Heading>
      </div>
      <TestModeNotice />
      <StripeConnectNotice />
    </div>
  );
}
