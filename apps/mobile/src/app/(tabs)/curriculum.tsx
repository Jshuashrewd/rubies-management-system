import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import type { CurriculumProgress, CurriculumStage } from "@rubies/shared";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { api } from "@/lib/api";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

export default function Curriculum() {
  const q = useQuery({
    queryKey: ["curriculum"],
    queryFn: () => api.curriculum.progress(),
  });

  return (
    <Screen>
      <Text style={styles.title}>Curriculum</Text>

      {q.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : q.isError || !q.data ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Couldn&apos;t load your progress.</Text>
        </View>
      ) : (
        <Progress data={q.data} />
      )}
    </Screen>
  );
}

function Progress({ data }: { data: CurriculumProgress }) {
  const pct = Math.max(0, Math.min(100, data.percentComplete));
  const completed = new Set(data.completedStageIds);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.pctLabel}>
          Stage {data.currentStageOrder} of {data.totalStages}
        </Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.pctValue}>{pct}% complete</Text>
      </Card>

      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        {data.stages.map((stage) => (
          <StageRow
            key={stage.id}
            stage={stage}
            done={completed.has(stage.id)}
            current={stage.id === data.currentStageId}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function StageRow({
  stage,
  done,
  current,
}: {
  stage: CurriculumStage;
  done: boolean;
  current: boolean;
}) {
  return (
    <View style={[styles.stageRow, current && styles.stageCurrent]}>
      <View style={[styles.stageDot, done && styles.stageDotDone]}>
        <Text style={styles.stageDotText}>{done ? "✓" : stage.order}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stageTitle}>{stage.title}</Text>
        {stage.description ? (
          <Text style={styles.stageDesc}>{stage.description}</Text>
        ) : null}
      </View>
    </View>
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
  pctLabel: {
    fontSize: fontSize.labelLg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  barTrack: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.canvasTint,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: radius.full, backgroundColor: colors.accent },
  pctValue: {
    fontSize: fontSize.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  stageCurrent: { borderColor: colors.accent, borderWidth: 2 },
  stageDot: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.canvasTint,
    alignItems: "center",
    justifyContent: "center",
  },
  stageDotDone: { backgroundColor: colors.success },
  stageDotText: {
    fontSize: fontSize.labelMd,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  stageTitle: {
    fontSize: fontSize.titleMd,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  stageDesc: {
    fontSize: fontSize.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
