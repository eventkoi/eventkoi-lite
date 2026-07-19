import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "@/components/ErrorBoundary";

const locationText = (location = {}, key, fallbackKey = "") => {
  const value = location?.[key] ?? (fallbackKey ? location?.[fallbackKey] : "");
  if (Array.isArray(value)) {
    const texts = value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return String(item).trim();
        }
        if (item && typeof item === "object") {
          for (const nestedKey of ["name", "text", "url", "@id"]) {
            const nested = item?.[nestedKey];
            if (typeof nested === "string" || typeof nested === "number") {
              return String(nested).trim();
            }
          }
        }
        return "";
      })
      .filter(Boolean);
    return [...new Set(texts)].join(" ");
  }
  if (value && typeof value === "object") {
    for (const nestedKey of ["name", "text", "url", "@id"]) {
      const nested = value?.[nestedKey];
      if (typeof nested === "string" || typeof nested === "number") {
        const text = String(nested).trim();
        if (text) return text;
      }
    }
    return "";
  }
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
};

const getLocationType = (location = {}) => {
  const type = locationText(location, "type").toLowerCase();
  if (type === "virtual" || type === "online") return "online";
  if (type === "physical" || type === "inperson") return "inperson";
  if (type.includes("virtuallocation")) return "online";
  if (type.includes("place")) return "inperson";

  const schemaType = locationText(location, "@type").toLowerCase();
  if (schemaType.includes("virtuallocation")) return "online";
  if (schemaType.includes("place")) return "inperson";

  return "";
};

const getLocationAddress = (location = {}) =>
  location?.address && typeof location.address === "object"
    ? location.address
    : {};

const getLocationGeo = (location = {}) =>
  location?.geo && typeof location.geo === "object" ? location.geo : {};

const getLocationCoordinate = (location = {}, key, alias) => {
  const geo = getLocationGeo(location);
  const value = location?.[key] ?? location?.[alias] ?? geo?.[key];
  // Empty strings/blanks must read as "no coordinate". Number("") is 0, which
  // would otherwise pass isFinite and place the map at 0,0 (the ocean) or force
  // the interactive map path on an address-only location with no lat/lng.
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getLocationQuery = (location = {}) => {
  const address = getLocationAddress(location);
  return [
    locationText(location, "name"),
    locationText(location, "address1") || locationText(address, "streetAddress"),
    locationText(location, "address2"),
    locationText(location, "address3"),
    locationText(location, "city") || locationText(address, "addressLocality"),
    locationText(location, "state") || locationText(address, "addressRegion"),
    locationText(location, "country") || locationText(address, "addressCountry"),
    locationText(location, "zip") || locationText(address, "postalCode"),
  ]
    .filter(Boolean)
    .join(", ");
};

const getLocationMapLink = (location = {}) => {
  const explicit = locationText(location, "gmap_link");
  if (explicit) {
    return explicit;
  }

  const lat = getLocationCoordinate(location, "latitude", "lat");
  const lng = getLocationCoordinate(location, "longitude", "lng");
  if (lat !== null && lng !== null) {
    return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
  }

  const query = getLocationQuery(location);
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : "";
};

const getEmbeddableMapLink = (location = {}) => {
  const source = getLocationMapLink(location);
  if (!source) {
    return "";
  }

  let url;
  try {
    url = new URL(source, window.location.href);
  } catch {
    return source;
  }

  if (!/(\.|^)google\.[^/]+$/i.test(url.hostname)) {
    return source;
  }

  if (url.pathname.startsWith("/maps/embed")) {
    return url.toString();
  }

  let query =
    url.searchParams.get("q") ||
    url.searchParams.get("query") ||
    getLocationQuery(location);

  if (!query && url.pathname.includes("/maps/place/")) {
    query = decodeURIComponent(
      url.pathname.split("/maps/place/")[1]?.split("/")[0] || ""
    ).replace(/\+/g, " ");
  }

  const lat = getLocationCoordinate(location, "latitude", "lat");
  const lng = getLocationCoordinate(location, "longitude", "lng");
  if (!query && lat !== null && lng !== null) {
    query = `${lat},${lng}`;
  }

  if (!query) {
    return source;
  }

  const embedUrl = new URL("https://www.google.com/maps");
  embedUrl.searchParams.set("q", query);
  embedUrl.searchParams.set("output", "embed");
  return embedUrl.toString();
};

function GoogleMapInstance({ container }) {
  const { event, gmap } = window.eventkoi_params;

  const locations = (event.locations || []).filter(
    (loc) =>
      getLocationType(loc) === "inperson" &&
      loc.embed_gmap &&
      getLocationMapLink(loc)
  );

  if (locations.length === 0) {
    container.classList.add("hidden");
    return null;
  }

  const isMultiple = locations.length > 1;
  const useInteractive = gmap?.connected;

  const renderIframeMap = (loc) => (
    <iframe
      src={getEmbeddableMapLink(loc)}
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
      className="w-full h-full border-0 absolute top-0 left-0"
    ></iframe>
  );

  return (
    <>
      {useInteractive ? (
        <APIProvider apiKey={gmap.api_key}>
          <div className="flex flex-col gap-[30px]">
            {locations.map((loc, index) => {
              const lat = getLocationCoordinate(loc, "latitude", "lat");
              const lng = getLocationCoordinate(loc, "longitude", "lng");
              const canRenderInteractive = lat !== null && lng !== null;

              return (
                <div key={loc.id || index} className="flex flex-col gap-2">
                  {isMultiple && (
                    <div className="text-sm font-medium text-muted-foreground">
                      {locationText(loc, "name")}
                    </div>
                  )}
                  <div className="relative w-full h-[300px] rounded-lg overflow-hidden border border-gray-200">
                    {canRenderInteractive ? (
                      <Map
                        defaultCenter={{ lat, lng }}
                        defaultZoom={16}
                        gestureHandling="greedy"
                        disableDefaultUI={true}
                        style={{ width: "100%", height: "100%" }}
                      >
                        <Marker
                          position={{ lat, lng }}
                          onClick={() => {
                            window.open(getLocationMapLink(loc), "_blank");
                          }}
                        />
                      </Map>
                    ) : (
                      renderIframeMap(loc)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </APIProvider>
      ) : (
        <div className="flex flex-col gap-[30px]">
          {locations.map((loc, index) =>
            getLocationMapLink(loc) ? (
              <div key={loc.id || index} className="flex flex-col gap-2">
                {isMultiple && (
                  <div className="text-sm font-medium text-muted-foreground">
                    {locationText(loc, "name")}
                  </div>
                )}
                <div className="relative w-full h-[300px] rounded-lg overflow-hidden border border-gray-200">
                  {renderIframeMap(loc)}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </>
  );
}

document.querySelectorAll(".eventkoi-gmap").forEach((el) => {
  const root = createRoot(el);
  root.render(
    <ErrorBoundary>
      <GoogleMapInstance container={el} />
    </ErrorBoundary>
  );
});
