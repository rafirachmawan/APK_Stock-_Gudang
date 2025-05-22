import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
    Record<string, { L: string; M: string; S: string }>
  >({});

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const stored = await AsyncStorage.getItem("barangMasuk");
    if (stored) {
      const products: Product[] = JSON.parse(stored);
      setAllProducts(products);

      const grouped: Record<string, Product[]> = {};
      for (const item of products) {
        const brand = item.principle || "UNKNOWN";
        if (!grouped[brand]) {
          grouped[brand] = [];
        }
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
  };

  const handleStockChange = (
    kode: string,
    type: "L" | "M" | "S",
    value: string
  ) => {
    setStockInputs((prev) => ({
      ...prev,
      [kode]: {
        L: type === "L" ? value : prev[kode]?.L || "",
        M: type === "M" ? value : prev[kode]?.M || "",
        S: type === "S" ? value : prev[kode]?.S || "",
      },
    }));
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
  };

  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.itemBox}>
      <Text style={styles.itemText}>{item.nama}</Text>
      <View style={styles.row}>
        {(["L", "M", "S"] as const).map((size) => (
          <TextInput
            key={size}
            placeholder={size}
            placeholderTextColor="#888"
            style={styles.input}
            value={stockInputs[item.kode]?.[size] || ""}
            onChangeText={(text) => handleStockChange(item.kode, size, text)}
            keyboardType="numeric"
          />
        ))}
      </View>
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
          <FlatList
            data={brandProducts}
            renderItem={renderItem}
            keyExtractor={(item) => item.kode}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
          <TouchableOpacity style={styles.exportBtn} onPress={exportToExcel}>
            <Text style={styles.buttonText}>Export to Excel</Text>
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
