import apiRequest from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";
import { DateTime } from "luxon";

import { getUtcISOString, normalizeTimeZone } from "@/lib/date-utils";

// The demo event the tour walks through. Same listing the onboarding wizard
// created before: a draft, so the tour can ask for it to be published.

async function fetchEventById(eventId) {
  try {
    return await apiRequest({
      path: `${eventkoi_params.api}/event?id=${eventId}`,
      method: "GET",
    });
  } catch (error) {
    return null;
  }
}

async function persistDemoEventId(eventId) {
  if (!eventId) return;

  await apiRequest({
    path: `${eventkoi_params.api}/onboarding/demo-event`,
    method: "POST",
    data: { event_id: eventId },
  });

  window.eventkoi_params.demo_event_id = eventId;
}

/**
 * Create the demo event, or reset the existing one to a fresh draft.
 *
 * @return {Promise<number>} The demo event ID.
 */
export async function ensureDemoEvent() {
  const tz = normalizeTimeZone(window?.eventkoi_params?.timezone || "UTC");
  const nowTz = DateTime.now().setZone(tz);

  const daysToSaturday = (6 - nowTz.weekday + 7) % 7 || 7; // luxon weekday: Mon=1, Sat=6
  const startTz = nowTz
    .plus({ days: daysToSaturday })
    .set({ hour: 13, minute: 0, second: 0, millisecond: 0 });
  const endTz = startTz.plus({ days: 7 });

  const startIso = getUtcISOString(
    startTz.toISO({ suppressMilliseconds: true }),
    tz
  );
  const endIso = getUtcISOString(
    endTz.toISO({ suppressMilliseconds: true }),
    tz
  );

  const demoImage = window?.eventkoi_params?.demo_event_image || "";

  const demoEvent = {
    title: __("Classical Concert in the Park", "eventkoi-lite"),
    description: __(
      "<p>A serene evening of classical music unfolds at the Singapore Botanic Gardens’ iconic Bandstand. Surrounded by lush greenery and gentle evening breezes, audiences can enjoy a live orchestral performance beneath the open sky. An enchanting blend of nature, culture, and timeless melodies in the heart of the city.</p>",
      "eventkoi-lite"
    ),
    summary: __("A ready-made listing to explore.", "eventkoi-lite"),
    date_type: "standard",
    event_days: [
      {
        start_date: startIso,
        end_date: endIso,
        all_day: false,
      },
    ],
    start_date: startIso,
    end_date: endIso,
    status: "draft",
    wp_status: "draft",
    type: "inperson",
    timezone: tz,
    timezone_display: true,
    standard_type: "continuous",
    image: demoImage,
    locations: [
      {
        id: "5d5799c6-ac2b-4d1d-869c-cf3282d0f83a",
        type: "physical",
        name: "Singapore Botanic Gardens Bandstand",
        address1: "6 Cluny Rd",
        address2: "",
        city: "Singapore",
        state: "",
        country: "Singapore",
        zip: "259573",
        embed_gmap: true,
        gmap_link:
          "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.774915409844!2d103.81382031158998!3d1.3103791616937597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31da1a1ed7caf6ed%3A0x27edef434c3270e4!2sSingapore%20Botanic%20Gardens%20Bandstand!5e0!3m2!1sen!2ssg!4v1761213367640!5m2!1sen!2ssg",
        virtual_url: "",
        latitude: "",
        longitude: "",
      },
    ],
    location: {
      type: "physical",
      name: "Singapore Botanic Gardens Bandstand",
      address1: "6 Cluny Rd",
      address2: "",
      city: "Singapore",
      state: "",
      country: "Singapore",
      zip: "259573",
      embed_gmap: true,
      gmap_link:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.774915409844!2d103.81382031158998!3d1.3103791616937597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31da1a1ed7caf6ed%3A0x27edef434c3270e4!2sSingapore%20Botanic%20Gardens%20Bandstand!5e0!3m2!1sen!2ssg!4v1761213367640!5m2!1sen!2ssg",
      virtual_url: "",
      latitude: "",
      longitude: "",
    },
    address1: "6 Cluny Rd",
    address2: "",
    address3: "",
    city: "Singapore",
    state: "",
    country: "Singapore",
    zip: "259573",
    embed_gmap: true,
    gmap_link:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.774915409844!2d103.81382031158998!3d1.3103791616937597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31da1a1ed7caf6ed%3A0x27edef434c3270e4!2sSingapore%20Botanic%20Gardens%20Bandstand!5e0!3m2!1sen!2ssg!4v1761213367640!5m2!1sen!2ssg",
  };

  const existingId = Number(window?.eventkoi_params?.demo_event_id) || 0;
  const existing = existingId ? await fetchEventById(existingId) : null;

  if (existing?.wp_status === "trash") {
    try {
      await apiRequest({
        path: `${eventkoi_params.api}/restore_event`,
        method: "POST",
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
        data: { event_id: existingId },
      });
    } catch (error) {
      console.error("Failed to restore demo event", error);
    }
  }

  const firstSave = await apiRequest({
    path: `${eventkoi_params.api}/update_event`,
    method: "POST",
    headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
    data: {
      event: {
        ...demoEvent,
        // Only reuse an existing ID if the event still exists.
        id: existing?.id || undefined,
      },
    },
  });

  const targetId = firstSave?.id || existing?.id || existingId;

  // Always run a second update so meta persists (new events need it, existing can re-sync defaults).
  const saved = targetId
    ? await apiRequest({
        path: `${eventkoi_params.api}/update_event`,
        method: "POST",
        headers: { "EVENTKOI-API-KEY": eventkoi_params.api_key },
        data: { event: { ...demoEvent, id: targetId } },
      })
    : firstSave;

  if (!saved?.id) {
  throw new Error("Demo event was not saved.");
  }

  await persistDemoEventId(saved.id);

  return Number(saved.id);
}
