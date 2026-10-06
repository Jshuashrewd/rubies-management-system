// Local class reminders (SYSTEM_DESIGN.md §11.2).
//
// Alarm pattern, relative to a class's scheduledStartAt:
//   T-30, T-20, T-10        one alarm every 10 minutes
//   T-5, T-4, T-3, T-2, T-1 one alarm every minute for the last 5 minutes
//   T-0                     "starting now"
// = 9 alarms per class. They stop the moment the student taps "Join on Zoom"
// (see cancelForClass in reminders.tsx).
//
// iOS keeps at most 64 pending local notifications per app. At 9 per class
// that is ~7 classes, so reminders.tsx only books the next MAX_BOOKED_CLASSES
// classes (6 x 9 = 54, leaving headroom) and tops up as classes pass.
import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";
import type { ClassSession } from "@rubies/shared";

// Alarms need a development build or an installed APK/IPA. Two places can't
// run them:
//   - Android inside Expo Go: expo-notifications THROWS while loading there
//     (remote-push support was removed in SDK 53), which would take the whole
//     app down — not just alarms.
//   - Web: no local scheduling.
// So the library is only loaded where it works; everywhere else these
// functions quietly do nothing and the rest of the app runs normally.
// This file is the ONLY place that may import "expo-notifications".
export const remindersSupported =
  Platform.OS === "ios" || (Platform.OS === "android" && !isRunningInExpoGo());

const Notifications: typeof import("expo-notifications") | null = remindersSupported
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("expo-notifications")
  : null;

export const REMINDER_OFFSETS_MIN = [30, 20, 10, 5, 4, 3, 2, 1, 0] as const;

// Strict Mode students get a denser schedule — one alarm every minute for
// the full 30-minute run-up, not just the last 5. This is the practical
// stand-in for an OS-level lock (not possible on personal phones — see
// strict-mode-provider.tsx) — persistent reminders are the strongest thing
// we can actually do.
export const STRICT_MODE_REMINDER_OFFSETS_MIN = Array.from({ length: 31 }, (_, i) => 30 - i);

export const MAX_BOOKED_CLASSES = 6;
// iOS caps an app at 64 pending local notifications, total, across every
// class. At 31 alarms per class, only 2 fit safely (62) — so Strict Mode
// students get fewer classes booked ahead, not fewer alarms per class.
export const MAX_BOOKED_CLASSES_STRICT_MODE = 2;

const CHANNEL_ID = "class-reminders";
let channelReady: Promise<void> | null = null;

/** Android needs a high-importance channel or alarms arrive silently. */
function ensureChannel(): Promise<void> {
  if (!Notifications) return Promise.resolve();
  if (!channelReady) {
    channelReady =
      Platform.OS === "android"
        ? Notifications.setNotificationChannelAsync(CHANNEL_ID, {
            name: "Class reminders",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: "default",
          }).then(() => undefined)
        : Promise.resolve();
  }
  return channelReady;
}

/**
 * Call once at app start. Without a handler, notifications that fire while
 * the app is open are swallowed silently. Also creates the Android channel.
 */
export function configureNotificationHandler(): void {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  void ensureChannel();
}

function reminderTitle(offsetMin: number): string {
  if (offsetMin === 0) return "Class is starting now";
  if (offsetMin === 1) return "Class starts in 1 minute";
  return `Class starts in ${offsetMin} minutes`;
}

/**
 * Schedule every reminder for a class that is still in the future. Returns
 * the notification ids so the caller can cancel them (see cancelReminders).
 */
export async function scheduleClassReminders(
  session: ClassSession,
  offsetsMin: readonly number[] = REMINDER_OFFSETS_MIN,
): Promise<string[]> {
  if (!Notifications) return [];
  const N = Notifications;
  await ensureChannel();

  const startMs = new Date(session.scheduledStartAt).getTime();
  const now = Date.now();

  const ids = await Promise.all(
    offsetsMin.map(async (offset) => {
      const fireAtMs = startMs - offset * 60_000;
      if (fireAtMs <= now) return null; // don't schedule in the past

      return N.scheduleNotificationAsync({
        content: {
          title: reminderTitle(offset),
          body: `${session.title} · tap to join`,
          sound: "default",
          data: { classId: session.id },
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.DATE,
          date: new Date(fireAtMs),
          channelId: CHANNEL_ID,
        },
      });
    }),
  );

  return ids.filter((id): id is string => id !== null);
}

/** Cancel previously scheduled reminders (call on join). */
export async function cancelReminders(ids: string[]): Promise<void> {
  if (!Notifications) return;
  const N = Notifications;
  await Promise.all(ids.map((id) => N.cancelScheduledNotificationAsync(id)));
}

/** Drop every pending reminder (sign-out, or a clean rebuild on launch). */
export async function cancelAllReminders(): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Request notification permissions. Call once, e.g. after first login. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === "granted";
}

/** The alarm the user most recently tapped (also covers app-was-killed). */
export interface TappedAlarm {
  /** Unique per notification, so the same tap is never handled twice. */
  key: string;
  classId: string;
}

function useTappedAlarmNative(): TappedAlarm | null {
  const N = Notifications!;
  const response = N.useLastNotificationResponse();
  if (!response || response.actionIdentifier !== N.DEFAULT_ACTION_IDENTIFIER) return null;
  const classId = response.notification.request.content.data?.classId;
  if (typeof classId !== "string") return null;
  return { key: response.notification.request.identifier, classId };
}

// Picked once at load (not per render), so hook order never changes.
export const useTappedAlarm: () => TappedAlarm | null = Notifications
  ? useTappedAlarmNative
  : () => null;
