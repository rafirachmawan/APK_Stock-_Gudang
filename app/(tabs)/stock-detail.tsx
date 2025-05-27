// StockDetailScreen.tsx - Tambahan fitur export Excel di tampilan collapsible

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

interface ItemInput {
  namaBarang: string;
  kode: string;
  large: string;
  medium: string;
  small: string;
  ed?: string;
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

export default function StockDetailScreen() {
  const [forms, setForms] = useState<PurchaseForm[]>([]);
  const [expandedIndexes, setExpandedIndexes] = useState<number[]>([]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const json = await AsyncStorage.getItem("barangMasuk");
        const data: PurchaseForm[] = json ? JSON.parse(json) : [];
        setForms(data);
      };
      load();
    }, [])
  );

  const toggleExpand = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedIndexes.includes(index)) {
      setExpandedIndexes(expandedIndexes.filter((i) => i !== index));
    } else {
      setExpandedIndexes([...expandedIndexes, index]);
    }
  };

  const updateItem = async (
    formIndex: number,
    itemIndex: number,
    field: keyof ItemInput,
    value: string
  ) => {
    const updatedForms = [...forms];
    updatedForms[formIndex].items[itemIndex][field] = value;
    setForms(updatedForms);
    await AsyncStorage.setItem("barangMasuk", JSON.stringify(updatedForms));
  };

  const updateCatatan = async (formIndex: number, value: string) => {
    const updatedForms = [...forms];
    updatedForms[formIndex].catatan = value;
    setForms(updatedForms);
    await AsyncStorage.setItem("barangMasuk", JSON.stringify(updatedForms));
  };

  const exportToExcel = async () => {
    const allItems = forms.flatMap((form, index) =>
      form.items.map((item, i) => ({
        No: `${index + 1}.${i + 1}`,
        Gudang: form.gudang,
        KodeGudang: form.kodeGdng,
        KodeApos: form.kodeApos,
        Principle: form.principle,
        Kode: item.kode,
        Nama: item.namaBarang,
        Large: item.large,
        Medium: item.medium,
        Small: item.small,
        ED: item.ed || "-",
        Catatan: form.catatan,
        "Waktu Input": new Date(form.waktuInput).toLocaleString(),
      }))
    );

    const worksheet = XLSX.utils.json_to_sheet(allItems);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BarangMasuk");

    const binaryExcel = XLSX.write(workbook, {
      type: "base64",
      bookType: "xlsx",
    });
    const filePath = FileSystem.documentDirectory + "barang-masuk.xlsx";

    await FileSystem.writeAsStringAsync(filePath, binaryExcel, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(filePath);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📦 Semua Data Barang Masuk</Text>

      <TouchableOpacity style={styles.exportBtn} onPress={exportToExcel}>
        <Text style={styles.exportText}>📤 Export ke Excel</Text>
      </TouchableOpacity>

      {forms.map((form, formIndex) => (
        <View key={formIndex} style={styles.itemContainer}>
          <TouchableOpacity onPress={() => toggleExpand(formIndex)}>
            <Text style={styles.itemTitle}>
              [{formIndex + 1}] Gudang {form.gudang} | Principle:{" "}
              {form.principle}
            </Text>
          </TouchableOpacity>

          {expandedIndexes.includes(formIndex) && (
            <View>
              <Text style={styles.label}>Kode Gudang: {form.kodeGdng}</Text>
              <Text style={styles.label}>Kode Apos: {form.kodeApos}</Text>
              <Text style={styles.label}>
                Waktu Input: {new Date(form.waktuInput).toLocaleString()}
              </Text>
              {form.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.subItem}>
                  <Text style={styles.label}>
                    • {item.namaBarang} ({item.kode})
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={item.large}
                    onChangeText={(text) =>
                      updateItem(formIndex, itemIndex, "large", text)
                    }
                    placeholder="Large"
                  />
                  <TextInput
                    style={styles.input}
                    value={item.medium}
                    onChangeText={(text) =>
                      updateItem(formIndex, itemIndex, "medium", text)
                    }
                    placeholder="Medium"
                  />
                  <TextInput
                    style={styles.input}
                    value={item.small}
                    onChangeText={(text) =>
                      updateItem(formIndex, itemIndex, "small", text)
                    }
                    placeholder="Small"
                  />
                  <TextInput
                    style={styles.input}
                    value={item.ed || ""}
                    onChangeText={(text) =>
                      updateItem(formIndex, itemIndex, "ed", text)
                    }
                    placeholder="ED (dd/mm/yyyy)"
                  />
                </View>
              ))}
              <TextInput
                style={styles.input}
                value={form.catatan}
                onChangeText={(text) => updateCatatan(formIndex, text)}
                placeholder="Catatan"
              />
            </View>
          )}
        </View>
      ))}
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
  subItem: {
    paddingLeft: 10,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    backgroundColor: "#fff",
  },
  exportBtn: {
    backgroundColor: "#10b981",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  exportText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
});
