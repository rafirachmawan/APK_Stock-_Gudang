import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as XLSX from "xlsx";

interface HasilItem {
  brand: string;
  waktu: string;
  data: {
    kode: string;
    nama: string;
    principle: string;
    L: string;
    M: string;
    S: string;
    ed: string;
    waktu: string;
  }[];
}

export default function HasilGenerateScreen() {
  const [hasil, setHasil] = useState<HasilItem[]>([]);

  useEffect(() => {
    loadHasil();
  }, []);

  const loadHasil = async () => {
    const data = await AsyncStorage.getItem("hasilGenerate");
    if (data) {
      setHasil(JSON.parse(data));
    }
  };

  const exportExcel = async () => {
    if (hasil.length === 0) return;

    const rows = hasil.flatMap((item) =>
      item.data.map((d, idx) => ({
        No: idx + 1,
        Brand: item.brand,
        Kode: d.kode,
        Nama: d.nama,
        Large: d.L,
        Medium: d.M,
        Small: d.S,
        ED: d.ed || "",
        Tanggal: d.waktu,
      }))
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HasilGenerate");

    const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const uri = FileSystem.documentDirectory + `hasil-generate.xlsx`;
    await FileSystem.writeAsStringAsync(uri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await Sharing.shareAsync(uri);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Hasil Generate</Text>

      <FlatList
        data={hasil}
        keyExtractor={(item, index) => `${item.brand}-${index}`}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.brand}>{item.brand}</Text>
            <Text style={styles.date}>Tanggal Generate: {item.waktu}</Text>
            {item.data.map((d, idx) => (
              <Text key={`${d.kode}-${idx}`} style={styles.item}>
                {d.nama} - L:{d.L}, M:{d.M}, S:{d.S}, ED:{d.ed}
              </Text>
            ))}
          </View>
        )}
      />

      <TouchableOpacity style={styles.exportButton} onPress={exportExcel}>
        <Text style={styles.exportText}>📤 Export Semua ke Excel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 16 },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#1f1f1f",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  brand: { fontWeight: "bold", color: "#4ade80", marginBottom: 4 },
  date: { color: "#aaa", marginBottom: 6, fontStyle: "italic" },
  item: { color: "#ccc", fontSize: 14 },
  exportButton: {
    backgroundColor: "#3b82f6",
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
  },
  exportText: { color: "#fff", fontWeight: "bold" },
});
