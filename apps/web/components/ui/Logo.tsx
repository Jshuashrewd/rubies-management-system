"use client";

// Renders /public/logo.png (put the academy's logo file there — see
// README note in that folder). Falls back to the text wordmark if the
// file isn't there yet, so nothing breaks before it's added.
import { useState } from "react";

const SIZES = {
  sm: { box: 28, text: "text-title-md" },
  lg: { box: 56, text: "text-headline-md" },
} as const;

export function Logo({
  size = "sm",
  onDark = false,
}: {
  size?: keyof typeof SIZES;
  /** Set true on a dark/primary-colored background (e.g. the login brand panel). */
  onDark?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const { box, text } = SIZES[size];
  const textColor = onDark ? "text-white" : "text-primary";

  if (imageFailed) {
    return (
      <span className={`font-display ${text} font-semibold ${textColor}`}>
        Rubies Code School
      </span>
    );
  }

  return (
    <span className="flex items-center gap-xs">
      {/* eslint-disable-next-line @next/next/no-img-element -- small static logo, not worth next/image's overhead */}
      <img
        src="/logo.png"
        alt="Rubies Code School"
        style={{ height: box, width: box, objectFit: "contain" }}
        onError={() => setImageFailed(true)}
      />
      <span className={`font-display ${text} font-semibold ${textColor}`}>
        Rubies Code School
      </span>
    </span>
  );
}
