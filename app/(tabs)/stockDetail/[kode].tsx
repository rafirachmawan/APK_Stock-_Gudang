import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
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

export interface Barang {
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
  const { kode } = useLocalSearchParams<{ kode?: string }>();
  const router = useRouter();

  const [items, setItems] = useState<Barang[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (kodeParam: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const jsonValue = await AsyncStorage.getItem("barangMasuk");
      const allData: Barang[] = jsonValue ? JSON.parse(jsonValue) : [];

      const filtered = allData.filter((item) => item.kode === kodeParam);
      if (filtered.length === 0) {
        setError(`Tidak ada data ditemukan untuk kode: ${kodeParam}`);
      } else {
        setItems(filtered);
      }
    } catch (err) {
      console.error("Error saat load data:", err);
      setError("Gagal memuat data dari penyimpanan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (kode && typeof kode === "string" && kode.trim().length > 0) {
      loadData(kode.trim());
    } else {
      setError("Kode barang tidak valid atau kosong.");
      setIsLoading(false);
    }
  }, [kode]);

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
            const sisa = items.filter((x) => x.waktuInput !== item.waktuInput);
            if (sisa.length === 0) {
              router.back();
            } else if (kode && typeof kode === "string") {
              loadData(kode);
            }
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "DataBarang");

    const binaryExcel = XLSX.write(workbook, {
      type: "base64",
      bookType: "xlsx",
    });
    const filePath = FileSystem.documentDirectory + `barang-${kode}.xlsx`;

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
        <Text style={styles.label}>Memuat data barang...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>⬅ Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Detail Barang: {items[0].nama} ({items[0].kode})
      </Text>
      <Text style={styles.subtitle}>Jumlah Input: {items.length}</Text>

      <TouchableOpacity style={styles.exportBtn} onPress={exportToExcel}>
        <Text style={styles.exportText}>📤 Export ke Excel</Text>
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
  errorText: {
    color: "#ff6666",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    padding: 12,
    backgroundColor: "#333",
    borderRadius: 6,
    alignSelf: "center",
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  listContent: {
    paddingBottom: 20,
  },
});
