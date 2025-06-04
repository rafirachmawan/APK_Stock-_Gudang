import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import {
  Alert,
  Modal,
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
  catatan?: string;
  ed?: string;
}

interface PurchaseForm {
  gudang: string;
  kodeGdng: string;
  kodeApos: string;
  suratJalan: string;
  principle: string;
  jenisForm?: "Pembelian" | "Return" | string;
  waktuInput: string;
  kategori?: string;
  nomorKendaraan?: string;
  namaSopir?: string;
  items: ItemInput[];
}

export default function StockDetailScreen() {
  const [data, setData] = useState<
    Record<string, Record<string, PurchaseForm[]>>
  >({});
  const [expandedTanggal, setExpandedTanggal] = useState<
    Record<string, boolean>
  >({});
  const [expandedJenis, setExpandedJenis] = useState<Record<string, boolean>>(
    {}
  );
  const [editModal, setEditModal] = useState(false);
  const [selectedTrx, setSelectedTrx] = useState<PurchaseForm | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(-1);
  const [editItem, setEditItem] = useState<ItemInput>({
    namaBarang: "",
    kode: "",
    large: "",
    medium: "",
    small: "",
    ed: "",
    catatan: "",
  });
  const [editSuratJalan, setEditSuratJalan] = useState("");
  const [editKodeApos, setEditKodeApos] = useState("");
  const [editWaktuInput, setEditWaktuInput] = useState("");

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const json = await AsyncStorage.getItem("barangMasuk");
      const all: PurchaseForm[] = json ? JSON.parse(json) : [];

      const grouped: Record<string, Record<string, PurchaseForm[]>> = {};
      all.forEach((trx) => {
        const date = new Date(trx.waktuInput).toLocaleDateString("id-ID");
        const jenis = trx.jenisForm || "Pembelian";
        if (!grouped[date]) grouped[date] = {};
        if (!grouped[date][jenis]) grouped[date][jenis] = [];
        grouped[date][jenis].push(trx);
      });

      setData(grouped);
    } catch (err) {
      Alert.alert("Gagal memuat data");
    }
  };

  const removeItem = async (trx: PurchaseForm, index: number) => {
    const json = await AsyncStorage.getItem("barangMasuk");
    const all: PurchaseForm[] = json ? JSON.parse(json) : [];

    const updated = all.map((t) => {
      if (t.kodeApos === trx.kodeApos && t.waktuInput === trx.waktuInput) {
        const items = [...t.items];
        items.splice(index, 1);
        return { ...t, items };
      }
      return t;
    });

    await AsyncStorage.setItem("barangMasuk", JSON.stringify(updated));
    loadData();
  };

  const removeAll = async () => {
    Alert.alert("Konfirmasi", "Hapus semua data?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("barangMasuk");
          loadData();
        },
      },
    ]);
  };

  const openEditModal = (trx: PurchaseForm, index: number) => {
    const item = trx.items[index];
    setEditItem(item);
    setEditSuratJalan(trx.suratJalan);
    setEditKodeApos(trx.kodeApos);
    setEditWaktuInput(trx.waktuInput);
    setSelectedTrx(trx);
    setSelectedItemIndex(index);
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!selectedTrx) return;

    try {
      const json = await AsyncStorage.getItem("barangMasuk");
      const all: PurchaseForm[] = json ? JSON.parse(json) : [];

      const updated = all.map((trx) => {
        if (
          trx.kodeApos === selectedTrx.kodeApos &&
          trx.waktuInput === selectedTrx.waktuInput
        ) {
          const updatedItems = [...trx.items];
          updatedItems[selectedItemIndex] = editItem;

          return {
            ...trx,
            items: updatedItems,
            suratJalan: editSuratJalan,
            kodeApos: editKodeApos,
            waktuInput: editWaktuInput,
          };
        }
        return trx;
      });

      await AsyncStorage.setItem("barangMasuk", JSON.stringify(updated));
      setEditModal(false);
      loadData();
    } catch (err) {
      Alert.alert("Gagal menyimpan perubahan");
    }
  };

  const toggleTanggal = (tgl: string) => {
    setExpandedTanggal((prev) => ({ ...prev, [tgl]: !prev[tgl] }));
  };

  const toggleJenis = (key: string) => {
    setExpandedJenis((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderItem = (trx: PurchaseForm) => (
    <View style={styles.card}>
      <Text style={styles.bold}>Surat Jalan: {trx.suratJalan}</Text>
      <Text style={styles.bold}>Kode Apos: {trx.kodeApos}</Text>
      <Text style={styles.bold}>Waktu: {trx.waktuInput}</Text>
      {trx.items.map((item, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => openEditModal(trx, index)}
          style={[styles.card, { backgroundColor: "#e9ecef" }]}
        >
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={styles.bold}>{item.namaBarang}</Text>
            <TouchableOpacity onPress={() => removeItem(trx, index)}>
              <Text style={{ color: "red", marginLeft: 10 }}>Hapus</Text>
            </TouchableOpacity>
          </View>
          <Text>
            Large: {item.large} | Medium: {item.medium} | Small: {item.small}
          </Text>
          <Text>ED: {item.ed || "-"}</Text>
          <Text>Catatan: {item.catatan || "-"}</Text>
          <Text>Gudang: {trx.gudang}</Text>
          <Text>Principle: {trx.principle}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const exportExcel = (tanggal?: string, jenis?: string) => {
    let exportData: any[] = [];

    const tanggalKeys = tanggal ? [tanggal] : Object.keys(data);
    tanggalKeys.forEach((tgl) => {
      const jenisKeys = jenis ? [jenis] : Object.keys(data[tgl] || {});
      jenisKeys.forEach((jns) => {
        data[tgl][jns]?.forEach((trx) => {
          trx.items.forEach((item) => {
            exportData.push({
              Tanggal: tgl,
              JenisForm: trx.jenisForm || "Pembelian",
              Waktu: trx.waktuInput,
              Gudang: trx.gudang,
              Principle: trx.principle,
              KodeBarang: item.kode,
              NamaBarang: item.namaBarang,
              Large: item.large,
              Medium: item.medium,
              Small: item.small,
              ED: item.ed || "-",
              Catatan: item.catatan || "",
              KodeApos: trx.kodeApos,
              SuratJalan: trx.suratJalan,
            });
          });
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RiwayatMasuk");

    const uri = FileSystem.cacheDirectory + `RiwayatMasuk.xlsx`;
    const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

    FileSystem.writeAsStringAsync(uri, buffer, {
      encoding: FileSystem.EncodingType.Base64,
    }).then(() => {
      Sharing.shareAsync(uri);
    });
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Riwayat Barang Masuk</Text>
        {Object.entries(data).map(([tanggal, jenisMap]) => (
          <View key={tanggal} style={styles.section}>
            <TouchableOpacity
              onPress={() => toggleTanggal(tanggal)}
              style={styles.expandBtn}
            >
              <Text style={styles.expandBtnText}>
                {expandedTanggal[tanggal] ? "▼" : "▶"} {tanggal}
              </Text>
            </TouchableOpacity>
            {expandedTanggal[tanggal] &&
              Object.entries(jenisMap).map(([jenis, list]) => {
                const jenisKey = `${tanggal}-${jenis}`;
                return (
                  <View key={jenisKey} style={{ marginLeft: 16 }}>
                    <TouchableOpacity
                      onPress={() => toggleJenis(jenisKey)}
                      style={styles.jenisBtn}
                    >
                      <Text style={styles.expandBtnText}>
                        {expandedJenis[jenisKey] ? "▼" : "▶"} {jenis}
                      </Text>
                    </TouchableOpacity>
                    {expandedJenis[jenisKey] && (
                      <>
                        {list.map((trx, i) => (
                          <View key={i}>{renderItem(trx)}</View>
                        ))}
                        <TouchableOpacity
                          onPress={() => exportExcel(tanggal, jenis)}
                          style={styles.exportButton}
                        >
                          <Text style={styles.exportText}>
                            Export {tanggal} - {jenis}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                );
              })}
          </View>
        ))}
      </ScrollView>

      <View style={{ padding: 16 }}>
        <TouchableOpacity
          onPress={() => exportExcel()}
          style={[styles.exportButton, { backgroundColor: "#006400" }]}
        >
          <Text style={styles.exportText}>Export Semua</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={removeAll}
          style={[styles.exportButton, { backgroundColor: "#dc3545" }]}
        >
          <Text style={styles.exportText}>Hapus Semua Data</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <Text style={styles.modalTitle}>Edit: {editItem.namaBarang}</Text>

            <Text>Large</Text>
            <TextInput
              style={styles.input}
              value={editItem.large}
              onChangeText={(t) => setEditItem({ ...editItem, large: t })}
              keyboardType="numeric"
            />

            <Text>Medium</Text>
            <TextInput
              style={styles.input}
              value={editItem.medium}
              onChangeText={(t) => setEditItem({ ...editItem, medium: t })}
              keyboardType="numeric"
            />

            <Text>Small</Text>
            <TextInput
              style={styles.input}
              value={editItem.small}
              onChangeText={(t) => setEditItem({ ...editItem, small: t })}
              keyboardType="numeric"
            />

            <Text>ED</Text>
            <TextInput
              style={styles.input}
              value={editItem.ed}
              onChangeText={(t) => setEditItem({ ...editItem, ed: t })}
            />

            <Text>Catatan</Text>
            <TextInput
              style={styles.input}
              value={editItem.catatan}
              onChangeText={(t) => setEditItem({ ...editItem, catatan: t })}
            />

            <Text>Surat Jalan</Text>
            <TextInput
              style={styles.input}
              value={editSuratJalan}
              onChangeText={setEditSuratJalan}
            />

            <Text>Kode Apos</Text>
            <TextInput
              style={styles.input}
              value={editKodeApos}
              onChangeText={setEditKodeApos}
            />

            <Text>Waktu Input</Text>
            <TextInput
              style={styles.input}
              value={editWaktuInput}
              onChangeText={setEditWaktuInput}
            />

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <TouchableOpacity
                onPress={() => setEditModal(false)}
                style={[
                  styles.exportButton,
                  { backgroundColor: "#999", flex: 1, marginRight: 4 },
                ]}
              >
                <Text style={styles.exportText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveEdit}
                style={[
                  styles.exportButton,
                  { backgroundColor: "#006400", flex: 1, marginLeft: 4 },
                ]}
              >
                <Text style={styles.exportText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  section: { marginBottom: 16 },
  expandBtn: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 6,
  },
  jenisBtn: {
    backgroundColor: "#17a2b8",
    padding: 8,
    marginVertical: 6,
    borderRadius: 6,
  },
  expandBtnText: { color: "#fff", fontWeight: "bold" },
  card: {
    backgroundColor: "#f2f2f2",
    padding: 12,
    marginVertical: 6,
    borderRadius: 8,
  },
  bold: { fontWeight: "bold", fontSize: 15 },
  exportButton: {
    backgroundColor: "#006400",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  exportText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
});
