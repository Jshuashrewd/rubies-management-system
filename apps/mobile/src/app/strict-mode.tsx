import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { ApiError, type Student } from "@rubies/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

/**
 * Settings screen — the parent turns Strict Mode on/off here using the
 * passcode the school issued. This is NOT the lock itself; that's
 * strict-mode-lock.tsx, shown automatically near class time once this is on.
 */
export default function StrictModeSettings() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const student = user as Student | null;

  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const enable = useMutation({
    mutationFn: () => api.strictMode.enable({ passcode: passcode.trim() }),
    onSuccess: async () => {
      await refresh(); // re-fetch /me so student.strictModeEnabled reflects the change
      setPasscode("");
      setError(null);
      setMessage("Strict Mode is now ON. Classes will lock the app starting 10 minutes before they begin.");
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    },
  });

  const disable = useMutation({
    mutationFn: () => api.strictMode.disable({ passcode: passcode.trim() }),
    onSuccess: async () => {
      await refresh();
      setPasscode("");
      setError(null);
      setMessage("Strict Mode is now OFF.");
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    },
  });

  if (!student) return null;

  const pending = enable.isPending || disable.isPending;

  return (
    <Screen>
      <Text style={styles.title}>Strict Mode</Text>
      <Text style={styles.subtitle}>
        When ON, the app locks the screen starting 10 minutes before each class and won&apos;t
        let go until the student joins, or the class ends.
      </Text>

      <Card style={{ marginTop: spacing.lg }}>
        <Text style={styles.statusLabel}>Current status</Text>
        <Text style={[styles.statusValue, student.strictModeEnabled && styles.statusOn]}>
          {student.strictModeEnabled ? "ON" : "OFF"}
        </Text>
      </Card>

      {!student.strictModePasscodeSet ? (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.body}>
            No passcode has been set up for this account yet. Ask the school to set one before
            Strict Mode can be turned on.
          </Text>
        </Card>
      ) : (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.label}>School-issued passcode</Text>
          <TextInput
            value={passcode}
            onChangeText={(t) => {
              setPasscode(t);
              setError(null);
              setMessage(null);
            }}
            placeholder="4–6 digits"
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            style={styles.input}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.success}>{message}</Text> : null}

          {student.strictModeEnabled ? (
            <Button
              label="Turn off Strict Mode"
              variant="outline"
              loading={pending}
              onPress={() => disable.mutate()}
              style={{ marginTop: spacing.md }}
            />
          ) : (
            <Button
              label="Turn on Strict Mode"
              loading={pending}
              onPress={() => enable.mutate()}
              style={{ marginTop: spacing.md }}
            />
          )}
        </Card>
      )}

      <Button
        label="Back"
        variant="outline"
        onPress={() => router.back()}
        style={{ marginTop: spacing.lg }}
      />
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
  subtitle: {
    fontSize: fontSize.bodyMd,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusLabel: {
    fontSize: fontSize.labelMd,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  statusValue: {
    fontSize: fontSize.headlineMd,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusOn: { color: colors.success },
  body: { fontSize: fontSize.bodyMd, color: colors.textPrimary },
  label: {
    fontSize: fontSize.labelMd,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  input: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.titleMd,
    letterSpacing: 4,
  },
  error: { fontSize: fontSize.bodySm, color: colors.error, marginTop: spacing.sm },
  success: { fontSize: fontSize.bodySm, color: colors.success, marginTop: spacing.sm },
});
