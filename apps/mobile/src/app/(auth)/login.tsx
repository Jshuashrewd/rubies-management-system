import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { ApiError } from "@rubies/shared";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/lib/auth";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

export default function Login() {
  const { signIn } = useAuth();
  const [schoolId, setSchoolId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const user = await signIn(schoolId.trim(), password);
      router.replace(user.mustChangePassword ? "/change-password" : "/dashboard");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.brand}>Rubies Code School</Text>
        <Text style={styles.subtitle}>Sign in with your School ID</Text>
      </View>

      <Text style={styles.label}>School ID</Text>
      <TextInput
        style={styles.input}
        placeholder="RCS-STU-2025-884"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="characters"
        autoCorrect={false}
        value={schoolId}
        onChangeText={setSchoolId}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Your surname (first login)"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Sign in"
        variant="accent"
        onPress={onSubmit}
        loading={loading}
        style={{ marginTop: spacing.lg }}
      />

      <Text style={styles.hint}>
        First time? Your password is your lowercase surname. You&apos;ll set a new one
        right after.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xl, marginBottom: spacing.xl },
  brand: {
    fontSize: fontSize.headlineLgMobile,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.bodyLg,
    color: colors.textSecondary,
    marginTop: spacing["2xs"],
  },
  label: {
    fontSize: fontSize.labelLg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing["2xs"],
    marginTop: spacing.md,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: fontSize.bodyLg,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  error: { color: colors.error, marginTop: spacing.sm },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.bodySm,
    marginTop: spacing.md,
    lineHeight: 18,
  },
});
