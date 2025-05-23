import { useColorScheme } from "@/hooks/useColorScheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox } from "react-native";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    LogBox.ignoreLogs(["VirtualizedLists should never be nested"]);
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Drawer>
        <Drawer.Screen name="dashboard" options={{ title: "Dashboard" }} />
        <Drawer.Screen name="in" options={{ title: "Barang Masuk" }} />
        <Drawer.Screen name="out" options={{ title: "Barang Keluar" }} />
        <Drawer.Screen name="generate" options={{ title: "Generate" }} />
        <Drawer.Screen name="stock-detail" options={{ title: "In Detail" }} />
        <Drawer.Screen name="out-detail" options={{ title: "Out Detail" }} />
        <Drawer.Screen
          name="hasil-generate"
          options={{ title: "Hasil Generate" }}
        />
      </Drawer>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
