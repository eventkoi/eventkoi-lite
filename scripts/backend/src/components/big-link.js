export function BigLink({ href, children, disabled = false }) {
  return (
    <a
      href={disabled ? undefined : href}
      target={disabled ? undefined : "_blank"}
      aria-disabled={disabled}
      className={`
        flex border rounded-xl items-center text-base px-6 py-4 h-[70px]
        ${
          disabled
            ? "bg-muted text-muted-foreground border-muted opacity-50 cursor-not-allowed pointer-events-none"
            : "bg-transparent text-card-foreground hover:bg-accent border-input hover:border-foreground/40"
        }
      `}
    >
      {children}
    </a>
  );
}
