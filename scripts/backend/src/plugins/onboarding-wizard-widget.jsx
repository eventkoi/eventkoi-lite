import { ArrowLeft, CircleCheck, CircleDotDashed } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { LogoIcon } from "@/components/logo-icon";

const ACTIVE_KEY = "eventkoi_onboarding_wizard_active";
const DONE_KEY = "eventkoi_onboarding_wizard_done";
const STEP_KEY = "eventkoi_onboarding_wizard_step";

const wizardSteps = [{ key: "calendar", title: "Set calendar defaults" }];
const stepOrder = ["license", "calendar", "datetime"];

const normalizeStep = (step) => {
  if (step === "defaults") return "calendar";
  return step;
};

const getOnboardingStepFromHash = () => {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash || "";
  const [, search] = hash.split("?");
  if (!search) return null;
  const params = new URLSearchParams(search);
  const step = normalizeStep(params.get("step"));
  return stepOrder.includes(step) || step === "done" ? step : null;
};

const isOnboardingRoute = () => {
  if (typeof window === "undefined") return false;
  const search = window.location.search || "";
  const hash = window.location.hash || "";
  return (
    search.includes("page=eventkoi") && hash.includes("/dashboard/onboarding")
  );
};

const persistStateFromHash = () => {
  if (!isOnboardingRoute()) return;

  const step = getOnboardingStepFromHash();
  if (step === "done") {
    try {
      window.localStorage.setItem(DONE_KEY, "1");
      window.localStorage.removeItem(ACTIVE_KEY);
      window.localStorage.removeItem(STEP_KEY);
    } catch {
      // Ignore localStorage issues.
    }
    return;
  }

  if (!step) return;

  try {
    window.localStorage.setItem(ACTIVE_KEY, "1");
    window.localStorage.removeItem(DONE_KEY);
    window.localStorage.setItem(STEP_KEY, step);
  } catch {
    // Ignore localStorage issues.
  }
};

function WizardWidget() {
  const computeShouldShow = useMemo(() => {
    return () => {
      if (typeof window === "undefined") return false;
      if (isOnboardingRoute()) return false;
      try {
        const active = window.localStorage.getItem(ACTIVE_KEY) === "1";
        const done = window.localStorage.getItem(DONE_KEY) === "1";
        return active && !done;
      } catch {
        return false;
      }
    };
  }, []);

  const [show, setShow] = useState(computeShouldShow);
  const [storedStep, setStoredStep] = useState(() => {
    try {
      return normalizeStep(window.localStorage.getItem(STEP_KEY) || "license");
    } catch {
      return "license";
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      setShow(computeShouldShow());
      try {
        setStoredStep(
          normalizeStep(window.localStorage.getItem(STEP_KEY) || "license")
        );
      } catch {
        // Ignore localStorage issues.
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [computeShouldShow]);

  useEffect(() => {
    const handleHash = () => {
      persistStateFromHash();
      setShow(computeShouldShow());
      try {
        setStoredStep(
          normalizeStep(window.localStorage.getItem(STEP_KEY) || "license")
        );
      } catch {
        // ignore
      }
    };

    persistStateFromHash();
    setShow(computeShouldShow());
    try {
      setStoredStep(
        normalizeStep(window.localStorage.getItem(STEP_KEY) || "license")
      );
    } catch {
      // ignore
    }
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [computeShouldShow]);

  const containerStyle = {
    position: "fixed",
    bottom: "32px",
    right: "32px",
    zIndex: 9999,
    width: "280px",
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

  if (!show) {
    return null;
  }

  const targetUrlBase =
    window.eventkoi_params?.admin_page || "/wp-admin/admin.php?page=eventkoi";
  const currentStep = stepOrder.includes(storedStep)
    ? storedStep
    : wizardSteps[0].key;
  const activeIndex = Math.max(0, stepOrder.indexOf(currentStep));
  const targetStep =
    currentStep === "calendar" ? "datetime" : currentStep || "license";
  const continueUrl = `${targetUrlBase}#/dashboard/onboarding?step=${encodeURIComponent(
    targetStep
  )}`;

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
            window.localStorage.setItem(ACTIVE_KEY, "1");
            window.localStorage.removeItem(DONE_KEY);
            window.localStorage.setItem(STEP_KEY, targetStep);
          } catch {
            // Ignore localStorage issues.
          }
          window.location.href = continueUrl;
        }}
        data-eventkoi-continue
      >
        <ArrowLeft style={{ width: "16px", height: "16px" }} />
        <span>Continue Onboarding Wizard</span>
      </button>

      <div style={headerStyle}>
        <LogoIcon width="18" height="23" />
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>
          EventKoi Onboarding Wizard
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
            try {
              window.localStorage.removeItem(ACTIVE_KEY);
              window.localStorage.removeItem(STEP_KEY);
            } catch {
              // ignore
            }
            setShow(false);
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div style={dividerStyle} />

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {wizardSteps.map((step, index) => {
          const isActive = step.key === targetStep;
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
                background: "#ffffff",
                color: isComplete ? "#137C63" : "#161616",
                fontSize: "14px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                border: "none",
                cursor: "default",
                boxShadow: "none",
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
                  textDecoration: isComplete ? "line-through" : "none",
                  color: isComplete ? "#137C63" : "#161616",
                }}
              >
                {step.title}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          height: "1px",
          width: "100%",
          background: "#e5e5e5",
          marginTop: "4px",
        }}
      />

      <div style={footerStyle}>
        You can restart the onboarding any time in the EventKoi Dashboard.
      </div>
    </div>
  );
}

if (typeof document !== "undefined") {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const root = createRoot(mount);
  root.render(<WizardWidget />);
}
