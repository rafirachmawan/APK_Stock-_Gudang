// StockDetailScreen.tsx — In Detail
// - Export Excel (aman Android via SAF) + filter range tanggal + search
// - Edit: HANYA "No Faktur" yang bisa diubah; lainnya read-only

import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import * as XLSX from "xlsx";
import { db } from "../../utils/firebase";

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
  id?: string;
  gudang: string;
  kodeGdng: string;
  kodeApos?: string;
  kodeRetur?: string;
  principle: string;
  jenisForm?: string;
  jenisGudang?: string;
  waktuInput: string; // ISO
  items: ItemInput[];
}

export default function StockDetailScreen() {
  const [allData, setAllData] = useState<PurchaseForm[]>([]);
  const [searchText, setSearchText] = useState("");

  // Edit modal (No Faktur only)
  const [modalVisible, setModalVisible] = useState(false);
  const [editedTrx, setEditedTrx] = useState<PurchaseForm | null>(null);

  // Filter tanggal
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const unsub = onSnapshot(collection(db, "barangMasuk"), (snapshot) => {
        const all: PurchaseForm[] = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as PurchaseForm)
        );
        setAllData(all);
      });
      return () => unsub();
    }, [])
  );

  // Helpers tanggal
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
  const endOfDay = (d: Date) =>
    new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      23,
      59,
      59,
      999
    ).getTime();

  // Filter data (tanggal + search)
  const filteredData = useMemo(() => {
    const startMs = startDate ? startOfDay(startDate) : -Infinity;
    const endMs = endDate ? endOfDay(endDate) : Infinity;
    const q = searchText.trim().toLowerCase();

    return allData.filter((trx) => {
      const tMs = new Date(trx.waktuInput).getTime();
      if (tMs < startMs || tMs > endMs) return false;

      if (!q) return true;
      const tgl = new Date(trx.waktuInput).toLocaleDateString("id-ID");
      const noFaktur = (trx.kodeApos || trx.kodeRetur || "").toLowerCase();
      return tgl.includes(q) || noFaktur.includes(q);
    });
  }, [allData, startDate, endDate, searchText]);

  // Group per tanggal → jenis
  const grouped = useMemo(() => {
    return filteredData.reduce((acc, trx) => {
      const date = new Date(trx.waktuInput).toLocaleDateString("id-ID");
      const jenis = trx.jenisForm || "Pembelian";
      if (!acc[date]) acc[date] = {};
      if (!acc[date][jenis]) acc[date][jenis] = [];
      acc[date][jenis].push(trx);
      return acc;
    }, {} as Record<string, Record<string, PurchaseForm[]>>);
  }, [filteredData]);

  // Hapus
  const handleDelete = async (trx: PurchaseForm) => {
    if (!trx.id) return;
    Alert.alert("Hapus Transaksi", "Yakin ingin menghapus data ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "barangMasuk", trx.id!));
        },
      },
    ]);
  };

  // Simpan edit (HANYA No Faktur)
  const handleSave = async () => {
    if (!editedTrx?.id) return;
    try {
      const payload: any = {};
      if (editedTrx.jenisForm?.startsWith("Return")) {
        payload.kodeRetur = editedTrx.kodeRetur ?? "";
      } else {
        payload.kodeApos = editedTrx.kodeApos ?? "";
      }
      await updateDoc(doc(db, "barangMasuk", editedTrx.id), payload);
      Alert.alert("Berhasil", "No Faktur berhasil diperbarui");
      setModalVisible(false);
    } catch (e) {
      Alert.alert("Gagal", "Tidak dapat menyimpan perubahan No Faktur.");
    }
  };

  // Export → XLSX (berdasarkan filteredData) — aman untuk Android (SAF)
  const exportToExcel = async () => {
    try {
      const rows: any[] = [];
      filteredData.forEach((trx) => {
        trx.items.forEach((it) => {
          rows.push({
            Tanggal: new Date(trx.waktuInput).toLocaleDateString("id-ID"),
            JenisGudang: trx.jenisGudang || "-",
            JenisForm: trx.jenisForm || "-",
            Gudang: trx.gudang,
            Principle: trx.principle,
            KodeGudang: trx.kodeGdng,
            NoFaktur: trx.kodeApos || trx.kodeRetur || "-",
            NamaBarang: it.namaBarang,
            KodeBarang: it.kode,
            Large: it.large,
            Medium: it.medium,
            Small: it.small,
            Catatan: it.catatan || "-",
            ED: it.ed || "-",
          });
        });
      });

      if (rows.length === 0) {
        Alert.alert(
          "Tidak ada data",
          "Tidak ada baris yang cocok dengan filter."
        );
        return;
      }

      const ws = XLSX.utils.json_to_sheet(rows, {
        header: [
          "Tanggal",
          "JenisGudang",
          "JenisForm",
          "Gudang",
          "Principle",
          "KodeGudang",
          "NoFaktur",
          "NamaBarang",
          "KodeBarang",
          "Large",
          "Medium",
          "Small",
          "Catatan",
          "ED",
        ],
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "BarangMasuk");

      const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

      const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, "-");
      const fmt = (d?: Date | null) =>
        d
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
              2,
              "0"
            )}-${String(d.getDate()).padStart(2, "0")}`
          : "ALL";
      const nameHint = `${fmt(startDate)}_to_${fmt(endDate)}`;
      const fileName = safe(`BarangMasuk_${nameHint}.xlsx`);
      const mime =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      if (Platform.OS === "android") {
        try {
          const perm =
            await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (perm.granted) {
            const uri = await FileSystem.StorageAccessFramework.createFileAsync(
              perm.directoryUri,
              fileName,
              mime
            );
            await FileSystem.writeAsStringAsync(uri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            Alert.alert("Berhasil", `File tersimpan: ${fileName}`);
            return;
          }
        } catch (e) {
          console.warn("SAF error, fallback ke cache+share:", e);
        }
      }

      const fileUri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: mime,
          UTI: "com.microsoft.excel.xlsx",
          dialogTitle: "Export Data Barang Masuk",
        });
      } else {
        Alert.alert("File siap", `Lokasi: ${fileUri}`);
      }
    } catch (e) {
      console.error("Export error:", e);
      Alert.alert(
        "Export gagal",
        "Terjadi kesalahan saat membuat atau membagikan file Excel."
      );
    }
  };

  // Picker filter
  const handlePickStart = (_: any, d?: Date) => {
    setShowStartPicker(false);
    if (!d) return;
    if (endDate && d > endDate) {
      setStartDate(endDate);
      setEndDate(d);
    } else {
      setStartDate(d);
    }
  };
  const handlePickEnd = (_: any, d?: Date) => {
    setShowEndPicker(false);
    if (!d) return;
    if (startDate && d < startDate) {
      setEndDate(startDate);
      setStartDate(d);
    } else {
      setEndDate(d);
    }
  };
  const clearDates = () => {
    setStartDate(null);
    setEndDate(null);
  };

  return (
    <ScrollView
      style={{ flex: 1, padding: 16, backgroundColor: "#fff" }}
      contentContainerStyle={{ paddingBottom: 100 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>
        Riwayat Barang Masuk
      </Text>

      {/* Export di atas */}
      <TouchableOpacity
        onPress={exportToExcel}
        style={{
          backgroundColor: "#28a745",
          padding: 12,
          borderRadius: 8,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Export (Sesuai Filter)
        </Text>
      </TouchableOpacity>

      {/* Filter tanggal */}
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => setShowStartPicker(true)}
          style={[styles.input, { flex: 1 }]}
        >
          <Text>
            Dari: {startDate ? startDate.toLocaleDateString("id-ID") : "—"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowEndPicker(true)}
          style={[styles.input, { flex: 1 }]}
        >
          <Text>
            Sampai: {endDate ? endDate.toLocaleDateString("id-ID") : "—"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={clearDates}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 14,
            backgroundColor: "#e5e7eb",
            borderRadius: 8,
          }}
        >
          <Text style={{ fontWeight: "600", color: "#111827" }}>Reset</Text>
        </TouchableOpacity>
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={handlePickStart}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={handlePickEnd}
        />
      )}

      {/* Search */}
      <TextInput
        placeholder="Cari No Faktur atau Tanggal (dd/mm/yyyy)"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 10,
          borderRadius: 8,
          marginBottom: 12,
        }}
        value={searchText}
        onChangeText={setSearchText}
      />

      {/* List */}
      {Object.entries(grouped)
        .sort((a, b) => {
          const dateA = new Date(a[0].split("/").reverse().join("-"));
          const dateB = new Date(b[0].split("/").reverse().join("-"));
          return dateB.getTime() - dateA.getTime();
        })
        .map(([tanggal, jenisMap]) => (
          <View key={tanggal} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 4 }}>
              {tanggal}
            </Text>
            {Object.entries(jenisMap).map(([jenis, trxList]) => (
              <View key={jenis}>
                <Text
                  style={{ fontSize: 15, fontWeight: "bold", color: "#555" }}
                >
                  {jenis}
                </Text>
                {trxList.map((trx) => (
                  <View
                    key={trx.id}
                    style={{
                      backgroundColor: "#f8f9fa",
                      padding: 12,
                      borderRadius: 8,
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ fontWeight: "bold" }}>
                      No Faktur: {trx.kodeApos || trx.kodeRetur || "-"}
                    </Text>
                    <Text>
                      Waktu: {new Date(trx.waktuInput).toLocaleString("id-ID")}
                    </Text>
                    <View
                      style={{ flexDirection: "row", gap: 10, marginTop: 8 }}
                    >
                      <TouchableOpacity
                        style={{
                          padding: 8,
                          borderRadius: 6,
                          flex: 1,
                          backgroundColor: "green",
                          alignItems: "center",
                        }}
                        onPress={() => {
                          setEditedTrx(trx);
                          setModalVisible(true);
                        }}
                      >
                        <Text style={{ color: "white", fontWeight: "bold" }}>
                          Edit
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          padding: 8,
                          borderRadius: 6,
                          flex: 1,
                          backgroundColor: "#dc3545",
                          alignItems: "center",
                        }}
                        onPress={() => handleDelete(trx)}
                      >
                        <Text style={{ color: "white", fontWeight: "bold" }}>
                          Hapus
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}

      {/* Modal edit — hanya No Faktur editable */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 10,
                padding: 20,
                width: "90%",
                maxHeight: "90%",
              }}
            >
              {editedTrx && (
                <ScrollView>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      marginBottom: 10,
                    }}
                  >
                    Edit No Faktur
                  </Text>

                  <Text>Jenis Gudang</Text>
                  <TextInput
                    style={styles.input}
                    value={editedTrx.jenisGudang || ""}
                    editable={false}
                  />

                  <Text>Jenis Form</Text>
                  <TextInput
                    style={styles.input}
                    value={editedTrx.jenisForm || ""}
                    editable={false}
                  />

                  <Text>Gudang</Text>
                  <TextInput
                    style={styles.input}
                    value={editedTrx.gudang}
                    editable={false}
                  />

                  <Text>Principle</Text>
                  <TextInput
                    style={styles.input}
                    value={editedTrx.principle}
                    editable={false}
                  />

                  <Text>Kode Gudang</Text>
                  <TextInput
                    style={styles.input}
                    value={editedTrx.kodeGdng}
                    editable={false}
                  />

                  <Text>Tanggal</Text>
                  <TextInput
                    style={styles.input}
                    value={new Date(editedTrx.waktuInput).toLocaleDateString(
                      "id-ID"
                    )}
                    editable={false}
                  />

                  {/* Satu-satunya field yang bisa diubah */}
                  <Text>No Faktur</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: "#fff" }]}
                    value={editedTrx.kodeApos || editedTrx.kodeRetur || ""}
                    onChangeText={(t) => {
                      if (editedTrx.jenisForm?.startsWith("Return")) {
                        setEditedTrx({ ...editedTrx, kodeRetur: t });
                      } else {
                        setEditedTrx({ ...editedTrx, kodeApos: t });
                      }
                    }}
                    placeholder="No Faktur"
                  />

                  {/* Items (read-only) */}
                  {editedTrx.items.map((item, i) => (
                    <View
                      key={i}
                      style={{
                        backgroundColor: "#f1f5f9",
                        padding: 10,
                        borderRadius: 6,
                        marginBottom: 10,
                      }}
                    >
                      <Text style={{ fontWeight: "bold" }}>
                        {item.namaBarang}
                      </Text>
                      <Text>Kode: {item.kode}</Text>
                      <Text>Large: {item.large}</Text>
                      <Text>Medium: {item.medium}</Text>
                      <Text>Small: {item.small}</Text>
                      <Text>Catatan: {item.catatan || "-"}</Text>
                      <Text>ED: {item.ed || "-"}</Text>
                    </View>
                  ))}

                  <TouchableOpacity
                    onPress={handleSave}
                    style={{
                      padding: 10,
                      borderRadius: 6,
                      backgroundColor: "green",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      Simpan
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={{
                      padding: 10,
                      borderRadius: 6,
                      backgroundColor: "#6c757d",
                      alignItems: "center",
                      marginTop: 10,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      Tutup
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#f8fafc", // abu-abu ringan untuk menandai read-only
  },
});
