import { useEffect } from "react";
import { __ } from "@wordpress/i18n";
import { createRoot } from "react-dom/client";
import {
  Navigate,
  Route,
  HashRouter as Router,
  Routes,
  useLocation,
} from "react-router-dom";

import { Dashboard } from "@/admin/dashboard";
import { DashboardOnboarding } from "@/admin/dashboard/onboarding";
import { DashboardOverview } from "@/admin/dashboard/overview";
import { Home } from "@/admin/home";

import { Events } from "@/admin/events";
import { EventEdit } from "@/admin/events/edit";
import { EventEditInstances } from "@/admin/events/edit/instances";
import { EditInstance } from "@/admin/events/edit/instances/edit-instance";
import { EventEditMain } from "@/admin/events/edit/main";
import { EventEditRsvp } from "@/admin/events/edit/rsvp";
import { EventEditAttendees } from "@/admin/events/edit/attendees";
import { EventEditManageTickets } from "@/admin/events/edit/tickets/manage-tickets";
import { EventEditSalesHistory } from "@/admin/events/edit/tickets/sales-history";
import { EventsOverview } from "@/admin/events/overview";
import { EventTemplates } from "@/admin/events/templates";

import { Calendars } from "@/admin/calendars";
import { CalendarEdit } from "@/admin/calendars/edit";
import { CalendarEditDetails } from "@/admin/calendars/edit/details";
import { CalendarEditEmbed } from "@/admin/calendars/edit/embed";
import { CalendarEditMain } from "@/admin/calendars/edit/main";
import { CalendarsOverview } from "@/admin/calendars/overview";

import { Tickets } from "@/admin/tickets";
import { Attendees } from "@/admin/tickets/attendees";
import { Customers } from "@/admin/tickets/customers";
import { Orders } from "@/admin/tickets/orders";
import { OrderView } from "@/admin/tickets/orders/view";
import { OrderRefundView } from "@/admin/tickets/orders/refund";

import { Settings } from "@/admin/settings";
import { SettingsFields } from "@/admin/settings/fields";
import { SettingsIntegrations } from "@/admin/settings/integrations";
import { SettingsOverview } from "@/admin/settings/overview";
import { SettingsEmails } from "@/admin/settings/emails";
import { SettingsPayments } from "@/admin/settings/payments";
import { SettingsImport } from "@/admin/settings/import";

import { Nav } from "@/components/nav";
import { FeatureDisabled } from "@/components/empty-state/FeatureDisabled";
import { Toaster } from "@/components/ui/sonner";

import { SettingsProvider } from "@/hooks/SettingsContext";
import { useWindowDimensions } from "@/lib/use-window-dimensions";

function AdminLayout() {
  const location = useLocation();
  const { width } = useWindowDimensions();
  const ticketsEnabled = !!window?.eventkoi_params?.tickets_feature_enabled;

  const isStandaloneView =
    /^\/tickets\/orders\/([0-9a-fA-F-]{36}|\d+)(\/refund)?$/.test(location.pathname) ||
    /^\/events\/\d+/.test(location.pathname) ||
    /^\/calendars\/\d+/.test(location.pathname);

  let offset = 0;
  if (width >= 960) offset = 160;
  if (width < 960 && width > 780) offset = 32;

  useEffect(() => {
    jQuery(".wp-toolbar").css({ backgroundColor: "inherit" });

    const menu = location.pathname?.split("/")?.[1];
    jQuery("#toplevel_page_eventkoi ul.wp-submenu-wrap li").removeClass(
      "current"
    );
    jQuery(
      '#toplevel_page_eventkoi ul.wp-submenu-wrap li a[href*="eventkoi#/' +
        menu +
        '"]'
    )
      .parent()
      .addClass("current");
  }, [location]);

  return (
    <div className="w-full flex flex-col">
      <Toaster
        expand
        position="bottom-right"
        visibleToasts={2}
        toastOptions={{
          unstyled: true,
          className: "",
          style: {
            right: "1rem",
            bottom: "1rem",
          },
        }}
      />
      {!isStandaloneView && <Nav />}
      <Routes>
        <Route index element={<Home />} />

        <Route path="dashboard" element={<Dashboard />}>
          <Route index element={<DashboardOverview />} />
          <Route path="overview" element={<DashboardOverview />} />
          <Route path="onboarding" element={<DashboardOnboarding />} />
          <Route path="*" element={<Home />} />
        </Route>

        <Route path="events" element={<Events />}>
          <Route index element={<EventsOverview />} />
          <Route path="" element={<EventsOverview />} />
          <Route path="templates" element={<EventTemplates />} />
        </Route>
        <Route path="events/:id" element={<EventEdit />}>
          <Route path="main" element={<EventEditMain />} />
          <Route path="rsvp" element={<EventEditRsvp />} />
          <Route path="instances" element={<EventEditInstances />} />
          <Route path="attendees" element={<EventEditAttendees />} />
          {ticketsEnabled ? (
            <>
              <Route path="manage-tickets" element={<EventEditManageTickets />} />
              <Route path="sales-history" element={<EventEditSalesHistory />} />
            </>
          ) : (
            <>
              <Route
                path="manage-tickets"
                element={
                  <FeatureDisabled
                    actionTo="../main"
                    actionLabel={__("Back to event", "eventkoi-lite")}
                  />
                }
              />
              <Route
                path="sales-history"
                element={
                  <FeatureDisabled
                    actionTo="../main"
                    actionLabel={__("Back to event", "eventkoi-lite")}
                  />
                }
              />
            </>
          )}
          <Route path="instances/edit/:timestamp" element={<EditInstance />} />
        </Route>

        <Route path="calendars" element={<Calendars />}>
          <Route index element={<CalendarsOverview />} />
          <Route path="" element={<CalendarsOverview />} />
        </Route>
        <Route path="calendars/:id" element={<CalendarEdit />}>
          <Route path="main" element={<CalendarEditMain />} />
          <Route path="details" element={<CalendarEditDetails />} />
          <Route path="embed" element={<CalendarEditEmbed />} />
        </Route>

        {ticketsEnabled ? (
          <>
            <Route path="tickets" element={<Tickets />}>
              <Route index element={<Orders />} />
              <Route path="" element={<Orders />} />
              <Route path="orders" element={<Orders />} />
              <Route path="customers" element={<Customers />} />
              <Route path="attendees" element={<Attendees />} />
            </Route>
            <Route path="tickets/orders/:id" element={<OrderView />} />
            <Route path="tickets/orders/:id/refund" element={<OrderRefundView />} />
          </>
        ) : (
          <>
            <Route
              path="tickets/*"
              element={<Navigate to="/events" replace />}
            />
            <Route
              path="tickets/orders/:id"
              element={<Navigate to="/events" replace />}
            />
            <Route
              path="tickets/orders/:id/refund"
              element={<Navigate to="/events" replace />}
            />
          </>
        )}

        <Route path="settings" element={<Settings />}>
          <Route index element={<SettingsOverview />} />
          <Route path="default" element={<SettingsOverview />} />
          {ticketsEnabled ? (
            <Route path="payments" element={<SettingsPayments />} />
          ) : (
            <Route
              path="payments"
              element={<Navigate to="/settings/default" replace />}
            />
          )}
          <Route path="emails" element={<SettingsEmails />} />
          <Route path="fields" element={<SettingsFields />} />
          <Route path="integrations" element={<SettingsIntegrations />} />
          <Route path="import" element={<SettingsImport />} />
        </Route>

        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  );
}

const rootElement = document.getElementById("eventkoi-admin");

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <SettingsProvider>
        <AdminLayout />
      </SettingsProvider>
    </Router>
  );
}
