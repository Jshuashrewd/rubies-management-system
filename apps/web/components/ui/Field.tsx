import type { ReactNode } from "react";

/** Shared classes for native <input>/<select>/<textarea> controls. */
export const controlClasses =
  "w-full rounded-md border border-border-strong bg-canvas px-3.5 py-2.5 " +
  "font-body text-body-lg text-text-primary placeholder:text-text-secondary " +
  "outline-none focus:border-primary";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2xs">
      <label
        htmlFor={htmlFor}
        className="font-body text-label-lg font-semibold text-text-primary"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="font-body text-body-sm text-text-secondary">{hint}</p>
      ) : null}
      {error ? (
        <p role="alert" className="font-body text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
