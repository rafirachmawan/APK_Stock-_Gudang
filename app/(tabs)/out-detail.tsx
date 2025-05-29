import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useCallback, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import * as XLSX from "xlsx";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ItemOut {
  namaBarang: string;
  kode: string;
  large: number;
  medium: number;
  small: number;
  principle: string;
  ed?: string;
  catatan?: string;
}

interface TransaksiOut {
  kodeGdng: string;
  kodeApos: string;
  kategori: string;
  catatan: string;
  nomorKendaraan: string;
  namaSopir: string;
  waktuInput: string;
  items: ItemOut[];
}

export default function OutDetailScreen() {
  const [data, setData] = useState<TransaksiOut[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const json = await AsyncStorage.getItem("barangKeluar");
        const parsed: TransaksiOut[] = json ? JSON.parse(json) : [];
        setData(parsed);
      };
      load();
    }, [])
  );

  const toggleExpand = (kodeApos: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) =>
      prev.includes(kodeApos)
        ? prev.filter((k) => k !== kodeApos)
        : [...prev, kodeApos]
    );
  };

  const saveToStorage = async () => {
    const filtered = data.filter(
      (trx) =>
        trx.kodeApos &&
        trx.waktuInput &&
        Array.isArray(trx.items) &&
        trx.items.length > 0
    );

    console.log(
      "📦 Data disimpan ke AsyncStorage:",
      JSON.stringify(filtered, null, 2)
    );

    await AsyncStorage.setItem("barangKeluar", JSON.stringify(filtered));
    alert("✅ Data berhasil disimpan");
  };

  const exportToExcel = async () => {
    const allItems = data.flatMap((trx) =>
      trx.items.map((item) => ({
        KodeApos: trx.kodeApos,
        KodeGudang: trx.kodeGdng,
        Waktu: new Date(trx.waktuInput).toLocaleString(),
        Kategori: trx.kategori,
        Principle: item.principle,
        Nama: item.namaBarang,
        Kode: item.kode,
        Large: item.large,
        Medium: item.medium,
        Small: item.small,
        ED: item.ed || "-",
        Catatan: item.catatan || "-",
      }))
    );

    const ws = XLSX.utils.json_to_sheet(allItems);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BarangKeluar");

    const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const fileUri = FileSystem.documentDirectory + "barang-keluar.xlsx";
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(fileUri);
  };

  const filtered = data.filter((trx) => {
    const kodeAposMatch = (trx?.kodeApos || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const namaMatch = Array.isArray(trx?.items)
      ? trx.items.some((item) =>
          (item?.namaBarang || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        )
      : false;

    return kodeAposMatch || namaMatch;
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📦 Semua Data Barang Keluar</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Cari berdasarkan kodeApos atau nama barang..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <TouchableOpacity style={styles.exportBtn} onPress={exportToExcel}>
        <Text style={styles.exportText}>📤 Export ke Excel</Text>
      </TouchableOpacity>

      {filtered.map((trx, trxIndex) => (
        <View key={trxIndex} style={{ marginBottom: 16 }}>
          <TouchableOpacity onPress={() => toggleExpand(trx.kodeApos)}>
            <Text style={styles.itemTitle}>
              📌 Kode Apos: {trx.kodeApos} (
              {Array.isArray(trx.items) ? trx.items.length : 0} item)
            </Text>

            <Text style={styles.readOnlyText}>
              Gudang: {trx.kategori} | Sopir: {trx.namaSopir} | No. Kendaraan:{" "}
              {trx.nomorKendaraan}
            </Text>
          </TouchableOpacity>

          {expanded.includes(trx.kodeApos) &&
            trx.items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.itemContainer}>
                <Text style={styles.itemTitle}>
                  {item.namaBarang} ({item.kode})
                </Text>

                <Text style={styles.label}>Principle</Text>
                <Text style={styles.readOnlyText}>{item.principle}</Text>

                <Text style={styles.label}>ED</Text>
                <TextInput
                  style={styles.input}
                  value={item.ed || ""}
                  onChangeText={(text) => {
                    const copy = [...data];
                    copy[trxIndex].items[itemIndex].ed = text;
                    setData(copy);
                  }}
                />

                <Text style={styles.label}>Catatan</Text>
                <TextInput
                  style={styles.input}
                  value={item.catatan || ""}
                  onChangeText={(text) => {
                    const copy = [...data];
                    copy[trxIndex].items[itemIndex].catatan = text;
                    setData(copy);
                  }}
                />

                <Text style={styles.label}>Stok</Text>
                <TextInput
                  style={styles.input}
                  value={item.large.toString()}
                  onChangeText={(text) => {
                    const copy = [...data];
                    copy[trxIndex].items[itemIndex].large = parseInt(text) || 0;
                    setData(copy);
                  }}
                  placeholder="Large"
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  value={item.medium.toString()}
                  onChangeText={(text) => {
                    const copy = [...data];
                    copy[trxIndex].items[itemIndex].medium =
                      parseInt(text) || 0;
                    setData(copy);
                  }}
                  placeholder="Medium"
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  value={item.small.toString()}
                  onChangeText={(text) => {
                    const copy = [...data];
                    copy[trxIndex].items[itemIndex].small = parseInt(text) || 0;
                    setData(copy);
                  }}
                  placeholder="Small"
                  keyboardType="numeric"
                />
              </View>
            ))}
        </View>
      ))}

      <TouchableOpacity style={styles.saveBtn} onPress={saveToStorage}>
        <Text style={styles.saveText}>💾 Simpan Perubahan</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1f2937",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  itemContainer: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    backgroundColor: "#fff",
  },
  readOnlyText: {
    padding: 8,
    marginBottom: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    color: "#6b7280",
  },
  saveBtn: {
    backgroundColor: "#10b981",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  saveText: { color: "#fff", fontWeight: "bold" },
  exportBtn: {
    backgroundColor: "#3b82f6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 30,
  },
  exportText: { color: "#fff", fontWeight: "bold" },
  searchInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    backgroundColor: "#f9fafb",
    color: "#111827",
  },
});
