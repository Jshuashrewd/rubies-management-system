import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth";
import { RemindersProvider } from "@/lib/reminders";
import { StrictModeProvider } from "@/lib/strict-mode-provider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RemindersProvider>
            <StrictModeProvider>
              <SafeAreaProvider>
                <StatusBar style="light" />
                <Stack screenOptions={{ headerShown: false }}>
                  {/* Screens declared here are ordered FIRST, and the first one is
                      where the app starts when there's no deep link. `index`
                      must lead, or the app opens on the class screen. */}
                  <Stack.Screen name="index" />
                  <Stack.Screen
                    name="class/[id]"
                    options={{ headerShown: true, title: "Class" }}
                  />
                  <Stack.Screen
                    name="strict-mode"
                    options={{ headerShown: true, title: "Strict Mode" }}
                  />
                  {/* The actual lock. No swipe-to-dismiss (gestureEnabled: false) and
                      the hardware back button is separately swallowed inside the
                      screen itself (see strict-mode-lock.tsx) — it only closes via
                      router.back() from code (join, or the window ending). */}
                  <Stack.Screen
                    name="strict-mode-lock"
                    options={{ presentation: "fullScreenModal", gestureEnabled: false }}
                  />
                </Stack>
              </SafeAreaProvider>
            </StrictModeProvider>
          </RemindersProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
