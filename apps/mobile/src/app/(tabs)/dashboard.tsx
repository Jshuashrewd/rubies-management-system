import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { ClassSession } from "@rubies/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDay, formatTime, minutesUntil } from "@/lib/format";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

function pickNextClass(sessions: ClassSession[]): ClassSession | null {
  const upcoming = sessions
    .filter((s) => s.status === "scheduled" || s.status === "live")
    .sort(
      (a, b) => +new Date(a.scheduledStartAt) - +new Date(b.scheduledStartAt),
    );
  return upcoming[0] ?? null;
}

function joinLabel(s: ClassSession): string {
  if (s.status === "live") return "Join now";
  const mins = minutesUntil(s.scheduledStartAt);
  if (mins <= 0) return "Join now";
  if (mins < 60) return `Join in ${mins} min`;
  return "View class";
}

export default function Dashboard() {
  const { user } = useAuth();
  const schedule = useQuery({
    queryKey: ["schedule"],
    queryFn: () => api.schedule.list(),
  });

  const next = schedule.data ? pickNextClass(schedule.data) : null;

  return (
    <Screen scroll>
      <Text style={styles.greeting}>Hi {user?.firstName ?? "there"} 👋</Text>
      <Text style={styles.sub}>Here&apos;s what&apos;s next.</Text>

      <Card style={styles.nextCard}>
        <Text style={styles.cardLabel}>NEXT LIVE CLASS</Text>
        {schedule.isLoading ? (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginVertical: spacing.md }}
          />
        ) : next ? (
          <>
            <Text style={styles.classTitle}>{next.title}</Text>
            <Text style={styles.classMeta}>
              {formatDay(next.scheduledStartAt)} · {formatTime(next.scheduledStartAt)}
            </Text>
            <Text style={styles.classMeta}>with {next.trainerName}</Text>
            <Button
              label={joinLabel(next)}
              variant="accent"
              onPress={() =>
                router.push({ pathname: "/class/[id]", params: { id: next.id } })
              }
              style={{ marginTop: spacing.md }}
            />
          </>
        ) : (
          <Text style={styles.empty}>
            {schedule.isError
              ? "Couldn't reach the server. Check that the API is running."
              : "No upcoming classes right now."}
          </Text>
        )}
      </Card>

      <View style={styles.tiles}>
        <Tile
          label="Curriculum"
          hint="Track your progress"
          onPress={() => router.push("/curriculum")}
        />
        <Tile
          label="Strict Mode"
          hint="Stay focused in class"
          onPress={() => router.push("/strict-mode")}
        />
      </View>
    </Screen>
  );
}

function Tile({
  label,
  hint,
  onPress,
}: {
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileHint}>{hint}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontSize: fontSize.headlineMd,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  sub: {
    fontSize: fontSize.bodyMd,
    color: colors.textSecondary,
    marginTop: spacing["2xs"],
  },
  nextCard: { marginTop: spacing.lg, backgroundColor: colors.primary },
  cardLabel: {
    fontSize: fontSize.labelSm,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1,
    color: "#B9A8D6",
  },
  classTitle: {
    fontSize: fontSize.titleLg,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginTop: spacing.xs,
  },
  classMeta: { fontSize: fontSize.bodyMd, color: "#D8CCEC", marginTop: 2 },
  empty: {
    fontSize: fontSize.bodyMd,
    color: "#D8CCEC",
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  tiles: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  tile: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  tilePressed: { opacity: 0.9 },
  tileLabel: {
    fontSize: fontSize.titleMd,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  tileHint: {
    fontSize: fontSize.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
