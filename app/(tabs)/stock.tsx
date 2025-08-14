import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
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

  gdg?: string; // asal gudang per item
  principle: string;
}

interface Transaksi {
  gudang?: string; // barangMasuk
  gudangTujuan?: string; // barangKeluar (MB)
  jenisGudang?: string; // barangKeluar (asal: header)
  jenisForm?: "DR" | "MB" | "RB";
  principle: string;
  items: Item[];
}

type StokRow = {
  kode: string;
  nama: string;
  principle: string;
  totalLarge: number;
  totalMedium: number;
  totalSmall: number;
};

const normCode = (s: any) =>
  String(s ?? "")
    .trim()
    .toUpperCase();

const toInt = (v: any) => {
  const n = parseInt(String(v ?? "0").trim(), 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
};

// 🔁 Pemetaan gudang fisik → grup logis
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

        const useL = toInt((item as any).consumedL ?? item.large);
        const useM = toInt((item as any).consumedM ?? item.medium);
        const useS = toInt((item as any).consumedS ?? item.small);

        data.L = Math.max(0, data.L - useL);
        data.M = Math.max(0, data.M - useM);
        data.S = Math.max(0, data.S - useS);
      });
    });

    // + mutasi masuk (group tujuan)
    barangKeluar.forEach((trx) => {
      const tujuan = canonicalGudang(trx.gudangTujuan);
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

  // (opsional) Penghapusan menyeluruh per group gudang
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
              // Hapus semua barangMasuk dg group ini
              const snapMasuk = await getDocs(collection(db, "barangMasuk"));
              for (const d of snapMasuk.docs) {
                const trx = d.data() as Transaksi;
                if (canonicalGudang(trx.gudang) === gudangDipilih) {
                  await deleteDoc(doc(db, "barangMasuk", d.id));
                }
              }

              // barangKeluar
              const snapKeluar = await getDocs(collection(db, "barangKeluar"));
              for (const d of snapKeluar.docs) {
                const trx = d.data() as Transaksi;
                const jenis = String(trx.jenisForm ?? "").toUpperCase();
                const tujuan = canonicalGudang(trx.gudangTujuan);
                const headerAsal = canonicalGudang(trx.jenisGudang);

                // Jika mutasi MASUK ke gudang ini → hapus seluruh dokumen
                if (jenis === "MB" && tujuan === gudangDipilih) {
                  await deleteDoc(doc(db, "barangKeluar", d.id));
                  continue;
                }

                // Filter item yang BUKAN milik gudang ini (asal per item)
                const items = Array.isArray(trx.items) ? trx.items : [];
                const remaining = items.filter((it) => {
                  const asalRaw =
                    it.gdg && it.gdg.trim() !== "" ? it.gdg : trx.jenisGudang;
                  const asalGroup = canonicalGudang(asalRaw);
                  return asalGroup !== gudangDipilih;
                });

                if (remaining.length === items.length) continue; // tidak ada yang perlu dihapus
                if (remaining.length === 0) {
                  await deleteDoc(doc(db, "barangKeluar", d.id));
                } else {
                  await updateDoc(doc(db, "barangKeluar", d.id), {
                    items: remaining,
                  });
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
              searchable={true}
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
              <View key={index} style={styles.card}>
                <Text style={styles.name}>{item.nama}</Text>
                <Text>Kode: {item.kode}</Text>
                <Text>Principle: {item.principle}</Text>
                <Text>Large: {item.totalLarge}</Text>
                <Text>Medium: {item.totalMedium}</Text>
                <Text>Small: {item.totalSmall}</Text>
              </View>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 100,
    backgroundColor: "#fff",
  },
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
});
