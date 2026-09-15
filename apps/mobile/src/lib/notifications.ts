// Local class reminders. Scheduled at T-30 / T-10 / T-5 / T-0 before class start.
// Deliberately capped at 4 per class to stay well under iOS's 64-notification limit.
import * as Notifications from "expo-notifications";
import type { ClassSession } from "@rubies/shared";

const REMINDER_OFFSETS_MIN = [30, 10, 5, 0] as const;

/**
 * Schedule reminder notifications for a class. Returns the notification ids so
 * the caller can cancel them once the student has joined (see cancelReminders).
 */
export async function scheduleClassReminders(
  session: ClassSession,
): Promise<string[]> {
  const startMs = new Date(session.scheduledStartAt).getTime();
  const ids: string[] = [];

  for (const offset of REMINDER_OFFSETS_MIN) {
    const fireAtMs = startMs - offset * 60_000;
    if (fireAtMs <= Date.now()) continue; // don't schedule in the past

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: offset === 0 ? "Class is starting" : `Class in ${offset} min`,
        body: session.title,
        data: { classId: session.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(fireAtMs),
      },
    });
    ids.push(id);
  }

  return ids;
}

/** Cancel previously scheduled reminders (call on join). */
export async function cancelReminders(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
  );
}

/** Request notification permissions. Call once, e.g. after first login. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === "granted";
}
