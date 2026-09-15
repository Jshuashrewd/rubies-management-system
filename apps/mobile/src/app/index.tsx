import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

/** Entry route: send the user where they belong based on auth state. */
export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (user.mustChangePassword) return <Redirect href="/change-password" />;
  return <Redirect href="/dashboard" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvasTint,
  },
});
