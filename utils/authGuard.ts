// utils/authGuard.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Href } from "expo-router";

export type WarehouseKey = "Gudang A" | "Gudang BCD" | "Gudang E (Bad Stock)";

export const loginHref = () => "/auth/login" as Href<string>;

export const getUserProfile = async () => {
  const raw = await AsyncStorage.getItem("userProfile");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const requireLogin = async (router: {
  replace: (p: Href<string>) => void;
}) => {
  const logged = await AsyncStorage.getItem("userLoggedIn");
  if (logged !== "true") {
    router.replace(loginHref());
    return null;
  }
  const profile = await getUserProfile();
  if (!profile) {
    router.replace(loginHref());
    return null;
  }
  return profile;
};

export const logoutToLogin = async (router: {
  replace: (p: Href<string>) => void;
}) => {
  await AsyncStorage.multiRemove([
    "userLoggedIn",
    "userProfile",
    "lastGudangHome",
  ]);
  router.replace(loginHref());
};

// Resolusi “virtual” → set gudang aktual di data
export const resolveGudangSet = (key: WarehouseKey): string[] => {
  if (key === "Gudang A") return ["Gudang A"];
  if (key === "Gudang E (Bad Stock)") return ["Gudang E (Bad Stock)"];
  // Gudang BCD:
  return ["Gudang B", "Gudang C", "Gudang D"];
};

// opsi dropdown dari allowed user
export const buildAllowedOptions = (allowed: WarehouseKey[]) =>
  allowed.map((g) => ({ label: g, value: g }));
