import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { __ } from "@wordpress/i18n";

// "Price from" attendance mode: a starting price plus a link to an external
// ticketing site, for events that do not sell tickets through EventKoi.
export function EventEditPriceFrom() {
  const { event, setEvent } = useEventEditContext();

  const updateField = (field, value) => {
    setEvent((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col w-full gap-8">
      <Box container className="gap-8">
        <div className="grid gap-1">
          <Heading level={3}>{__("Price from", "eventkoi-lite")}</Heading>
          <p className="text-sm text-muted-foreground">
            {__(
              "Shown in the tickets box on the event page, with a button that sends visitors to your external ticketing site.",
              "eventkoi-lite",
            )}
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="price-from-amount">
            {__("Minimum price", "eventkoi-lite")}
          </Label>
          <Input
            id="price-from-amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className="w-[160px]"
            value={event?.price_from_amount ?? ""}
            onChange={(e) => updateField("price_from_amount", e.target.value)}
          />
          <div className="text-sm text-muted-foreground">
            {__(
              "Displayed as a starting price, e.g. “From $25”. Uses the currency from your settings.",
              "eventkoi-lite",
            )}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="price-from-url">
            {__("Ticket website URL", "eventkoi-lite")}
          </Label>
          <Input
            id="price-from-url"
            type="url"
            className="w-[400px] max-w-full"
            placeholder="https://"
            value={event?.price_from_url ?? ""}
            onChange={(e) => updateField("price_from_url", e.target.value)}
          />
          <div className="text-sm text-muted-foreground">
            {__(
              "Where the button sends visitors to buy tickets. Opens in a new tab. Leave empty to show the price without a button.",
              "eventkoi-lite",
            )}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="price-from-details">
            {__("Pricing details", "eventkoi-lite")}
          </Label>
          <Textarea
            id="price-from-details"
            rows={4}
            value={event?.price_from_details ?? ""}
            onChange={(e) => updateField("price_from_details", e.target.value)}
          />
          <div className="text-sm text-muted-foreground">
            {__(
              "Optional extra information about prices, shown under the price.",
              "eventkoi-lite",
            )}
          </div>
        </div>
      </Box>
    </div>
  );
}
