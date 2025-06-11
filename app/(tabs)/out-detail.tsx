// OutDetailScreen.tsx - Final Fix Dropdown + Export + Firebase + Mobile Friendly

import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import * as XLSX from "xlsx";
import { db } from "../../utils/firebase";

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
  jenisGudang: string;
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
  const [filterGudang, setFilterGudang] = useState<string>("Semua");

  useFocusEffect(
    useCallback(() => {
      const q = query(
        collection(db, "barangKeluar"),
        orderBy("waktuInput", "desc")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data: TransaksiOut[] = snapshot.docs.map(
          (doc) => doc.data() as TransaksiOut
        );
        const grouped: Record<string, Record<string, TransaksiOut[]>> = {};

        const filtered =
          filterGudang === "Semua"
            ? data
            : data.filter((trx) => trx.jenisGudang === filterGudang);

        filtered.forEach((trx) => {
          const tanggal = new Date(trx.waktuInput).toLocaleDateString("id-ID");
          const jenis = trx.jenisForm;
          if (!grouped[tanggal]) grouped[tanggal] = {};
          if (!grouped[tanggal][jenis]) grouped[tanggal][jenis] = [];
          grouped[tanggal][jenis].push(trx);
        });

        setGroupedData(grouped);
      });
      return () => unsubscribe();
    }, [filterGudang])
  );

  const toggleExpand = (
    key: string,
    setter: any,
    current: Record<string, boolean>
  ) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter({ ...current, [key]: !current[key] });
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
              JenisGudang: trx.jenisGudang,
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
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
                        {expandedJenis[key] ? "▼" : "▶"} {jenis}
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
                            Gudang: {trx.kodeGdng} | JenisGudang:{" "}
                            {trx.jenisGudang} | Kategori: {trx.kategori}
                          </Text>
                          <Text>Catatan Global: {trx.catatan}</Text>
                          {trx.items.map((item, index) => (
                            <View key={index} style={styles.itemBox}>
                              <Text>
                                {item.namaBarang} ({item.kode})
                              </Text>
                              <Text>
                                Large: {item.large}, Medium: {item.medium},
                                Small: {item.small}
                              </Text>
                              <Text>ED: {item.ed || "-"}</Text>
                              <Text>Catatan: {item.catatan || "-"}</Text>
                            </View>
                          ))}
                        </View>
                      ))}
                  </View>
                );
              })}
          </View>
        ))}

        <TouchableOpacity
          onPress={exportAll}
          style={[styles.exportButton, { backgroundColor: "#28a745" }]}
        >
          <Text style={styles.exportText}>Export Semua</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
});
