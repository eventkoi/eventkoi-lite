import { Box } from "@/components/box";
import { EventDescription } from "@/components/event/event-description";
import { EventImage } from "@/components/event/event-image";
import { EventLocation } from "@/components/event/event-location";
import { EventName } from "@/components/event/event-name";
import { EventTemplate } from "@/components/event/event-template";
import { Heading } from "@/components/heading";
import { showToast } from "@/lib/toast";
import { APIProvider } from "@vis.gl/react-google-maps";
import apiRequest from "@wordpress/api-fetch";
import { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";

export function EditInstance() {
  const { id, timestamp } = useParams();
  const { instanceData: data, setInstanceData: setData } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});

  const [instanceStart, setInstanceStart] = useState(null);
  const [instanceEnd, setInstanceEnd] = useState(null);

  useEffect(() => {
    if (!timestamp) return;

    // Convert Unix timestamp to UTC ISO string
    const utcStartISO = new Date(Number(timestamp) * 1000).toISOString();
    const start = new Date(utcStartISO); // Safe in UTC
    setInstanceStart(start);

    if (
      data?.recurrence_rules?.[0]?.start_date &&
      data?.recurrence_rules?.[0]?.end_date
    ) {
      const rule = data.recurrence_rules[0];
      const ruleStart = new Date(rule.start_date);
      const ruleEnd = new Date(rule.end_date);
      const duration = ruleEnd.getTime() - ruleStart.getTime();
      const end = new Date(start.getTime() + duration);
      setInstanceEnd(end);
    }
  }, [timestamp, data?.recurrence_rules]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [instance, pluginSettings] = await Promise.all([
          apiRequest({
            path: `${eventkoi_params.api}/instance_data?id=${id}&timestamp=${timestamp}`,
          }),
          apiRequest({
            path: `${eventkoi_params.api}/settings`,
            method: "GET",
            headers: {
              "EVENTKOI-API-KEY": eventkoi_params.api_key,
            },
          }),
        ]);

        const merged = instance?.merged || {};
        setData(merged);
        setSettings(pluginSettings || {});
      } catch (err) {
        showToast({ message: "Failed to load instance." });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, timestamp, setData]);

  if (loading) return null;

  return (
    <div className="flex flex-col w-full gap-8">
      <Box container>
        <EventName
          isInstance
          timestamp={timestamp}
          startDate={instanceStart}
          endDate={instanceEnd}
          timezone={data.timezone}
          value={data.title}
          onChange={(val) => setData((prev) => ({ ...prev, title: val }))}
        />
      </Box>

      <Box container>
        <Heading level={3}>Location details</Heading>
        {settings?.gmap_api_key ? (
          <APIProvider apiKey={settings.gmap_api_key}>
            <EventLocation
              isInstance
              value={data}
              onChange={(val) => setData((prev) => ({ ...prev, ...val }))}
            />
          </APIProvider>
        ) : (
          <EventLocation
            isInstance
            value={data}
            onChange={(val) => setData((prev) => ({ ...prev, ...val }))}
          />
        )}
      </Box>

      <Box container className="gap-10">
        <Heading level={3}>Additional details</Heading>
        <EventImage
          isInstance
          value={data}
          onChange={(val) => setData((prev) => ({ ...prev, ...val }))}
        />
        <EventDescription
          isInstance
          value={data.description}
          onChange={(val) => setData((prev) => ({ ...prev, description: val }))}
        />
        <EventTemplate
          isInstance
          value={data}
          onChange={(val) => setData((prev) => ({ ...prev, ...val }))}
        />
      </Box>
    </div>
  );
}
