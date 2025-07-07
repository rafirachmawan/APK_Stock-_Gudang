// ✅ app/logout.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function LogoutScreen() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      try {
        // Hapus status login
        await AsyncStorage.removeItem("userLoggedIn");

        // Redirect ke halaman login
        router.replace("/auth/login");
      } catch (error) {
        console.error("Logout gagal:", error);
      }
    };

    logout();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
