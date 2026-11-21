import { __, sprintf } from "@wordpress/i18n";
import { BookOpen, Inbox, Loader2, X } from "lucide-react";
import { forwardRef, useEffect, useRef, useState } from "react";

import { LogoIcon } from "@/components/logo-icon";
import { hideHelp, subscribeEmail, tourContext } from "@/tour/store";

// The pointer with click rays shown on steps that ask for a click.
export function ClickIcon() {
  return (
    <svg
      className="ek-tour-click"
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path d="M10.5 3.07495L9 4.49995" />
      <path d="M3.82502 5.9999L1.65002 5.3999" />
      <path d="M4.50001 9L3.07501 10.5" />
      <path d="M5.40002 1.6499L6.00002 3.8249" />
      <path d="M6.77774 7.26749C6.74866 7.19898 6.74071 7.12334 6.75491 7.05028C6.76911 6.97722 6.80481 6.91007 6.85744 6.85744C6.91007 6.80481 6.97722 6.76911 7.05028 6.75491C7.12334 6.74071 7.19898 6.74866 7.26749 6.77774L15.5175 10.1527C15.5909 10.1829 15.6529 10.2355 15.6945 10.3031C15.7361 10.3707 15.7552 10.4497 15.749 10.5288C15.7429 10.608 15.7117 10.6831 15.6602 10.7434C15.6086 10.8037 15.5392 10.8461 15.462 10.8645L12.2002 11.6452C12.0656 11.6774 11.9425 11.7462 11.8445 11.844C11.7466 11.9419 11.6776 12.0649 11.6452 12.1995L10.8652 15.462C10.8471 15.5395 10.8047 15.6091 10.7443 15.6609C10.6839 15.7128 10.6086 15.744 10.5293 15.7502C10.4499 15.7564 10.3707 15.7372 10.303 15.6953C10.2353 15.6535 10.1827 15.5912 10.1527 15.5175L6.77774 7.26749Z" />
    </svg>
  );
}

function CloseButton({ onClick, label }) {
  return (
    <button
      type="button"
      className="ek-tour-close"
      onClick={onClick}
      aria-label={label || __("Close tour", "eventkoi-lite")}
    >
      <X aria-hidden="true" />
    </button>
  );
}

function Lines({ body }) {
  const lines = Array.isArray(body) ? body : [body];
  return (
    <p className="ek-tour-body">
      {lines.map((line, index) => (
        <span key={index} className="ek-tour-line">
          {line}
        </span>
      ))}
    </p>
  );
}

/**
 * A tour popover.
 */
export const Popover = forwardRef(function Popover(
  { step, def, position, onClose, onBack, onNext },
  ref
) {
  const hasFooter = !!(def.counter || def.back || def.next || def.nextClicks);
  const arrowStyle =
    position?.arrow === "left"
      ? { top: position.arrowOffset }
      : position?.arrow === "top"
      ? { left: position.arrowOffset }
      : null;

  return (
    <div
      ref={ref}
      className={`ek-tour-pop${position?.arrow ? ` ek-tour-pop--arrow-${position.arrow}` : ""}`}
      style={{
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        visibility: position ? "visible" : "hidden",
      }}
      role="dialog"
      aria-labelledby={`ek-tour-title-${step}`}
    >
      {arrowStyle && <span className="ek-tour-arrow" style={arrowStyle} />}
      <CloseButton onClick={onClose} />
      {def.click && <ClickIcon />}
      <h2 className="ek-tour-title" id={`ek-tour-title-${step}`}>
        {def.title}
      </h2>
      <Lines body={def.body} />
      {hasFooter && (
        <div className="ek-tour-footer">
          <span className="ek-tour-counter">
            {def.counter
              ? sprintf(
                  /* translators: 1: current step, 2: number of steps. */
                  __("%1$s of %2$s", "eventkoi-lite"),
                  def.counter[0],
                  def.counter[1]
                )
              : ""}
          </span>
          <span className="ek-tour-actions">
            {def.back && (
              <button type="button" className="ek-tour-back" onClick={onBack}>
                {__("Back", "eventkoi-lite")}
              </button>
            )}
            {(def.next || def.nextClicks) && (
              <button type="button" className="ek-tour-next" onClick={onNext}>
                {def.nextLabel || __("Next", "eventkoi-lite")}
              </button>
            )}
          </span>
        </div>
      )}
    </div>
  );
});

/**
 * Step 1: the welcome from Lesley on the Plugins page.
 */
