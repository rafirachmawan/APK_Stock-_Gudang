// ✅ OutDetailScreen.tsx - Final Lengkap (fix pencarian & guard aman + admin gate)
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import React, { useCallback, useState } from "react";
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

/* 🔐 Password Admin */
const STOCK_ADMIN_PASSWORD = "admin123@";

interface ItemOut {
  namaBarang: string;
  kode: string;
  large: string;
  medium: string;
  small: string;
  principle?: string;
  ed?: string;
  catatan?: string;
}

interface TransaksiOut {
  id?: string;
  jenisGudang: string;
  kodeGdng: string;
  kodeApos: string;
  kategori: string;
  catatan: string;
  nomorKendaraan: string;
  namaSopir: string;
  waktuInput: string;
  jenisForm: "DR" | "MB" | "RB";
  tujuanGudang?: string;
  items: ItemOut[];
}

export default function OutDetailScreen() {
  /* ====== Gate Password ====== */
  const [isAuthed, setIsAuthed] = useState(false);
  const [pwInput, setPwInput] = useState("");

  /* ====== State Data & UI ====== */
  const [allData, setAllData] = useState<TransaksiOut[]>([]);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editedTrx, setEditedTrx] = useState<TransaksiOut | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Subscriber Firestore HANYA setelah lolos password
  useFocusEffect(
    useCallback(() => {
      if (!isAuthed) return;
      const q = query(collection(db, "barangKeluar"), orderBy("waktuInput"));
      const unsub = onSnapshot(q, (snapshot) => {
        const all: TransaksiOut[] = snapshot.docs.map(
          (d) => ({ id: d.id, ...(d.data() as any) } as TransaksiOut)
        );
        setAllData(all);
      });
      return () => unsub();
    }, [isAuthed])
  );

  // 🔧 FIX: pencarian aman meski kodeApos / waktuInput kosong
  const filtered = (allData || []).filter((trx) => {
    const tgl = trx?.waktuInput
      ? new Date(trx.waktuInput).toLocaleDateString("id-ID")
      : "";
    const faktur = (trx?.kodeApos || "").toLowerCase();
    const search = (searchText || "").toLowerCase();
    return tgl.includes(search) || faktur.includes(search);
  });

  // Pengelompokan tampilan
  const grouped = filtered.reduce((acc, trx) => {
    const tgl = trx?.waktuInput
      ? new Date(trx.waktuInput).toLocaleDateString("id-ID")
      : "-";
    const jenis = trx?.jenisForm || "-";
    if (!acc[tgl]) acc[tgl] = {};
    if (!acc[tgl][jenis]) acc[tgl][jenis] = [];
    acc[tgl][jenis].push(trx);
    return acc;
  }, {} as Record<string, Record<string, TransaksiOut[]>>);

  const exportToExcel = async () => {
    const exportData: any[] = [];
    (allData || []).forEach((trx) => {
      const rows = Array.isArray(trx.items) ? trx.items : [];
      rows.forEach((item) => {
        exportData.push({
          Tanggal: trx?.waktuInput
            ? new Date(trx.waktuInput).toLocaleDateString("id-ID")
            : "-",
          JenisForm: trx?.jenisForm || "-",
          Gudang: trx?.jenisGudang || "-",
          NoFaktur: trx?.kodeApos || "-",
          Kategori: trx?.kategori || "-",
          Catatan: trx?.catatan || "-",
          Sopir: trx?.namaSopir || "-",
          Kendaraan: trx?.nomorKendaraan || "-",
          GudangTujuan: trx?.tujuanGudang || "-",
          NamaBarang: item?.namaBarang || "-",
          KodeBarang: item?.kode || "-",
          Large: item?.large ?? "",
          Medium: item?.medium ?? "",
          Small: item?.small ?? "",
          CatatanItem: item?.catatan || "-",
          ED: item?.ed || "-",
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BarangKeluar");

    const fileName = "BarangKeluar.xlsx";
    const uri = FileSystem.cacheDirectory + fileName;
    const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

    // Android: coba SAF dulu, kalau gagal share dari cache
    if (Platform.OS === "android") {
      try {
        const mime =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        const perm =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (perm.granted) {
          const fUri = await FileSystem.StorageAccessFramework.createFileAsync(
            perm.directoryUri,
            fileName,
            mime
          );
          await FileSystem.writeAsStringAsync(fUri, buffer, {
            encoding: FileSystem.EncodingType.Base64,
          });
          Alert.alert("Berhasil", `File tersimpan: ${fileName}`);
          return;
        }
      } catch {
        // fallback di bawah
      }
    }

    await FileSystem.writeAsStringAsync(uri, buffer, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await Sharing.shareAsync(uri);
  };

  const handleChangeItem = (i: number, field: keyof ItemOut, value: string) => {
    if (!editedTrx) return;
    const updated = [...(editedTrx.items || [])];
    updated[i] = { ...updated[i], [field]: value };
    setEditedTrx({ ...editedTrx, items: updated });
  };

  const handleSave = async () => {
    if (!editedTrx?.id) return;
    try {
      const { id, ...payload } = editedTrx as any; // hindari tulis field id ke dokumen
      await updateDoc(doc(db, "barangKeluar", id), payload);
      Alert.alert("✅ Berhasil diupdate");
      setModalVisible(false);
    } catch (e) {
      console.log(e);
      Alert.alert("Gagal update");
    }
  };

  const onChangeDate = (_: any, selected?: Date) => {
    setShowDatePicker(false);
    if (selected && editedTrx) {
      setSelectedDate(selected);
      setEditedTrx({ ...editedTrx, waktuInput: selected.toISOString() });
    }
  };

  /* ====== Render: Gate Password dulu ====== */
  if (!isAuthed) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#fff" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              backgroundColor: "#ffffff",
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 8 }}>
              🔒 Akses Admin
            </Text>
            <Text
              style={{
                color: "#475569",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              Masukkan password admin untuk membuka halaman detail barang
              keluar.
            </Text>

            <TextInput
              value={pwInput}
              onChangeText={setPwInput}
              secureTextEntry
              placeholder="Password admin"
              style={{
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 12,
                width: "100%",
                backgroundColor: "#fff",
                marginBottom: 12,
              }}
            />

            <TouchableOpacity
              onPress={() => {
                if (pwInput !== STOCK_ADMIN_PASSWORD) {
                  Alert.alert("Ditolak", "Password admin salah.");
                  return;
                }
                setIsAuthed(true);
              }}
              style={{
                backgroundColor: "#0ea5e9",
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
                width: "100%",
              }}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>Masuk</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }

  /* ====== Render Konten Utama ====== */
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <Text style={styles.title}>Riwayat Barang Keluar</Text>

      <TextInput
        style={styles.input}
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Cari tanggal (dd/mm/yyyy) atau No Faktur"
      />

      {Object.entries(grouped).map(([tgl, jenisMap]) => (
        <View key={tgl} style={styles.section}>
          <Text style={styles.dateTitle}>{tgl}</Text>
          {Object.entries(jenisMap).map(([jenis, list]) => (
            <View key={jenis}>
              <Text style={styles.jenisTitle}>{jenis}</Text>
              {list.map((trx) => (
                <View key={trx.id} style={styles.card}>
                  <Text style={styles.bold}>
                    No Faktur: {trx.kodeApos || "-"}
                  </Text>
                  <Text>Gudang: {trx.jenisGudang || "-"}</Text>
                  <Text>Catatan: {trx.catatan || "-"}</Text>
                  {trx.jenisForm !== "MB" && (
                    <>
                      <Text>Sopir: {trx.namaSopir || "-"}</Text>
                      <Text>Kendaraan: {trx.nomorKendaraan || "-"}</Text>
                    </>
                  )}
                  {(trx.items || []).map((item, index) => (
                    <Text key={index}>
                      • {item?.namaBarang || "-"} – ED: {item?.ed || "-"}
                    </Text>
                  ))}
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => {
                      setEditedTrx(trx);
                      setModalVisible(true);
                      setSelectedDate(
                        trx?.waktuInput ? new Date(trx.waktuInput) : new Date()
                      );
                    }}
                  >
                    <Text style={{ color: "white" }}>✏️ Edit</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}

      <TouchableOpacity onPress={exportToExcel} style={styles.exportBtn}>
        <Text style={{ color: "white" }}>Export Semua</Text>
      </TouchableOpacity>

      {/* Modal Edit */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              {editedTrx && (
                <ScrollView>
                  <Text style={styles.modalTitle}>Edit Transaksi</Text>

                  <Text style={styles.label}>No Faktur</Text>
                  <TextInput
                    style={styles.input}
                    value={editedTrx.kodeApos}
                    onChangeText={(t) =>
                      setEditedTrx({ ...editedTrx, kodeApos: t })
                    }
                  />

                  {editedTrx.jenisForm !== "MB" && (
                    <>
                      <Text style={styles.label}>Nama Sopir</Text>
                      <TextInput
                        style={styles.input}
                        value={editedTrx.namaSopir}
                        onChangeText={(t) =>
                          setEditedTrx({ ...editedTrx, namaSopir: t })
                        }
                        placeholder="Nama Sopir"
                      />

                      <Text style={styles.label}>Plat Nomor Kendaraan</Text>
                      <TextInput
                        style={styles.input}
                        value={editedTrx.nomorKendaraan}
                        onChangeText={(t) =>
                          setEditedTrx({ ...editedTrx, nomorKendaraan: t })
                        }
                        placeholder="Plat Nomor Kendaraan"
                      />
                    </>
                  )}

                  <Text style={styles.label}>Jenis Gudang</Text>
                  <TextInput
                    style={styles.input}
                    value={editedTrx.jenisGudang}
                    onChangeText={(t) =>
                      setEditedTrx({ ...editedTrx, jenisGudang: t })
                    }
                  />

                  <Text style={styles.label}>Tanggal</Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={styles.input}
                  >
                    <Text>
                      {editedTrx.waktuInput
                        ? new Date(editedTrx.waktuInput).toLocaleDateString(
                            "id-ID"
                          )
                        : "-"}
                    </Text>
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="default"
                      onChange={onChangeDate}
                    />
                  )}

                  {(editedTrx.items || []).map((item, i) => (
                    <View key={i} style={styles.itemBox}>
                      <Text style={styles.bold}>{item?.namaBarang || "-"}</Text>
                      <TextInput
                        style={styles.input}
                        value={item.large}
                        onChangeText={(t) => handleChangeItem(i, "large", t)}
                        placeholder="Large"
                      />
                      <TextInput
                        style={styles.input}
                        value={item.medium}
                        onChangeText={(t) => handleChangeItem(i, "medium", t)}
                        placeholder="Medium"
                      />
                      <TextInput
                        style={styles.input}
                        value={item.small}
                        onChangeText={(t) => handleChangeItem(i, "small", t)}
                        placeholder="Small"
                      />
                      <TextInput
                        style={styles.input}
                        value={item.catatan || ""}
                        onChangeText={(t) => handleChangeItem(i, "catatan", t)}
                        placeholder="Catatan"
                      />
                      <TextInput
                        style={styles.input}
                        value={item.ed || ""}
                        onChangeText={(t) => handleChangeItem(i, "ed", t)}
                        placeholder="ED (dd-mm-yyyy)"
                      />
                    </View>
                  ))}

                  <TouchableOpacity onPress={handleSave} style={styles.editBtn}>
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      Simpan
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.cancelBtn}
                  >
                    <Text style={{ color: "white" }}>Tutup</Text>
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
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  section: { marginBottom: 20 },
  card: {
    backgroundColor: "#f1f1f1",
    padding: 12,
    borderRadius: 8,
    marginVertical: 6,
  },
  bold: { fontWeight: "bold" },
  editBtn: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#6c757d",
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    alignItems: "center",
  },
  exportBtn: {
    marginTop: 20,
    backgroundColor: "#28a745",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxHeight: "90%",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  jenisTitle: { fontWeight: "bold", marginTop: 10 },
  dateTitle: { fontWeight: "bold", marginTop: 16 },
  itemBox: {
    backgroundColor: "#f2f2f2",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
});
