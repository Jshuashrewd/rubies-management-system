import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ClassSession, ClassStatus } from "@rubies/shared";
import { Screen } from "@/components/ui/Screen";
import { api } from "@/lib/api";
import { formatDay, formatTime } from "@/lib/format";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

const STATUS_COLOR: Record<ClassStatus, string> = {
  scheduled: colors.textSecondary,
  live: colors.success,
  ended: colors.borderStrong,
  cancelled: colors.error,
};

export default function Schedule() {
  const q = useQuery({
    queryKey: ["schedule"],
    queryFn: () => api.schedule.list(),
  });

  return (
    <Screen>
      <Text style={styles.title}>Schedule</Text>

      {q.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : q.isError ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Couldn&apos;t load your schedule.</Text>
        </View>
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: spacing.sm, gap: spacing.sm }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>No classes scheduled yet.</Text>
            </View>
          }
          renderItem={({ item }) => <ClassRow session={item} />}
        />
      )}
    </Screen>
  );
}

function ClassRow({ session }: { session: ClassSession }) {
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/class/[id]", params: { id: session.id } })
      }
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{session.title}</Text>
        <Text style={styles.rowMeta}>
          {formatDay(session.scheduledStartAt)} · {formatTime(session.scheduledStartAt)}
        </Text>
        <Text style={styles.rowMeta}>{session.trainerName}</Text>
      </View>
      <View style={[styles.pill, { backgroundColor: STATUS_COLOR[session.status] }]}>
        <Text style={styles.pillText}>{session.status}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.headlineMd,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: spacing.xl },
  muted: { fontSize: fontSize.bodyMd, color: colors.textSecondary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rowPressed: { opacity: 0.9 },
  rowTitle: {
    fontSize: fontSize.titleMd,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  rowMeta: { fontSize: fontSize.bodySm, color: colors.textSecondary, marginTop: 2 },
  pill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  pillText: {
    fontSize: fontSize.labelSm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
    textTransform: "capitalize",
  },
});
