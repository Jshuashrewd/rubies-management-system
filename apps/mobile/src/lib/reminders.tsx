// Owns the class-reminders lifecycle described in SYSTEM_DESIGN.md §11.2:
// request permission after login, schedule T-30/10/5/0 reminders whenever
// the schedule loads, cancel a class's reminders the moment the student
// joins. Mirrors lib/auth.tsx's Provider/hook shape.
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { api } from "./api";
import { useAuth } from "./auth";
import {
  cancelReminders,
  configureNotificationHandler,
  ensureNotificationPermission,
  scheduleClassReminders,
} from "./notifications";

interface RemindersState {
  /** Cancel a class's pending local reminders (call this on join). */
  cancelForClass: (classId: string) => Promise<void>;
}

const RemindersContext = createContext<RemindersState | undefined>(undefined);

export function RemindersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Notification ids already scheduled per class, so a schedule refetch
  // doesn't double-book reminders. A `[]` entry means "handled, don't
  // reschedule" — set once a class's reminders are cancelled (join) or a
  // schedule attempt is in flight. A ref, not state: this is bookkeeping,
  // not something that should trigger a re-render.
  const scheduledRef = useRef<Map<string, string[]>>(new Map());

  useEffect(() => {
    configureNotificationHandler();
  }, []);

  useEffect(() => {
    if (!user) return;
    void ensureNotificationPermission();
  }, [user]);

  // Shares the ["schedule"] cache with the dashboard/schedule screens —
  // same queryKey, so this doesn't add an extra network round trip once
  // either of those also mounts.
  const schedule = useQuery({
    queryKey: ["schedule"],
    queryFn: () => api.schedule.list(),
    enabled: !!user,
  });

  useEffect(() => {
    if (!schedule.data) return;

    const upcoming = schedule.data.filter(
      (s) => s.status === "scheduled" || s.status === "live",
    );

    for (const session of upcoming) {
      if (scheduledRef.current.has(session.id)) continue;
      scheduledRef.current.set(session.id, []); // reserve, avoid races on refetch
      void scheduleClassReminders(session).then((ids) => {
        scheduledRef.current.set(session.id, ids);
      });
    }
  }, [schedule.data]);

  async function cancelForClass(classId: string): Promise<void> {
    const ids = scheduledRef.current.get(classId);
    // Mark handled either way, so a subsequent refetch (schedule may still
    // list the class as "live" briefly after join) doesn't reschedule it.
    scheduledRef.current.set(classId, []);
    if (ids?.length) await cancelReminders(ids);
  }

  return (
    <RemindersContext.Provider value={{ cancelForClass }}>
      {children}
    </RemindersContext.Provider>
  );
}

export function useReminders(): RemindersState {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error("useReminders must be used within a RemindersProvider");
  return ctx;
}
