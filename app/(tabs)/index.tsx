import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  resetSemuaHistory,
  syncDownload,
  syncUpload,
} from "../../utils/firebase";
import { Barang } from "../../utils/stockManager";

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const [barang, setBarang] = useState<Barang[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const formatWaktu = () => {
    const now = new Date();
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
  };

  const loadData = async () => {
    const json = await AsyncStorage.getItem("barangMasuk");
    const data: Barang[] = json ? JSON.parse(json) : [];
    setBarang(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalPrinciple = [...new Set(barang.map((item) => item.principle))]
    .length;
  const totalBrand = [...new Set(barang.map((item) => item.nama))].length;

  const handleUpload = () => {
    Alert.alert(
      "Konfirmasi",
      "Upload akan menggantikan seluruh data di Firebase dengan data lokal.\nLanjutkan?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Lanjutkan",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await syncUpload();
              setLastSync(`Upload: ${formatWaktu()}`);
              Alert.alert("✅ Berhasil", "Data berhasil diunggah ke Firebase");
            } catch (error) {
              Alert.alert("❌ Gagal", "Upload gagal");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      await syncDownload();
      await loadData(); // refresh data
      setLastSync(`Download: ${formatWaktu()}`);
      Alert.alert("✅ Berhasil", "Data berhasil diunduh dari Firebase");
    } catch (error) {
      Alert.alert("❌ Gagal", "Gagal mengunduh data");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    Alert.alert("Reset Data", "Hapus semua data lokal?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          await resetSemuaHistory();
          await loadData();
          Alert.alert("✅ Reset", "Data berhasil dihapus");
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        📊 Dashboard Stock Gudang
      </ThemedText>

      <ThemedView style={styles.contentBox}>
        <ThemedText type="subtitle">Selamat datang!</ThemedText>
        <ThemedText>
          Gunakan menu di kiri atas untuk mengelola barang, upload, dan download
          database.
        </ThemedText>
      </ThemedView>

      <View style={styles.cardsContainer}>
        <ThemedView style={styles.card}>
          <MaterialCommunityIcons
            name="account-group"
            size={32}
            color="#22c55e"
          />
          <ThemedText>Total Principle</ThemedText>
          <ThemedText type="title">{totalPrinciple}</ThemedText>
          <ThemedText style={styles.cardHint}>Merek utama</ThemedText>
        </ThemedView>

        <ThemedView style={styles.card}>
          <MaterialCommunityIcons name="tag" size={32} color="#f59e0b" />
          <ThemedText>Total Brand</ThemedText>
          <ThemedText type="title">{totalBrand}</ThemedText>
          <ThemedText style={styles.cardHint}>Jenis barang unik</ThemedText>
        </ThemedView>
      </View>

      <View style={styles.syncContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#38bdf8" />
        ) : (
          <>
            <TouchableOpacity style={styles.syncButton} onPress={handleUpload}>
              <ThemedText style={styles.syncText}>
                ⬆️ Upload ke Cloud
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleDownload}
            >
              <ThemedText style={styles.syncText}>
                ⬇️ Download dari Cloud
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.syncButton, { backgroundColor: "#dc2626" }]}
              onPress={handleReset}
            >
              <ThemedText style={styles.syncText}>
                🗑️ Reset Semua Data
              </ThemedText>
            </TouchableOpacity>
          </>
        )}
        {lastSync && (
          <ThemedText style={styles.syncStatus}>
            📅 Terakhir: {lastSync}
          </ThemedText>
        )}
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
  },
  cardHint: {
    fontSize: 12,
    color: "#cbd5e1",
    textAlign: "center",
  },
  syncContainer: {
    marginTop: 32,
    gap: 12,
    alignItems: "center",
  },
  syncButton: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    width: "100%",
  },
  syncText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  syncStatus: {
    marginTop: 10,
    color: "#38bdf8",
    fontSize: 13,
    fontStyle: "italic",
  },
});
