import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  resetSemuaHistory,
  syncDownload,
  syncUpload,
} from "../../utils/firebase";
import { Barang } from "../../utils/stockManager";

// Ambil lebar layar device
const screenWidth = Dimensions.get("window").width;
const cardWidth = screenWidth < 400 ? screenWidth - 60 : 160;

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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📊 Dashboard Stock Gudang</Text>

        <View style={styles.contentBox}>
          <Text style={styles.subtitle}>Selamat datang!</Text>
          <Text style={styles.normalText}>
            Gunakan menu di kiri atas untuk mengelola barang, upload, dan
            download database.
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          <View style={[styles.card, { width: cardWidth }]}>
            <MaterialCommunityIcons
              name="account-group"
              size={32}
              color="#16a34a"
            />
            <Text style={styles.cardTitle}>Total Principle</Text>
            <Text style={styles.cardCount}>{totalPrinciple}</Text>
            <Text style={styles.cardHint}>Merek utama</Text>
          </View>

          <View style={[styles.card, { width: cardWidth }]}>
            <MaterialCommunityIcons name="tag" size={32} color="#d97706" />
            <Text style={styles.cardTitle}>Total Brand</Text>
            <Text style={styles.cardCount}>{totalBrand}</Text>
            <Text style={styles.cardHint}>Jenis barang unik</Text>
          </View>
        </View>

        <View style={styles.syncContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#3b82f6" />
          ) : (
            <>
              <TouchableOpacity
                style={styles.syncButton}
                onPress={handleUpload}
              >
                <Text style={styles.syncText}>⬆️ Upload ke Cloud</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.syncButton}
                onPress={handleDownload}
              >
                <Text style={styles.syncText}>⬇️ Download dari Cloud</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: "#dc2626" }]}
                onPress={handleReset}
              >
                <Text style={styles.syncText}>🗑️ Reset Semua Data</Text>
              </TouchableOpacity>
            </>
          )}
          {lastSync && (
            <Text style={styles.syncStatus}>📅 Terakhir: {lastSync}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  title: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  normalText: {
    fontSize: 14,
    color: "#374151",
  },
  contentBox: {
    backgroundColor: "#f3f4f6",
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
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontWeight: "bold",
    color: "#1e3a8a",
  },
  cardCount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
  },
  cardHint: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  syncContainer: {
    marginTop: 32,
    gap: 12,
    alignItems: "center",
  },
  syncButton: {
    backgroundColor: "#3b82f6",
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
    color: "#0ea5e9",
    fontSize: 13,
    fontStyle: "italic",
  },
});
