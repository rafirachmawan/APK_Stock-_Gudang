import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

export default function HomeScreen() {
  // Dummy data—nanti ganti dengan data real dari AsyncStorage / API
  const totalMasuk = 120;
  const totalKeluar = 45;
  const stokSaatIni = 75;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        📊 Dashboard Gudang
      </ThemedText>

      <ThemedView style={styles.contentBox}>
        <ThemedText type="subtitle">Selamat datang!</ThemedText>
        <ThemedText>
          Gunakan menu di bawah untuk mengelola barang masuk, barang keluar, dan
          melihat riwayat stok.
        </ThemedText>
      </ThemedView>

      <View style={styles.cardsContainer}>
        <ThemedView style={styles.card}>
          <MaterialCommunityIcons name="warehouse" size={32} color="#4ade80" />
          <ThemedText>Total Barang Masuk</ThemedText>
          <ThemedText type="title">{totalMasuk}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.card}>
          <MaterialCommunityIcons
            name="truck-delivery"
            size={32}
            color="#facc15"
          />
          <ThemedText>Total Barang Keluar</ThemedText>
          <ThemedText type="title">{totalKeluar}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.card}>
          <MaterialCommunityIcons name="archive" size={32} color="#60a5fa" />
          <ThemedText>Stok Saat Ini</ThemedText>
          <ThemedText type="title">{stokSaatIni}</ThemedText>
        </ThemedView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  title: {
    textAlign: "center",
  },
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "center",
  },
  card: {
    width: 160,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    alignItems: "center",
    gap: 8,
    // shadow untuk iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // elevation untuk Android
    elevation: 5,
  },
  contentBox: {
    marginTop: 20,
    backgroundColor: "#222",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
});
