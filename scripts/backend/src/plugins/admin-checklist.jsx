import { ArrowLeft, CircleCheck, CircleDotDashed } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { LogoIcon } from "@/components/logo-icon";

const steps = [
  { key: "event", title: "Publish demo event" },
  { key: "view", title: "View default calendar" },
];

function GlobalOnboardingWidget() {
  const computeShouldShow = useMemo(() => {
    return () => {
      if (typeof window === "undefined") return false;
      if (window.location.search.includes("page=eventkoi")) return false;
      const active =
        window.localStorage.getItem("eventkoi_onboarding_active") === "1";
      const done =
        window.localStorage.getItem("eventkoi_onboarding_demo_complete") ===
        "1";
      return active && !done;
    };
  }, []);

  const [show, setShow] = useState(computeShouldShow);

  useEffect(() => {
    const handleStorage = () => setShow(computeShouldShow());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [computeShouldShow]);

  if (!show) {
    return null;
  }

  const containerStyle = {
    position: "fixed",
    bottom: "32px",
    right: "32px",
    zIndex: 9999,
    width: "250px",
    borderRadius: "10px",
    boxSizing: "border-box",
    background: "#ffffff",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    border: "1px solid #e5e5e5",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    padding: "16px",
  };

  const dividerStyle = {
    height: "1px",
    background: "#e5e5e5",
    marginTop: "16px",
    marginBottom: "12px",
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const footerStyle = {
    fontSize: "12px",
    color: "#555",
    marginTop: "16px",
  };

  return (
    <div style={containerStyle} className="eventkoi-onboarding-widget">
      <button
        type="button"
        style={{
          position: "absolute",
          top: "-64px",
          left: 0,
          width: "100%",
          height: "50px",
          background: "#161616",
          color: "#FBFBFB",
          border: "none",
          borderRadius: "10px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 0.2s",
          boxSizing: "border-box",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#000")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#161616")}
        onClick={() => {
          try {
            const params = new URLSearchParams(window.location.search);
            params.set("onboarding", "demo-event");
            params.set("hint", "1");
            const demoId =
              window.eventkoi_params?.demo_event_id ||
              window.localStorage.getItem("eventkoi_demo_event_id");
            if (demoId) {
              params.set("demo_event_id", demoId);
            }
            const base =
              window.eventkoi_params?.admin_page ||
              "/wp-admin/admin.php?page=eventkoi";
            window.location.href = `${base}#/events?${params.toString()}`;
          } catch {
            // ignore
          }
        }}
        data-eventkoi-continue
      >
        <ArrowLeft style={{ width: "16px", height: "16px" }} />
        <span>Continue Guide</span>
      </button>

      <div style={headerStyle}>
        <LogoIcon width="18" height="23" />
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>
          EventKoi Plugin Tour
        </div>
        <button
          type="button"
          style={{
            marginLeft: "auto",
            background: "none",
            border: 0,
            color: "#777",
            cursor: "pointer",
            padding: 0,
            fontSize: "24px",
            lineHeight: 1,
            borderRadius: "6px",
            marginTop: "-4px",
          }}
          onClick={() => {
            window.localStorage.removeItem("eventkoi_onboarding_active");
            setShow(false);
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div style={dividerStyle} />

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {steps.map((step, index) => {
          const isActive = index === 0;
          const isComplete = false;
          return (
            <button
              key={step.key}
              type="button"
              style={{
                width: "100%",
                height: "36px",
                borderRadius: "10px",
                padding: "8px 12px",
                textAlign: "left",
                transition: "all 0.2s",
                background: isActive ? "#ffffff" : "#ffffff",
                color: isComplete ? "#137C63" : "#161616",
                fontSize: "14px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                border: "none",
                cursor: "default",
              }}
            >
              {isComplete ? (
                <CircleCheck
                  style={{
                    width: "16px",
                    height: "16px",
                    color: "#137C63",
                  }}
                />
              ) : (
                <CircleDotDashed
                  style={{
                    width: "16px",
                    height: "16px",
                    color: "#161616",
                  }}
                />
              )}
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: isComplete ? "#137C63" : "#161616",
                }}
              >
                {step.title}
              </span>
            </button>
          );
        })}
      </div>

      <div style={dividerStyle} />

      <div style={footerStyle}>
        You can restart this Guide any time in the EventKoi Dashboard.
      </div>
    </div>
  );
}

function mountWidget() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(<GlobalOnboardingWidget />);
}

document.addEventListener("DOMContentLoaded", () => {
  const isAdmin =
    window?.eventkoi_params?.is_admin || window?.eventkoi_params?.isAdmin;
  if (!isAdmin) return;

  mountWidget();
});
