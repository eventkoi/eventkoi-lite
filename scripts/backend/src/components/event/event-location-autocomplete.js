import { Input } from "@/components/ui/input";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";

export function EventLocationAutocomplete({ location, onChange }) {
  const [selectedPlace, setSelectedPlace] = useState(null);

  return (
    <div className="flex flex-col gap-2">
      <PlaceAutocomplete
        onPlaceSelect={setSelectedPlace}
        location={location}
        onChange={onChange}
      />
    </div>
  );
}

const PlaceAutocomplete = ({ onPlaceSelect, location, onChange }) => {
  const [placeAutocomplete, setPlaceAutocomplete] = useState(null);
  const inputRef = useRef(null);
  const places = useMapsLibrary("places");
  const geocoder = useRef(null);

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options = {
      fields: ["geometry", "name", "formatted_address", "address_components"],
    };

    setPlaceAutocomplete(new places.Autocomplete(inputRef.current, options));
    geocoder.current = new google.maps.Geocoder();
  }, [places]);

  useEffect(() => {
    if (!placeAutocomplete) return;

    placeAutocomplete.addListener("place_changed", () => {
      const place = placeAutocomplete.getPlace();
      onPlaceSelect(place);

      const lat = place.geometry?.location.lat().toString();
      const lng = place.geometry?.location.lng().toString();

      const components = place.address_components || [];
      let streetNumber = "";
      let route = "";
      let city = "";
      let state = "";
      let postalCode = "";
      let country = "";

      components.forEach(({ long_name, short_name, types }) => {
        if (types.includes("street_number")) streetNumber = long_name;
        if (types.includes("route")) route = long_name;
        if (types.includes("locality")) city = long_name;
        if (types.includes("administrative_area_level_1")) state = short_name;
        if (types.includes("postal_code")) postalCode = long_name;
        if (types.includes("country")) country = long_name;
      });

      const address1 = [streetNumber, route].filter(Boolean).join(" ");
      const address2 = ""; // Apartment/unit blank
      const address3 = [city, state, postalCode, country]
        .filter(Boolean)
        .join(", ");
      const venueName = place.name || ""; // <— This is the venue/place name like "Starbucks"

      const updatedFields = {
        name: venueName, // <— fill Location Name from Google Place name
        address1,
        address2,
        address3,
        city,
        state,
        zip: postalCode,
        country,
        latitude: lat,
        longitude: lng,
      };

      onChange(updatedFields);
    });
  }, [onPlaceSelect, placeAutocomplete]);

  const handleManualAddressChange = (address) => {
    if (geocoder.current) {
      geocoder.current.geocode({ address }, (results, status) => {
        if (status === "OK" && results[0]) {
          const location = results[0].geometry.location;
          onChange({
            latitude: location.lat().toString(),
            longitude: location.lng().toString(),
          });
        } else {
          console.error(
            "Geocode was not successful for the following reason: " + status
          );
        }
      });
    }
  };

  useEffect(() => {
    const address = [location.address1, location.address2, location.address3]
      .filter(Boolean)
      .join(" ");
    if (address) {
      handleManualAddressChange(address);
    }
  }, [location.address1, location.address2, location.address3]);

  return (
    <Input
      ref={inputRef}
      id="address1"
      type="text"
      value={location?.address1 || ""}
      placeholder="Search address here..."
      onChange={(e) => onChange({ address1: e.target.value })}
      autoComplete="off"
    />
  );
};
