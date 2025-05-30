import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
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
  catatan?: string;
}

interface PurchaseForm {
  gudang: string;
  kodeGdng: string;
  kodeApos: string;
  principle: string;
  catatan: string;
  suratJalan?: string;
  items: ItemInput[];
  waktuInput: string;
}

export default function StockDetailScreen() {
  const [forms, setForms] = useState<PurchaseForm[]>([]);
  const [expandedIndexes, setExpandedIndexes] = useState<number[]>([]);
  const [activeDateIndex, setActiveDateIndex] = useState<{
    form: number;
    item: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [authVisible, setAuthVisible] = useState(false);
  const [authTargetIndex, setAuthTargetIndex] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const CREDENTIALS = {
    username: "admin",
    password: "admin",
  };

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

  const updateFormField = async (
    formIndex: number,
    field: keyof PurchaseForm,
    value: string
  ) => {
    const updatedForms = [...forms];
    if (field !== "items") {
      (updatedForms[formIndex] as any)[field] = value;
    }
    setForms(updatedForms);
    await AsyncStorage.setItem("barangMasuk", JSON.stringify(updatedForms));
  };

  const hapusSuratJalan = async (index: number) => {
    const updated = [...forms];
    updated.splice(index, 1);
    setForms(updated);
    await AsyncStorage.setItem("barangMasuk", JSON.stringify(updated));
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
        Catatan: item.catatan || form.catatan || "-",
        SuratJalan: form.suratJalan || "-",
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

  const filteredForms = forms.filter(
    (form) =>
      form.suratJalan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.items.some((item) =>
        item.namaBarang.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📦 Semua Data Barang Masuk</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Cari berdasarkan surat jalan atau nama barang..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <TouchableOpacity style={styles.exportBtn} onPress={exportToExcel}>
        <Text style={styles.exportText}>📄 Export ke Excel</Text>
      </TouchableOpacity>

      {filteredForms.map((form, formIndex) => (
        <View key={formIndex} style={styles.itemContainer}>
          <TouchableOpacity onPress={() => toggleExpand(formIndex)}>
            <Text style={styles.itemTitle}>
              [{formIndex + 1}] Surat Jalan: {form.suratJalan || "(kosong)"}
            </Text>
          </TouchableOpacity>

          {expandedIndexes.includes(formIndex) && (
            <View>
              <Text style={styles.label}>Gudang</Text>
              <TextInput
                style={[styles.input, { backgroundColor: "#e5e7eb" }]}
                value={form.gudang}
                editable={false}
              />

              <Text style={styles.label}>Principle</Text>
              <TextInput
                style={[styles.input, { backgroundColor: "#e5e7eb" }]}
                value={form.principle}
                editable={false}
              />

              <Text style={styles.label}>Kode Transaksi Gudang</Text>
              <TextInput
                style={[styles.input, { backgroundColor: "#e5e7eb" }]}
                value={form.kodeGdng}
                editable={false}
              />

              <Text style={styles.label}>Kode Transaksi Apos</Text>
              <TextInput
                style={styles.input}
                value={form.kodeApos}
                onChangeText={(text) =>
                  updateFormField(formIndex, "kodeApos", text)
                }
              />

              <Text style={styles.label}>Surat Jalan</Text>
              <TextInput
                style={[styles.input, { backgroundColor: "#e5e7eb" }]}
                value={form.suratJalan || ""}
                editable={false}
              />

              <Text style={styles.label}>Waktu Input</Text>
              <Text>{new Date(form.waktuInput).toLocaleString()}</Text>

              <Text style={styles.label}>Detail Barang</Text>
              {form.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.subItem}>
                  <Text style={styles.label}>
                    • {item.namaBarang} ({item.kode})
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: "#e5e7eb" }]}
                    value={item.large}
                    editable={false}
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: "#e5e7eb" }]}
                    value={item.medium}
                    editable={false}
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: "#e5e7eb" }]}
                    value={item.small}
                    editable={false}
                  />

                  <Text style={styles.label}>ED (Tanggal Kedaluwarsa)</Text>
                  <TouchableOpacity
                    onPress={() =>
                      setActiveDateIndex({ form: formIndex, item: itemIndex })
                    }
                    style={styles.input}
                  >
                    <Text>{item.ed || "Pilih Tanggal"}</Text>
                  </TouchableOpacity>

                  {activeDateIndex?.form === formIndex &&
                    activeDateIndex?.item === itemIndex && (
                      <DateTimePicker
                        value={item.ed ? new Date(item.ed) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, date) => {
                          if (event?.type === "set" && date) {
                            updateItem(
                              formIndex,
                              itemIndex,
                              "ed",
                              date.toISOString().split("T")[0]
                            );
                          }
                          setTimeout(() => setActiveDateIndex(null), 200);
                        }}
                      />
                    )}

                  <Text style={styles.label}>Catatan</Text>
                  <TextInput
                    style={styles.input}
                    value={item.catatan || ""}
                    onChangeText={(text) =>
                      updateItem(formIndex, itemIndex, "catatan", text)
                    }
                  />
                </View>
              ))}

              <TouchableOpacity
                style={{
                  backgroundColor: "#ef4444",
                  padding: 10,
                  borderRadius: 6,
                  alignItems: "center",
                  marginTop: 10,
                }}
                onPress={() => {
                  setAuthTargetIndex(formIndex);
                  setAuthVisible(true);
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  🗑️ Hapus Surat Jalan Ini
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      {authVisible && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 8,
              width: "80%",
            }}
          >
            <Text
              style={{ fontWeight: "bold", fontSize: 16, marginBottom: 10 }}
            >
              Autentikasi Diperlukan
            </Text>
            <TextInput
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
            />
            <TextInput
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
            />
            <TouchableOpacity
              onPress={() => {
                if (
                  username === CREDENTIALS.username &&
                  password === CREDENTIALS.password
                ) {
                  if (authTargetIndex !== null)
                    hapusSuratJalan(authTargetIndex);
                  setAuthVisible(false);
                  setAuthTargetIndex(null);
                  setUsername("");
                  setPassword("");
                } else {
                  alert("Username atau Password salah.");
                }
              }}
              style={{
                backgroundColor: "#ef4444",
                padding: 10,
                borderRadius: 6,
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Hapus</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setAuthVisible(false);
                setUsername("");
                setPassword("");
              }}
              style={{
                marginTop: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#3b82f6" }}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
