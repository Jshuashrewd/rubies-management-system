import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Linking, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatTime } from "@/lib/format";
import { useReminders } from "@/lib/reminders";
import { useStrictMode } from "@/lib/strict-mode-provider";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";

const TICK_MS = 1_000;

/**
 * Auto-shown by StrictModeProvider — this is not a screen the student
 * navigates to themselves. There are exactly two ways out: tap "Join on
 * Zoom" (releases immediately), or the class's scheduled end time passes
 * (the provider releases it and this screen pops itself). The hardware
 * back button is swallowed while this is open, matching the Tier-1 design
 * (SYSTEM_DESIGN.md §16) — a strong, honest UI lock, not an OS-level one.
 */
export default function StrictModeLock() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { cancelForClass } = useReminders();
  const { releaseForJoin } = useStrictMode();
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [joining, setJoining] = useState(false);

  const q = useQuery({
    queryKey: ["class", classId],
    queryFn: () => api.schedule.get(classId),
    enabled: !!classId && !!user,
  });

  // Block the hardware back button for as long as this screen is focused.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  // Tick every second for the countdown, and self-dismiss the moment the
  // class's end time passes — don't wait on the provider's slower poll.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!q.data) return;
    if (now >= new Date(q.data.scheduledEndAt).getTime()) {
      router.back();
    }
  }, [now, q.data, router]);

  if (authLoading || q.isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.white} />
        </View>
      </Screen>
    );
  }
  if (!user) return <Redirect href="/login" />;
  if (!classId || q.isError || !q.data) return <Redirect href="/" />;

  const session = q.data;
  const startMs = new Date(session.scheduledStartAt).getTime();
  const hasStarted = now >= startMs;
  const minutesToStart = Math.max(0, Math.ceil((startMs - now) / 60_000));

  async function onJoin() {
    if (!classId) return;
    setJoining(true);
    try {
      await Promise.race([
        api.events.join({ classId }).catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
      await cancelForClass(classId).catch(() => undefined);
      await releaseForJoin(classId);
      try {
        await Linking.openURL(session.zoomJoinUrl);
      } catch {
        // ignore — URL may be invalid in the scaffold
      }
      router.back();
    } finally {
      setJoining(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>STRICT MODE</Text>
        <Text style={styles.title}>{session.title}</Text>

        {hasStarted ? (
          <Text style={styles.status}>Class is in progress</Text>
        ) : (
          <>
            <Text style={styles.countdown}>{minutesToStart}</Text>
            <Text style={styles.status}>
              {minutesToStart === 1 ? "minute" : "minutes"} until class starts
            </Text>
          </>
        )}

        <Text style={styles.meta}>
          {formatTime(session.scheduledStartAt)} – {formatTime(session.scheduledEndAt)}
        </Text>
        <Text style={styles.meta}>with {session.trainerName}</Text>

        <Text style={styles.hint}>
          This screen stays until you join the class, or it ends.
        </Text>

        <Button label="Join on Zoom" onPress={onJoin} loading={joining} style={{ marginTop: spacing.xl }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  eyebrow: {
    fontSize: fontSize.labelMd,
    fontWeight: fontWeight.bold,
    color: colors.accent,
    letterSpacing: 2,
  },
  title: {
    fontSize: fontSize.headlineMd,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  countdown: {
    fontSize: 72,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginTop: spacing.xl,
  },
  status: {
    fontSize: fontSize.titleMd,
    color: colors.white,
    marginTop: spacing.xs,
  },
  meta: {
    fontSize: fontSize.bodyMd,
    color: "rgba(255,255,255,0.7)",
    marginTop: spacing.sm,
  },
  hint: {
    fontSize: fontSize.bodySm,
    color: "rgba(255,255,255,0.5)",
    marginTop: spacing.xl,
    textAlign: "center",
  },
});
