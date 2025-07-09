import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { collection, getDocs } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import * as XLSX from "xlsx";
import { db } from "../../utils/firebase";

interface StokPerGudang {
  [gudang: string]: {
    L: number;
    M: number;
    S: number;
  };
}

interface ItemStok {
  kode: string;
  nama: string;
  principle: string;
  stok: StokPerGudang;
}

export default function GenerateScreen() {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [brandOptions, setBrandOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [openBrand, setOpenBrand] = useState(false);
  const [items, setItems] = useState<ItemStok[]>([]);

  const loadData = async () => {
    const masukSnap = await getDocs(collection(db, "barangMasuk"));
    const keluarSnap = await getDocs(collection(db, "barangKeluar"));

    const dataMap: Record<string, ItemStok> = {};
    const principleSet = new Set<string>();

    // 🔵 Proses barang masuk
    masukSnap.forEach((doc) => {
      const data = doc.data();
      const gudang = data.gudang || "-";
      const principle = data.principle || "-";
      principleSet.add(principle);

      const itemsMasuk = data.items || [];
      for (const item of itemsMasuk) {
        const kode = item.kode;
        if (!dataMap[kode]) {
          dataMap[kode] = {
            kode,
            nama: item.namaBarang,
            principle,
            stok: {},
          };
        }
        if (!dataMap[kode].stok[gudang]) {
          dataMap[kode].stok[gudang] = { L: 0, M: 0, S: 0 };
        }

        dataMap[kode].stok[gudang].L += parseInt(item.large || "0");
        dataMap[kode].stok[gudang].M += parseInt(item.medium || "0");
        dataMap[kode].stok[gudang].S += parseInt(item.small || "0");
      }
    });

    // 🔴 Proses barang keluar
    keluarSnap.forEach((doc) => {
      const data = doc.data();
      const jenisForm = data.jenisForm || "";
      const gudangAsal = data.gudangAsal || "-";
      const gudangTujuan = data.gudangTujuan || "-";
      const itemsKeluar = data.items || [];

      for (const item of itemsKeluar) {
        const kode = item.kode;
        if (!dataMap[kode]) continue;

        // Kurangi dari gudangAsal
        if (!dataMap[kode].stok[gudangAsal]) {
          dataMap[kode].stok[gudangAsal] = { L: 0, M: 0, S: 0 };
        }
        dataMap[kode].stok[gudangAsal].L -= parseInt(item.large || "0");
        dataMap[kode].stok[gudangAsal].M -= parseInt(item.medium || "0");
        dataMap[kode].stok[gudangAsal].S -= parseInt(item.small || "0");

        // Jika mutasi, tambahkan ke gudangTujuan
        if (jenisForm === "MB") {
          if (!dataMap[kode].stok[gudangTujuan]) {
            dataMap[kode].stok[gudangTujuan] = { L: 0, M: 0, S: 0 };
          }
          dataMap[kode].stok[gudangTujuan].L += parseInt(item.large || "0");
          dataMap[kode].stok[gudangTujuan].M += parseInt(item.medium || "0");
          dataMap[kode].stok[gudangTujuan].S += parseInt(item.small || "0");
        }
      }
    });

    const allItems = Object.values(dataMap);
    setItems(allItems);
    setBrandOptions(
      Array.from(principleSet).map((p) => ({ label: p, value: p }))
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = selectedBrand
    ? items.filter((i) => i.principle === selectedBrand)
    : [];

  const handleExport = async () => {
    if (!selectedBrand) return;

    const data: any[] = [];

    filteredItems.forEach((item) => {
      Object.entries(item.stok).forEach(([gudang, stok]) => {
        data.push({
          Kode: item.kode,
          Nama: item.nama,
          Principle: item.principle,
          Gudang: gudang,
          Large: stok.L,
          Medium: stok.M,
          Small: stok.S,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stok");

    const wbout = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
    const uri = FileSystem.cacheDirectory + `Stok_${selectedBrand}.xlsx`;

    await FileSystem.writeAsStringAsync(uri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(uri, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: `Export Stok ${selectedBrand}`,
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Generate Stok per Principle & Gudang</Text>

        <View style={{ zIndex: 1000 }}>
          <DropDownPicker
            open={openBrand}
            value={selectedBrand}
            items={brandOptions}
            setOpen={setOpenBrand}
            setValue={setSelectedBrand}
            setItems={setBrandOptions}
            placeholder="Pilih Principle"
            listMode="SCROLLVIEW"
            scrollViewProps={{ nestedScrollEnabled: true }}
            dropDownDirection="AUTO"
            style={{ marginBottom: openBrand ? 200 : 10 }}
          />
        </View>

        {filteredItems.map((item, idx) => (
          <View key={idx} style={styles.itemBox}>
            <Text style={styles.itemTitle}>
              {item.nama} ({item.kode})
            </Text>
            {Object.entries(item.stok).map(([gudang, stok], i) => (
              <View key={i} style={styles.stokRow}>
                <Text style={styles.gudangLabel}>{gudang}</Text>
                <Text style={styles.stokText}>L: {stok.L}</Text>
                <Text style={styles.stokText}>M: {stok.M}</Text>
                <Text style={styles.stokText}>S: {stok.S}</Text>
              </View>
            ))}
          </View>
        ))}

        {selectedBrand && (
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
            <Text style={styles.exportText}>
              📤 Export Stok {selectedBrand}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1f2937",
    textAlign: "center",
  },
  itemBox: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#111827",
  },
  stokRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#e5e7eb",
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  gudangLabel: { fontWeight: "bold", color: "#374151" },
  stokText: { color: "#1f2937" },
  exportBtn: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    margin: 30,
  },
  exportText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
