import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

type Variant = "accent" | "primary" | "outline";

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        variant === "accent" && styles.accent,
        variant === "primary" && styles.primary,
        variant === "outline" && styles.outline,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? colors.primary : colors.white} />
      ) : (
        <Text style={[styles.label, variant === "outline" && styles.outlineLabel]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  accent: { backgroundColor: colors.accent },
  primary: { backgroundColor: colors.primary },
  outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.borderStrong },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
  label: { color: colors.white, fontSize: fontSize.titleMd, fontWeight: fontWeight.semibold },
  outlineLabel: { color: colors.textPrimary },
});
