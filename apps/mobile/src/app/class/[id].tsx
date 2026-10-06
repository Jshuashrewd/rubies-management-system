import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDay, formatTime } from "@/lib/format";
import { useReminders } from "@/lib/reminders";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";

export default function ClassDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cancelForClass } = useReminders();
  const { user, isLoading } = useAuth();
  const q = useQuery({
    queryKey: ["class", id],
    queryFn: () => api.schedule.get(id),
    enabled: !!id && !!user,
  });

  async function onJoin() {
    const session = q.data;
    if (!session) return;

    // Log the join (attendance signal), but never let a slow network hold up
    // Zoom: give it 2s, then move on. Some mobile connections hang for
    // a long time rather than failing fast.
    await Promise.race([
      api.events.join({ classId: session.id }).catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);

    // Joined -> stop the alarms. Only when class is close: tapping the link on
    // a class days away (e.g. to check it) must not silence its future alarms.
    const minsToStart = (new Date(session.scheduledStartAt).getTime() - Date.now()) / 60_000;
    if (minsToStart <= 60) {
      try {
        await cancelForClass(session.id);
      } catch {
        // best effort — worst case one more alarm fires
      }
    }

    try {
      await Linking.openURL(session.zoomJoinUrl);
    } catch {
      // ignore — URL may be invalid in the scaffold
    }
  }

  // This is a root-level screen, so nothing above it checks for a session.
  // Signed out (or opened with no class id) must never show a broken screen.
  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }
  if (!user) return <Redirect href="/login" />;
  if (!id) return <Redirect href="/" />;

  if (q.isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (q.isError || !q.data) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.muted}>Couldn&apos;t load this class.</Text>
        </View>
      </Screen>
    );
  }

  const s = q.data;
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.meta}>
          {formatDay(s.scheduledStartAt)} · {formatTime(s.scheduledStartAt)} –{" "}
          {formatTime(s.scheduledEndAt)}
        </Text>
        <Text style={styles.meta}>with {s.trainerName}</Text>

        <Button
          label="Join on Zoom"
          variant="accent"
          onPress={onJoin}
          style={{ marginTop: spacing.lg }}
        />
        <Text style={styles.note}>
          Joining opens Zoom and marks your attendance.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { fontSize: fontSize.bodyMd, color: colors.textSecondary },
  title: {
    fontSize: fontSize.headlineSm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  meta: { fontSize: fontSize.bodyMd, color: colors.textSecondary, marginTop: 2 },
  body: { fontSize: fontSize.bodyMd, color: colors.textPrimary, lineHeight: 20 },
  note: {
    fontSize: fontSize.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
