import { LogoIcon } from "@/components/logo-icon";
import { Button } from "@/components/ui/button";
import { renderToStaticMarkup } from "react-dom/server";

const shouldShowWidget = () => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const onboarding = params.get("onboarding");
  const isAdmin = Boolean(window.eventkoi_params?.is_admin);
  return onboarding === "demo-event" && isAdmin;
};

const Widget = () => (
  <div
    className="eventkoi-onboarding-widget fixed bottom-8 right-8 z-50 w-[250px] rounded-lg border border-solid border-border bg-white shadow-xl p-4 space-y-4"
    style={{
      boxSizing: "border-box",
      fontFamily: "Inter, system-ui, sans-serif",
    }}
  >
    <div className="flex items-center gap-2">
      <LogoIcon width="18" height="23" />
      <div className="text-[14px] font-semibold text-black">
        <span className="block">EventKoi Plugin Tour</span>
      </div>
      <button
        type="button"
        className="ml-auto text-[#555] hover:text-black transition-colors leading-none -mt-1"
        aria-label="Close"
        style={{
          background: "transparent",
          border: "none",
          fontSize: "20px",
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </div>
    <div className="h-[1px] w-full bg-border" />
    <div
      className="flex flex-col gap-3 rounded-md p-3"
      style={{ background: "#EDFBF8" }}
    >
      <div className="flex items-start gap-2">
        <span className="text-[16px]" aria-hidden="true">
          🥳
        </span>
        <p
          className="text-[14px] font-medium m-0"
          style={{ color: "#137C63", fontWeight: 500 }}
        >
          Hooray! You’ve completed the Quick Start Guide.
        </p>
      </div>
      <Button
        asChild
        className="w-full h-8 text-[14px] rounded-sm font-medium text-[#FBFBFB] bg-[#161616] hover:bg-black"
        data-eventkoi-dashboard
        style={{ boxSizing: "border-box" }}
      >
        <a
          className="no-underline"
          href={`${
            window.eventkoi_params?.admin_page ||
            "/wp-admin/admin.php?page=eventkoi"
          }#/dashboard`}
        >
          Go to EventKoi Dashboard
        </a>
      </Button>
      <Button
        asChild
        variant="outline"
        className="w-full rounded-sm border border-solid border-input py-2 h-12 text-[14px] font-medium hover:bg-white text-[#161616] whitespace-normal"
        style={{ boxSizing: "border-box" }}
      >
        <a
          className="no-underline text-[#161616] text-center"
          href="https://eventkoi.com/docs/knowledge-base/how-to-customise-the-default-events-template/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn how to edit Event Template
        </a>
      </Button>
    </div>
    <div className="h-[1px] w-full bg-border" />
    <p className="text-[12px] text-[#555] m-0">
      You can restart this Guide any time in the EventKoi Dashboard.
    </p>
  </div>
);

const renderWidget = () => {
  if (!shouldShowWidget()) return;
  if (document.querySelector(".eventkoi-onboarding-widget")) return;

  const defaultCalId =
    Number(window.eventkoi_params?.default_cal_id) > 0
      ? Number(window.eventkoi_params.default_cal_id)
      : null;
  const calendarContainer = document.querySelector(
    '.eventkoi-front [id^="eventkoi-calendar-"][data-calendar-id]'
  );
  const calendarId = calendarContainer
    ? Number(calendarContainer.getAttribute("data-calendar-id"))
    : null;

  if (!defaultCalId || calendarId !== defaultCalId) return;

  const html = renderToStaticMarkup(<Widget />);
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  const el = wrapper.firstElementChild;
  if (!el) return;

  const closeBtn = el.querySelector("button[aria-label='Close']");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => el.remove());
  }

  document.body.appendChild(el);
};

if (typeof window !== "undefined") {
  const ready = () => renderWidget();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready);
  } else {
    ready();
  }
}
