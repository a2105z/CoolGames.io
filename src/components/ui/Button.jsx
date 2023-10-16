import { Link } from "react-router-dom";

const baseStyles =
  "inline-flex items-center justify-center rounded-xl2 px-4 py-2 text-sm font-semibold transition-all duration-200 ease-game focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg";

const variants = {
  primary:
    "bg-brand-primary text-slate-950 hover:bg-brand-primaryHover hover:-translate-y-0.5",
  secondary:
    "border border-brand-border bg-brand-panel text-brand-text hover:border-brand-primary hover:text-brand-primary",
  ghost:
    "text-brand-muted hover:bg-brand-panelSoft hover:text-brand-text",
};

function Button({
  children,
  variant = "primary",
  className = "",
  to,
  type = "button",
  ...props
}) {
  const classes = `${baseStyles} ${variants[variant] ?? variants.primary} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}

export default Button;
