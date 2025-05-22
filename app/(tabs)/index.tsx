import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import {
  resetSemuaHistory,
  syncDownload,
  syncUpload,
} from "../../utils/firebase";

export default function HomeScreen() {
  const totalMasuk = 120;
  const totalKeluar = 45;
  const stokSaatIni = 75;

  const handleUpload = () => {
    Alert.alert(
      "Konfirmasi",
      "Upload akan menggantikan seluruh data di Firebase dengan data lokal.\nApakah kamu yakin?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Lanjutkan",
          style: "destructive",
          onPress: async () => {
            try {
              await syncUpload();
              Alert.alert("✅ Berhasil", "Data berhasil diunggah ke Firebase");
            } catch (error) {
              console.error(error);
              Alert.alert("❌ Gagal", "Gagal mengupload data ke Firebase");
            }
          },
        },
      ]
    );
  };

  const handleDownload = async () => {
    try {
      await syncDownload();
      Alert.alert("✅ Berhasil", "Data berhasil diunduh dari Firebase");
    } catch (error) {
      console.error(error);
      Alert.alert("❌ Gagal", "Gagal mengunduh data dari Firebase");
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Histori",
      "Semua data barang masuk & keluar di device ini akan dihapus. Lanjutkan?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            await resetSemuaHistory();
            Alert.alert(
              "✅ Histori dihapus",
              "Semua data lokal telah di-reset."
            );
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        📊 Dashboard Stock Gudang
      </ThemedText>

      <ThemedView style={styles.contentBox}>
        <ThemedText type="subtitle">Selamat datang!</ThemedText>
        <ThemedText>
          Gunakan menu di kiri atas untuk mengelola barang masuk, barang keluar,
          dan melihat riwayat stok.
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

      <View style={styles.syncContainer}>
        <TouchableOpacity style={styles.syncButton} onPress={handleUpload}>
          <ThemedText style={styles.syncText}>⬆️ Upload ke Cloud</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.syncButton} onPress={handleDownload}>
          <ThemedText style={styles.syncText}>
            ⬇️ Download dari Cloud
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.syncButton, { backgroundColor: "#dc2626" }]}
          onPress={handleReset}
        >
          <ThemedText style={styles.syncText}>
            🗑️ Reset Semua Histori
          </ThemedText>
        </TouchableOpacity>
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
  contentBox: {
    marginTop: 20,
    backgroundColor: "#222",
    padding: 16,
    borderRadius: 12,
    gap: 8,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  syncContainer: {
    marginTop: 32,
    gap: 12,
  },
  syncButton: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
  },
  syncText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
});
