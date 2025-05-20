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
} from "../../utils/stockManager";

import { MasterBarang } from "../../utils/stockManager";

export default function StockScreen() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [stockData, setStockData] = useState<Barang[]>([]);
  const [selectedItem, setSelectedItem] = useState<Barang | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const isFocused = useIsFocused();
  const [selectedMaster, setSelectedMaster] = useState<MasterBarang | null>(
    null
  );
  const [masterBarang, setMasterBarang] = useState<MasterBarang[]>([]);

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
              setStockData((prev) =>
                prev.filter(
                  (i) =>
                    !(i.kode === item.kode && i.waktuInput === item.waktuInput)
                )
              );
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

  const filteredData = stockData.filter(
    (item) =>
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: Barang }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedItem(item);
        setModalVisible(true);
      }}
    >
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
