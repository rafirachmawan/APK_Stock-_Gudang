// ... import tetap
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const [modalVisible, setModalVisible] = useState(false);
  const [barangKeluar, setBarangKeluar] = useState<Barang[]>([]);
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
          Kode: item.kode,
          Nama: item.nama,
          Large: item.stokLarge,
          Medium: item.stokMedium,
          Small: item.stokSmall,
          ED: item.ed,
          Catatan: item.catatan,
          WaktuInput: item.waktuInput,
          Principle: item.principle,
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
              setModalVisible(false);
              Alert.alert("Sukses", "Barang berhasil dihapus");
            } else {
              Alert.alert("Error", "Gagal menghapus barang");
            }
          },
        },
      ]
    );
  };

  const handleItemPress = async (item: Barang) => {
    setSelectedItem(item);
    try {
      const keluarData = await AsyncStorage.getItem("barangKeluar");
      const parsedKeluar = keluarData ? JSON.parse(keluarData) : [];
      const filteredKeluar = parsedKeluar.filter(
        (bk: Barang) => bk.kode === item.kode
      );
      setBarangKeluar(filteredKeluar);
    } catch (error) {
      console.error("Gagal memuat data barang keluar:", error);
      setBarangKeluar([]);
    }
    setModalVisible(true);
  };

  const filteredData = stockData.filter(
    (item) =>
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: Barang }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleItemPress(item)}>
      <Text style={styles.cardTitle}>
        {item.nama} ({item.kode})
      </Text>
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
        style={{
          marginTop: 10,
          backgroundColor: "#ef4444",
          padding: 10,
          borderRadius: 6,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Hapus</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Daftar Stock Barang</Text>

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
          <Text style={styles.emptyText}>Tidak ada data stock</Text>
        }
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity
        onPress={exportToExcel}
        style={{
          backgroundColor: "#10b981",
          padding: 14,
          borderRadius: 8,
          marginTop: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>
          📄 Export ke Excel
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
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
          ]);
        }}
        style={{
          backgroundColor: "#ef4444",
          padding: 14,
          borderRadius: 8,
          marginTop: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>
          🗑 Hapus Semua Stok
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#1a1a1a",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 20,
    textAlign: "center",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#444",
    padding: 14,
    marginBottom: 16,
    backgroundColor: "#2a2a2a",
    color: "#ffffff",
    borderRadius: 10,
    fontSize: 16,
  },
  card: {
    backgroundColor: "#2a2a2a",
    padding: 18,
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    color: "#bbbbbb",
    fontSize: 15,
  },
  value: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "500",
  },
  emptyText: {
    textAlign: "center",
    color: "#888888",
    marginTop: 40,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalContent: {
    backgroundColor: "#2a2a2a",
    padding: 20,
    borderRadius: 15,
    width: "85%",
    borderWidth: 1,
    borderColor: "#444",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 20,
    textAlign: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    paddingBottom: 10,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  modalLabel: {
    color: "#bbbbbb",
    fontSize: 16,
  },
  modalValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    width: "48%",
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "#d9534f",
  },
  closeButton: {
    backgroundColor: "#5bc0de",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
});
