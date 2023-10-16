function SectionHeading({ eyebrow, title, subtitle, className = "" }) {
  return (
    <header className={className}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 font-display text-2xl font-bold text-brand-text md:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-2 max-w-2xl text-brand-muted">{subtitle}</p> : null}
    </header>
  );
}

export default SectionHeading;
