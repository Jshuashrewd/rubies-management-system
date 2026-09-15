import type { HTMLAttributes } from "react";

/** White surface with a structural border — no floaty shadow. */
export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["rounded-lg border border-border bg-canvas p-md", className].join(
        " ",
      )}
      {...rest}
    />
  );
}
