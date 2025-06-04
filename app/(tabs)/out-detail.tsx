// OutDetailScreen.tsx - Versi Lengkap + Edit Modal per Item

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useCallback, useState } from "react";
import {
  Alert,
  LayoutAnimation,
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

interface ItemOut {
  namaBarang: string;
  kode: string;
  large: string;
  medium: string;
  small: string;
  principle: string;
  ed?: string;
  catatan?: string;
  harga?: string;
  disc1?: string;
  disc2?: string;
  disc3?: string;
  discRp?: string;
  total?: string;
  gdg?: string;
}

interface TransaksiOut {
  kodeGdng: string;
  kodeApos: string;
  kategori: string;
  catatan: string;
  nomorKendaraan: string;
  namaSopir: string;
  waktuInput: string;
  jenisForm: "DR" | "MB" | "RB";
  items: ItemOut[];
}

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function OutDetailScreen() {
  const [groupedData, setGroupedData] = useState<
    Record<string, Record<string, TransaksiOut[]>>
  >({});
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>(
    {}
  );
  const [expandedJenis, setExpandedJenis] = useState<Record<string, boolean>>(
    {}
  );

  const [editModal, setEditModal] = useState(false);
  const [selectedTrx, setSelectedTrx] = useState<TransaksiOut | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(-1);
  const [editItem, setEditItem] = useState<ItemOut>({
    namaBarang: "",
    kode: "",
    large: "",
    medium: "",
    small: "",
    principle: "",
    ed: "",
    catatan: "",
  });

  const loadData = async () => {
    const json = await AsyncStorage.getItem("barangKeluar");
    const all: TransaksiOut[] = json ? JSON.parse(json) : [];
    const grouped: Record<string, Record<string, TransaksiOut[]>> = {};

    all.forEach((trx) => {
      const tanggal = new Date(trx.waktuInput).toLocaleDateString("id-ID");
      const jenis = trx.jenisForm;
      if (!grouped[tanggal]) grouped[tanggal] = {};
      if (!grouped[tanggal][jenis]) grouped[tanggal][jenis] = [];
      grouped[tanggal][jenis].push(trx);
    });

    setGroupedData(grouped);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const toggleExpand = (
    key: string,
    setter: any,
    current: Record<string, boolean>
  ) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter({ ...current, [key]: !current[key] });
  };

  const openEditModal = (trx: TransaksiOut, index: number) => {
    setSelectedTrx(trx);
    setSelectedItemIndex(index);
    setEditItem(trx.items[index]);
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!selectedTrx) return;
    const json = await AsyncStorage.getItem("barangKeluar");
    const all: TransaksiOut[] = json ? JSON.parse(json) : [];

    const updated = all.map((trx) => {
      if (
        trx.kodeApos === selectedTrx.kodeApos &&
        trx.waktuInput === selectedTrx.waktuInput
      ) {
        const items = [...trx.items];
        items[selectedItemIndex] = editItem;
        return { ...trx, items };
      }
      return trx;
    });

    await AsyncStorage.setItem("barangKeluar", JSON.stringify(updated));
    setEditModal(false);
    loadData();
  };

  const removeAll = async () => {
    Alert.alert("Konfirmasi", "Hapus semua data barang keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("barangKeluar");
          loadData();
        },
      },
    ]);
  };

  const exportAll = () => {
    const exportData: any[] = [];
    Object.entries(groupedData).forEach(([tanggal, jenisGroup]) => {
      Object.entries(jenisGroup).forEach(([jenis, list]) => {
        list.forEach((trx) => {
          trx.items.forEach((item) => {
            const row: any = {
              Tanggal: tanggal,
              JenisForm: trx.jenisForm,
              Gudang: trx.kodeGdng,
              KodeApos: trx.kodeApos,
              Kategori: trx.kategori,
              Catatan: trx.catatan,
              Kendaraan: trx.nomorKendaraan,
              Sopir: trx.namaSopir,
              KodeBarang: item.kode,
              NamaBarang: item.namaBarang,
              Large: item.large,
              Medium: item.medium,
              Small: item.small,
              ED: item.ed || "-",
              Principle: item.principle,
              CatatanItem: item.catatan || "-",
            };
            if (jenis === "RB") {
              row.Harga = item.harga;
              row.Disc1 = item.disc1;
              row.Disc2 = item.disc2;
              row.Disc3 = item.disc3;
              row.DiscRp = item.discRp;
              row.Total = item.total;
              row.Gdg = item.gdg;
            }
            exportData.push(row);
          });
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BarangKeluar");

    const uri = FileSystem.cacheDirectory + "OutDetail.xlsx";
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
        <Text style={styles.title}>Riwayat Barang Keluar</Text>
        {Object.entries(groupedData).map(([tanggal, jenisGroup]) => (
          <View key={tanggal}>
            <TouchableOpacity
              onPress={() =>
                toggleExpand(tanggal, setExpandedDates, expandedDates)
              }
              style={styles.expandBtn}
            >
              <Text style={styles.expandText}>
                {expandedDates[tanggal] ? "▼" : "▶"} {tanggal}
              </Text>
            </TouchableOpacity>

            {expandedDates[tanggal] &&
              Object.entries(jenisGroup).map(([jenis, list]) => {
                const key = `${tanggal}-${jenis}`;
                return (
                  <View key={key} style={{ marginLeft: 12 }}>
                    <TouchableOpacity
                      onPress={() =>
                        toggleExpand(key, setExpandedJenis, expandedJenis)
                      }
                      style={styles.jenisBtn}
                    >
                      <Text style={styles.expandText}>
                        {expandedJenis[key] ? "▼" : "▶"}{" "}
                        {jenis === "DR"
                          ? "Pengiriman (DR)"
                          : jenis === "MB"
                          ? "Mutasi Stock (MB)"
                          : "Return Pembelian (RB)"}
                      </Text>
                    </TouchableOpacity>

                    {expandedJenis[key] &&
                      list.map((trx, i) => (
                        <View key={i} style={styles.card}>
                          <Text style={styles.bold}>
                            Kode Apos: {trx.kodeApos}
                          </Text>
                          <Text>
                            Sopir: {trx.namaSopir} | Kendaraan:{" "}
                            {trx.nomorKendaraan}
                          </Text>
                          <Text>
                            Gudang: {trx.kodeGdng} | Kategori: {trx.kategori}
                          </Text>
                          <Text>Catatan Global: {trx.catatan}</Text>
                          {trx.items.map((item, index) => (
                            <TouchableOpacity
                              key={index}
                              style={styles.itemBox}
                              onPress={() => openEditModal(trx, index)}
                            >
                              <Text>
                                {item.namaBarang} ({item.kode})
                              </Text>
                              <Text>
                                Large: {item.large}, Medium: {item.medium},
                                Small: {item.small}
                              </Text>
                              <Text>ED: {item.ed || "-"}</Text>
                              <Text>Catatan: {item.catatan || "-"}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ))}
                  </View>
                );
              })}
          </View>
        ))}
      </ScrollView>

      <View style={{ padding: 16 }}>
        <TouchableOpacity
          onPress={exportAll}
          style={[styles.exportButton, { backgroundColor: "#28a745" }]}
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit: {editItem.namaBarang}</Text>
            <Text>Large</Text>
            <TextInput
              style={styles.input}
              value={editItem.large}
              onChangeText={(t) => setEditItem({ ...editItem, large: t })}
            />
            <Text>Medium</Text>
            <TextInput
              style={styles.input}
              value={editItem.medium}
              onChangeText={(t) => setEditItem({ ...editItem, medium: t })}
            />
            <Text>Small</Text>
            <TextInput
              style={styles.input}
              value={editItem.small}
              onChangeText={(t) => setEditItem({ ...editItem, small: t })}
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
                style={[styles.exportButton, { flex: 1, marginLeft: 4 }]}
              >
                <Text style={styles.exportText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  expandBtn: {
    backgroundColor: "#007bff",
    padding: 10,
    marginBottom: 6,
    borderRadius: 6,
  },
  jenisBtn: {
    backgroundColor: "#17a2b8",
    padding: 8,
    marginVertical: 6,
    borderRadius: 6,
  },
  expandText: { color: "#fff", fontWeight: "bold" },
  card: {
    backgroundColor: "#f2f2f2",
    padding: 10,
    marginVertical: 6,
    borderRadius: 8,
  },
  bold: { fontWeight: "bold", fontSize: 15 },
  exportButton: {
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  exportText: { color: "#fff", fontWeight: "bold" },
  itemBox: { marginTop: 6, paddingVertical: 4 },
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
  },
  modalTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
});
