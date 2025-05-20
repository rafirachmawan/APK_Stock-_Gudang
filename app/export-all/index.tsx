import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as XLSX from "xlsx";

export default function ExportAllScreen() {
  const [isLoading, setIsLoading] = useState(false);

  const exportAll = async () => {
    try {
      setIsLoading(true);
      const jsonValue = await AsyncStorage.getItem("barangMasuk");
      const data = jsonValue ? JSON.parse(jsonValue) : [];

      if (data.length === 0) {
        Alert.alert("Kosong", "Tidak ada data barang masuk.");
        return;
      }

      const exportData = data.map((item: any, index: number) => ({
        No: index + 1,
        Kode: item.kode,
        Nama: item.nama,
        Large: item.stokLarge,
        Medium: item.stokMedium,
        Small: item.stokSmall,
        ED: item.ed,
        Catatan: item.catatan,
        "Waktu Input": new Date(item.waktuInput).toLocaleString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "SemuaData");

      const excelBinary = XLSX.write(workbook, {
        type: "base64",
        bookType: "xlsx",
      });

      const filename = FileSystem.documentDirectory + "semua-barang.xlsx";
      await FileSystem.writeAsStringAsync(filename, excelBinary, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(filename);
    } catch (err) {
      console.error("Export error:", err);
      Alert.alert("Gagal", "Gagal melakukan export data.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Export Semua Barang Masuk</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={exportAll}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>📤 Export Semua Data</Text>
      </TouchableOpacity>
      {isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#ccc", marginTop: 10 }}>Mengekspor...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#03a9f4",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  loading: {
    marginTop: 20,
    alignItems: "center",
  },
});
