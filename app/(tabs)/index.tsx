// HomeScreen.tsx — Satu screen, akses gudang berdasar user login (A / BCD / E)
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as Updates from "expo-updates";
import { collection, DocumentData, onSnapshot } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
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
import DropDownPicker from "react-native-dropdown-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  buildAllowedOptions,
  logoutToLogin,
  requireLogin,
  resolveGudangSet,
  WarehouseKey,
} from "../../utils/authGuard";
import {
  db,
  resetSemuaHistory,
  syncDownload,
  syncUpload,
} from "../../utils/firebase";

const screenWidth = Dimensions.get("window").width;

const CREDENTIALS = { username: "admin", password: "admin" };

// Helpers
const norm = (s: any) =>
  String(s ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]/g, "");
const toInt = (v: any) => {
  const n = parseInt(String(v ?? "0").trim(), 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
};
const formatWaktu = () => {
  const now = new Date();
  return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
};

export default function HomeScreen() {
  const router = useRouter();

  // Auth/profile
  const [displayName, setDisplayName] = useState<string>("");
  const [allowed, setAllowed] = useState<WarehouseKey[]>([]);

  // Data realtime
  const [barangMasuk, setBarangMasuk] = useState<DocumentData[]>([]);
  const [barangKeluar, setBarangKeluar] = useState<DocumentData[]>([]);

  // Pilihan gudang dibatasi oleh allowed
  const [gudangOpen, setGudangOpen] = useState(false);
  const [gudangOptions, setGudangOptions] = useState<
    { label: string; value: WarehouseKey }[]
  >([]);
  const [selectedGudang, setSelectedGudang] = useState<WarehouseKey | null>(
    null
  );

  // Auth modal untuk sync
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [authVisible, setAuthVisible] = useState(false);
  const [authAction, setAuthAction] = useState<string | null>(null);
  const [inputUsername, setInputUsername] = useState("");
  const [inputPassword, setInputPassword] = useState("");

  // Require login & setup allowed
  useEffect(() => {
    (async () => {
      const profile = await requireLogin(router);
      if (!profile) return;
      setDisplayName(profile.displayName || "-");

      const userAllowed: WarehouseKey[] = profile.allowed ?? [];
      setAllowed(userAllowed);
      const opts = buildAllowedOptions(userAllowed);
      setGudangOptions(opts);

      // restore last choice kalau masih allowed, else pilih pertama
      const last = (await AsyncStorage.getItem(
        "lastGudangHome"
      )) as WarehouseKey | null;
      const validLast = last && userAllowed.includes(last) ? last : null;
      setSelectedGudang(validLast || (userAllowed[0] ?? null));
    })();
  }, []);

  // Realtime snapshot
  useEffect(() => {
    const unsubIn = onSnapshot(collection(db, "barangMasuk"), (snap) => {
      setBarangMasuk(snap.docs.map((d) => d.data()));
    });
    const unsubOut = onSnapshot(collection(db, "barangKeluar"), (snap) => {
      setBarangKeluar(snap.docs.map((d) => d.data()));
    });
    return () => {
      unsubIn();
      unsubOut();
    };
  }, []);

  // Simpan pilihan gudang terakhir
  useEffect(() => {
    if (selectedGudang) {
      AsyncStorage.setItem("lastGudangHome", selectedGudang);
    }
  }, [selectedGudang]);

  // Hitung stok per-kode sesuai pilihan:
  // kalau pilih "Gudang BCD" → union dari Gudang B,C,D
  const principleTotals = useMemo(() => {
    if (!selectedGudang) return {} as Record<string, number>;
    const targetGudangs = resolveGudangSet(selectedGudang); // array gudang aktual untuk filter

    // map per kode
    const map = new Map<
      string,
      { L: number; M: number; S: number; principle: string; nama: string }
    >();

    // + barangMasuk (trx.gudang ∈ targetGudangs)
    for (const trx of barangMasuk) {
      if (!targetGudangs.includes(trx.gudang)) continue;
      const items = Array.isArray(trx.items) ? trx.items : [];
      for (const it of items) {
        const key = norm(it.kode);
        if (!map.has(key)) {
          map.set(key, {
            L: 0,
            M: 0,
            S: 0,
            principle: it.principle || trx.principle || "-",
            nama: it.namaBarang || "",
          });
        }
        const row = map.get(key)!;
        row.L += toInt(it.large);
        row.M += toInt(it.medium);
        row.S += toInt(it.small);
      }
    }

    // - barangKeluar asal (item.gdg ?? trx.jenisGudang) ∈ targetGudangs
    for (const trx of barangKeluar) {
      const items = Array.isArray(trx.items) ? trx.items : [];
      for (const it of items) {
        const asal = String(
          (it.gdg && it.gdg.trim() !== "" ? it.gdg : trx.jenisGudang) || ""
        );
        if (!targetGudangs.includes(asal)) continue;

        const key = norm(it.kode);
        if (!map.has(key)) {
          map.set(key, {
            L: 0,
            M: 0,
            S: 0,
            principle: it.principle || trx.principle || "-",
            nama: it.namaBarang || "",
          });
        }
        const row = map.get(key)!;
        const useL = toInt(it.consumedL ?? it.large);
        const useM = toInt(it.consumedM ?? it.medium);
        const useS = toInt(it.consumedS ?? it.small);
        row.L = Math.max(0, row.L - useL);
        row.M = Math.max(0, row.M - useM);
        row.S = Math.max(0, row.S - useS);
      }
    }

    // + mutasiMasuk (trx.gudangTujuan ∈ targetGudangs)
    for (const trx of barangKeluar) {
      const tujuan = String(trx.gudangTujuan || "");
      if (!targetGudangs.includes(tujuan)) continue;
      const items = Array.isArray(trx.items) ? trx.items : [];
      for (const it of items) {
        const key = norm(it.kode);
        if (!map.has(key)) {
          map.set(key, {
            L: 0,
            M: 0,
            S: 0,
            principle: it.principle || trx.principle || "-",
            nama: it.namaBarang || "",
          });
        }
        const row = map.get(key)!;
        row.L += toInt(it.large);
        row.M += toInt(it.medium);
        row.S += toInt(it.small);
      }
    }

    // agregasi per principle (tanpa angka ditampilkan di UI)
    const perPrinciple: Record<string, number> = {};
    map.forEach((row) => {
      const total = row.L + row.M + row.S;
      if (total <= 0) return;
      const p = row.principle || "-";
      perPrinciple[p] = (perPrinciple[p] || 0) + total;
    });

    return perPrinciple;
  }, [selectedGudang, barangMasuk, barangKeluar]);

  // Pie data (tanpa angka, cuma proporsi)
  const pieData = useMemo(() => {
    const entries = Object.entries(principleTotals).filter(([, v]) => v > 0);
    if (entries.length === 0) return [];
    const palette = [
      "#4ade80",
      "#60a5fa",
      "#facc15",
      "#f87171",
      "#a78bfa",
      "#34d399",
      "#fb7185",
      "#38bdf8",
      "#fbbf24",
      "#c084fc",
    ];
    return entries.map(([label, value], i) => ({
      name: label,
      population: value,
      color: palette[i % palette.length],
      legendFontColor: "#333",
      legendFontSize: 12,
    }));
  }, [principleTotals]);

  // --- Sync / Reset / Logout ---
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
    Alert.alert("Reset Data", "Hapus semua data lokal & Firebase?", [
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
    await logoutToLogin(router);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📊 Dashboard Stock Gudang (Realtime)</Text>
        {!!displayName && (
          <Text
            style={{ textAlign: "center", color: "#6b7280", marginTop: -6 }}
          >
            User: {displayName}
          </Text>
        )}

        {/* Pilih Gudang (hanya yang allowed) */}
        <View style={{ zIndex: 1000 }}>
          <DropDownPicker
            open={gudangOpen}
            value={selectedGudang}
            items={gudangOptions}
            setOpen={setGudangOpen}
            setValue={setSelectedGudang as any}
            setItems={setGudangOptions}
            placeholder="Pilih Gudang"
            style={styles.dropdown}
            dropDownContainerStyle={{
              borderWidth: 1,
              borderColor: "#ccc",
              maxHeight: 300,
            }}
            listMode="SCROLLVIEW"
            searchable
            disabled={allowed.length <= 1} // kalau cuma 1, kunci
          />
        </View>

        {/* Pie principles (tanpa angka) */}
        <View style={{ marginVertical: 20, alignItems: "center" }}>
          <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 10 }}>
            {selectedGudang ? `Principle di ${selectedGudang}` : "Pilih gudang"}
          </Text>

          {selectedGudang && pieData.length > 0 ? (
            <>
              <PieChart
                data={pieData}
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
                hasLegend={false}
              />
              <View style={styles.legendWrap}>
                {pieData.map((d, idx) => (
                  <View key={idx} style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: d.color }]}
                    />
                    <Text style={styles.legendLabel}>{d.name}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={{ color: "#6b7280" }}>
              {selectedGudang
                ? "Belum ada stok untuk gudang ini"
                : "Data belum siap"}
            </Text>
          )}
        </View>

        {/* Tombol utilitas */}
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
                onPress={async () => {
                  try {
                    const upd = await Updates.checkForUpdateAsync();
                    if (upd.isAvailable) {
                      await Updates.fetchUpdateAsync();
                      Alert.alert(
                        "🔄 Update Tersedia",
                        "Aplikasi akan diperbarui.",
                        [{ text: "OK", onPress: () => Updates.reloadAsync() }]
                      );
                    } else {
                      Alert.alert(
                        "✅ Tidak ada update",
                        "Versi terbaru sudah digunakan."
                      );
                    }
                  } catch (e: any) {
                    Alert.alert(
                      "❌ Gagal cek update",
                      e?.message || "Unknown error"
                    );
                  }
                }}
              >
                <Text style={styles.syncText}>🔄 Cek Update Aplikasi</Text>
              </TouchableOpacity>

              {/* Kalau masih butuh manual sync, buka komentar di bawah:
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: "#3b82f6" }]}
                onPress={() => { setAuthAction("upload"); setAuthVisible(true); }}
              >
                <Text style={styles.syncText}>☁️ Upload ke Firebase</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: "#2563eb" }]}
                onPress={() => { setAuthAction("download"); setAuthVisible(true); }}
              >
                <Text style={styles.syncText}>⬇️ Download dari Firebase</Text>
              </TouchableOpacity>
              */}
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

        {/* Modal Auth */}
        <Modal transparent visible={authVisible} animationType="slide">
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
                autoCapitalize="none"
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
  dropdown: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10 },
  legendWrap: {
    width: screenWidth - 40,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#f3f4f6",
    borderRadius: 999,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendLabel: { fontSize: 12, color: "#111827", fontWeight: "600" },
  syncContainer: { marginTop: 24, gap: 12, alignItems: "center" },
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
