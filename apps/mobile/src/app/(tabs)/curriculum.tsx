import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import type { CurriculumProgress, LevelWithTopics, Topic } from "@rubies/shared";
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
      ) : !q.data.currentStage ? (
        <View style={styles.center}>
          <Text style={styles.muted}>
            You haven&apos;t been placed on a topic yet — check with your trainer.
          </Text>
        </View>
      ) : (
        <Progress data={q.data} />
      )}
    </Screen>
  );
}

function Progress({ data }: { data: CurriculumProgress }) {
  const pct = Math.max(0, Math.min(100, data.percentComplete));
  const completed = new Set(data.completedTopicIds);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.pctLabel}>
          {capitalize(data.currentStage!)} — {data.totalTopicsInStage} topics
        </Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.pctValue}>{pct}% complete</Text>
      </Card>

      <View style={{ marginTop: spacing.lg, gap: spacing.lg }}>
        {data.levels.map((level) => (
          <LevelSection
            key={level.id}
            level={level}
            completed={completed}
            currentTopicId={data.currentTopicId}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function LevelSection({
  level,
  completed,
  currentTopicId,
}: {
  level: LevelWithTopics;
  completed: Set<string>;
  currentTopicId: string | null;
}) {
  return (
    <View>
      <Text style={styles.levelHeading}>
        L{level.order}: {level.title}
      </Text>
      <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
        {level.topics.map((topic) => (
          <TopicRow
            key={topic.id}
            topic={topic}
            done={completed.has(topic.id)}
            current={topic.id === currentTopicId}
          />
        ))}
      </View>
    </View>
  );
}

function TopicRow({ topic, done, current }: { topic: Topic; done: boolean; current: boolean }) {
  return (
    <View style={[styles.topicRow, current && styles.topicCurrent]}>
      <View style={[styles.topicDot, done && styles.topicDotDone]}>
        <Text style={styles.topicDotText}>{done ? "✓" : topic.order}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.topicTitle}>{topic.title}</Text>
        {topic.description ? <Text style={styles.topicDesc}>{topic.description}</Text> : null}
      </View>
    </View>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.headlineMd,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: spacing.xl },
  muted: { fontSize: fontSize.bodyMd, color: colors.textSecondary, textAlign: "center" },
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
  levelHeading: {
    fontSize: fontSize.labelLg,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  topicCurrent: { borderColor: colors.accent, borderWidth: 2 },
  topicDot: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.canvasTint,
    alignItems: "center",
    justifyContent: "center",
  },
  topicDotDone: { backgroundColor: colors.success },
  topicDotText: {
    fontSize: fontSize.labelMd,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  topicTitle: {
    fontSize: fontSize.titleMd,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  topicDesc: {
    fontSize: fontSize.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
