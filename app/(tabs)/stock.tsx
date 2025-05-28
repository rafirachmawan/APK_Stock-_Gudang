import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as XLSX from "xlsx";
import { Barang, getCurrentStock } from "../../utils/stockManager";

interface RiwayatBarang {
  nama: string;
  kode: string;
  large: number;
  medium: number;
  small: number;
  waktu: string;
}

export default function StockScreen() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [stockData, setStockData] = useState<Barang[]>([]);
  const [selectedPrinciple, setSelectedPrinciple] = useState<string | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [riwayatMasuk, setRiwayatMasuk] = useState<RiwayatBarang[]>([]);
  const [riwayatKeluar, setRiwayatKeluar] = useState<RiwayatBarang[]>([]);

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

  const loadRiwayat = async (principle: string) => {
    const masukRaw = await AsyncStorage.getItem("barangMasuk");
    const keluarRaw = await AsyncStorage.getItem("barangKeluar");

    const masuk = masukRaw ? JSON.parse(masukRaw) : [];
    const keluar = keluarRaw ? JSON.parse(keluarRaw) : [];

    const masukFiltered = masuk
      .filter((f: any) => f.principle === principle)
      .flatMap((f: any) =>
        f.items.map((i: any) => ({
          nama: i.namaBarang,
          kode: i.kode,
          large: parseInt(i.large),
          medium: parseInt(i.medium),
          small: parseInt(i.small),
          waktu: f.waktuInput,
        }))
      );

    const keluarFiltered = keluar
      .filter((f: any) => f.principle === principle)
      .map((i: any) => ({
        nama: i.nama,
        kode: i.kode,
        large: i.stokLarge,
        medium: i.stokMedium,
        small: i.stokSmall,
        waktu: i.waktuInput,
      }));

    setRiwayatMasuk(masukFiltered);
    setRiwayatKeluar(keluarFiltered);
  };

  const handleShowDetail = async (principle: string) => {
    setSelectedPrinciple(principle);
    await loadRiwayat(principle);
    setModalVisible(true);
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

      await Sharing.shareAsync(filePath);
    } catch (error) {
      console.error("Gagal export Excel:", error);
      Alert.alert("Error", "Gagal export ke Excel");
    }
  };

  const filteredData = stockData.filter(
    (item) =>
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const DetailModal = () => (
    <Modal visible={modalVisible} animationType="slide">
      <ScrollView style={styles.container}>
        <Text style={styles.header}>
          📌 Detail Principle: {selectedPrinciple}
        </Text>

        <Text style={styles.subheader}>📅 Riwayat Barang Masuk</Text>
        {riwayatMasuk.map((item, index) => (
          <View key={index} style={styles.detailRow}>
            <Text style={styles.label}>
              {item.nama} ({item.kode})
            </Text>
            <Text style={styles.label}>
              Large: {item.large} | Medium: {item.medium} | Small: {item.small}
            </Text>
            <Text style={styles.label}>
              Tanggal: {new Date(item.waktu).toLocaleDateString()}
            </Text>
          </View>
        ))}

        <Text style={styles.subheader}>📄 Riwayat Barang Keluar</Text>
        {riwayatKeluar.map((item, index) => (
          <View key={index} style={styles.detailRow}>
            <Text style={styles.label}>
              {item.nama} ({item.kode})
            </Text>
            <Text style={styles.label}>
              Large: {item.large} | Medium: {item.medium} | Small: {item.small}
            </Text>
            <Text style={styles.label}>
              Tanggal: {new Date(item.waktu).toLocaleDateString()}
            </Text>
          </View>
        ))}

        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => setModalVisible(false)}
        >
          <Text style={styles.resetText}>⬅️ Kembali</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );

  const renderItem = ({ item }: { item: Barang }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleShowDetail(item.principle)}
    >
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
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {modalVisible && <DetailModal />}

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
  subheader: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    color: "#1e3a8a",
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
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 40,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  detailRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 10,
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
});
