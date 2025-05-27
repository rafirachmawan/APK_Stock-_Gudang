// StockScreen.tsx - Memperhitungkan In dan Out via stockManager

import { useIsFocused } from "@react-navigation/native";
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
import {
  Barang,
  deleteBarang,
  getCurrentStock,
  resetAllStock,
} from "../../utils/stockManager";

export default function StockScreen() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [stockData, setStockData] = useState<Barang[]>([]);
  const [selectedItem, setSelectedItem] = useState<Barang | null>(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadStockData();
    }
  }, [isFocused]);

  const loadStockData = async () => {
    try {
      const currentStock = await getCurrentStock();
      setStockData(currentStock);
    } catch (error) {
      console.error("Gagal memuat data:", error);
      Alert.alert("Error", "Gagal memuat data stok");
    }
  };

  const exportToExcel = async () => {
    try {
      if (stockData.length === 0) {
        Alert.alert("Info", "Tidak ada data stok untuk diekspor.");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(
        stockData.map((item) => ({
          Kategori: item.kategori,
          Principle: item.principle,
          Kode: item.kode,
          Nama: item.nama,
          Large: item.stokLarge,
          Medium: item.stokMedium,
          Small: item.stokSmall,
          ED: item.ed,
          Catatan: item.catatan,
          WaktuInput: item.waktuInput,
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "StockBarang");

      const buffer = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
      const filePath = FileSystem.cacheDirectory + `stock-barang.xlsx`;

      await FileSystem.writeAsStringAsync(filePath, buffer, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(filePath, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Bagikan file Excel",
        UTI: "com.microsoft.excel.xlsx",
      });
    } catch (error) {
      console.error("Gagal export Excel:", error);
      Alert.alert("Error", "Gagal export ke Excel");
    }
  };

  const handleDelete = async (item: Barang) => {
    Alert.alert(
      "Konfirmasi Hapus",
      `Apakah Anda yakin ingin menghapus ${item.nama} (${item.kode})?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          onPress: async () => {
            const success = await deleteBarang(item.kode, item.waktuInput);
            if (success) {
              await loadStockData();
              setSelectedItem(null);
              Alert.alert("Sukses", "Barang berhasil dihapus");
            } else {
              Alert.alert("Error", "Gagal menghapus barang");
            }
          },
        },
      ]
    );
  };

  const filteredData = stockData.filter(
    (item) =>
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: Barang }) => (
    <TouchableOpacity style={styles.card}>
      <Text style={styles.cardTitle}>
        {item.nama} ({item.kode})
      </Text>
      <View style={styles.row}>
        <Text style={styles.label}>Kategori:</Text>
        <Text style={styles.value}>{item.kategori}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Large:</Text>
        <Text style={styles.value}>{item.stokLarge}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Medium:</Text>
        <Text style={styles.value}>{item.stokMedium}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Small:</Text>
        <Text style={styles.value}>{item.stokSmall}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>ED:</Text>
        <Text style={styles.value}>{item.ed}</Text>
      </View>
      <TouchableOpacity
        onPress={() => handleDelete(item)}
        style={styles.deleteButton}
      >
        <Text style={styles.deleteButtonText}>Hapus</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📦 Daftar Stok Barang</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Cari barang..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.kode}-${item.waktuInput}`}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Tidak ada data stok</Text>
        }
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity style={styles.exportButton} onPress={exportToExcel}>
        <Text style={styles.exportText}>📄 Export ke Excel</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resetButton}
        onPress={() =>
          Alert.alert("Konfirmasi", "Yakin ingin menghapus semua stok?", [
            { text: "Batal", style: "cancel" },
            {
              text: "Hapus Semua",
              style: "destructive",
              onPress: async () => {
                await resetAllStock();
                await loadStockData();
                Alert.alert("Berhasil", "Semua stok berhasil dihapus");
              },
            },
          ])
        }
      >
        <Text style={styles.resetText}>🗑 Hapus Semua Stok</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#ffffff",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 20,
    textAlign: "center",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 14,
    marginBottom: 16,
    backgroundColor: "#f9fafb",
    color: "#111827",
    borderRadius: 10,
    fontSize: 16,
  },
  card: {
    backgroundColor: "#f1f5f9",
    padding: 18,
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    color: "#475569",
    fontSize: 15,
  },
  value: {
    color: "#1e293b",
    fontSize: 15,
    fontWeight: "500",
  },
  deleteButton: {
    marginTop: 10,
    backgroundColor: "#ef4444",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  exportButton: {
    backgroundColor: "#10b981",
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
  },
  exportText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  resetButton: {
    backgroundColor: "#ef4444",
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
  },
  resetText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 40,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
});
