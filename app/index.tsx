// app/index.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // 🧹 selalu hapus sesi lama tiap kali app dibuka
      await AsyncStorage.multiRemove([
        "userProfile",
        "userLoggedIn",
        "lastGudangHome",
      ]);
      // ⏩ paksa ke halaman login
      router.replace("/auth/login");
    })();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
