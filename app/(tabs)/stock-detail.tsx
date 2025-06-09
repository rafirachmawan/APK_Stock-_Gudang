import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
  kodeApos: string;
  suratJalan: string;
  principle: string;
  jenisForm?: string;
  waktuInput: string;
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
  const [selectedTrx, setSelectedTrx] = useState<PurchaseForm | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedTrx, setEditedTrx] = useState<PurchaseForm | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const unsub = onSnapshot(collection(db, "barangMasuk"), (snapshot) => {
        try {
          const all: PurchaseForm[] = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as PurchaseForm)
          );

          const grouped: Record<string, Record<string, PurchaseForm[]>> = {};
          all.forEach((trx) => {
            const date = new Date(trx.waktuInput).toLocaleDateString("id-ID");
            const jenis = trx.jenisForm || "Pembelian";
            if (!grouped[date]) grouped[date] = {};
            if (!grouped[date][jenis]) grouped[date][jenis] = [];
            grouped[date][jenis].push(trx);
          });

          setData(grouped);
        } catch (error) {
          Alert.alert("Gagal memuat data");
          console.error("Snapshot error:", error);
        }
      });
      return () => unsub();
    }, [])
  );

  const openDetailModal = (trx: PurchaseForm) => {
    setSelectedTrx(trx);
    setEditedTrx({ ...trx });
    setEditMode(false);
    setModalVisible(true);
  };

  const handleChangeItem = (
    index: number,
    field: keyof ItemInput,
    value: string
  ) => {
    if (!editedTrx) return;
    const updatedItems = [...editedTrx.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setEditedTrx({ ...editedTrx, items: updatedItems });
  };

  const handleSave = async () => {
    if (!editedTrx || !editedTrx.id) return;
    try {
      await updateDoc(doc(db, "barangMasuk", editedTrx.id), {
        gudang: editedTrx.gudang,
        kodeGdng: editedTrx.kodeGdng,
        kodeApos: editedTrx.kodeApos,
        suratJalan: editedTrx.suratJalan,
        waktuInput: editedTrx.waktuInput,
        items: editedTrx.items,
      });
      Alert.alert("Berhasil", "Data berhasil diperbarui");
      setModalVisible(false);
    } catch (err) {
      Alert.alert("Gagal menyimpan perubahan");
      console.error(err);
    }
  };

  const onChangeDate = (event: any, selected?: Date) => {
    setShowDatePicker(false);
    if (selected && editedTrx) {
      setSelectedDate(selected);
      const iso = selected.toISOString();
      setEditedTrx({ ...editedTrx, waktuInput: iso });
    }
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Riwayat Barang Masuk</Text>

        {Object.entries(data || {}).map(([tanggal, jenisMap]) => (
          <View key={tanggal} style={styles.section}>
            <TouchableOpacity
              onPress={() =>
                setExpandedTanggal((prev) => ({
                  ...prev,
                  [tanggal]: !prev[tanggal],
                }))
              }
              style={styles.expandBtn}
            >
              <Text style={styles.expandBtnText}>
                {expandedTanggal[tanggal] ? "▼" : "▶"} {tanggal}
              </Text>
            </TouchableOpacity>

            {expandedTanggal[tanggal] &&
              Object.entries(jenisMap || {}).map(([jenis, list]) => {
                const jenisKey = `${tanggal}-${jenis}`;
                return (
                  <View key={jenisKey} style={{ marginLeft: 16 }}>
                    <TouchableOpacity
                      onPress={() =>
                        setExpandedJenis((prev) => ({
                          ...prev,
                          [jenisKey]: !prev[jenisKey],
                        }))
                      }
                      style={styles.jenisBtn}
                    >
                      <Text style={styles.expandBtnText}>
                        {expandedJenis[jenisKey] ? "▼" : "▶"} {jenis}
                      </Text>
                    </TouchableOpacity>

                    {expandedJenis[jenisKey] &&
                      list.map((trx, i) => (
                        <TouchableOpacity
                          key={i}
                          style={styles.card}
                          onPress={() => openDetailModal(trx)}
                        >
                          <Text style={styles.bold}>
                            Surat Jalan: {trx.suratJalan}
                          </Text>
                          <Text style={styles.bold}>
                            Kode Apos: {trx.kodeApos}
                          </Text>
                          <Text style={styles.bold}>
                            Waktu: {trx.waktuInput}
                          </Text>
                          <Text style={{ fontStyle: "italic" }}>
                            Klik untuk lihat detail barang
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                );
              })}
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {editedTrx && (
              <ScrollView>
                <Text style={styles.modalTitle}>Detail Transaksi</Text>

                <Text>Kode Gudang</Text>
                <TextInput
                  style={styles.input}
                  value={editedTrx.kodeGdng}
                  onChangeText={(t) =>
                    setEditedTrx({ ...editedTrx, kodeGdng: t })
                  }
                />

                <Text>Kode Apos</Text>
                <TextInput
                  style={styles.input}
                  value={editedTrx.kodeApos}
                  onChangeText={(t) =>
                    setEditedTrx({ ...editedTrx, kodeApos: t })
                  }
                />

                <Text>Surat Jalan</Text>
                <TextInput
                  style={styles.input}
                  value={editedTrx.suratJalan}
                  onChangeText={(t) =>
                    setEditedTrx({ ...editedTrx, suratJalan: t })
                  }
                />

                <Text>Waktu Input</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={styles.input}
                >
                  <Text>
                    {new Date(editedTrx.waktuInput).toLocaleDateString("id-ID")}
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

                <Text style={{ marginTop: 12, fontWeight: "bold" }}>
                  Barang:
                </Text>
                {(editedTrx.items || []).map((item, idx) => (
                  <View key={idx} style={styles.itemBox}>
                    <Text style={styles.bold}>{item.namaBarang}</Text>
                    <Text>Kode: {item.kode}</Text>
                    <TextInput
                      style={styles.input}
                      value={item.large}
                      onChangeText={(t) => handleChangeItem(idx, "large", t)}
                      placeholder="Large"
                    />
                    <TextInput
                      style={styles.input}
                      value={item.medium}
                      onChangeText={(t) => handleChangeItem(idx, "medium", t)}
                      placeholder="Medium"
                    />
                    <TextInput
                      style={styles.input}
                      value={item.small}
                      onChangeText={(t) => handleChangeItem(idx, "small", t)}
                      placeholder="Small"
                    />
                    <TextInput
                      style={styles.input}
                      value={item.catatan || ""}
                      onChangeText={(t) => handleChangeItem(idx, "catatan", t)}
                      placeholder="Catatan"
                    />
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={handleSave}
              style={[styles.closeBtn, { backgroundColor: "green" }]}
            >
              <Text style={styles.closeText}>Simpan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>Tutup</Text>
            </TouchableOpacity>
          </View>
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
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  itemBox: {
    backgroundColor: "#eee",
    marginVertical: 6,
    padding: 10,
    borderRadius: 6,
  },
  closeBtn: {
    backgroundColor: "#dc3545",
    marginTop: 16,
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  closeText: { color: "white", fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 8,
    marginVertical: 6,
  },
});
