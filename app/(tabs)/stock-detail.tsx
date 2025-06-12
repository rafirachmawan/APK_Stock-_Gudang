// Final Version of StockDetailScreen.tsx with Sorting, Search, Delete, and Full Edit UI

import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
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
  waktuInput: string;
  items: ItemInput[];
}

export default function StockDetailScreen() {
  const [allData, setAllData] = useState<PurchaseForm[]>([]);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editedTrx, setEditedTrx] = useState<PurchaseForm | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const unsub = onSnapshot(collection(db, "barangMasuk"), (snapshot) => {
        const all: PurchaseForm[] = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as PurchaseForm)
        );
        setAllData(all);
      });
      return () => unsub();
    }, [])
  );

  const filteredData = allData.filter((trx) => {
    const tgl = new Date(trx.waktuInput).toLocaleDateString("id-ID");
    const noFaktur = trx.kodeApos || trx.kodeRetur || "";
    return (
      tgl.includes(searchText) ||
      noFaktur.toLowerCase().includes(searchText.toLowerCase())
    );
  });

  const grouped = filteredData.reduce((acc, trx) => {
    const date = new Date(trx.waktuInput).toLocaleDateString("id-ID");
    const jenis = trx.jenisForm || "Pembelian";
    if (!acc[date]) acc[date] = {};
    if (!acc[date][jenis]) acc[date][jenis] = [];
    acc[date][jenis].push(trx);
    return acc;
  }, {} as Record<string, Record<string, PurchaseForm[]>>);

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
        jenisGudang: editedTrx.jenisGudang,
        jenisForm: editedTrx.jenisForm,
        principle: editedTrx.principle,
        kodeGdng: editedTrx.kodeGdng,
        kodeApos: editedTrx.kodeApos,
        kodeRetur: editedTrx.kodeRetur,
        waktuInput: editedTrx.waktuInput,
        items: editedTrx.items,
      });
      Alert.alert("Berhasil", "Data berhasil diperbarui");
      setModalVisible(false);
    } catch (err) {
      Alert.alert("Gagal menyimpan perubahan");
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
    <ScrollView style={{ flex: 1, padding: 16, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>
        Riwayat Barang Masuk
      </Text>

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
                    <Text>Waktu: {trx.waktuInput}</Text>
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
                    Edit Transaksi
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
                    onChangeText={(t) =>
                      setEditedTrx({ ...editedTrx, kodeGdng: t })
                    }
                  />

                  <Text>No Faktur</Text>
                  <TextInput
                    style={styles.input}
                    value={editedTrx.kodeApos || editedTrx.kodeRetur || ""}
                    onChangeText={(t) => {
                      if (editedTrx.jenisForm?.startsWith("Return")) {
                        setEditedTrx({ ...editedTrx, kodeRetur: t });
                      } else {
                        setEditedTrx({ ...editedTrx, kodeApos: t });
                      }
                    }}
                  />

                  <Text>Tanggal</Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={styles.input}
                  >
                    <Text>
                      {new Date(editedTrx.waktuInput).toLocaleDateString(
                        "id-ID"
                      )}
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

                  {editedTrx.items.map((item, i) => (
                    <View
                      key={i}
                      style={{
                        backgroundColor: "#eee",
                        padding: 10,
                        borderRadius: 6,
                        marginBottom: 10,
                      }}
                    >
                      <Text style={{ fontWeight: "bold" }}>
                        {item.namaBarang}
                      </Text>
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
  },
});
