import type { ButtonHTMLAttributes } from "react";

type Variant = "accent" | "primary" | "outline";

const VARIANT_CLASSES: Record<Variant, string> = {
  accent: "bg-accent text-white hover:bg-accent-hover",
  primary: "bg-primary text-white hover:bg-primary-hover",
  outline:
    "bg-transparent text-text-primary border border-border-strong hover:bg-canvas-tint",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

/** Standard action button: accent (single CTA per screen), primary, or outline. */
export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={[
        "inline-flex h-[52px] items-center justify-center rounded-md px-lg",
        "font-body text-title-md font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        className,
      ].join(" ")}
    >
      {loading ? (
        <span
          aria-hidden
          className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      ) : (
        children
      )}
      {loading ? <span className="sr-only">Loading</span> : null}
    </button>
  );
}
