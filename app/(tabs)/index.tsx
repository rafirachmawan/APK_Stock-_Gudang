// ✅ HomeScreen.tsx — Tambah Fitur Cek Update OTA

import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates"; // ✅ Tambahkan ini
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

const screenWidth = Dimensions.get("window").width;
const cardWidth = screenWidth < 400 ? screenWidth - 60 : 160;

const CREDENTIALS = {
  username: "admin",
  password: "admin",
};

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const [barang, setBarang] = useState<Barang[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const [authVisible, setAuthVisible] = useState(false);
  const [authAction, setAuthAction] = useState<
    "upload" | "download" | "reset" | null
  >(null);
  const [inputUsername, setInputUsername] = useState("");
  const [inputPassword, setInputPassword] = useState("");

  const formatWaktu = () => {
    const now = new Date();
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
  };

  const loadData = async () => {
    try {
      const inJson = await AsyncStorage.getItem("barangMasuk");
      const outJson = await AsyncStorage.getItem("barangKeluar");
      const dataIn: Barang[] = inJson ? JSON.parse(inJson) : [];
      const dataOut: Barang[] = outJson ? JSON.parse(outJson) : [];
      setBarang([...dataIn, ...dataOut]);
    } catch (e) {
      console.error("Gagal memuat data dari AsyncStorage", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalPrinciple = [...new Set(barang.map((item) => item.principle))]
    .length;
  const totalBrand = [...new Set(barang.map((item) => item.nama))].length;

  const handleUpload = async () => {
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
              await loadData();
              setLastSync(`Upload: ${formatWaktu()}`);
              Alert.alert("✅ Berhasil", "Data berhasil diunggah ke Firebase");
            } catch (error) {
              Alert.alert("❌ Gagal", "Upload gagal: " + error);
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
      await loadData();
      setLastSync(`Download: ${formatWaktu()}`);
      Alert.alert("✅ Berhasil", "Data berhasil diunduh dari Firebase");
    } catch (error) {
      Alert.alert("❌ Gagal", "Gagal mengunduh data: " + error);
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

  const verifyAndProceed = () => {
    if (
      inputUsername === CREDENTIALS.username &&
      inputPassword === CREDENTIALS.password
    ) {
      setAuthVisible(false);
      setInputUsername("");
      setInputPassword("");
      if (authAction === "upload") handleUpload();
      else if (authAction === "download") handleDownload();
      else if (authAction === "reset") handleReset();
    } else {
      Alert.alert("❌ Gagal", "Username atau password salah");
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userLoggedIn");
    Alert.alert("Logout", "Anda telah keluar dari akun.");
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // ✅ Fitur Cek Update OTA
  const checkForUpdates = async () => {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert("🔄 Update Tersedia", "Aplikasi akan diperbarui.", [
          { text: "OK", onPress: () => Updates.reloadAsync() },
        ]);
      } else {
        Alert.alert("✅ Tidak ada update", "Versi terbaru sudah digunakan.");
      }
    } catch (error) {
      Alert.alert("❌ Gagal cek update", error?.message || "Unknown error");
    }
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
              {/* <TouchableOpacity
                style={styles.syncButton}
                onPress={() => {
                  setAuthAction("upload");
                  setAuthVisible(true);
                }}
              >
                <Text style={styles.syncText}>⬆️ Upload ke Cloud</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.syncButton}
                onPress={() => {
                  setAuthAction("download");
                  setAuthVisible(true);
                }}
              >
                <Text style={styles.syncText}>⬇️ Download dari Cloud</Text>
              </TouchableOpacity> */}

              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: "#dc2626" }]}
                onPress={() => {
                  setAuthAction("reset");
                  setAuthVisible(true);
                }}
              >
                <Text style={styles.syncText}>🗑️ Reset Semua Data</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: "#10b981" }]}
                onPress={checkForUpdates}
              >
                <Text style={styles.syncText}>🔄 Cek Update Aplikasi</Text>
              </TouchableOpacity>
            </>
          )}
          {lastSync && (
            <Text style={styles.syncStatus}>📅 Terakhir: {lastSync}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.syncButton,
            { backgroundColor: "#6b7280", marginTop: 40 },
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.syncText}>🔓 Logout</Text>
        </TouchableOpacity>

        {/* Modal Login */}
        <Modal transparent={true} visible={authVisible} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                🔐 Verifikasi untuk{" "}
                {authAction === "upload"
                  ? "Upload"
                  : authAction === "download"
                  ? "Download"
                  : authAction === "reset"
                  ? "Reset"
                  : ""}
              </Text>

              <Text style={styles.fieldLabel}>🧑 Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Username"
                value={inputUsername}
                onChangeText={setInputUsername}
              />

              <Text style={styles.fieldLabel}>🔒 Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={inputPassword}
                onChangeText={setInputPassword}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={verifyAndProceed}
                  style={[styles.syncButton, { width: "48%" }]}
                >
                  <Text style={styles.syncText}>✅ Lanjut</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAuthVisible(false)}
                  style={[
                    styles.syncButton,
                    { width: "48%", backgroundColor: "#9ca3af" },
                  ]}
                >
                  <Text style={styles.syncText}>❌ Batal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: "80%",
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  fieldLabel: {
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#f9fafb",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
});
