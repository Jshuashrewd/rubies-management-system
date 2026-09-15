import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { api } from "@/lib/api";
import { formatDay, formatTime } from "@/lib/format";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";

export default function ClassDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({
    queryKey: ["class", id],
    queryFn: () => api.schedule.get(id),
    enabled: !!id,
  });

  async function onJoin() {
    const session = q.data;
    if (!session) return;
    // Log the join (attendance signal). Don't block the Zoom hand-off on it.
    // The backend also cancels this class's pending reminders on join.
    try {
      await api.events.join({ classId: session.id });
    } catch {
      // ignore — joining Zoom matters more than the log
    }
    try {
      await Linking.openURL(session.zoomJoinUrl);
    } catch {
      // ignore — URL may be invalid in the scaffold
    }
  }

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

        {s.description ? (
          <Card style={{ marginTop: spacing.lg }}>
            <Text style={styles.body}>{s.description}</Text>
          </Card>
        ) : null}

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
