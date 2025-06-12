// OutDetailScreen.tsx - Final Versi Format Seperti InDetail + Tetap Ikuti OutDetail

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
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as XLSX from "xlsx";
import { db } from "../../utils/firebase";

export default function OutDetailScreen() {
  const [allData, setAllData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editedTrx, setEditedTrx] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const q = query(
        collection(db, "barangKeluar"),
        orderBy("waktuInput", "desc")
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAllData(all);
      });
      return () => unsub();
    }, [])
  );

  const filtered = allData.filter((trx) => {
    const tgl = new Date(trx.waktuInput).toLocaleDateString("id-ID");
    return (
      tgl.includes(searchText) ||
      trx.kodeApos?.toLowerCase().includes(searchText.toLowerCase())
    );
  });

  const grouped = filtered.reduce((acc, trx) => {
    const date = new Date(trx.waktuInput).toLocaleDateString("id-ID");
    const jenis = trx.jenisForm || "-";
    if (!acc[date]) acc[date] = {};
    if (!acc[date][jenis]) acc[date][jenis] = [];
    acc[date][jenis].push(trx);
    return acc;
  }, {});

  const exportAll = () => {
    const exportData = [];
    allData.forEach((trx) => {
      trx.items.forEach((item) => {
        exportData.push({
          Tanggal: new Date(trx.waktuInput).toLocaleDateString("id-ID"),
          JenisForm: trx.jenisForm,
          Gudang: trx.jenisGudang,
          NoFaktur: trx.kodeApos,
          Kategori: trx.kategori,
          Catatan: trx.catatan,
          Sopir: trx.namaSopir,
          Kendaraan: trx.nomorKendaraan,
          Tujuan: trx.tujuanGudang,
          NamaBarang: item.namaBarang,
          Kode: item.kode,
          Large: item.large,
          Medium: item.medium,
          Small: item.small,
          ED: item.ed,
          CatatanItem: item.catatan,
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OutDetail");
    const uri = FileSystem.cacheDirectory + "OutDetail.xlsx";
    const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    FileSystem.writeAsStringAsync(uri, buffer, {
      encoding: FileSystem.EncodingType.Base64,
    }).then(() => Sharing.shareAsync(uri));
  };

  const handleSave = async () => {
    if (!editedTrx?.id) return;
    try {
      await updateDoc(doc(db, "barangKeluar", editedTrx.id), editedTrx);
      setModalVisible(false);
      Alert.alert("✅ Berhasil", "Data berhasil disimpan");
    } catch (err) {
      Alert.alert("❌ Gagal", "Tidak bisa menyimpan perubahan");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Riwayat Barang Keluar</Text>
      <TextInput
        placeholder="Cari tanggal atau No Faktur"
        style={styles.input}
        value={searchText}
        onChangeText={setSearchText}
      />

      {Object.entries(grouped).map(([tanggal, jenisGroup]) => (
        <View key={tanggal} style={styles.section}>
          <Text style={styles.dateTitle}>{tanggal}</Text>
          {Object.entries(jenisGroup).map(([jenis, trxList]) => (
            <View key={jenis}>
              <Text style={styles.jenisTitle}>{jenis}</Text>
              {trxList.map((trx) => (
                <View key={trx.id} style={styles.card}>
                  <Text style={styles.bold}>No Faktur: {trx.kodeApos}</Text>
                  <Text>Gudang: {trx.jenisGudang}</Text>
                  <Text>Kategori: {trx.kategori}</Text>
                  {jenis === "DR" && (
                    <Text>
                      Sopir: {trx.namaSopir}, Kendaraan: {trx.nomorKendaraan}
                    </Text>
                  )}
                  {jenis === "MB" && (
                    <Text>Gudang Tujuan: {trx.tujuanGudang}</Text>
                  )}
                  <Text>Catatan: {trx.catatan}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setEditedTrx(trx);
                      setModalVisible(true);
                    }}
                    style={[styles.btn, { backgroundColor: "orange" }]}
                  >
                    <Text style={styles.btnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}

      <TouchableOpacity onPress={exportAll} style={styles.exportBtn}>
        <Text style={styles.btnText}>Export Semua</Text>
      </TouchableOpacity>

      {/* Modal Edit */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <ScrollView>
              {editedTrx && (
                <>
                  <Text style={styles.label}>Jenis Gudang</Text>
                  <TextInput
                    style={styles.input}
                    value={editedTrx.jenisGudang}
                    onChangeText={(t) =>
                      setEditedTrx({ ...editedTrx, jenisGudang: t })
                    }
                  />
                  <Text style={styles.label}>Jenis Form</Text>
                  <TextInput
                    style={styles.input}
                    value={editedTrx.jenisForm}
                    onChangeText={(t) =>
                      setEditedTrx({ ...editedTrx, jenisForm: t })
                    }
                  />
                  <Text style={styles.label}>No Faktur</Text>
                  <TextInput
                    style={styles.input}
                    value={editedTrx.kodeApos}
                    onChangeText={(t) =>
                      setEditedTrx({ ...editedTrx, kodeApos: t })
                    }
                  />
                  <Text style={styles.label}>Kategori</Text>
                  <TextInput
                    style={styles.input}
                    value={editedTrx.kategori}
                    onChangeText={(t) =>
                      setEditedTrx({ ...editedTrx, kategori: t })
                    }
                  />
                  {editedTrx.jenisForm === "DR" && (
                    <>
                      <Text style={styles.label}>Nama Sopir</Text>
                      <TextInput
                        style={styles.input}
                        value={editedTrx.namaSopir}
                        onChangeText={(t) =>
                          setEditedTrx({ ...editedTrx, namaSopir: t })
                        }
                      />
                      <Text style={styles.label}>Nomor Kendaraan</Text>
                      <TextInput
                        style={styles.input}
                        value={editedTrx.nomorKendaraan}
                        onChangeText={(t) =>
                          setEditedTrx({ ...editedTrx, nomorKendaraan: t })
                        }
                      />
                    </>
                  )}
                  {editedTrx.jenisForm === "MB" && (
                    <>
                      <Text style={styles.label}>Gudang Tujuan</Text>
                      <TextInput
                        style={styles.input}
                        value={editedTrx.tujuanGudang}
                        onChangeText={(t) =>
                          setEditedTrx({ ...editedTrx, tujuanGudang: t })
                        }
                      />
                    </>
                  )}
                  <Text style={styles.label}>Catatan</Text>
                  <TextInput
                    style={styles.input}
                    value={editedTrx.catatan}
                    onChangeText={(t) =>
                      setEditedTrx({ ...editedTrx, catatan: t })
                    }
                  />
                  <TouchableOpacity
                    onPress={handleSave}
                    style={[styles.btn, { backgroundColor: "green" }]}
                  >
                    <Text style={styles.btnText}>Simpan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={[styles.btn, { backgroundColor: "gray" }]}
                  >
                    <Text style={styles.btnText}>Tutup</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  label: { fontWeight: "bold", marginTop: 8 },
  card: {
    backgroundColor: "#f2f2f2",
    padding: 10,
    marginVertical: 6,
    borderRadius: 8,
  },
  bold: { fontWeight: "bold" },
  btn: {
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "bold" },
  exportBtn: {
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  section: { marginBottom: 16 },
  dateTitle: { fontSize: 16, fontWeight: "bold" },
  jenisTitle: { fontSize: 14, fontWeight: "bold", color: "#555", marginTop: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxHeight: "90%",
  },
});
