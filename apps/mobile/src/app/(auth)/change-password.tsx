import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { ApiError } from "@rubies/shared";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

export default function ChangePassword() {
  const { refresh } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (next.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.auth.changePassword({ currentPassword: current, newPassword: next });
      await refresh();
      router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not change your password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>
          For your security, replace the default password before continuing.
        </Text>
      </View>

      <Text style={styles.label}>Current password</Text>
      <TextInput
        style={styles.input}
        placeholder="Your surname (default)"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={current}
        onChangeText={setCurrent}
      />

      <Text style={styles.label}>New password</Text>
      <TextInput
        style={styles.input}
        placeholder="At least 8 characters"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={next}
        onChangeText={setNext}
      />

      <Text style={styles.label}>Confirm new password</Text>
      <TextInput
        style={styles.input}
        placeholder="Re-enter new password"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Save password"
        variant="accent"
        onPress={onSubmit}
        loading={loading}
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, marginBottom: spacing.md },
  title: {
    fontSize: fontSize.headlineLgMobile,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.bodyMd,
    color: colors.textSecondary,
    marginTop: spacing["2xs"],
    lineHeight: 20,
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
});
