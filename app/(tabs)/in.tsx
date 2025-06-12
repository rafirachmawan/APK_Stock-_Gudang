// ✅ InScreen.tsx Final Versi: Hapus No Faktur Supplier + Dokumen Firebase pakai ID dinamis

import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { TouchableWithoutFeedback } from "react-native";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import * as XLSX from "xlsx";
import { db } from "../../utils/firebase";

interface PrincipalItem {
  principle: string;
  namaBarang: string;
  kode: string;
}

interface ItemInput {
  namaBarang: string;
  kode: string;
  ed: string;
  large: string;
  medium: string;
  small: string;
  catatan: string;
}

interface PurchaseForm {
  jenisGudang: string;
  gudang: string;
  kodeGdng: string;
  kodeApos?: string;
  kodeRetur?: string;
  suratJalan?: string;
  principle: string;
  jenisForm: string;
  waktuInput: string;
  items: ItemInput[];
}

export default function InScreen() {
  const [itemList, setItemList] = useState<ItemInput[]>([]);
  const [principle, setPrinciple] = useState("");
  const [principleList, setPrincipleList] = useState<string[]>([]);
  const [dataExcel, setDataExcel] = useState<PrincipalItem[]>([]);

  const [jenisForm, setJenisForm] = useState<"Pembelian" | "Return">(
    "Pembelian"
  );
  const [subJenisPembelian, setSubJenisPembelian] = useState<
    "Pabrik" | "Mutasi"
  >("Pabrik");
  const [subJenisReturn, setSubJenisReturn] = useState("Return Good Stock");

  const [jenisGudang, setJenisGudang] = useState("");
  const [openJenisGudang, setOpenJenisGudang] = useState(false);
  const [openJenis, setOpenJenis] = useState(false);
  const [openSubJenis, setOpenSubJenis] = useState(false);
  const [openSubReturn, setOpenSubReturn] = useState(false);
  const [openPrinciple, setOpenPrinciple] = useState(false);
  const [openGudang, setOpenGudang] = useState(false);
  const [openNamaBarang, setOpenNamaBarang] = useState<boolean[]>([]);

  const [gudang, setGudang] = useState("");
  const [kodeGdng, setKodeGdng] = useState("0001");
  const [kodeApos, setKodeApos] = useState("");
  const [kodeRetur, setKodeRetur] = useState("");
  const [suratJalan, setSuratJalan] = useState("");

  const [manualTanggal, setManualTanggal] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [indexEDPicker, setIndexEDPicker] = useState<number | null>(null);

  const barangByPrinciple = dataExcel.filter((d) => d.principle === principle);

  const [openStates, setOpenStates] = useState({
    jenisGudang: false,
    jenisForm: false,
    subPembelian: false,
    subReturn: false,
    principle: false,
    gudang: false,
  });

  useEffect(() => {
    if (jenisGudang === "Gudang BS") {
      setGudang("Gudang E");
      setOpenGudang(false);
    }
  }, [jenisGudang]);

  useEffect(() => {
    loadExcelHybrid();
    loadLastKodeGudang();
  }, []);

  const loadLastKodeGudang = async () => {
    const lastKode = await AsyncStorage.getItem("lastKodeGdng");
    if (lastKode) {
      const next = (parseInt(lastKode, 10) + 1).toString().padStart(4, "0");
      setKodeGdng(next);
    }
  };

  const loadExcelHybrid = async () => {
    try {
      await loadExcelFromURL();
    } catch {
      await loadExcelFromAssets();
    }
  };

  const loadExcelFromURL = async () => {
    const EXCEL_URL =
      "https://docs.google.com/spreadsheets/d/1c9E19bcynRxJg_47GFu0GWE6LbldI5L8_YFSxxCsFwI/export?format=xlsx";
    const downloadResumable = FileSystem.createDownloadResumable(
      EXCEL_URL,
      FileSystem.cacheDirectory + "list-online.xlsx"
    );
    const result = await downloadResumable.downloadAsync();
    if (!result || !result.uri) throw new Error("Gagal unduh dari internet");
    const fileContent = await FileSystem.readAsStringAsync(result.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    parseExcel(fileContent);
  };

  const loadExcelFromAssets = async () => {
    const filePath = FileSystem.bundleDirectory + "list-principal.xlsx";
    const b64 = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    parseExcel(b64);
  };

  const parseExcel = (base64: string) => {
    const workbook = XLSX.read(base64, { type: "base64" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw: any[] = XLSX.utils.sheet_to_json(worksheet);
    const jsonData: PrincipalItem[] = raw.map((row) => ({
      principle: row.brand,
      kode: row.kode,
      namaBarang: row.nama,
    }));
    setDataExcel(jsonData);
    setPrincipleList([...new Set(jsonData.map((d) => d.principle))]);
  };

  const handleSelectBarang = (index: number, namaBarang: string) => {
    const found = dataExcel.find(
      (d) => d.principle === principle && d.namaBarang === namaBarang
    );
    if (found) {
      const updated = [...itemList];
      updated[index].namaBarang = found.namaBarang;
      updated[index].kode = found.kode;
      setItemList(updated);
    }
  };

  const handleChangeItem = (
    index: number,
    key: keyof ItemInput,
    value: string
  ) => {
    const updated = [...itemList];
    updated[index][key] = value;
    setItemList(updated);
  };

  const addItem = () => {
    setItemList((prev) => [
      ...prev,
      {
        namaBarang: "",
        kode: "",
        ed: "",
        large: "",
        medium: "",
        small: "",
        catatan: "",
      },
    ]);
    setOpenNamaBarang((prev) => [...prev, false]);
  };

  const removeItem = (i: number) => {
    const updated = [...itemList];
    updated.splice(i, 1);
    setItemList(updated);

    const updatedOpen = [...openNamaBarang];
    updatedOpen.splice(i, 1);
    setOpenNamaBarang(updatedOpen);
  };

  const convertToISODate = (ddmmyyyy: string) => {
    const [day, month, year] = ddmmyyyy.split("-");
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
  };

  const onChangeDate = (event: any, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) {
      const d = selected;
      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const year = d.getFullYear();
      const formatted = `${day}-${month}-${year}`;
      setManualTanggal(formatted);
      setSelectedDate(d);
    }
  };
  const handleSubmit = async () => {
    if (!principle || !gudang || !jenisGudang || itemList.length === 0) {
      Alert.alert("Isi semua field wajib");
      return;
    }

    if (
      (jenisForm === "Pembelian" && !kodeApos) ||
      (jenisForm === "Return" && !kodeRetur)
    ) {
      Alert.alert(
        "⚠️ No Faktur belum diisi",
        "Silakan isi No Faktur terlebih dahulu"
      );
      return;
    }

    if (!manualTanggal) {
      Alert.alert(
        "⚠️ Tanggal belum dipilih",
        "Silakan pilih tanggal input terlebih dahulu"
      );
      return;
    }

    const newEntry: PurchaseForm = {
      jenisGudang,
      gudang,
      kodeGdng,
      kodeApos: jenisForm !== "Return" ? kodeApos : "",
      kodeRetur: jenisForm === "Return" ? kodeRetur : "",
      principle,
      jenisForm:
        jenisForm === "Pembelian"
          ? `Pembelian - ${subJenisPembelian}`
          : `Return - ${subJenisReturn}`,
      waktuInput: convertToISODate(manualTanggal),
      items: itemList,
    };

    try {
      const payload: Record<string, any> = {
        ...newEntry,
        createdAt: serverTimestamp(),
      };
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) delete payload[key];
      });

      // 🔥 ID dokumen diambil dari kodeApos + tanggal input
      const docId = `${kodeApos}-${manualTanggal}`;

      console.log("📦 ID Dokumen:", docId); // debug
      await setDoc(doc(db, "barangMasuk", docId), payload);
      await AsyncStorage.setItem("lastKodeGdng", kodeGdng);

      const next = (parseInt(kodeGdng, 10) + 1).toString().padStart(4, "0");
      setKodeGdng(next);
      Alert.alert("✅ Data berhasil disimpan ke cloud");

      // Reset form
      setItemList([]);
      setOpenNamaBarang([]);
      setKodeApos("");
      setKodeRetur("");
      setPrinciple("");
      setManualTanggal("");
      setJenisGudang("");
    } catch (error) {
      console.error("❌ Gagal simpan ke Firestore:", error);
      Alert.alert("Gagal menyimpan data ke server.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          >
            <ScrollView
              style={styles.container}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Jenis Gudang</Text>
              <DropDownPicker
                open={openStates.jenisGudang}
                setOpen={(val) =>
                  setOpenStates((prev) => ({
                    ...prev,
                    jenisGudang: Boolean(val),
                  }))
                }
                value={jenisGudang}
                setValue={setJenisGudang}
                items={[
                  { label: "Gudang Utama", value: "Gudang Utama" },
                  { label: "Gudang BS", value: "Gudang BS" },
                ]}
                placeholder="Pilih Jenis Gudang"
                style={styles.dropdown}
                zIndex={110000}
                zIndexInverse={1000}
                mode="BADGE"
                listMode="SCROLLVIEW"
              />

              <Text style={styles.title}>Form Barang Masuk</Text>

              <Text style={styles.label}>Jenis Form</Text>
              <DropDownPicker
                open={openJenis}
                setOpen={setOpenJenis}
                value={jenisForm}
                setValue={setJenisForm}
                items={[
                  { label: "Pembelian", value: "Pembelian" },
                  { label: "Return", value: "Return" },
                ]}
                style={styles.dropdown}
                zIndex={11000}
                mode="BADGE"
                listMode="SCROLLVIEW"
              />

              {jenisForm === "Pembelian" && (
                <>
                  <Text style={styles.label}>Jenis Pembelian</Text>
                  <DropDownPicker
                    open={openSubJenis}
                    setOpen={setOpenSubJenis}
                    value={subJenisPembelian}
                    setValue={setSubJenisPembelian}
                    items={[
                      { label: "Pembelian Pabrik", value: "Pabrik" },
                      { label: "Mutasi Antar Depo", value: "Mutasi" },
                    ]}
                    style={styles.dropdown}
                    zIndex={1100}
                    zIndexInverse={1099}
                    mode="BADGE"
                    listMode="SCROLLVIEW"
                  />
                </>
              )}

              {jenisForm === "Return" && (
                <>
                  <Text style={styles.label}>Jenis Return</Text>
                  <DropDownPicker
                    open={openSubReturn}
                    setOpen={setOpenSubReturn}
                    value={subJenisReturn}
                    setValue={setSubJenisReturn}
                    items={[
                      {
                        label: "Return Good Stock",
                        value: "Return Good Stock",
                      },
                      { label: "Return Bad Stock", value: "Return Bad Stock" },
                      {
                        label: "Return Batal Kirim",
                        value: "Return Batal Kirim",
                      },
                      {
                        label: "Return Coret Faktur",
                        value: "Return Coret Faktur",
                      },
                      {
                        label: "Return Salah Input",
                        value: "Return Salah Input",
                      },
                    ]}
                    style={styles.dropdown}
                    zIndex={1095}
                    zIndexInverse={1094}
                    mode="BADGE"
                    listMode="SCROLLVIEW"
                  />
                </>
              )}

              <Text style={styles.label}>Principle</Text>
              <DropDownPicker
                open={openPrinciple}
                setOpen={setOpenPrinciple}
                value={principle}
                setValue={setPrinciple}
                items={principleList.map((p) => ({ label: p, value: p }))}
                placeholder="Pilih Principle"
                searchable
                style={styles.dropdown}
                zIndex={999}
                mode="BADGE"
                listMode="SCROLLVIEW"
              />

              <Text style={styles.label}>Gudang</Text>
              <DropDownPicker
                open={openGudang}
                setOpen={setOpenGudang}
                value={gudang}
                setValue={setGudang}
                items={[
                  { label: "Gudang A", value: "Gudang A" },
                  { label: "Gudang B", value: "Gudang B" },
                  { label: "Gudang C", value: "Gudang C" },
                  { label: "Gudang D", value: "Gudang D" },
                  { label: "Gudang E", value: "Gudang E" },
                ]}
                placeholder="Pilih Gudang"
                style={styles.dropdown}
                zIndex={998}
                mode="BADGE"
                listMode="SCROLLVIEW"
                disabled={jenisGudang === "Gudang BS"} // <--- ini dia!
              />

              <Text style={styles.label}>Tanggal Input</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.input}
              >
                <Text>{manualTanggal || "Pilih Tanggal"}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={onChangeDate}
                />
              )}

              {jenisForm === "Return" ? (
                <>
                  <Text style={styles.label}>No Faktur</Text>
                  <TextInput
                    style={styles.input}
                    value={kodeRetur}
                    onChangeText={setKodeRetur}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>No Faktur</Text>
                  <TextInput
                    style={styles.input}
                    value={kodeApos}
                    onChangeText={setKodeApos}
                  />
                </>
              )}

              {itemList.map((item, i) => (
                <View key={i} style={styles.itemBox}>
                  <Text style={styles.label}>Nama Barang</Text>
                  <DropDownPicker
                    open={openNamaBarang[i] || false}
                    setOpen={(val) => {
                      const copy = [...openNamaBarang];
                      copy[i] = val;
                      setOpenNamaBarang(copy);
                    }}
                    value={item.namaBarang}
                    setValue={(cb) => {
                      const v = cb(item.namaBarang);
                      handleSelectBarang(i, v);
                    }}
                    items={barangByPrinciple.map((b) => ({
                      label: b.namaBarang,
                      value: b.namaBarang,
                    }))}
                    placeholder="Pilih Nama Barang"
                    searchable
                    style={styles.dropdown}
                    zIndex={900 - i}
                    mode="BADGE"
                    listMode="SCROLLVIEW"
                  />

                  <Text style={styles.label}>ED</Text>
                  <TouchableOpacity
                    onPress={() => setIndexEDPicker(i)}
                    style={styles.input}
                  >
                    <Text>{item.ed || "Pilih Tanggal ED"}</Text>
                  </TouchableOpacity>
                  {indexEDPicker === i && (
                    <DateTimePicker
                      value={item.ed ? parseDate(item.ed) : new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        if (event.type === "set" && date) {
                          const d = date;
                          const day = d.getDate().toString().padStart(2, "0");
                          const month = (d.getMonth() + 1)
                            .toString()
                            .padStart(2, "0");
                          const year = d.getFullYear();
                          const formatted = `${day}-${month}-${year}`;
                          handleChangeItem(i, "ed", formatted);
                        }
                        setIndexEDPicker(null);
                      }}
                    />
                  )}

                  <Text style={styles.label}>Large</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={item.large}
                    onChangeText={(t) => handleChangeItem(i, "large", t)}
                  />

                  <Text style={styles.label}>Medium</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={item.medium}
                    onChangeText={(t) => handleChangeItem(i, "medium", t)}
                  />

                  <Text style={styles.label}>Small</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={item.small}
                    onChangeText={(t) => handleChangeItem(i, "small", t)}
                  />

                  <Text style={styles.label}>Catatan</Text>
                  <TextInput
                    style={styles.input}
                    value={item.catatan}
                    onChangeText={(t) => handleChangeItem(i, "catatan", t)}
                  />

                  <TouchableOpacity
                    onPress={() => removeItem(i)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeText}>Hapus Item</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity onPress={addItem} style={styles.addButton}>
                <Text style={styles.addText}>+ Tambah Item</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmit}
                style={styles.submitButton}
              >
                <Text style={styles.submitText}>Simpan</Text>
              </TouchableOpacity>
            </ScrollView>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  label: { fontWeight: "bold", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  dropdown: { marginBottom: 12 },
  itemBox: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: "#6c757d",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  addText: { color: "#fff" },
  submitButton: {
    backgroundColor: "#007bff",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "bold" },
  removeButton: {
    backgroundColor: "#dc3545",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },
  removeText: { color: "#fff", fontWeight: "bold" },
});
