// ✅ InScreen.tsx — kirim ke Spreadsheet + sertakan operatorName/operatorUsername

import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
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
  TouchableWithoutFeedback,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import * as XLSX from "xlsx";
import { db } from "../../utils/firebase";
import { expandAllowed, getUserProfile } from "../../utils/userProfile";

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
  jenisGudang: string; // Gudang Utama | Gudang BS
  gudang: string; // Gudang A/B/C/D/E(BS)
  kodeGdng: string;
  kodeApos?: string;
  kodeRetur?: string;
  suratJalan?: string;
  principle: string;
  jenisForm: string; // Pembelian - ..., Return - ..., Stock Awal
  waktuInput: string; // ISO date
  items: ItemInput[];

  // ➕ kolom operator (untuk Firestore & Spreadsheet)
  operatorName?: string;
  operatorUsername?: string;
  operatorGuestName?: string;
}

// 🔗 Apps Script Spreadsheet (Barang Masuk)
const APPSCRIPT_IN_URL =
  "https://script.google.com/macros/s/AKfycbxuAFtkFbBSGOfPC_fwYbRYhH2EitaRPzQ3EuDzqKTs0ZKN5sSQHa9j7ERRUYQWXzSw/exec";

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
  const [subJenisReturn] = useState("Return Good Stock");

  const [jenisGudang, setJenisGudang] = useState<
    "Gudang Utama" | "Gudang BS" | ""
  >("");
  const [openJenisGudang, setOpenJenisGudang] = useState(false);
  const [openJenisForm, setOpenJenisForm] = useState(false);
  const [openSubJenis, setOpenSubJenis] = useState(false);
  const [openPrinciple, setOpenPrinciple] = useState(false);
  const [openGudang, setOpenGudang] = useState(false);
  const [openNamaBarang, setOpenNamaBarang] = useState<boolean[]>([]);

  const [gudang, setGudang] = useState("");
  const [kodeGdng, setKodeGdng] = useState("0001");
  const [kodeApos, setKodeApos] = useState("");
  const [kodeRetur, setKodeRetur] = useState("");

  const [manualTanggal, setManualTanggal] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [indexEDPicker, setIndexEDPicker] = useState<number | null>(null);

  // ⛔️ gudang yang boleh untuk user ini
  const [allowedGdg, setAllowedGdg] = useState<string[]>([]);
  // 👤 profil login (untuk nama operator)
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const prof = await getUserProfile(); // { username, displayName, guestName?, allowed, ... }
      setProfile(prof);
      const expanded = prof ? expandAllowed(prof.allowed) : [];
      setAllowedGdg(expanded);
      if (expanded.length === 1) setGudang(expanded[0]);
    })();
  }, []);

  // otomatis set gudang E (BS) hanya jika diizinkan
  useEffect(() => {
    if (jenisGudang === "Gudang BS") {
      if (allowedGdg.includes("Gudang E (Bad Stock)")) {
        setGudang("Gudang E (Bad Stock)");
        setOpenGudang(false);
      } else {
        Alert.alert(
          "Akses ditolak",
          "Anda tidak boleh input ke Gudang E (Bad Stock)."
        );
        setJenisGudang("");
      }
    } else if (jenisGudang === "Gudang Utama") {
      if (gudang === "Gudang E (Bad Stock)") setGudang("");
      setOpenGudang(false);
    }
  }, [jenisGudang, allowedGdg]);

  useEffect(() => {
    loadExcelHybrid();
    loadLastKodeGudang();
  }, []);

  const loadLastKodeGudang = async () => {
    const lastKode = await AsyncStorage.getItem("lastKodeGdng");
    if (lastKode)
      setKodeGdng((parseInt(lastKode, 10) + 1).toString().padStart(4, "0"));
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
      "https://docs.google.com/spreadsheets/d/1O2D9nLXWBbjpqZKBeypt_lJXqIzczmFUQp37vcTAvsA/export?format=xlsx";
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

  const barangByPrinciple = useMemo(
    () => dataExcel.filter((d) => d.principle === principle),
    [dataExcel, principle]
  );

  const handleSelectBarang = (index: number, namaBarang: string) => {
    const found = dataExcel.find(
      (d) => d.principle === principle && d.namaBarang === namaBarang
    );
    if (!found) return;
    const updated = [...itemList];
    updated[index].namaBarang = found.namaBarang;
    updated[index].kode = found.kode;
    setItemList(updated);
  };

  const handleChangeItem = (i: number, key: keyof ItemInput, value: string) => {
    const updated = [...itemList];
    updated[i][key] = value;
    setItemList(updated);
  };

  const addItem = () => {
    setItemList((p) => [
      ...p,
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
    setOpenNamaBarang((p) => [...p, false]);
  };
  const removeItem = (i: number) => {
    const a = [...itemList];
    a.splice(i, 1);
    setItemList(a);
    const b = [...openNamaBarang];
    b.splice(i, 1);
    setOpenNamaBarang(b);
  };

  const convertToISODate = (ddmmyyyy: string) => {
    const [day, month, year] = ddmmyyyy.split("-");
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
  };
  const parseDate = (ddmmyyyy: string): Date => {
    const [day, month, year] = ddmmyyyy.split("-");
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };
  const onChangeDate = (_event: any, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) {
      const d = selected;
      const formatted = `${String(d.getDate()).padStart(2, "0")}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}-${d.getFullYear()}`;
      setManualTanggal(formatted);
      setSelectedDate(d);
    }
  };

  const gudangItems = useMemo(() => {
    const result: string[] = [];
    for (const g of ["Gudang A", "Gudang B", "Gudang C", "Gudang D"]) {
      if (allowedGdg.includes(g)) result.push(g);
    }
    if (allowedGdg.includes("Gudang E (Bad Stock)"))
      result.push("Gudang E (Bad Stock)");
    return result.map((g) => ({ label: g, value: g }));
  }, [allowedGdg]);

  const handleSubmit = async () => {
    if (!principle || !gudang || !jenisGudang || itemList.length === 0) {
      Alert.alert("Isi semua field wajib");
      return;
    }
    if (!allowedGdg.includes(gudang)) {
      Alert.alert("Akses ditolak", "Anda tidak berhak input ke gudang ini.");
      return;
    }
    if (jenisForm === "Pembelian" && !kodeApos) {
      Alert.alert(
        "⚠️ No Faktur belum diisi",
        "Silakan isi No Faktur terlebih dahulu"
      );
      return;
    }
    if (jenisForm === "Return" && !kodeRetur) {
      Alert.alert(
        "⚠️ No Faktur Return belum diisi",
        "Silakan isi No Faktur Return terlebih dahulu"
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

    // 👤 siapkan nama operator
    const operatorUsername = profile?.username || "-";
    const operatorName =
      (profile?.guestName && String(profile.guestName).trim()) ||
      (profile?.displayName && String(profile.displayName).trim()) ||
      operatorUsername;
    const operatorGuestName =
      (profile?.guestName && String(profile.guestName).trim()) || "";

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
          : jenisForm === "Return"
          ? `Return - ${subJenisReturn}`
          : "Stock Awal",
      waktuInput: convertToISODate(manualTanggal),
      items: itemList,

      // ➕ sertakan operator
      operatorName,
      operatorUsername,
      operatorGuestName,
    };

    try {
      const payload: Record<string, any> = {
        ...newEntry,
        createdAt: serverTimestamp(),
      };
      Object.keys(payload).forEach(
        (k) => payload[k] === undefined && delete payload[k]
      );

      const docId =
        jenisForm === "Stock Awal"
          ? `STOKAWAL-${manualTanggal}-${Date.now()}`
          : `${kodeApos || kodeRetur}-${manualTanggal}`;

      // 🔥 Firestore
      await setDoc(doc(db, "barangMasuk", docId), payload);

      // 📤 Spreadsheet
      await fetch(APPSCRIPT_IN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry),
      });

      // 💾 update nomor gudang lokal
      await AsyncStorage.setItem("lastKodeGdng", kodeGdng);
      setKodeGdng((n) => (parseInt(n, 10) + 1).toString().padStart(4, "0"));

      Alert.alert("✅ Data berhasil disimpan");

      // reset
      setItemList([]);
      setOpenNamaBarang([]);
      setKodeApos("");
      setKodeRetur("");
      setPrinciple("");
      setManualTanggal("");
      setJenisGudang("");
    } catch (error) {
      console.error("❌ Gagal simpan:", error);
      Alert.alert("Gagal menyimpan data ke server atau spreadsheet.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: "#fff" }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 300 }}
          style={{ backgroundColor: "#fff" }}
        >
          <Text style={styles.label}>Jenis Gudang</Text>
          <DropDownPicker
            open={openJenisGudang}
            setOpen={setOpenJenisGudang}
            value={jenisGudang}
            setValue={setJenisGudang}
            items={[
              { label: "Gudang Utama ( Good Stock )", value: "Gudang Utama" },
              { label: "Gudang BS ( Bad Stock )", value: "Gudang BS" },
            ]}
            placeholder="Pilih Jenis Gudang"
            style={styles.dropdown}
            zIndex={4000}
            zIndexInverse={1000}
            listMode="SCROLLVIEW"
            dropDownContainerStyle={{ maxHeight: 250 }}
          />

          <Text style={styles.title}>Form Barang Masuk</Text>

          <DropDownPicker
            open={openJenisForm}
            setOpen={setOpenJenisForm}
            value={jenisForm}
            setValue={setJenisForm}
            items={[
              { label: "Pembelian", value: "Pembelian" },
              { label: "Return", value: "Return" },
              { label: "Stock Awal", value: "Stock Awal" },
            ]}
            style={styles.dropdown}
            zIndex={3900}
            zIndexInverse={900}
            listMode="SCROLLVIEW"
            dropDownContainerStyle={{ maxHeight: 250 }}
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
                zIndex={3800}
                zIndexInverse={800}
                listMode="SCROLLVIEW"
                dropDownContainerStyle={{ maxHeight: 250 }}
              />
            </>
          )}

          {jenisForm === "Pembelian" && (
            <>
              <Text style={styles.label}>No Faktur</Text>
              <TextInput
                style={styles.input}
                value={kodeApos}
                onChangeText={setKodeApos}
              />
            </>
          )}
          {jenisForm === "Return" && (
            <>
              <Text style={styles.label}>No Faktur</Text>
              <TextInput
                style={styles.input}
                value={kodeRetur}
                onChangeText={setKodeRetur}
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
            style={styles.dropdown}
            zIndex={3700}
            zIndexInverse={700}
            listMode="SCROLLVIEW"
            dropDownContainerStyle={{ maxHeight: 250 }}
            searchable
          />

          <Text style={styles.label}>Gudang</Text>
          <DropDownPicker
            open={openGudang}
            setOpen={setOpenGudang}
            value={gudang}
            setValue={setGudang}
            items={gudangItems}
            placeholder="Pilih Gudang"
            style={styles.dropdown}
            zIndex={3600}
            zIndexInverse={600}
            listMode="SCROLLVIEW"
            dropDownContainerStyle={{ maxHeight: 250 }}
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
                zIndex={1000 - i}
                zIndexInverse={900 - i}
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
                      const formatted = `${String(d.getDate()).padStart(
                        2,
                        "0"
                      )}-${String(d.getMonth() + 1).padStart(
                        2,
                        "0"
                      )}-${d.getFullYear()}`;
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

          <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
            <Text style={styles.submitText}>Simpan</Text>
          </TouchableOpacity>
        </ScrollView>
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
