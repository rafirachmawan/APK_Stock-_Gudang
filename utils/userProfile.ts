import AsyncStorage from "@react-native-async-storage/async-storage";

export type WarehouseKey = "Gudang A" | "Gudang BCD" | "Gudang E (Bad Stock)";

export type UserProfile = {
  username: string;
  displayName: string;
  role: "pic" | "guest";
  allowed: WarehouseKey[]; // contoh: ["Gudang BCD"] → berarti B,C,D
};

export async function getUserProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem("userProfile");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

/** Expand “Gudang BCD” → ["Gudang B","Gudang C","Gudang D"] */
export function expandAllowed(allowed: WarehouseKey[]): string[] {
  const set = new Set<string>();
  for (const k of allowed) {
    if (k === "Gudang A") set.add("Gudang A");
    else if (k === "Gudang BCD") {
      set.add("Gudang B");
      set.add("Gudang C");
      set.add("Gudang D");
    } else if (k === "Gudang E (Bad Stock)") {
      set.add("Gudang E (Bad Stock)");
    }
  }
  return Array.from(set);
}
