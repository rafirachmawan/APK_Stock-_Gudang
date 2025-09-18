import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import * as XLSX from "xlsx";
import { db } from "../../utils/firebase";

interface Item {
  namaBarang: string;
  kode: string;

  large: string;
  medium: string;
  small: string;

  consumedL?: string;
  consumedM?: string;
  consumedS?: string;

  gdg?: string;
  principle: string;

  leftoverM?: string;
  leftoverS?: string;

  netDL?: string;
  netDM?: string;
  netDS?: string;

  _adjustment?: boolean;
}

interface Transaksi {
  gudang?: string; // barangMasuk
  gudangTujuan?: string; // barangKeluar (beberapa data lama)
  tujuanGudang?: string; // barangKeluar (OutScreen)
  jenisGudang?: string; // barangKeluar (asal: header)
  jenisForm?: "DR" | "MB" | "RB" | "ADJ-IN" | "ADJ-OUT";
  principle: string;
  items: Item[];
  waktuInput?: any;
}

type StokRow = {
  kode: string;
  nama: string;
  principle: string;
  totalLarge: number;
  totalMedium: number;
  totalSmall: number;
};

// 🔐 Password admin
const STOCK_ADMIN_PASSWORD = "admin123@";

const normCode = (s: any) =>
  String(s ?? "")
    .trim()
    .toUpperCase();

