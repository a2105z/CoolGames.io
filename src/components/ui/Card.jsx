function Card({ title, description, children, className = "" }) {
  return (
    <article
      className={`rounded-xl2 border border-brand-border bg-brand-panel p-5 shadow-md transition-all duration-200 ease-game hover:-translate-y-1 hover:border-brand-primary/50 hover:shadow-glow ${className}`}
    >
      {title ? (
        <h3 className="font-display text-lg font-bold text-brand-text">{title}</h3>
      ) : null}
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">{description}</p>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </article>
  );
}

export default Card;
