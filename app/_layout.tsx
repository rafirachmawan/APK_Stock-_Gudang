import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Load font custom (misalnya SpaceMono)
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return null; // Jangan render layout sampai font siap
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <>
        <Stack>
          {/* Navigasi utama tab */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* Halaman not-found */}
          <Stack.Screen name="+not-found" />
        </Stack>

        {/* Status bar dinamis */}
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </>
    </ThemeProvider>
  );
}
