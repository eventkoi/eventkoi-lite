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
    className="eventkoi-onboarding-widget fixed bottom-8 right-8 z-50 w-[250px] rounded-lg shadow-md"
    style={{
      boxSizing: "border-box",
      fontFamily: "Inter, system-ui, sans-serif",
    }}
  >
    <div className="flex items-center gap-2 bg-[#EDFBF8] p-4 rounded-t-lg">
      <span className="text-[18px]" aria-hidden="true">
        🥳
      </span>
      <div className="text-[14px] font-semibold text-[#0D5342] leading-tight">
        <span className="block">EventKoi Plugin Tour Completed!</span>
      </div>
      <button
        type="button"
        className="ml-auto p-0 text-[#555] hover:text-black transition-colors leading-none -mt-1"
        aria-label="Close"
        style={{
          background: "transparent",
          border: "none",
          fontSize: "24px",
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </div>
    <div className="p-4 border border-solid border-border bg-white rounded-b-lg flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <div className="text-[14px] text-[#161616] font-medium text-center w-full">
          What you can do next:
        </div>
        <Button
          asChild
          className="w-full h-10 text-[12px] rounded-sm font-medium text-[#FBFBFB] bg-[#161616] hover:bg-black"
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
          className="w-full rounded-sm border border-solid border-[#161616] py-2 h-10 text-[12px] font-medium hover:bg-white text-[#161616] whitespace-normal"
          style={{ boxSizing: "border-box" }}
        >
          <a
            className="no-underline text-[#161616] text-center"
            href="https://eventkoi.com/docs/knowledge-base/how-to-customise-the-default-events-template/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn how to customize an Event Template
          </a>
        </Button>
      </div>
      <div className="h-[1px] w-full bg-border" />
      <p className="text-[12px] text-[#555] m-0 font-sans">
        You can restart this Tour any time in the EventKoi Dashboard.
      </p>
    </div>
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
