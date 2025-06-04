import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect } from "react";

export default function LogoutScreen() {
  useEffect(() => {
    const logout = async () => {
      await AsyncStorage.removeItem("userLoggedIn");
    };
    logout();
  }, []);

  return <Redirect href="/auth/login" />;
}
