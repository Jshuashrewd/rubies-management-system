// Owns the class-reminders lifecycle (SYSTEM_DESIGN.md §11.2):
//   - after login: ask for permission, wipe any stale OS-level alarms, and
//     rebuild them from the current schedule
//   - whenever the schedule loads/refreshes: book alarms for upcoming classes,
//     replace them if a class moved, drop them if it was cancelled
//   - on join: cancel that class's alarms and remember the join, so a later
//     refresh (or an app restart) never brings them back
//   - on sign-out: clear everything so the next person on this device isn't
//     woken by someone else's classes
// Mirrors lib/auth.tsx's Provider/hook shape.
import { useQuery } from "@tanstack/react-query";
import { useRootNavigationState, useRouter } from "expo-router";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import type { ClassSession, Student } from "@rubies/shared";
import { api } from "./api";
import { useAuth } from "./auth";
import {
  MAX_BOOKED_CLASSES,
  MAX_BOOKED_CLASSES_STRICT_MODE,
  REMINDER_OFFSETS_MIN,
  STRICT_MODE_REMINDER_OFFSETS_MIN,
  cancelAllReminders,
  cancelReminders,
  configureNotificationHandler,
  ensureNotificationPermission,
  scheduleClassReminders,
  useTappedAlarm,
} from "./notifications";
import { clearJoinedClassIds, getJoinedClassIds, markClassJoined } from "./storage";

interface RemindersState {
  /** Cancel a class's pending local reminders (call this on join). */
  cancelForClass: (classId: string) => Promise<void>;
}

interface Booking {
  startAt: string;
  ids: string[];
}

const RemindersContext = createContext<RemindersState | undefined>(undefined);

export function RemindersProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const navState = useRootNavigationState();

  // Bookkeeping, not UI state — refs so changes don't trigger re-renders.
  const bookings = useRef(new Map<string, Booking>());
  const joined = useRef(new Set<string>());
  const ready = useRef<Promise<void>>(Promise.resolve());
  // Every mutation runs through this chain, one at a time. Booking a class
  // is async (9 OS calls); without serialising, a join arriving mid-booking
  // could cancel before the ids exist and the alarms would leak.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const handledTap = useRef<string | null>(null);

  function enqueue(task: () => Promise<void>): Promise<void> {
    const next = queue.current.then(task, task);
    queue.current = next.catch(() => undefined);
    return next;
  }

  useEffect(() => {
    configureNotificationHandler();
  }, []);

  // Session start / end.
  useEffect(() => {
    if (isLoading) return; // don't mistake "still restoring the session" for signed-out

    if (!user) {
      bookings.current.clear();
      joined.current.clear();
      void cancelAllReminders();
      void clearJoinedClassIds();
      return;
    }

    void ensureNotificationPermission();
    // Alarms from a previous launch are still queued in the OS but this
    // process has forgotten them. Clear the slate and rebuild from the
    // schedule, otherwise every relaunch would stack duplicates.
    ready.current = (async () => {
      await cancelAllReminders();
      bookings.current.clear();
      joined.current = new Set(await getJoinedClassIds());
    })();
  }, [user, isLoading]);

  // Shares the ["schedule"] cache with the dashboard/schedule screens.
  const schedule = useQuery({
    queryKey: ["schedule"],
    queryFn: () => api.schedule.list(),
    enabled: !!user,
  });

  async function reconcile(sessions: ClassSession[]): Promise<void> {
    await ready.current;
    const now = Date.now();

    // Strict-Mode students get a denser 1-min-for-30-min alarm schedule —
    // the practical substitute for the OS-level lock we can't do on a
    // personal phone. iOS's 64-pending-notification cap means fewer
    // classes can be booked ahead at that density (see notifications.ts).
    const strictModeOn = (user as Student | null)?.strictModeEnabled ?? false;
    const offsets = strictModeOn ? STRICT_MODE_REMINDER_OFFSETS_MIN : REMINDER_OFFSETS_MIN;
    const maxBooked = strictModeOn ? MAX_BOOKED_CLASSES_STRICT_MODE : MAX_BOOKED_CLASSES;

    const wanted = sessions
      .filter(
        (s) =>
          (s.status === "scheduled" || s.status === "live") &&
          new Date(s.scheduledStartAt).getTime() > now &&
          !joined.current.has(s.id),
      )
      .sort((a, b) => a.scheduledStartAt.localeCompare(b.scheduledStartAt))
      .slice(0, maxBooked);
    const wantedIds = new Set(wanted.map((s) => s.id));

    // Cancelled, already started, joined, or pushed out of the window.
    for (const [classId, booking] of [...bookings.current]) {
      if (wantedIds.has(classId)) continue;
      bookings.current.delete(classId);
      await cancelReminders(booking.ids);
    }

    for (const session of wanted) {
      const existing = bookings.current.get(session.id);
      if (existing && existing.startAt === session.scheduledStartAt) continue;
      if (existing) await cancelReminders(existing.ids); // class was rescheduled
      const ids = await scheduleClassReminders(session, offsets);
      bookings.current.set(session.id, { startAt: session.scheduledStartAt, ids });
    }
  }

  useEffect(() => {
    if (!user || !schedule.data) return;
    const sessions = schedule.data;
    void enqueue(() => reconcile(sessions));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.data, user]);

  // Pick up class changes (moved/cancelled by admin) whenever the app comes
  // back to the foreground — the query cache alone wouldn't refresh.
  const { refetch } = schedule;
  useEffect(() => {
    if (!user) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refetch();
    });
    return () => sub.remove();
  }, [user, refetch]);

  // Tapping an alarm opens that class. Also covers the cold-start case (app
  // was killed when the alarm was tapped).
  const tapped = useTappedAlarm();
  const tappedKey = tapped?.key;
  const tappedClassId = tapped?.classId;
  useEffect(() => {
    if (!user || !navState?.key || !tappedKey || !tappedClassId) return;
    if (handledTap.current === tappedKey) return;
    handledTap.current = tappedKey;
    router.push({ pathname: "/class/[id]", params: { id: tappedClassId } });
  }, [tappedKey, tappedClassId, user, navState?.key, router]);

  async function cancelForClass(classId: string): Promise<void> {
    // Mark joined immediately so a reconcile already in the queue can't
    // re-book this class after we cancel it.
    joined.current.add(classId);
    void markClassJoined(classId);
    await enqueue(async () => {
      const booking = bookings.current.get(classId);
      bookings.current.delete(classId);
      if (booking?.ids.length) await cancelReminders(booking.ids);
    });
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
