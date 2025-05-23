import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
              await loadStockData(); // Refresh list
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                <Text style={styles.modalTitle}>
                  {selectedItem.nama} ({selectedItem.kode})
                </Text>

                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Stok Large:</Text>
                  <Text style={styles.modalValue}>
                    {selectedItem.stokLarge}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Stok Medium:</Text>
                  <Text style={styles.modalValue}>
                    {selectedItem.stokMedium}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Stok Small:</Text>
                  <Text style={styles.modalValue}>
                    {selectedItem.stokSmall}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Expiry Date:</Text>
                  <Text style={styles.modalValue}>{selectedItem.ed}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Catatan:</Text>
                  <Text style={styles.modalValue}>
                    {selectedItem.catatan || "-"}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Waktu Input:</Text>
                  <Text style={styles.modalValue}>
                    {selectedItem.waktuInput}
                  </Text>
                </View>

                <View style={{ marginTop: 20 }}>
                  <Text style={[styles.modalTitle, { fontSize: 18 }]}>
                    Riwayat Barang Keluar
                  </Text>
                  {barangKeluar.length === 0 ? (
                    <Text style={{ color: "#aaa", textAlign: "center" }}>
                      Belum ada pengeluaran
                    </Text>
                  ) : (
                    barangKeluar.map((keluar, index) => (
                      <View
                        key={index}
                        style={{
                          marginVertical: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: "#444",
                          paddingBottom: 8,
                        }}
                      >
                        <Text style={styles.modalLabel}>
                          Tanggal: {keluar.waktuInput}
                        </Text>
                        <Text style={styles.modalLabel}>
                          Large: {keluar.stokLarge}
                        </Text>
                        <Text style={styles.modalLabel}>
                          Medium: {keluar.stokMedium}
                        </Text>
                        <Text style={styles.modalLabel}>
                          Small: {keluar.stokSmall}
                        </Text>
                        <Text style={styles.modalLabel}>
                          Catatan: {keluar.catatan || "-"}
                        </Text>
                      </View>
                    ))
                  )}
                </View>

                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.deleteButton]}
                    onPress={() => handleDelete(selectedItem)}
                  >
                    <Text style={styles.buttonText}>Hapus Barang</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.closeButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.buttonText}>Tutup</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
