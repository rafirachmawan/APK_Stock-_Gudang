import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
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
  principle: string;
}

interface Transaksi {
  gudang?: string;
  gudangTujuan?: string;
  principle: string;
  jenisGudang?: string;
  items: Item[];
}

export default function StockScreen() {
  const [stok, setStok] = useState<any[]>([]);
  const [barangMasuk, setBarangMasuk] = useState<Transaksi[]>([]);
  const [barangKeluar, setBarangKeluar] = useState<Transaksi[]>([]);
  const [searchText, setSearchText] = useState("");

  const [totalPrinciple, setTotalPrinciple] = useState(0);
  const [totalBarang, setTotalBarang] = useState(0);

  const [gudangOpen, setGudangOpen] = useState(false);
  const [gudangDipilih, setGudangDipilih] = useState<string | null>(null);
  const [gudangItems, setGudangItems] = useState([
    { label: "Gudang A", value: "Gudang A" },
    { label: "Gudang B", value: "Gudang B" },
    { label: "Gudang C", value: "Gudang C" },
    { label: "Gudang D", value: "Gudang D" },
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

    const map = new Map();

    barangMasuk
      .filter((trx) => trx.gudang === gudangDipilih)
      .forEach((trx) => {
        trx.items.forEach((item) => {
          const key = item.kode;
          if (!map.has(key)) {
            map.set(key, {
              kode: item.kode,
              nama: item.namaBarang,
              principle: item.principle || trx.principle || "-",
              totalLarge: 0,
              totalMedium: 0,
              totalSmall: 0,
            });
          }
          const data = map.get(key);
          data.totalLarge += parseInt(item.large || "0");
          data.totalMedium += parseInt(item.medium || "0");
          data.totalSmall += parseInt(item.small || "0");
        });
      });

    barangKeluar
      .filter((trx) => trx.jenisGudang === gudangDipilih)
      .forEach((trx) => {
        trx.items.forEach((item) => {
          const key = item.kode;
          if (!map.has(key)) return;
          const data = map.get(key);
          data.totalLarge = Math.max(
            0,
            data.totalLarge - parseInt(item.large || "0")
          );
          data.totalMedium = Math.max(
            0,
            data.totalMedium - parseInt(item.medium || "0")
          );
          data.totalSmall = Math.max(
            0,
            data.totalSmall - parseInt(item.small || "0")
          );
        });
      });

    barangKeluar
      .filter((trx) => trx.gudangTujuan === gudangDipilih)
      .forEach((trx) => {
        trx.items.forEach((item) => {
          const key = item.kode;
          if (!map.has(key)) {
            map.set(key, {
              kode: item.kode,
              nama: item.namaBarang,
              principle: item.principle || trx.principle || "-",
              totalLarge: 0,
              totalMedium: 0,
              totalSmall: 0,
            });
          }
          const data = map.get(key);
          data.totalLarge += parseInt(item.large || "0");
          data.totalMedium += parseInt(item.medium || "0");
          data.totalSmall += parseInt(item.small || "0");
        });
      });

    const final = Array.from(map.values()).filter((item: any) => {
      const match =
        item.nama.toLowerCase().includes(searchText.toLowerCase()) ||
        item.kode.toLowerCase().includes(searchText.toLowerCase());
      return match;
    });

    setStok(final);
    setTotalBarang(final.length);
    setTotalPrinciple(new Set(final.map((item: any) => item.principle)).size);
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
  content: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
  },
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
  name: {
    fontWeight: "bold",
    fontSize: 16,
  },
  exportButton: {
    backgroundColor: "#007bff",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  exportText: {
    color: "#fff",
    fontWeight: "bold",
  },
  summaryBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#e0f2fe",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e3a8a",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
  },
});
