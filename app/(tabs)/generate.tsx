// GenerateScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
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

interface Product {
  kode: string;
  nama: string;
  principle: string;
  stokLarge: number;
  stokMedium: number;
  stokSmall: number;
}

export default function GenerateScreen() {
  const [brandMap, setBrandMap] = useState<Record<string, Product[]>>({});
  const [generatedBrands, setGeneratedBrands] = useState<string[]>([]);
  const [currentBrand, setCurrentBrand] = useState<string | null>(null);
  const [brandProducts, setBrandProducts] = useState<Product[]>([]);
  const [stockInputs, setStockInputs] = useState<
    Record<string, { L: string; M: string; S: string; ed: string }>
  >({});
  const [tanggal, setTanggal] = useState<string>("");
  const [showDateModal, setShowDateModal] = useState(false);
  const [showEdModal, setShowEdModal] = useState<null | string>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const loadBrandMap = async (clearGenerated = false) => {
    const stored = await AsyncStorage.getItem("barangMasuk");
    if (stored) {
      const products: Product[] = JSON.parse(stored);
      const grouped: Record<string, Product[]> = {};
      const seen = new Set<string>();

      for (const item of products) {
        const key = `${item.kode}-${item.nama}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const brand = item.principle || "UNKNOWN";
        if (!grouped[brand]) grouped[brand] = [];
        grouped[brand].push(item);
      }
      setBrandMap(grouped);
      if (clearGenerated) setGeneratedBrands([]);
    }
  };

  useEffect(() => {
    loadBrandMap();
  }, []);

  const generateNextBrand = () => {
    const allBrands = Object.keys(brandMap);
    const available = allBrands.filter((b) => !generatedBrands.includes(b));
    if (available.length === 0) {
      Alert.alert("Info", "Semua brand telah digenerate");
      return;
    }
    const next = available[Math.floor(Math.random() * available.length)];
    setCurrentBrand(next);
    setBrandProducts(brandMap[next]);
    setGeneratedBrands((prev) => [...prev, next]);
    setTanggal("");
    setStockInputs({});
  };

  const ulangGenerate = async () => {
    await loadBrandMap(true);
    setCurrentBrand(null);
    setBrandProducts([]);
    setTanggal("");
    setStockInputs({});
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
    if (!currentBrand || brandProducts.length === 0 || !tanggal) return;
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

    const existing = await AsyncStorage.getItem("hasilGenerate");
    const parsed = existing ? JSON.parse(existing) : [];
    parsed.push({
      brand: currentBrand,
      data: result,
      waktu: new Date().toISOString(),
    });
    await AsyncStorage.setItem("hasilGenerate", JSON.stringify(parsed));
    Alert.alert("Sukses", "Data generate berhasil disimpan");
  };

  const totalBrand = Object.keys(brandMap).length;
  const totalGenerated = generatedBrands.length;
  const remaining = totalBrand - totalGenerated;

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
            style={styles.dateButton}
            onPress={() => {
              setTempDate(tanggal ? new Date(tanggal) : new Date());
              setShowDateModal(true);
            }}
          >
            <Ionicons name="calendar" size={16} color="#000" />
            <Text style={styles.dateText}>
              {tanggal ? ` ${tanggal}` : " Pilih Tanggal Generate"}
            </Text>
          </TouchableOpacity>

          <FlatList
            data={brandProducts}
            renderItem={({ item }) => (
              <View style={styles.itemBox}>
                <Text style={styles.itemText}>{item.nama}</Text>
                <View style={styles.row}>
                  {["L", "M", "S"].map((size) => (
                    <TextInput
                      key={size}
                      style={styles.input}
                      placeholder={size}
                      keyboardType="numeric"
                      value={
                        stockInputs[item.kode]?.[size as "L" | "M" | "S"] || ""
                      }
                      onChangeText={(val) =>
                        handleStockChange(
                          item.kode,
                          size as "L" | "M" | "S",
                          val
                        )
                      }
                    />
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.edButton}
                  onPress={() => {
                    setTempDate(
                      stockInputs[item.kode]?.ed
                        ? new Date(stockInputs[item.kode].ed)
                        : new Date()
                    );
                    setShowEdModal(item.kode);
                  }}
                >
                  <Ionicons name="calendar" size={16} color="#000" />
                  <Text style={styles.dateText}>
                    {stockInputs[item.kode]?.ed || "Pilih ED"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            keyExtractor={(item, index) => `${item.kode}-${index}`}
          />

          <TouchableOpacity style={styles.button} onPress={saveGeneratedResult}>
            <Text style={styles.buttonText}>Simpan Generate</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.secondaryButton} onPress={ulangGenerate}>
        <Text style={styles.secondaryButtonText}>Reset Generate</Text>
      </TouchableOpacity>

      <Text style={styles.infoText}>
        Total Brand: {totalBrand} | Sudah Digenerate: {totalGenerated} | Belum:{" "}
        {remaining}
      </Text>

      {/* Modal untuk pilih tanggal */}
      {showDateModal && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            if (event.type === "set" && date) {
              setTanggal(date.toISOString().split("T")[0]);
            }
            setShowDateModal(false);
          }}
        />
      )}

      {/* Modal untuk pilih ED */}
      {showEdModal && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            if (event.type === "set" && date && showEdModal) {
              handleStockChange(
                showEdModal,
                "ed",
                date.toISOString().split("T")[0]
              );
            }
            setShowEdModal(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", padding: 16 },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 10,
  },
  subTitle: {
    color: "#1f2937",
    fontSize: 16,
    textAlign: "center",
    marginVertical: 10,
  },
  button: {
    backgroundColor: "#3b82f6",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginVertical: 10,
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
  secondaryButton: {
    backgroundColor: "#f87171",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderRadius: 6,
    marginVertical: 6,
  },
  edButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e2e8f0",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  dateText: { color: "#111827", marginLeft: 8 },
  itemBox: {
    backgroundColor: "#f9fafb",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  itemText: { color: "#1f2937", fontSize: 14, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  input: {
    backgroundColor: "#e5e7eb",
    color: "#111827",
    borderRadius: 4,
    padding: 8,
    width: "30%",
    textAlign: "center",
  },
  infoText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 12,
    marginTop: 10,
  },
});
