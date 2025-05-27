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

interface ItemInput {
  namaBarang: string;
  kode: string;
  large: string;
  medium: string;
  small: string;
}

interface PurchaseForm {
  gudang: string;
  kodeGdng: string;
  kodeApos: string;
  principle: string;
  catatan: string;
  items: ItemInput[];
  waktuInput: string;
}

const deleteBarang = async (kode: string, waktuInput: string) => {
  try {
    const jsonValue = await AsyncStorage.getItem("barangMasuk");
    const data: PurchaseForm[] = jsonValue ? JSON.parse(jsonValue) : [];
    const newData = data.filter((form) => form.waktuInput !== waktuInput);
    await AsyncStorage.setItem("barangMasuk", JSON.stringify(newData));
  } catch (e) {
    console.error("Gagal menghapus data:", e);
  }
};

export default function StockDetailScreen() {
  const [forms, setForms] = useState<PurchaseForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    try {
      setIsLoading(true);
      const jsonValue = await AsyncStorage.getItem("barangMasuk");
      const allData: PurchaseForm[] = jsonValue ? JSON.parse(jsonValue) : [];
      setForms(allData);
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

  const exportToExcel = async () => {
    const allItems = forms.flatMap((form) =>
      form.items.map((item, index) => ({
        No: index + 1,
        Gudang: form.gudang,
        KodeGudang: form.kodeGdng,
        KodeApos: form.kodeApos,
        Principle: form.principle,
        Kode: item.kode,
        Nama: item.namaBarang,
        Large: item.large,
        Medium: item.medium,
        Small: item.small,
        Catatan: form.catatan,
        "Waktu Input": new Date(form.waktuInput).toLocaleString(),
      }))
    );

    const worksheet = XLSX.utils.json_to_sheet(allItems);
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

  const filteredForms = forms.filter((form) =>
    form.items.some(
      (item) =>
        item.namaBarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kode.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const renderItem = ({
    item,
    index,
  }: {
    item: PurchaseForm;
    index: number;
  }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemTitle}>
        [{index + 1}] Gudang {item.gudang} | Principle: {item.principle}
      </Text>
      <Text style={styles.label}>Kode Gudang: {item.kodeGdng}</Text>
      <Text style={styles.label}>Kode Apos: {item.kodeApos}</Text>
      <Text style={styles.label}>
        Waktu Input: {new Date(item.waktuInput).toLocaleString()}
      </Text>
      {item.items.map((barang, i) => (
        <View key={i} style={styles.subItem}>
          <Text style={styles.label}>
            • {barang.namaBarang} ({barang.kode})
          </Text>
          <Text style={styles.label}>
            Large: {barang.large} | Medium: {barang.medium} | Small:{" "}
            {barang.small}
          </Text>
        </View>
      ))}
      <Text style={styles.label}>Catatan: {item.catatan || "-"}</Text>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDeleteItem(item.kodeGdng, item.waktuInput)}
      >
        <Text style={styles.deleteText}>🗑 Hapus Input Ini</Text>
      </TouchableOpacity>
    </View>
  );

  const handleDeleteItem = async (kode: string, waktuInput: string) => {
    Alert.alert("Konfirmasi", `Hapus input dengan kode gudang ${kode}?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          await deleteBarang(kode, waktuInput);
          loadData();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.label}>Memuat semua data barang...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📦 Semua Data Barang Masuk</Text>
      <Text style={styles.subtitle}>Total Input: {filteredForms.length}</Text>

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
        data={filteredForms}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          `${item.kodeGdng}-${item.waktuInput}-${index}`
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
  subItem: {
    paddingLeft: 10,
    marginBottom: 6,
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