export const WelcomePopover = forwardRef(function WelcomePopover(
  { def, position, onClose, onBegin, starting, error },
  ref
) {
  const ctx = tourContext();
  const arrowStyle =
    position?.arrow === "left" ? { top: position.arrowOffset } : null;

  return (
    <div
      ref={ref}
      className={`ek-tour-pop ek-tour-pop--welcome${position?.arrow ? ` ek-tour-pop--arrow-${position.arrow}` : ""}`}
      style={{
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        visibility: position ? "visible" : "hidden",
      }}
      role="dialog"
      aria-labelledby="ek-tour-title-1"
    >
      {arrowStyle && <span className="ek-tour-arrow" style={arrowStyle} />}
      <CloseButton onClick={onClose} />
      <h2 className="ek-tour-title" id="ek-tour-title-1">
        {def.title}
      </h2>
      <Lines body={def.body} />
      <div className="ek-tour-person">
        <img src={ctx.avatar} alt="" width="40" height="40" />
        <span>
          <strong>{__("Lesley Sim", "eventkoi-lite")}</strong>
          <span>{__("Co-founder, EventKoi", "eventkoi-lite")}</span>
        </span>
      </div>
      <button
        type="button"
        className="ek-tour-begin"
        onClick={onBegin}
        disabled={starting}
        aria-busy={starting}
      >
        {starting && <Loader2 className="ek-tour-spin" aria-hidden="true" />}
        {__("Begin tour", "eventkoi-lite")}
      </button>
      {error && (
        <p className="ek-tour-error" role="alert">
          {__("The tour could not start. Please try again.", "eventkoi-lite")}
        </p>
      )}
    </div>
  );
});

/**
 * The Need more help box in the bottom right corner.
 */
export function HelpBox() {
  const ctx = tourContext();

  return (
    <aside className="ek-tour-help" aria-label={__("Need more help?", "eventkoi-lite")}>
      <div className="ek-tour-help-head">
        <LogoIcon width="14" height="18" />
        <span className="ek-tour-help-title">
          {__("Need more help?", "eventkoi-lite")}
        </span>
        <CloseButton
          onClick={hideHelp}
          label={__("Close help", "eventkoi-lite")}
        />
      </div>
      <a
        className="ek-tour-help-link"
        href={ctx.guideUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <BookOpen aria-hidden="true" />
        {__("Read setup guide", "eventkoi-lite")}
      </a>
      <a
        className="ek-tour-help-link"
        href={ctx.supportUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Inbox aria-hidden="true" />
        {__("Contact support", "eventkoi-lite")}
      </a>
    </aside>
  );
}

/**
 * Step 14: You made it, with the email signup.
 */
export function FinalModal({ onClose, onDone }) {
  const ctx = tourContext();
  const [email, setEmail] = useState(ctx.email || "");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const dialogRef = useRef(null);

  // Move focus into the dialog so screen readers announce it.
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (status === "sending") return;

    setStatus("sending");
    setMessage("");

    try {
      await subscribeEmail(email.trim());
      setStatus("sent");
      onDone();
    } catch (error) {
      setStatus("error");
      setMessage(
        error?.message ||
          __("Something went wrong. Please try again.", "eventkoi-lite")
      );
    }
  };

  return (
    <div className="ek-tour-overlay">
      <div
        ref={dialogRef}
        className="ek-tour-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ek-tour-final-title"
        tabIndex={-1}
      >
        <button
          type="button"
          className="ek-tour-close ek-tour-close--modal"
          onClick={onClose}
          aria-label={__("Close", "eventkoi-lite")}
        >
          <X aria-hidden="true" />
        </button>
        <div className="ek-tour-modal-side">
          <img src={ctx.avatar} alt="" width="108" height="106" />
          <strong>{__("Lesley Sim", "eventkoi-lite")}</strong>
          <span>{__("Co-founder, EventKoi", "eventkoi-lite")}</span>
        </div>
        <div className="ek-tour-modal-main">
          <h2 id="ek-tour-final-title">
            {__("You made it! Welcome onboard! 🥳", "eventkoi-lite")}
          </h2>
          <p>
            {__(
              "We built EventKoi to be fast, modern and built for today’s WordPress with the block editor and page builders.",
              "eventkoi-lite"
            )}
          </p>
          <p>{__("I sincerely hope you enjoy using it.", "eventkoi-lite")}</p>
          <img
            className="ek-tour-signature"
            src={ctx.signature}
            alt={__("Lesley Sim", "eventkoi-lite")}
            width="122"
            height="28"
          />
          <p className="ek-tour-sign-name">{__("Lesley Sim", "eventkoi-lite")}</p>
          <p>
            {__(
              "P.S. I’ve hand picked a list of the best articles and videos to help you get the most out of EventKoi.",
              "eventkoi-lite"
            )}
          </p>
          <p>{__("Would you like me to email it to you?", "eventkoi-lite")}</p>
          {status === "sent" ? (
            <p className="ek-tour-sent" role="status">
              {__("Thanks! Check your inbox.", "eventkoi-lite")}
            </p>
          ) : (
            <form className="ek-tour-form" onSubmit={submit}>
              <label className="screen-reader-text" htmlFor="ek-tour-email">
                {__("Email address", "eventkoi-lite")}
              </label>
              <input
                id="ek-tour-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
              <button type="submit" disabled={status === "sending"}>
                {status === "sending" && (
                  <Loader2 className="ek-tour-spin" aria-hidden="true" />
                )}
                {__("Email me", "eventkoi-lite")}
              </button>
              {status === "error" && (
                <p className="ek-tour-error" role="alert">
                  {message}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
