import { useColorScheme } from "@/hooks/useColorScheme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, LogBox, View } from "react-native";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    LogBox.ignoreLogs(["VirtualizedLists should never be nested"]);
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    const token = await AsyncStorage.getItem("userLoggedIn");
    setIsLoggedIn(token === "true");
  };

  if (isLoggedIn === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isLoggedIn) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Drawer initialRouteName="index">
        <Drawer.Screen
          name="index"
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
        <Drawer.Screen
          name="in"
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
        <Drawer.Screen
          name="out"
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
        <Drawer.Screen
          name="generate"
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
        <Drawer.Screen
          name="hasil-generate"
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
        <Drawer.Screen
          name="stock"
          options={{
            drawerLabel: "📦 Stock Saat Ini",
            title: "Stock",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="warehouse"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Drawer.Screen
          name="export-all"
          options={{
            drawerLabel: "📤 Export Semua",
            title: "Export Semua",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="export-variant"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Drawer.Screen
          name="logout"
          options={{
            drawerLabel: "🔓 Logout",
            title: "Logout",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="logout" size={size} color={color} />
            ),
          }}
        />
      </Drawer>

      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
