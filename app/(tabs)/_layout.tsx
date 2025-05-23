import { useColorScheme } from "@/hooks/useColorScheme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
        {/* 🏠 Dashboard */}
        <Drawer.Screen
          name="(tabs)/index"
          options={{
            drawerLabel: "🏠 Dashboard",
            title: "Dashboard",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="view-dashboard"
                size={size}
                color={color}
              />
            ),
          }}
        />

        {/* 📥 Barang Masuk */}
        <Drawer.Screen
          name="(tabs)/in"
          options={{
            drawerLabel: "📥 Barang Masuk",
            title: "Barang Masuk",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="tray-arrow-down"
                size={size}
                color={color}
              />
            ),
          }}
        />

        {/* 📤 Barang Keluar */}
        <Drawer.Screen
          name="(tabs)/out"
          options={{
            drawerLabel: "📤 Barang Keluar",
            title: "Barang Keluar",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="tray-arrow-up"
                size={size}
                color={color}
              />
            ),
          }}
        />

        {/* 🎲 Generate */}
        <Drawer.Screen
          name="(tabs)/generate"
          options={{
            drawerLabel: "🎲 Generate",
            title: "Generate",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="shuffle-variant"
                size={size}
                color={color}
              />
            ),
          }}
        />

        {/* 🧾 Hasil Generate */}
        <Drawer.Screen
          name="(tabs)/hasil-generate"
          options={{
            drawerLabel: "🧾 Hasil Generate",
            title: "Hasil Generate",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="file-document-multiple-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />

        {/* 📋 In Detail */}
        <Drawer.Screen
          name="stock-detail"
          options={{
            drawerLabel: "📋 In Detail",
            title: "In Detail",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="clipboard-list-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />

        {/* 📋 Out Detail */}
        <Drawer.Screen
          name="out-detail"
          options={{
            drawerLabel: "📋 Out Detail",
            title: "Out Detail",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="clipboard-text-clock-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Drawer>

      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
