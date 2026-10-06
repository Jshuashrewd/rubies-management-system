// Watches the student's schedule and automatically shows the full-screen
// lock (strict-mode-lock.tsx) starting LOCK_BEFORE_MIN before a class and
// until it ends — but only for students whose parent has turned Strict
// Mode ON (student.strictModeEnabled). This is the "auto" half of Strict
// Mode; the on/off toggle itself lives in strict-mode.tsx (settings).
//
// Deliberately separate from RemindersProvider even though both watch the
// same schedule: reminders are advisory (a notification), this is
// enforcement (blocks the UI) — keeping them apart means a bug in one
// can't accidentally disable the other.
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { AppState } from "react-native";
import type { ClassSession, Student } from "@rubies/shared";
import { api } from "./api";
import { useAuth } from "./auth";

/** How long before a class the lock engages — matches the last alarm tier
 * in notifications.ts, so the lock and the final reminders line up. */
const LOCK_BEFORE_MIN = 10;
const CHECK_INTERVAL_MS = 20_000;

interface StrictModeState {
  /** Call when the student taps "Join" on the lock screen — releases the
   * lock for that class before navigating to Zoom. */
  releaseForJoin: (classId: string) => Promise<void>;
}

const StrictModeContext = createContext<StrictModeState | undefined>(undefined);

export function StrictModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const lockedClassId = useRef<string | null>(null);

  const schedule = useQuery({
    queryKey: ["schedule"],
    queryFn: () => api.schedule.list(),
    enabled: !!user,
  });

  // Mobile is student-only (trainers use the web console), so a signed-in
  // user here is always a Student — safe to read student-only fields.
  const strictModeEnabled = (user as Student | null)?.strictModeEnabled ?? false;

  function findActiveSession(sessions: ClassSession[]): ClassSession | null {
    const now = Date.now();
    return (
      sessions.find((s) => {
        if (s.status !== "scheduled" && s.status !== "live") return false;
        const lockFrom = new Date(s.scheduledStartAt).getTime() - LOCK_BEFORE_MIN * 60_000;
        const lockUntil = new Date(s.scheduledEndAt).getTime();
        return now >= lockFrom && now < lockUntil;
      }) ?? null
    );
  }

  async function check() {
    if (!user || !strictModeEnabled || !schedule.data) return;

    const active = findActiveSession(schedule.data);

    if (active && lockedClassId.current !== active.id) {
      // Entering a new lock window.
      lockedClassId.current = active.id;
      void api.events
        .strictModeActivate({ classId: active.id, source: "auto" })
        .catch(() => undefined); // best effort — don't block the lock on a network hiccup
      router.push({ pathname: "/strict-mode-lock", params: { classId: active.id } });
      return;
    }

    if (!active && lockedClassId.current) {
      // The window ended (class time passed) while still locked — release
      // and let the lock screen's own effect pop itself.
      const endedClassId = lockedClassId.current;
      lockedClassId.current = null;
      void api.events
        .strictModeRelease({ classId: endedClassId, reason: "scheduled_end", source: "auto" })
        .catch(() => undefined);
    }
  }

  // Check on schedule load/refresh, and on a steady timer so the lock
  // engages even if nothing else triggers a re-render right at T-10.
  useEffect(() => {
    void check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.data, strictModeEnabled, user]);

  // Re-check immediately on foreground — don't wait up to 20s after
  // returning to the app right at class time.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.data, strictModeEnabled, user]);

  async function releaseForJoin(classId: string): Promise<void> {
    lockedClassId.current = null;
    await api.events
      .strictModeRelease({ classId, reason: "class_joined", source: "auto" })
      .catch(() => undefined);
  }

  return (
    <StrictModeContext.Provider value={{ releaseForJoin }}>{children}</StrictModeContext.Provider>
  );
}

export function useStrictMode(): StrictModeState {
  const ctx = useContext(StrictModeContext);
  if (!ctx) throw new Error("useStrictMode must be used within a StrictModeProvider");
  return ctx;
}
