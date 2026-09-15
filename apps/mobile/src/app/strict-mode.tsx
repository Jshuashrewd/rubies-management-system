import { router } from "expo-router";
import { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

const HOW_IT_WORKS = [
  "Engages automatically 5 minutes before class starts.",
  "Keeps this device on the class — other apps stay out of reach.",
  "Releases on its own when class ends, or the moment you join.",
  "A parent can unlock early with the passcode.",
];

export default function StrictMode() {
  const [passcode, setPasscode] = useState("");
  const [locked, setLocked] = useState(false);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canPreview = passcode.length >= 4;

  function tryUnlock() {
    if (entry === passcode) {
      setLocked(false);
      setEntry("");
      setError(null);
    } else {
      setError("Incorrect passcode.");
    }
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>Strict Mode</Text>
      <Text style={styles.sub}>
        A focus lock that keeps students on the live class. It runs inside the app.
      </Text>

      <Card style={{ marginTop: spacing.lg }}>
        <Text style={styles.cardTitle}>How it works</Text>
        {HOW_IT_WORKS.map((line) => (
          <View key={line} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{line}</Text>
          </View>
        ))}
      </Card>

      <Text style={styles.label}>Parent passcode (4–6 digits)</Text>
      <TextInput
        style={styles.input}
        placeholder="••••"
        placeholderTextColor={colors.textSecondary}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        value={passcode}
        onChangeText={setPasscode}
      />

      <Button
        label="Preview the lock screen"
        variant="primary"
        disabled={!canPreview}
        onPress={() => setLocked(true)}
        style={{ marginTop: spacing.lg }}
      />
      <Button
        label="Close"
        variant="outline"
        onPress={() => router.back()}
        style={{ marginTop: spacing.sm }}
      />

      <Modal visible={locked} animationType="fade" onRequestClose={() => setLocked(false)}>
        <View style={styles.lock}>
          <Text style={styles.lockKicker}>STRICT MODE</Text>
          <Text style={styles.lockTitle}>Focus time</Text>
          <Text style={styles.lockBody}>
            Your class is in session. This screen stays until class ends — or a
            parent enters the passcode.
          </Text>
          <TextInput
            style={styles.lockInput}
            placeholder="Enter passcode"
            placeholderTextColor="#B9A8D6"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            value={entry}
            onChangeText={setEntry}
          />
          {error ? <Text style={styles.lockError}>{error}</Text> : null}
          <Button
            label="Unlock"
            variant="accent"
            onPress={tryUnlock}
            style={{ marginTop: spacing.md, alignSelf: "stretch" }}
          />
        </View>
      </Modal>
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
  sub: {
    fontSize: fontSize.bodyMd,
    color: colors.textSecondary,
    marginTop: spacing["2xs"],
    lineHeight: 20,
  },
  cardTitle: {
    fontSize: fontSize.titleMd,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  bulletRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing["2xs"] },
  bulletDot: { color: colors.accent, fontSize: fontSize.bodyMd },
  bulletText: {
    flex: 1,
    fontSize: fontSize.bodyMd,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  label: {
    fontSize: fontSize.labelLg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing["2xs"],
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: fontSize.bodyLg,
    letterSpacing: 4,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  lock: {
    flex: 1,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  lockKicker: {
    fontSize: fontSize.labelSm,
    fontWeight: fontWeight.semibold,
    letterSpacing: 2,
    color: colors.accent,
  },
  lockTitle: {
    fontSize: fontSize.displayLgMobile,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginTop: spacing.xs,
  },
  lockBody: {
    fontSize: fontSize.bodyMd,
    color: "#D8CCEC",
    textAlign: "center",
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  lockInput: {
    alignSelf: "stretch",
    height: 52,
    borderWidth: 1,
    borderColor: "#4A3570",
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: fontSize.bodyLg,
    letterSpacing: 6,
    textAlign: "center",
    color: colors.white,
    backgroundColor: "#241046",
  },
  lockError: { color: colors.warning, marginTop: spacing.sm },
});
