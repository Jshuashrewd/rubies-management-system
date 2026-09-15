import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { roleBadge } from "@rubies/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/lib/auth";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

export default function Profile() {
  const { user, signOut } = useAuth();

  async function onSignOut() {
    await signOut();
    router.replace("/login");
  }

  const badge = user ? roleBadge[user.role] : null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text style={styles.title}>Profile</Text>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.name}>
            {user ? `${user.firstName} ${user.lastName}` : "—"}
          </Text>
          <Text style={styles.schoolId}>{user?.schoolId ?? ""}</Text>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>
                {user?.role}
              </Text>
            </View>
          ) : null}
        </Card>

        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <Button
            label="Change password"
            variant="outline"
            onPress={() => router.push("/change-password")}
          />
          <Button
            label="Manage Strict Mode"
            variant="outline"
            onPress={() => router.push("/strict-mode")}
          />
          <Button label="Sign out" variant="primary" onPress={onSignOut} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.headlineMd,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  name: {
    fontSize: fontSize.titleLg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  schoolId: {
    fontSize: fontSize.bodyMd,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: 2,
  },
  badge: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.base,
  },
  badgeText: {
    fontSize: fontSize.labelSm,
    fontWeight: fontWeight.semibold,
    textTransform: "capitalize",
  },
});
