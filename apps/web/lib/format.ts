// Small date/time helpers, mirroring apps/mobile/src/lib/format.ts so the
// schedule reads the same way on both surfaces.
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Whole minutes from now until the given instant (negative if past). */
export function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
}

/** Combined day + time, for admin tables that need both at a glance. */
export function formatDateTime(iso: string): string {
  return `${formatDay(iso)}, ${formatTime(iso)}`;
}
