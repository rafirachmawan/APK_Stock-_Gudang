// OutDetailScreen.tsx

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useCallback, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import * as XLSX from "xlsx";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Barang {
  kode: string;
  nama: string;
  stokLarge: number;
  stokMedium: number;
  stokSmall: number;
  ed: string;
  catatan: string;
  waktuInput: string;
  kategori: string;
  principle: string;
}

export default function OutDetailScreen() {
  const [forms, setForms] = useState<Barang[]>([]);
  const [expandedIndexes, setExpandedIndexes] = useState<number[]>([]);
  const [activeDateIndex, setActiveDateIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const json = await AsyncStorage.getItem("barangKeluar");
        const data: Barang[] = json ? JSON.parse(json) : [];
        setForms(data);
      };
      load();
    }, [])
  );

  const toggleExpand = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const updateFormField = (
    formIndex: number,
    field: keyof Barang,
    value: any
  ) => {
    const updatedForms = [...forms];
    (updatedForms[formIndex] as any)[field] = [
      "stokLarge",
      "stokMedium",
      "stokSmall",
    ].includes(field)
      ? parseInt(value) || 0
      : value;

    setForms(updatedForms);
  };

  const saveToStorage = async () => {
    await AsyncStorage.setItem("barangKeluar", JSON.stringify(forms));
    alert("✅ Data berhasil disimpan");
  };

  const exportToExcel = async () => {
    const allItems = forms.map((form, index) => ({
      No: index + 1,
      Kategori: form.kategori,
      Principle: form.principle,
      Kode: form.kode,
      Nama: form.nama,
      Large: form.stokLarge,
      Medium: form.stokMedium,
      Small: form.stokSmall,
      ED: form.ed || "-",
      Catatan: form.catatan || "-",
      "Waktu Input": new Date(form.waktuInput).toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(allItems);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BarangKeluar");

    const binaryExcel = XLSX.write(workbook, {
      type: "base64",
      bookType: "xlsx",
    });

    const filePath = FileSystem.documentDirectory + "barang-keluar.xlsx";
    await FileSystem.writeAsStringAsync(filePath, binaryExcel, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(filePath);
  };

  const filteredForms = forms.filter(
    (form) =>
      form.principle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📦 Semua Data Barang Keluar</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Cari berdasarkan principle atau nama barang..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {filteredForms.map((form, formIndex) => (
        <View key={formIndex} style={styles.itemContainer}>
          <TouchableOpacity onPress={() => toggleExpand(formIndex)}>
            <Text style={styles.itemTitle}>
              [{formIndex + 1}] {form.nama} ({form.kode})
            </Text>
          </TouchableOpacity>

          {expandedIndexes.includes(formIndex) && (
            <View>
              <Text style={styles.label}>Kategori</Text>
              <Text style={styles.readOnlyText}>{form.kategori}</Text>

              <Text style={styles.label}>Principle</Text>
              <Text style={styles.readOnlyText}>{form.principle}</Text>

              <Text style={styles.label}>ED</Text>
              <Text style={styles.readOnlyText}>
                {form.ed || "📅 Tidak tersedia"}
              </Text>

              <Text style={styles.label}>Catatan</Text>
              <TextInput
                style={styles.input}
                value={form.catatan}
                onChangeText={(text) =>
                  updateFormField(formIndex, "catatan", text)
                }
              />

              <Text style={styles.label}>Stok</Text>
              <TextInput
                style={styles.input}
                value={form.stokLarge.toString()}
                onChangeText={(text) =>
                  updateFormField(formIndex, "stokLarge", text)
                }
                placeholder="Large"
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                value={form.stokMedium.toString()}
                onChangeText={(text) =>
                  updateFormField(formIndex, "stokMedium", text)
                }
                placeholder="Medium"
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                value={form.stokSmall.toString()}
                onChangeText={(text) =>
                  updateFormField(formIndex, "stokSmall", text)
                }
                placeholder="Small"
                keyboardType="numeric"
              />
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.saveBtn} onPress={saveToStorage}>
        <Text style={styles.saveText}>💾 Simpan Perubahan</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.exportBtn} onPress={exportToExcel}>
        <Text style={styles.exportText}>📤 Export ke Excel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1f2937",
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
  itemContainer: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    backgroundColor: "#fff",
  },
  readOnlyText: {
    padding: 8,
    marginBottom: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    color: "#6b7280",
  },
  saveBtn: {
    backgroundColor: "#10b981",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  saveText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  exportBtn: {
    backgroundColor: "#3b82f6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 30,
  },
  exportText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    backgroundColor: "#f9fafb",
    color: "#111827",
  },
});
