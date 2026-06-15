import { __, sprintf } from "@wordpress/i18n";

export function ShareLink({ event, icon, title, name }) {
  const shareLabel = sprintf(
    /* translators: %s: share service name. */
    __("Share this event via %s", "eventkoi-lite"),
    title
  );

  const handleShare = () => {
    const url = encodeURIComponent(event?.url);
    const text = encodeURIComponent(event?.title);
    const subject = `RE: ${text}`;

    if (name === "whatsapp") {
      window.open(
        `https://api.whatsapp.com/send?text=${text} ${url}`,
        "_blank"
      );
    }

    if (name === "x") {
      window.open(
        `https://x.com/intent/post?url=${url}&text=${text}`,
        "_blank"
      );
    }

    if (name === "facebook") {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        "_blank"
      );
    }

    if (name === "linkedin") {
      window.open(
        `https://www.linkedin.com/shareArticle/?mini=true&url=${url}&text=${text}`,
        "_blank"
      );
    }

    if (name === "instagram") {
      window.open(`https://www.instagram.com/?url=${url}`, "_blank");
    }

    if (name === "email") {
      window.open(`mailto:?&subject=${subject}&cc=&bcc=&body=${url}`, "_self");
    }
  };

  return (
    <a
      href="#"
      role="button"
      aria-label={shareLabel}
      title={shareLabel}
      className="flex flex-col gap-1 items-center justify-center no-underline text-sm text-foreground/90 hover:text-foreground group"
      onClick={(e) => {
        e.preventDefault();
        handleShare();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleShare();
        }
      }}
      rel="noopener noreferrer"
    >
      <span className="rounded-full bg-accent group-hover:bg-input flex items-center justify-center w-16 h-16">
        {icon}
        <span className="sr-only">{shareLabel}</span>
      </span>
      <span>{title}</span>
    </a>
  );
}
