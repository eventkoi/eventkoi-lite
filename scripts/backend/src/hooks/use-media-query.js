// use-media-query.js
import { useEffect, useState } from "react";

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const handler = () => setMatches(media.matches);
    if (media.addEventListener) {
      media.addEventListener("change", handler);
    } else {
      media.addListener(handler); // fallback for Safari
    }
    return () =>
      media.removeEventListener
        ? media.removeEventListener("change", handler)
        : media.removeListener(handler);
  }, [query]);

  return matches;
}
