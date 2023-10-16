function Chip({ children, tone = "default", className = "" }) {
  const tones = {
    default: "border-brand-border bg-brand-panelSoft text-brand-muted",
    accent: "border-brand-accent/40 bg-brand-accent/10 text-brand-text",
    primary: "border-brand-primary/30 bg-brand-primary/10 text-brand-text",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tones[tone] ?? tones.default} ${className}`}
    >
      {children}
    </span>
  );
}

export default Chip;
