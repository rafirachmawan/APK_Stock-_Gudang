import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useCallback, useState } from "react";
import {
  Alert,
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

  const loadHasil = async () => {
    const data = await AsyncStorage.getItem("hasilGenerate");
    if (data) {
      setHasil(JSON.parse(data));
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHasil();
    }, [])
  );

  const saveHasil = async (data: HasilItem[]) => {
    await AsyncStorage.setItem("hasilGenerate", JSON.stringify(data));
    setHasil(data);
  };

  const hapusSemua = () => {
    Alert.alert("Konfirmasi", "Yakin ingin menghapus semua hasil generate?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus Semua",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("hasilGenerate");
          setHasil([]);
        },
      },
    ]);
  };

  const hapusSatu = (index: number) => {
    Alert.alert("Konfirmasi", "Yakin ingin menghapus generate ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          const baru = [...hasil];
          baru.splice(index, 1);
          await saveHasil(baru);
        },
      },
    ]);
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
      <Text style={styles.header}>📋 Hasil Generate</Text>

      <FlatList
        data={hasil}
        keyExtractor={(item, index) => `${item.brand}-${index}`}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.brand}>{item.brand}</Text>
              <TouchableOpacity onPress={() => hapusSatu(index)}>
                <Text style={styles.hapus}>🗑️</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.date}>Tanggal Generate: {item.waktu}</Text>
            {item.data.map((d, idx) => (
              <Text key={`${d.kode}-${idx}`} style={styles.item}>
                {d.nama} - L:{d.L}, M:{d.M}, S:{d.S}, ED: {d.ed}
              </Text>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Belum ada data generate</Text>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <TouchableOpacity style={styles.exportButton} onPress={exportExcel}>
        <Text style={styles.exportText}>📤 Export Semua ke Excel</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.exportButton, { backgroundColor: "#ef4444" }]}
        onPress={hapusSemua}
      >
        <Text style={styles.exportText}>🗑️ Hapus Semua Generate</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", padding: 16 },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  brand: {
    fontWeight: "bold",
    color: "#22c55e",
    fontSize: 16,
  },
  date: {
    color: "#6b7280",
    marginBottom: 6,
    fontStyle: "italic",
    fontSize: 13,
  },
  item: {
    color: "#1f2937",
    fontSize: 14,
    marginVertical: 2,
  },
  hapus: {
    color: "#ef4444",
    fontSize: 18,
    paddingHorizontal: 4,
  },
  exportButton: {
    backgroundColor: "#3b82f6",
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
  },
  exportText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  emptyText: {
    color: "#6b7280",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
});
