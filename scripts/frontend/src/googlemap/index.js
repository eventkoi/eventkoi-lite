import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { createRoot } from "react-dom/client";

function GoogleMapInstance({ container }) {
  const { event, gmap } = eventkoi_params;

  const locations = (event.locations || []).filter(
    (loc) => loc.type === "physical" && loc.embed_gmap
  );

  if (event?.type === "virtual" || locations.length === 0) {
    container.classList.add("hidden");
    return null;
  }

  const isMultiple = locations.length > 1;
  const useInteractive = gmap?.connected;

  const renderIframeMap = (loc) => (
    <iframe
      src={loc.gmap_link}
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
            {locations.map((loc, index) => (
              <div key={loc.id || index} className="flex flex-col gap-2">
                {isMultiple && (
                  <div className="text-sm font-medium text-muted-foreground">
                    {loc.name}
                  </div>
                )}
                <div className="relative w-full h-[300px] rounded-lg overflow-hidden border border-gray-200">
                  <Map
                    defaultCenter={{
                      lat: Number(loc.latitude),
                      lng: Number(loc.longitude),
                    }}
                    defaultZoom={16}
                    gestureHandling="greedy"
                    disableDefaultUI={true}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <Marker
                      position={{
                        lat: Number(loc.latitude),
                        lng: Number(loc.longitude),
                      }}
                      onClick={() => {
                        const query = [
                          loc.name,
                          loc.address1,
                          loc.city,
                          loc.state,
                          loc.country,
                          loc.zip,
                        ]
                          .filter(Boolean)
                          .join(", ");
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            query
                          )}`,
                          "_blank"
                        );
                      }}
                    />
                  </Map>
                </div>
              </div>
            ))}
          </div>
        </APIProvider>
      ) : (
        <div className="flex flex-col gap-[30px]">
          {locations.map((loc, index) =>
            loc.gmap_link ? (
              <div key={loc.id || index} className="flex flex-col gap-2">
                {isMultiple && (
                  <div className="text-sm font-medium text-muted-foreground">
                    {loc.name}
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
  root.render(<GoogleMapInstance container={el} />);
});
