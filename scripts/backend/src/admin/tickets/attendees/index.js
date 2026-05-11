import { Heading } from "@/components/heading";
import { __ } from "@wordpress/i18n";

export function Attendees() {
  return (
    <div className="flex flex-col gap-8">
      <div className="mx-auto flex w-full gap-2 justify-between">
        <Heading>{__("Attendees", "eventkoi-lite")}</Heading>
      </div>
    </div>
  );
}
