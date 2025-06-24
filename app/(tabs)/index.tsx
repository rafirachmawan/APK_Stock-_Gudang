// ✅ HomeScreen.tsx — Versi Realtime dengan Pie Chart Stok per Gudang

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import { collection, DocumentData, onSnapshot } from "firebase/firestore";
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
import { PieChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  db,
  resetSemuaHistory,
  syncDownload,
  syncUpload,
} from "../../utils/firebase";

const screenWidth = Dimensions.get("window").width;

const CREDENTIALS = {
  username: "admin",
  password: "admin",
};

export default function HomeScreen() {
  const [barangMasuk, setBarangMasuk] = useState<DocumentData[]>([]);
  const [gudangStats, setGudangStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const [authVisible, setAuthVisible] = useState(false);
  const [authAction, setAuthAction] = useState<string | null>(null);
  const [inputUsername, setInputUsername] = useState("");
  const [inputPassword, setInputPassword] = useState("");

  const formatWaktu = () => {
    const now = new Date();
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "barangMasuk"), (snapshot) => {
      const data: DocumentData[] = snapshot.docs.map((doc) => doc.data());
      setBarangMasuk(data);

      const gudangJumlah: Record<string, number> = {};
      data.forEach((trx: any) => {
        const gudang = trx.gudang || "Unknown";
        const total = (trx.items || []).reduce((sum: number, item: any) => {
          const l = parseInt(item.large || "0");
          const m = parseInt(item.medium || "0");
          const s = parseInt(item.small || "0");
          return sum + l + m + s;
        }, 0);
        gudangJumlah[gudang] = (gudangJumlah[gudang] || 0) + total;
      });
      setGudangStats(gudangJumlah);
    });
    return () => unsub();
  }, []);

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
              setLastSync(`Upload: ${formatWaktu()}`);
              Alert.alert("✅ Berhasil", "Data berhasil diunggah ke Firebase");
            } catch (error: any) {
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
      setLastSync(`Download: ${formatWaktu()}`);
      Alert.alert("✅ Berhasil", "Data berhasil diunduh dari Firebase");
    } catch (error: any) {
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
    } catch (error: any) {
      Alert.alert("❌ Gagal cek update", error?.message || "Unknown error");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📊 Dashboard Stock Gudang</Text>

        <View style={{ marginVertical: 20, alignItems: "center" }}>
          <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 10 }}>
            Astro Distribusi
          </Text>

          {Object.keys(gudangStats).length > 0 ? (
            <PieChart
              data={Object.entries(gudangStats).map(([label, value], i) => ({
                name: label,
                population: value,
                color: ["#4ade80", "#60a5fa", "#facc15", "#f87171", "#a78bfa"][
                  i % 5
                ],
                legendFontColor: "#333",
                legendFontSize: 12,
              }))}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#f3f4f6",
                backgroundGradientTo: "#fff",
                color: () => "#000",
                labelColor: () => "#000",
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <Text style={{ color: "#6b7280" }}>Data stok belum tersedia</Text>
          )}
        </View>

        <View style={styles.syncContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#3b82f6" />
          ) : (
            <>
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
            <Text style={styles.syncStatus}>🗓️ Terakhir: {lastSync}</Text>
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

        <Modal transparent={true} visible={authVisible} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                🔐 Verifikasi untuk{" "}
                {authAction === "upload"
                  ? "Upload"
                  : authAction === "download"
                  ? "Download"
                  : "Reset"}
              </Text>
              <Text style={styles.fieldLabel}>🧑 Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Username"
                value={inputUsername}
                onChangeText={setInputUsername}
              />
              <Text style={styles.fieldLabel}>🔐 Password</Text>
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
  container: { padding: 20, gap: 16 },
  title: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  syncContainer: { marginTop: 32, gap: 12, alignItems: "center" },
  syncButton: {
    backgroundColor: "#3b82f6",
    padding: 14,
    borderRadius: 10,
    width: "100%",
  },
  syncText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
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
