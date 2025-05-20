import { Tabs } from "expo-router";
import { useEffect } from "react";
import { LogBox } from "react-native";

export default function TabLayout() {
  useEffect(() => {
    LogBox.ignoreLogs([
      "VirtualizedLists should never be nested", // ✅ Menghilangkan warning DropDownPicker + ScrollView
    ]);
  }, []);

  return (
    <Tabs>
      <Tabs.Screen name="in" options={{ title: "In" }} />
      <Tabs.Screen name="out" options={{ title: "Out" }} />
      <Tabs.Screen name="generate" options={{ title: "Generate" }} />
    </Tabs>
  );
}
