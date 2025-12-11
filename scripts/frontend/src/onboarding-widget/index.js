import { LogoIcon } from "@/components/logo-icon";
import { ArrowLeft, CircleCheck, CircleDotDashed } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

const shouldShowWidget = () => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const onboarding = params.get("onboarding");
  const isAdmin = Boolean(window.eventkoi_params?.is_admin);
  return onboarding === "demo-event" && isAdmin;
};

const Widget = ({ steps }) => (
  <div
    className="eventkoi-onboarding-widget fixed bottom-8 right-8 z-50 w-[250px] rounded-lg border border-solid border-border bg-white shadow-xl p-4"
    style={{
      boxSizing: "border-box",
      fontFamily: "Inter, system-ui, sans-serif",
    }}
  >
    <button
      type="button"
      className="absolute bg-[#161616] cursor-pointer hover:bg-black text-[#FBFBFB] -top-[71px] left-0 w-full h-[50px] rounded-lg border-none shadow-md flex items-center justify-center text-[14px] font-semibold gap-2 transition"
      style={{ boxSizing: "border-box", fontWeight: 600 }}
      data-eventkoi-continue
    >
      <ArrowLeft className="h-4 w-4" />
      <span>Continue Guide</span>
    </button>
    <div className="space-y-4">
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
      <div className="space-y-1">
        <div className="h-[1px] w-full bg-border" />
        <div className="h-1" />
        {steps.map((step) => {
          const textColor = step.complete ? "#137C63" : "#161616";
          const stepBg =
            step.key === "view" && !step.complete ? "#e6e6e6" : "white";
          const textWeight =
            step.key === "view" && !step.complete ? "600" : "500";
          return (
            <button
              key={step.key}
              type="button"
              className={`w-full h-9 rounded-lg cursor-default border px-3 py-3 text-left transition text-[14px] font-medium border-none flex items-center focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                step.complete ? "line-through" : ""
              }`}
              style={{
                color: textColor,
                background: stepBg,
                fontWeight: textWeight,
              }}
            >
              <div className="flex items-center gap-2">
                {step.complete ? (
                  <CircleCheck
                    className="h-4 w-4"
                    style={{ color: "#137C63" }}
                  />
                ) : (
                  <CircleDotDashed
                    className="h-4 w-4"
                    style={{ color: textColor }}
                  />
                )}
                <span
                  className="text-[14px] font-medium"
                  style={{ color: textColor }}
                >
                  {step.title}
                </span>
              </div>
            </button>
          );
        })}
        <div className="h-[1px] w-full bg-border" />
      </div>
      <div className="text-[12px] text-[#555] font-sans">
        You can restart this Tour any time in the EventKoi Dashboard.
      </div>
    </div>
  </div>
);

const renderWidget = () => {
  if (!shouldShowWidget()) return;
  if (document.querySelector(".eventkoi-onboarding-widget")) return;

  const demoId =
    window.eventkoi_params?.event?.id ||
    new URLSearchParams(window.location.search).get("demo_event_id");
  const configuredDemo =
    Number(window.eventkoi_params?.demo_event_id) > 0
      ? Number(window.eventkoi_params.demo_event_id)
      : null;

  const eventContainer = document.querySelector(".eventkoi-front[data-event]");
  const pageEventId = eventContainer
    ? Number(eventContainer.getAttribute("data-event"))
    : null;

  const targetDemo = demoId || configuredDemo;
  if (!targetDemo || pageEventId !== Number(targetDemo)) {
    return;
  }

  const steps = [
    { key: "event", title: "Publish demo event", complete: true },
    { key: "view", title: "View default calendar", complete: false },
  ];

  const html = renderToStaticMarkup(<Widget steps={steps} />);
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  const el = wrapper.firstElementChild;
  if (!el) return;

  const closeBtn = el.querySelector("button[aria-label='Close']");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => el.remove());
  }

  const continueBtn = el.querySelector("[data-eventkoi-continue]");
  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      const fallbackDemo =
        window.eventkoi_params?.demo_event_id &&
        Number(window.eventkoi_params.demo_event_id) > 0
          ? window.eventkoi_params.demo_event_id
          : null;
      const targetDemo = demoId || fallbackDemo;
      if (!targetDemo) return;
      const base =
        window.eventkoi_params?.admin_page ||
        "/wp-admin/admin.php?page=eventkoi";
      const adminUrl = `${base}#/events/${targetDemo}/main?onboarding=demo-event&hint=4`;
      window.location.href = adminUrl;
    });
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
