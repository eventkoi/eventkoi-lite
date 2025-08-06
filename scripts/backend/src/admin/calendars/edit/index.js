import { CalendarHeader } from "@/components/calendar/calendar-header";
import { CalendarTabs } from "@/components/calendar/calendar-tabs";
import { NotFound } from "@/components/empty-state/NotFound";
import { Wrapper } from "@/components/wrapper";
import { useSettings } from "@/hooks/SettingsContext";
import { cn } from "@/lib/utils";
import apiRequest from "@wordpress/api-fetch";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export function CalendarEdit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, refreshSettings } = useSettings();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [calendar, setCalendar] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const parent = location.pathname?.split("/");
  const view = parent[3];
  const calendarId = parseInt(id) || 0;

  const showToast = (response) => {
    if (!response.message) return;

    const toastId = toast(
      <div
        className="flex items-center cursor-pointer active:ring-2 active:ring-ring active:ring-offset-2 bg-[#222222] rounded-sm border-0 font-medium justify-between p-4 gap-4 text-sm leading-5 text-primary-foreground w-60"
        onClick={() => toast.dismiss(toastId)}
      >
        {response.message}
        {response.url && (
          <div
            onClick={() => window.open(response.url, "_blank")}
            className="underline underline-offset-2 hover:no-underline"
          >
            View event
          </div>
        )}
      </div>,
      { duration: 4000 }
    );
  };

  const getCalendar = async () => {
    try {
      const response = await apiRequest({
        path: `${eventkoi_params.api}/calendar?id=${calendarId}`,
        method: "get",
      });
      setCalendar(response);
    } catch (error) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!view) {
      navigate("main");
    }
  }, [location]);

  useEffect(() => {
    const initNewCalendar = async () => {
      const newSettings = await refreshSettings();

      // Build the default calendar using current fresh settings
      const defaultStartDay = (() => {
        const orderedKeys = [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ];
        const dayIndex = parseInt(newSettings?.week_starts_on ?? "0", 10);
        return orderedKeys[dayIndex] ?? "monday";
      })();

      setCalendar({
        ...eventkoi_params.new_calendar,
        startday: defaultStartDay, // ✅ inject fresh default
      });

      setLoading(false);
    };

    if (!calendarId) {
      initNewCalendar();
    } else {
      getCalendar();
    }
  }, []);

  // ✅ BLOCK render until everything is ready
  if (loading || !settings || (!calendar && !calendarId)) {
    return null;
  }

  if (notFound || (calendarId && !calendar?.id)) {
    return <NotFound type="calendar" />;
  }

  return (
    <>
      <CalendarHeader
        loading={loading}
        setLoading={setLoading}
        calendar={calendar}
        setCalendar={setCalendar}
      />
      <Wrapper className="max-w-[1180px]">
        <div
          className={cn(
            "w-full mx-auto items-start gap-6",
            "grid grid-cols-1 md:grid-cols-[180px_1fr]"
          )}
        >
          <CalendarTabs
            calendar={calendar}
            setCalendar={setCalendar}
            location={location}
          />
          <div className="grid">
            <Outlet context={[calendar, setCalendar]} />
          </div>
        </div>
        <div className="h-10" />
      </Wrapper>
    </>
  );
}
