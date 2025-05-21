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
  TouchableOpacity,
  View,
} from "react-native";
import * as XLSX from "xlsx";

interface Barang {
  kode: string;
  nama: string;
  stokLarge: number;
  stokMedium: number;
  stokSmall: number;
  ed: string;
  catatan: string;
  waktuInput: string;
}

const deleteBarang = async (kode: string, waktuInput: string) => {
  try {
    const jsonValue = await AsyncStorage.getItem("barangKeluar");
    const data: Barang[] = jsonValue ? JSON.parse(jsonValue) : [];
    const newData = data.filter(
      (item) => !(item.kode === kode && item.waktuInput === waktuInput)
    );
    await AsyncStorage.setItem("barangKeluar", JSON.stringify(newData));
  } catch (e) {
    console.error("Gagal menghapus data:", e);
  }
};

export default function OutDetailScreen() {
  const [items, setItems] = useState<Barang[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const jsonValue = await AsyncStorage.getItem("barangKeluar");
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "BarangKeluar");

    const binaryExcel = XLSX.write(workbook, {
      type: "base64",
      bookType: "xlsx",
    });
    const filePath = FileSystem.documentDirectory + `barang-keluar.xlsx`;

    await FileSystem.writeAsStringAsync(filePath, binaryExcel, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(filePath);
  };

  const renderItem = ({ item, index }: { item: Barang; index: number }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemTitle}>
        [{index + 1}] {item.nama} ({item.kode})
      </Text>
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
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.label}>Memuat semua data barang keluar...</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Belum ada data barang keluar.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Semua Data Barang Keluar</Text>
      <Text style={styles.subtitle}>Total Input: {items.length}</Text>

      <TouchableOpacity style={styles.exportBtn} onPress={exportToExcel}>
        <Text style={styles.exportText}>📤 Export Semua ke Excel</Text>
      </TouchableOpacity>

      <FlatList
        data={items}
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
    backgroundColor: "#1a1a1a",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#bbb",
    marginBottom: 16,
  },
  itemContainer: {
    backgroundColor: "#2a2a2a",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 4,
  },
  stockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  deleteBtn: {
    marginTop: 10,
    backgroundColor: "#d11a2a",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  deleteText: {
    color: "#fff",
    fontWeight: "bold",
  },
  exportBtn: {
    backgroundColor: "#4caf50",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 16,
  },
  exportText: {
    color: "#fff",
    fontWeight: "bold",
  },
  listContent: {
    paddingBottom: 20,
  },
});
