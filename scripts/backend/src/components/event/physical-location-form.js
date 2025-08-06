import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";
import { useRef, useState } from "react";
import { EventLocationAutocomplete } from "./event-location-autocomplete";

export function PhysicalLocationForm({ location, onChange, settings }) {
  const isGmapConnected = Boolean(settings?.gmap_connection_status);

  const extractMapUrl = (input) => {
    const iframePattern = /<iframe[^>]+src=["']([^"']+)["']/i;
    const urlPattern = /^https:\/\/www\.google\.com\/maps\/embed(\?.*)?$/i;

    const iframeMatch = input.match(iframePattern);
    if (iframeMatch) {
      const iframeSrc = iframeMatch[1];
      if (urlPattern.test(iframeSrc)) {
        return iframeSrc;
      }
    }

    if (urlPattern.test(input)) {
      return input;
    }

    return "";
  };

  const mapLinkRef = useRef(null);
  const [error, setError] = useState(false);

  const validateMapLink = (e) => {
    const raw = location?.gmap_link || "";
    const extracted = extractMapUrl(raw);

    if (!raw) {
      e.target.classList.remove("eventkoi-error");
      setError(false);
      return;
    }

    if (extracted) {
      // Auto-correct to just the embed URL
      onChange({ gmap_link: extracted });
      e.target.classList.remove("eventkoi-error");
      setError(false);
    } else {
      e.target.classList.add("eventkoi-error");
      setError(true);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`name-${location.id}`}>Location name (optional)</Label>
        <Input
          id={`name-${location.id}`}
          value={location.name}
          placeholder="e.g., Main Hall, Room A"
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <p className="text-muted-foreground text-sm">
          Give your location a name to help attendees identify it more easily.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`address1-${location.id}`}>Address</Label>
        {isGmapConnected ? (
          <EventLocationAutocomplete location={location} onChange={onChange} />
        ) : (
          <Input
            id={`address1-${location.id}`}
            value={location.address1}
            placeholder="Street address"
            onChange={(e) => onChange({ address1: e.target.value })}
          />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`address2-${location.id}`}>
          Apartment unit number, building name (optional)
        </Label>
        <Input
          id={`address2-${location.id}`}
          value={location.address2}
          placeholder="Apartment, unit, building name"
          onChange={(e) => onChange({ address2: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`city-${location.id}`}>City</Label>
          <Input
            id={`city-${location.id}`}
            value={location.city}
            placeholder="City"
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`state-${location.id}`}>State</Label>
          <Input
            id={`state-${location.id}`}
            value={location.state}
            placeholder="State"
            onChange={(e) => onChange({ state: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`country-${location.id}`}>Country</Label>
          <Input
            id={`country-${location.id}`}
            value={location.country}
            placeholder="Country"
            onChange={(e) => onChange({ country: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`zip-${location.id}`}>Postal code</Label>
          <Input
            id={`zip-${location.id}`}
            value={location.zip}
            placeholder="Postal code"
            onChange={(e) => onChange({ zip: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id={`embed_gmap-${location.id}`}
          checked={location.embed_gmap}
          onCheckedChange={(checked) => onChange({ embed_gmap: checked })}
        />
        <label htmlFor={`embed_gmap-${location.id}`} className="text-sm">
          Embed Google Map on page.
        </label>
      </div>

      {location.embed_gmap && !isGmapConnected && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 max-w-[422px]">
            <Label htmlFor={`gmap_link-${location.id}`}>
              Google Maps Embed Link
            </Label>
            <Input
              ref={mapLinkRef}
              type="text"
              id={`gmap_link-${location.id}`}
              value={location?.gmap_link}
              placeholder="https://google.com/maps/embed"
              onChange={(e) => onChange({ gmap_link: e.target.value })}
              onBlur={validateMapLink}
            />
            {error && (
              <p className="w-full text-xs text-[#d13d3d]">
                Wrong embed URL. Follow the instructions below to get the
                correct URL.
              </p>
            )}
          </div>

          <Alert className="flex gap-x-8 bg-gray-50">
            <AlertDescription>
              <p className="text-base font-medium mb-2">
                How to get the Google Maps embed link:
              </p>
              <ol className="text-sm list-decimal pl-4 mb-4">
                <li>Find your address in Google Maps.</li>
                <li>
                  Click on the <strong>Share</strong> button.
                </li>
                <li>
                  Go to <strong>Embed a map</strong> tab.
                </li>
                <li>Copy the entire iframe html code.</li>
                <li>Paste it above. We’ll extract the correct embed URL.</li>
                <li>
                  It should start with:
                  <code className="text-inherit ml-1">
                    https://www.google.com/maps/embed
                  </code>
                </li>
              </ol>
              <p className="text-sm">
                Do <strong>NOT</strong> paste:
                <code className="text-inherit ml-1">
                  https://maps.app.goo.gl/
                </code>
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-8">
                <Card className="select-none relative">
                  <div className="absolute -right-2.5 top-0 rounded-full w-6 h-6 bg-red-500 text-white inline-flex items-center justify-center -translate-y-1/2">
                    <X size={20} />
                  </div>
                  <CardHeader className="py-2 px-4">
                    <CardTitle className="text-base font-normal">
                      Share
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 px-4 pb-4">
                    <ul className="flex gap-x-4 font-semibold text-black whitespace-nowrap">
                      <li className="underline underline-offset-4">
                        Send a link
                      </li>
                      <li>Embed a map</li>
                    </ul>
                    <p className="text-black underline underline-offset-4 decoration-gray-200 text-xs">
                      https://maps.app.goo.gl/
                    </p>
                    <p className="text-blue-700 font-semibold text-xs">
                      COPY TO CLIPBOARD
                    </p>
                  </CardContent>
                </Card>

                <Card className="select-none relative">
                  <div className="absolute -right-2.5 top-0 rounded-full w-6 h-6 bg-green-500 text-white inline-flex items-center justify-center -translate-y-1/2">
                    <Check size={20} />
                  </div>
                  <CardHeader className="py-2 px-4">
                    <CardTitle className="text-base font-normal">
                      Share
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 px-4 pb-4">
                    <ul className="flex gap-x-4 font-semibold text-black whitespace-nowrap">
                      <li>Send a link</li>
                      <li className="underline underline-offset-4">
                        Embed a map
                      </li>
                    </ul>
                    <p className="text-black underline underline-offset-4 decoration-gray-200 text-xs truncate">
                      &lt;iframe src="https://www.google.com/maps/embed...
                    </p>
                    <p className="text-blue-700 font-semibold text-xs">
                      COPY HTML
                    </p>
                  </CardContent>
                </Card>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