const toInt = (v: any) => {
  const n = parseInt(String(v ?? "0").trim(), 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
};
const toIntAny = (v: any) => {
  const n = parseInt(String(v ?? "0").trim(), 10);
  return Number.isNaN(n) ? 0 : n;
};

const canonicalGudang = (g: any): string => {
  const x = String(g ?? "").trim();
  const U = x.toUpperCase();
  if (!x) return "Unknown";
  if (U.includes("E (BAD STOCK)")) return "Gudang E (Bad Stock)";
  if (U.includes("BCD")) return "Gudang BCD";
  if (
    U.includes("GUDANG B") ||
    U.includes("GUDANG C") ||
    U.includes("GUDANG D")
  )
    return "Gudang BCD";
  if (U.includes("GUDANG A")) return "Gudang A";
  return x;
};

export default function StockScreen() {
  const [stok, setStok] = useState<StokRow[]>([]);
  const [barangMasuk, setBarangMasuk] = useState<Transaksi[]>([]);
  const [barangKeluar, setBarangKeluar] = useState<Transaksi[]>([]);
  const [searchText, setSearchText] = useState("");

  const [totalPrinciple, setTotalPrinciple] = useState(0);
  const [totalBarang, setTotalBarang] = useState(0);

  const [gudangOpen, setGudangOpen] = useState(false);
  const [gudangDipilih, setGudangDipilih] = useState<string | null>(null);
  const [gudangItems, setGudangItems] = useState([
    { label: "Gudang A", value: "Gudang A" },
    { label: "Gudang BCD", value: "Gudang BCD" },
    { label: "Gudang E (Bad Stock)", value: "Gudang E (Bad Stock)" },
  ]);

  // ====== Edit Modal State ======
  const [editVisible, setEditVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<StokRow | null>(null);
  const [inputL, setInputL] = useState("");
  const [inputM, setInputM] = useState("");
  const [inputS, setInputS] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  useEffect(() => {
    const unsubIn = onSnapshot(collection(db, "barangMasuk"), (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data() as Transaksi);
      setBarangMasuk(data);
    });
    const unsubOut = onSnapshot(collection(db, "barangKeluar"), (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data() as Transaksi);
      setBarangKeluar(data);
    });
    return () => {
      unsubIn();
      unsubOut();
    };
  }, []);

  useEffect(() => {
    if (!gudangDipilih) return;

    const map = new Map<
      string,
      {
        kodeRaw: string;
        nama: string;
        principle: string;
        L: number;
        M: number;
        S: number;
      }
    >();

    // + barangMasuk (group)
    barangMasuk.forEach((trx) => {
      const gGroup = canonicalGudang(trx.gudang);
      if (gGroup !== gudangDipilih) return;
      trx.items?.forEach((item) => {
        const key = normCode(item.kode);
        if (!map.has(key)) {
          map.set(key, {
            kodeRaw: String(item.kode ?? ""),
            nama: item.namaBarang,
            principle: item.principle || trx.principle || "-",
            L: 0,
            M: 0,
            S: 0,
          });
        }
        const data = map.get(key)!;
        data.L += toInt(item.large);
        data.M += toInt(item.medium);
        data.S += toInt(item.small);
      });
    });

    // - barangKeluar asal (group asal per item)
    barangKeluar.forEach((trx) => {
      trx.items?.forEach((item) => {
        const asalRaw =
          item.gdg && item.gdg.trim() !== "" ? item.gdg : trx.jenisGudang;
        const gGroup = canonicalGudang(asalRaw);
        if (gGroup !== gudangDipilih) return;

        const key = normCode(item.kode);
        if (!map.has(key)) {
          map.set(key, {
            kodeRaw: String(item.kode ?? ""),
            nama: item.namaBarang,
            principle: item.principle || trx.principle || "-",
            L: 0,
            M: 0,
            S: 0,
          });
        }
        const data = map.get(key)!;

        // ✅ ADJ-OUT: pakai net* (bersih)
        const isAdjOut =
          String(trx.jenisForm ?? "").toUpperCase() === "ADJ-OUT" &&
          item._adjustment === true;

        if (isAdjOut) {
          const dL = Math.max(0, toIntAny(item.netDL));
          const dM = Math.max(0, toIntAny(item.netDM));
          const dS = Math.max(0, toIntAny(item.netDS));
          data.L = Math.max(0, data.L - dL);
          data.M = Math.max(0, data.M - dM);
          data.S = Math.max(0, data.S - dS);
        } else {
          // ✅ Transaksi biasa (DR/RB/MB): kurangi konsumsi, lalu tambah leftover
          const consumedL = toInt(item.consumedL ?? item.large);
          const consumedM = toInt(item.consumedM ?? item.medium);
          const consumedS = toInt(item.consumedS ?? item.small);

          // 1) kurangi stok
          data.L = Math.max(0, data.L - consumedL);
          data.M = Math.max(0, data.M - consumedM);
          data.S = Math.max(0, data.S - consumedS);

          // 2) tambahkan kembali leftover (dibatasi agar ≤ konsumsi)
          const rawLeftoverM = toInt(item.leftoverM);
          const rawLeftoverS = toInt(item.leftoverS);
          const safeLeftoverM = Math.min(rawLeftoverM, consumedM);
          const safeLeftoverS = Math.min(rawLeftoverS, consumedS);

          data.M += safeLeftoverM;
          data.S += safeLeftoverS;
        }
      });
    });

    // + mutasi masuk (group tujuan) — HANYA untuk MB
    barangKeluar.forEach((trx) => {
      if (String(trx.jenisForm ?? "").toUpperCase() !== "MB") return;

      const tujuan = canonicalGudang(trx.gudangTujuan ?? trx.tujuanGudang);
      if (tujuan !== gudangDipilih) return;

      trx.items?.forEach((item) => {
        const key = normCode(item.kode);
        if (!map.has(key)) {
          map.set(key, {
            kodeRaw: String(item.kode ?? ""),
            nama: item.namaBarang,
            principle: item.principle || trx.principle || "-",
            L: 0,
            M: 0,
            S: 0,
          });
        }
        const data = map.get(key)!;
        data.L += toInt(item.large);
        data.M += toInt(item.medium);
        data.S += toInt(item.small);
      });
    });

    const final = Array.from(map.values())
      .map((r) => ({
        kode: r.kodeRaw,
        nama: r.nama,
        principle: r.principle,
        totalLarge: r.L,
        totalMedium: r.M,
        totalSmall: r.S,
      }))
      .filter((item) => {
        const q = searchText.trim().toLowerCase();
        if (!q) return true;
        return (
          item.nama.toLowerCase().includes(q) ||
          item.kode.toLowerCase().includes(q)
        );
      });

    setStok(final);
    setTotalBarang(final.length);
    setTotalPrinciple(new Set(final.map((item) => item.principle)).size);
  }, [barangMasuk, barangKeluar, searchText, gudangDipilih]);

  const handleExport = async () => {
    const data = stok.map((item) => ({
      Nama: item.nama,
      Kode: item.kode,
      Principle: item.principle,
      Large: item.totalLarge,
      Medium: item.totalMedium,
      Small: item.totalSmall,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "StokGudang");

    const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const uri = FileSystem.cacheDirectory + "StokGudang_Export.xlsx";

    await FileSystem.writeAsStringAsync(uri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(uri, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Export Data Stok",
      UTI: "com.microsoft.excel.xlsx",
    });
  };

  const deleteDocsByGudang = async () => {
    if (!gudangDipilih) return;

    Alert.alert(
      "Konfirmasi",
      `Yakin ingin menghapus semua data terkait ${gudangDipilih}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              // 1) Hapus semua barangMasuk di gudangDipilih
              const snapMasuk = await getDocs(collection(db, "barangMasuk"));
              for (const d of snapMasuk.docs) {
                const trx = d.data() as Transaksi;
                if (canonicalGudang(trx.gudang) === gudangDipilih) {
                  await deleteDoc(doc(db, "barangMasuk", d.id));
                }
              }

              // 2) Bersihkan barangKeluar:
              //    - Untuk item yang ASAL-nya = gudangDipilih -> buang item tsb dari dokumen
              //    - Khusus MB yang TUJUAN = gudangDipilih -> jangan hapus doc!
              //      Cukup "matikan" efek tambah dengan mengganti tujuan ke __REMOVED__
              const snapKeluar = await getDocs(collection(db, "barangKeluar"));
              for (const d of snapKeluar.docs) {
                const trx = d.data() as Transaksi;
                const jenis = String(trx.jenisForm ?? "").toUpperCase();
                const tujuanNow = canonicalGudang(
                  trx.gudangTujuan ?? trx.tujuanGudang
                );

                // a) Kalau MB dan TUJUAN = gudangDipilih -> nonaktifkan penambahan ke tujuan
                if (jenis === "MB" && tujuanNow === gudangDipilih) {
                  await updateDoc(doc(db, "barangKeluar", d.id), {
                    gudangTujuan: "__REMOVED__",
                    tujuanGudang: "__REMOVED__",
                  } as any);
                }

                // b) Buang item yang ASAL-nya = gudangDipilih
                const items = Array.isArray(trx.items) ? trx.items : [];
                const remaining = items.filter((it) => {
                  const asalRaw =
                    it.gdg && it.gdg.trim() !== "" ? it.gdg : trx.jenisGudang;
                  const asalGroup = canonicalGudang(asalRaw);
                  return asalGroup !== gudangDipilih;
                });

                if (remaining.length === items.length) continue;

                if (remaining.length === 0) {
                  await deleteDoc(doc(db, "barangKeluar", d.id));
                } else {
                  await updateDoc(doc(db, "barangKeluar", d.id), {
                    items: remaining,
                  } as any);
                }
              }

              Alert.alert(
                "Sukses",
                `✅ Semua data terkait ${gudangDipilih} dibersihkan.`
              );
            } catch (err) {
              console.error(err);
              Alert.alert("Gagal", "❌ Terjadi kesalahan saat menghapus.");
            }
          },
        },
      ]
    );
  };

  // ====== Helpers penyesuaian (tidak mengubah logika stok) ======
  const createAdjustmentIn = async (
    row: StokRow,
    dL: number,
    dM: number,
    dS: number
  ) => {
    const id = `ADJ-IN-${normCode(row.kode)}-${Date.now()}`;
    const docRef = doc(db, "barangMasuk", id);
    const payload: Transaksi = {
      gudang: gudangDipilih || "-",
      principle: row.principle || "-",
      jenisForm: "ADJ-IN",
      items: [
        {
          namaBarang: row.nama,
          kode: row.kode,
          large: String(Math.max(0, dL)),
          medium: String(Math.max(0, dM)),
          small: String(Math.max(0, dS)),
          principle: row.principle || "-",
          _adjustment: true,
        },
      ],
    };
    await setDoc(docRef, { ...payload, waktuInput: serverTimestamp() } as any);
  };

  const createAdjustmentOut = async (
    row: StokRow,
    dL: number,
    dM: number,
    dS: number
  ) => {
    const id = `ADJ-OUT-${normCode(row.kode)}-${Date.now()}`;
    const docRef = doc(db, "barangKeluar", id);
    const payload: Transaksi = {
      jenisForm: "ADJ-OUT",
      jenisGudang: gudangDipilih || "-",
      principle: row.principle || "-",
      items: [
        {
          namaBarang: row.nama,
          kode: row.kode,
          large: "0",
          medium: "0",
          small: "0",
          netDL: String(Math.max(0, dL)),
          netDM: String(Math.max(0, dM)),
          netDS: String(Math.max(0, dS)),
          principle: row.principle || "-",
          gdg: gudangDipilih || "-",
          _adjustment: true,
        } as any,
      ],
    };
    await setDoc(docRef, { ...payload, waktuInput: serverTimestamp() } as any);
  };

  const verifyPassword = () => {
    if (adminPassword !== STOCK_ADMIN_PASSWORD) {
      Alert.alert("Ditolak", "Password admin salah.");
      return false;
    }
    return true;
  };

  const applyEdit = async () => {
    if (!editTarget || !gudangDipilih) return;
    if (!verifyPassword()) return;

    const curL = toInt(editTarget.totalLarge);
    const curM = toInt(editTarget.totalMedium);
    const curS = toInt(editTarget.totalSmall);

    const tgtL = toInt(inputL);
    const tgtM = toInt(inputM);
    const tgtS = toInt(inputS);

    const dL = tgtL - curL;
    const dM = tgtM - curM;
    const dS = tgtS - curS;

    if (dL === 0 && dM === 0 && dS === 0) {
      Alert.alert("Info", "Tidak ada perubahan qty.");
      return;
    }

    try {
      if (dL > 0 || dM > 0 || dS > 0) {
        await createAdjustmentIn(
          editTarget,
          Math.max(0, dL),
          Math.max(0, dM),
          Math.max(0, dS)
        );
      }
      if (dL < 0 || dM < 0 || dS < 0) {
        await createAdjustmentOut(
          editTarget,
          Math.max(0, -dL),
          Math.max(0, -dM),
          Math.max(0, -dS)
        );
      }
      setEditVisible(false);
      Alert.alert("Sukses", "Perubahan stok berhasil disimpan.");
    } catch (e) {
      console.error(e);
      Alert.alert("Gagal", "Terjadi kesalahan saat menyimpan penyesuaian.");
    }
  };

  const openEdit = (row: StokRow) => {
    setEditTarget(row);
    setInputL(String(row.totalLarge));
    setInputM(String(row.totalMedium));
    setInputS(String(row.totalSmall));
    setAdminPassword("");
    setEditVisible(true);
  };

  const deleteItemAllStock = async () => {
    if (!editTarget || !gudangDipilih) return;
    if (!verifyPassword()) return;

    const curL = toInt(editTarget.totalLarge);
    const curM = toInt(editTarget.totalMedium);
    const curS = toInt(editTarget.totalSmall);

    if (curL === 0 && curM === 0 && curS === 0) {
      Alert.alert("Info", "Stok barang ini sudah kosong.");
      return;
    }

    try {
      await createAdjustmentOut(editTarget, curL, curM, curS);
      setEditVisible(false);
      Alert.alert("Sukses", "Barang dihapus (stok dikurangi menjadi 0).");
    } catch (e) {
      console.error(e);
      Alert.alert("Gagal", "Terjadi kesalahan saat menghapus barang.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={{ zIndex: 1000, padding: 16 }}>
            <DropDownPicker
              open={gudangOpen}
              value={gudangDipilih}
              items={gudangItems}
              setOpen={setGudangOpen}
              setValue={setGudangDipilih}
              setItems={setGudangItems}
              placeholder="Pilih Gudang"
              style={styles.dropdown}
              dropDownContainerStyle={{
                borderWidth: 1,
                borderColor: "#ccc",
                maxHeight: 300,
              }}
              zIndex={1000}
              zIndexInverse={300}
              mode="BADGE"
              listMode="SCROLLVIEW"
              dropDownDirection="AUTO"
              searchable
            />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>📦 STOK BARANG</Text>

            <View style={styles.summaryBox}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Principle</Text>
                <Text style={styles.summaryValue}>{totalPrinciple}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Barang</Text>
                <Text style={styles.summaryValue}>{totalBarang}</Text>
              </View>
            </View>

            <TextInput
              placeholder="Cari nama/kode barang..."
              value={searchText}
              onChangeText={setSearchText}
              style={styles.search}
            />

            {stok.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => openEdit(item)}
                activeOpacity={0.7}
              >
                <View style={styles.card}>
                  <Text style={styles.name}>{item.nama}</Text>
                  <Text>Kode: {item.kode}</Text>
                  <Text>Principle: {item.principle}</Text>
                  <Text>Large: {item.totalLarge}</Text>
                  <Text>Medium: {item.totalMedium}</Text>
                  <Text>Small: {item.totalSmall}</Text>
                  <Text style={styles.tapHint}>Tap untuk edit / hapus</Text>
                </View>
              </TouchableOpacity>
            ))}

            {stok.length === 0 && gudangDipilih && (
              <Text style={{ marginTop: 20, color: "gray" }}>
                Tidak ada data stok untuk gudang ini.
              </Text>
            )}

            {stok.length > 0 && (
              <TouchableOpacity
                onPress={handleExport}
                style={styles.exportButton}
              >
                <Text style={styles.exportText}>📤 Export ke Excel</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={deleteDocsByGudang}
            style={{
              backgroundColor: "#ef4444",
              padding: 12,
              borderRadius: 8,
              marginTop: 12,
              marginHorizontal: 16,
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              🗑️ Hapus Semua Data Terkait {gudangDipilih || "Gudang"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* ======= Modal Edit ======= */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Stok</Text>
            <Text style={styles.modalSub}>
              {editTarget?.nama} ({editTarget?.kode})
            </Text>

            <View style={{ height: 12 }} />

            <View style={styles.row}>
              <Text style={styles.lbl}>Large</Text>
              <TextInput
                value={inputL}
                onChangeText={setInputL}
                keyboardType="number-pad"
                style={styles.inp}
                placeholder="0"
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.lbl}>Medium</Text>
              <TextInput
                value={inputM}
                onChangeText={setInputM}
                keyboardType="number-pad"
                style={styles.inp}
                placeholder="0"
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.lbl}>Small</Text>
              <TextInput
                value={inputS}
                onChangeText={setInputS}
                keyboardType="number-pad"
                style={styles.inp}
                placeholder="0"
              />
            </View>

            <View style={{ height: 16 }} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔒 Password Admin</Text>
              <Text style={styles.sectionDesc}>
                Wajib diisi untuk **Simpan** maupun **Hapus Barang**.
              </Text>
              <TextInput
                value={adminPassword}
                onChangeText={setAdminPassword}
                secureTextEntry
                placeholder="Masukkan password admin"
                style={styles.pwInput}
              />
            </View>

            <View style={{ height: 10 }} />
            <View style={styles.btnRow}>
              <TouchableOpacity
                onPress={() => setEditVisible(false)}
                style={[styles.btn, { backgroundColor: "#94a3b8" }]}
              >
                <Text style={styles.btnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={applyEdit}
                style={[styles.btn, { backgroundColor: "#0ea5e9" }]}
              >
                <Text style={styles.btnText}>Simpan</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              onPress={deleteItemAllStock}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteText}>Hapus Barang Ini</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, paddingBottom: 100, backgroundColor: "#fff" },
  content: { paddingHorizontal: 16, marginTop: 8 },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  dropdown: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8 },
  search: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  card: {
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    marginBottom: 10,
  },
  name: { fontWeight: "bold", fontSize: 16 },
  tapHint: { marginTop: 6, color: "#334155", fontStyle: "italic" },
  exportButton: {
    backgroundColor: "#007bff",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  exportText: { color: "#fff", fontWeight: "bold" },
  summaryBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#e0f2fe",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryLabel: { fontSize: 14, fontWeight: "600", color: "#1e3a8a" },
  summaryValue: { fontSize: 20, fontWeight: "bold", color: "#0f172a" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: { backgroundColor: "white", borderRadius: 16, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: "bold", textAlign: "center" },
  modalSub: { fontSize: 14, color: "#475569", textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 10 },
  lbl: { width: 80, fontWeight: "600" },
  inp: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  section: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
  },
  sectionTitle: { fontWeight: "700", marginBottom: 4 },
  sectionDesc: { color: "#64748b", marginBottom: 8 },
  pwInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  btnText: { color: "white", fontWeight: "bold" },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    width: "100%",
    marginTop: 14,
    marginBottom: 12,
  },
  deleteBtn: {
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteText: { color: "white", fontWeight: "800" },
});
