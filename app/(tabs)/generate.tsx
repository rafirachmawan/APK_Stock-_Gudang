import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { TextInput } from "react-native-gesture-handler";
import * as XLSX from "xlsx";

interface Product {
  kode: string;
  nama: string;
  principle: string;
  stokLarge: number;
  stokMedium: number;
  stokSmall: number;
}

export default function GenerateScreen() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [brandMap, setBrandMap] = useState<Record<string, Product[]>>({});
  const [generatedBrands, setGeneratedBrands] = useState<string[]>([]);
  const [currentBrand, setCurrentBrand] = useState<string | null>(null);
  const [brandProducts, setBrandProducts] = useState<Product[]>([]);
  const [stockInputs, setStockInputs] = useState<
    Record<string, { L: string; M: string; S: string; ed: string }>
  >({});
  const [tanggal, setTanggal] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeEdKode, setActiveEdKode] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const stored = await AsyncStorage.getItem("barangMasuk");
    if (stored) {
      const products: Product[] = JSON.parse(stored);
      setAllProducts(products);

      const grouped: Record<string, Product[]> = {};
      const seen = new Set<string>();

      for (const item of products) {
        const uniqueKey = `${item.kode}-${item.nama}`;
        if (seen.has(uniqueKey)) continue;
        seen.add(uniqueKey);

        const brand = item.principle || "UNKNOWN";
        if (!grouped[brand]) grouped[brand] = [];
        grouped[brand].push(item);
      }
      setBrandMap(grouped);
    }
  };

  const generateNextBrand = () => {
    const allBrandNames = Object.keys(brandMap);
    const availableBrands = allBrandNames.filter(
      (b) => !generatedBrands.includes(b)
    );

    if (availableBrands.length === 0) {
      Alert.alert("Info", "Semua brand telah digenerate");
      return;
    }

    const nextBrand =
      availableBrands[Math.floor(Math.random() * availableBrands.length)];
    setCurrentBrand(nextBrand);
    setBrandProducts(brandMap[nextBrand]);
    setGeneratedBrands((prev) => [...prev, nextBrand]);
    setStockInputs({});
    setTanggal("");
  };

  const handleStockChange = (
    kode: string,
    field: "L" | "M" | "S" | "ed",
    value: string
  ) => {
    setStockInputs((prev) => ({
      ...prev,
      [kode]: {
        L: field === "L" ? value : prev[kode]?.L || "",
        M: field === "M" ? value : prev[kode]?.M || "",
        S: field === "S" ? value : prev[kode]?.S || "",
        ed: field === "ed" ? value : prev[kode]?.ed || "",
      },
    }));
  };

  const saveGeneratedResult = async () => {
    if (!currentBrand || brandProducts.length === 0) return;

    if (!tanggal) {
      Alert.alert("Peringatan", "Harap isi tanggal terlebih dahulu");
      return;
    }

    const result = brandProducts.map((item) => ({
      principle: item.principle,
      kode: item.kode,
      nama: item.nama,
      L: stockInputs[item.kode]?.L || "0",
      M: stockInputs[item.kode]?.M || "0",
      S: stockInputs[item.kode]?.S || "0",
      ed: stockInputs[item.kode]?.ed || "-",
      waktu: tanggal,
    }));

    try {
      const existing = await AsyncStorage.getItem("hasilGenerate");
      const parsed = existing ? JSON.parse(existing) : [];
      parsed.push({
        brand: currentBrand,
        data: result,
        waktu: new Date().toISOString(),
      });
      await AsyncStorage.setItem("hasilGenerate", JSON.stringify(parsed));
      Alert.alert("Sukses", "Data generate berhasil disimpan");
    } catch (e) {
      Alert.alert("Gagal", "Tidak bisa menyimpan data");
      console.error(e);
    }
  };

  const exportToExcel = async () => {
    if (!currentBrand) return;

    const exportData = brandProducts.map((item, index) => ({
      No: index + 1,
      Brand: item.principle,
      Kode: item.kode,
      Nama: item.nama,
      Large: stockInputs[item.kode]?.L || "",
      Medium: stockInputs[item.kode]?.M || "",
      Small: stockInputs[item.kode]?.S || "",
      ED: stockInputs[item.kode]?.ed || "",
      Tanggal: tanggal,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BrandData");

    const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const uri = FileSystem.documentDirectory + `generate-${currentBrand}.xlsx`;
    await FileSystem.writeAsStringAsync(uri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await Sharing.shareAsync(uri);
  };

  const resetBrands = () => {
    setGeneratedBrands([]);
    setCurrentBrand(null);
    setBrandProducts([]);
    setStockInputs({});
    setTanggal("");
  };

  const renderItem = ({ item, index }: { item: Product; index: number }) => (
    <View style={styles.itemBox} key={`${item.kode}-${index}`}>
      <Text style={styles.itemText}>{item.nama}</Text>
      <View style={styles.row}>
        {["L", "M", "S"].map((size) => (
          <TextInput
            key={`${item.kode}-${size}`}
            placeholder={size}
            placeholderTextColor="#888"
            style={styles.input}
            value={stockInputs[item.kode]?.[size as "L" | "M" | "S"] || ""}
            onChangeText={(text) =>
              handleStockChange(item.kode, size as "L" | "M" | "S", text)
            }
            keyboardType="numeric"
          />
        ))}
      </View>
      <TouchableOpacity
        style={[styles.input, { marginTop: 6, width: "100%" }]}
        onPress={() => setActiveEdKode(item.kode)}
      >
        <Text style={{ color: stockInputs[item.kode]?.ed ? "#fff" : "#aaa" }}>
          {stockInputs[item.kode]?.ed || "Pilih Tanggal ED"}
        </Text>
      </TouchableOpacity>

      {activeEdKode === item.kode && (
        <DateTimePicker
          value={
            stockInputs[item.kode]?.ed
              ? new Date(stockInputs[item.kode].ed)
              : new Date()
          }
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setActiveEdKode(null);
            if (selectedDate) {
              handleStockChange(
                item.kode,
                "ed",
                selectedDate.toISOString().split("T")[0]
              );
            }
          }}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generate Brand</Text>

      <TouchableOpacity style={styles.button} onPress={generateNextBrand}>
        <Text style={styles.buttonText}>Generate Brand</Text>
      </TouchableOpacity>

      {currentBrand && (
        <>
          <Text style={styles.subTitle}>Brand: {currentBrand}</Text>

          <TouchableOpacity
            style={[styles.input, { marginBottom: 10, width: "100%" }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ color: tanggal ? "#fff" : "#aaa" }}>
              {tanggal || "Pilih Tanggal Generate"}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={tanggal ? new Date(tanggal) : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setTanggal(selectedDate.toISOString().split("T")[0]);
                }
              }}
            />
          )}

          <FlatList
            data={brandProducts}
            renderItem={renderItem}
            keyExtractor={(_, index) => `brand-item-${index}`}
            contentContainerStyle={{ paddingBottom: 40 }}
          />

          <TouchableOpacity style={styles.exportBtn} onPress={exportToExcel}>
            <Text style={styles.buttonText}>Export to Excel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: "#10b981" }]}
            onPress={saveGeneratedResult}
          >
            <Text style={styles.buttonText}>Simpan Generate</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.resetBtn} onPress={resetBrands}>
        <Text style={styles.resetText}>🔄 Reset Semua Brand</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
  },
  subTitle: {
    color: "#fff",
    fontSize: 16,
    marginVertical: 10,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#4caf50",
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  exportBtn: {
    backgroundColor: "#2196f3",
    padding: 12,
    borderRadius: 6,
    marginVertical: 10,
    alignItems: "center",
  },
  resetBtn: {
    marginTop: 10,
    alignItems: "center",
  },
  resetText: {
    color: "#ccc",
    fontSize: 14,
    fontStyle: "italic",
  },
  itemBox: {
    backgroundColor: "#1e1e1e",
    padding: 10,
    marginBottom: 8,
    borderRadius: 6,
  },
  itemText: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  input: {
    backgroundColor: "#333",
    color: "#fff",
    borderRadius: 4,
    padding: 8,
    width: "30%",
    textAlign: "center",
  },
});
