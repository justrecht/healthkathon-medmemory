import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ThemeProvider } from "../src/theme";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="settings"
            options={{ presentation: "card", headerShown: false }}
          />
        </Stack>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
