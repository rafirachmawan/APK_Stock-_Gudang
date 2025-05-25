import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as XLSX from "xlsx";

export interface Barang {
  kode: string;
  nama: string;
  stokLarge: number;
  stokMedium: number;
  stokSmall: number;
  ed: string;
  catatan: string;
  waktuInput: string;
  principle: string;
  kategori: string;
}

const deleteBarang = async (kode: string, waktuInput: string) => {
  try {
    const jsonValue = await AsyncStorage.getItem("barangMasuk");
    const data: Barang[] = jsonValue ? JSON.parse(jsonValue) : [];
    const newData = data.filter(
      (item) => !(item.kode === kode && item.waktuInput === waktuInput)
    );
    await AsyncStorage.setItem("barangMasuk", JSON.stringify(newData));
  } catch (e) {
    console.error("Gagal menghapus data:", e);
  }
};

export default function StockDetailScreen() {
  const [items, setItems] = useState<Barang[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    try {
      setIsLoading(true);
      const jsonValue = await AsyncStorage.getItem("barangMasuk");
      const allData: Barang[] = jsonValue ? JSON.parse(jsonValue) : [];
      setItems(allData);
    } catch (err) {
      console.error("Error saat memuat data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleDelete = async (item: Barang) => {
    Alert.alert(
      "Konfirmasi",
      `Hapus input "${item.nama}" dari ${new Date(
        item.waktuInput
      ).toLocaleString()}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            await deleteBarang(item.kode, item.waktuInput);
            loadData();
          },
        },
      ]
    );
  };

  const exportToExcel = async () => {
    if (items.length === 0) return;

    const exportData = items.map((item, index) => ({
      No: index + 1,
      Kategori: item.kategori,
      Principle: item.principle,
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "SemuaBarang");

    const binaryExcel = XLSX.write(workbook, {
      type: "base64",
      bookType: "xlsx",
    });
    const filePath = FileSystem.documentDirectory + `semua-barang.xlsx`;

    await FileSystem.writeAsStringAsync(filePath, binaryExcel, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(filePath);
  };

  const filteredItems = items.filter(
    (item) =>
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item, index }: { item: Barang; index: number }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemTitle}>
        [{index + 1}] {item.nama} ({item.kode})
      </Text>
      <Text style={styles.label}>Kategori: {item.kategori}</Text>
      <Text style={styles.label}>Principle: {item.principle}</Text>
      <Text style={styles.label}>
        Waktu Input: {new Date(item.waktuInput).toLocaleString()}
      </Text>
      <Text style={styles.label}>ED: {item.ed}</Text>
      <View style={styles.stockRow}>
        <Text style={styles.label}>Large: {item.stokLarge}</Text>
        <Text style={styles.label}>Medium: {item.stokMedium}</Text>
        <Text style={styles.label}>Small: {item.stokSmall}</Text>
      </View>
      <Text style={styles.label}>Catatan: {item.catatan || "-"}</Text>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item)}
      >
        <Text style={styles.deleteText}>🗑 Hapus Input Ini</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.label}>Memuat semua data barang...</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Belum ada data barang masuk.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📦 Semua Data Barang Masuk</Text>
      <Text style={styles.subtitle}>Total Input: {filteredItems.length}</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Cari nama atau kode barang..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <TouchableOpacity style={styles.exportBtn} onPress={exportToExcel}>
        <Text style={styles.exportText}>📤 Export Semua ke Excel</Text>
      </TouchableOpacity>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          `${item.kode}-${item.waktuInput}-${index}`
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#4b5563",
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "#f3f4f6",
    color: "#111827",
  },
  itemContainer: {
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  stockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  deleteBtn: {
    marginTop: 10,
    backgroundColor: "#ef4444",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  deleteText: {
    color: "#fff",
    fontWeight: "bold",
  },
  exportBtn: {
    backgroundColor: "#10b981",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 16,
  },
  exportText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  listContent: {
    paddingBottom: 20,
  },
});
