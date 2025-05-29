// InScreen.tsx - Dengan input ED per item (manual input tanggal) + Surat Jalan

import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system";
import React, { useEffect, useState } from "react";
import {
  Alert,
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

interface ItemInput {
  namaBarang: string;
  kode: string;
  ed: string;
  large: string;
  medium: string;
  small: string;
}

interface PurchaseForm {
  gudang: string;
  kodeGdng: string;
  kodeApos: string;
  suratJalan: string;
  principle: string;
  catatan: string;
  items: ItemInput[];
  waktuInput: string;
}

export default function InScreen() {
  const [gudang, setGudang] = useState("Gudang A");
  const [kodeGdng, setKodeGdng] = useState("");
  const [kodeApos, setKodeApos] = useState("");
  const [suratJalan, setSuratJalan] = useState("");
  const [principle, setPrinciple] = useState("");
  const [catatan, setCatatan] = useState("");
  const [items, setItems] = useState<ItemInput[]>([
    { namaBarang: "", kode: "", ed: "", large: "", medium: "", small: "" },
  ]);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(
    null
  );
  const [gudangOpen, setGudangOpen] = useState(false);
  const [principleOpen, setPrincipleOpen] = useState(false);
  const [datePickerIndex, setDatePickerIndex] = useState<number | null>(null);
  const [principleList, setPrincipleList] = useState<
    { label: string; value: string }[]
  >([]);
  const [masterBarangList, setMasterBarangList] = useState<any[]>([]);
  const [filteredNamaItems, setFilteredNamaItems] = useState<
    { label: string; value: string }[][]
  >([[]]);

  const gudangOptions = [
    { label: "Gudang A", value: "Gudang A" },
    { label: "Gudang B", value: "Gudang B" },
    { label: "Gudang C", value: "Gudang C" },
    { label: "Gudang D", value: "Gudang D" },
    { label: "Gudang E", value: "Gudang E" },
  ];

  useEffect(() => {
    importExcel();
    previewKodeGdng();
  }, []);

  const previewKodeGdng = async () => {
    const kodeKey = "kodeGdngCounter";
    let counter = parseInt((await AsyncStorage.getItem(kodeKey)) || "0") + 1;
    setKodeGdng(counter.toString().padStart(5, "0"));
  };

  const importExcel = async () => {
    try {
      const EXCEL_URL =
        "https://docs.google.com/spreadsheets/d/1c9E19bcynRxJg_47GFu0GWE6LbldI5L8_YFSxxCsFwI/export?format=xlsx";

      const downloadResumable = FileSystem.createDownloadResumable(
        EXCEL_URL,
        FileSystem.cacheDirectory + "temp-list.xlsx"
      );

      const result = await downloadResumable.downloadAsync();
      if (!result || !result.uri) throw new Error("Gagal unduh Excel");

      const fileContent = await FileSystem.readAsStringAsync(result.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const workbook = XLSX.read(fileContent, { type: "base64" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      setMasterBarangList(jsonData);

      const principles = Array.from(
        new Set(jsonData.map((item: any) => item.brand))
      ).map((p) => ({ label: p, value: p }));
      setPrincipleList(principles);
    } catch (err) {
      Alert.alert("Error", "Gagal membaca data Excel");
    }
  };

  useEffect(() => {
    const updated = items.map(() => {
      const filtered = masterBarangList
        .filter(
          (item: any) => item.brand?.toLowerCase() === principle.toLowerCase()
        )
        .map((item: any) => ({ label: item.nama, value: item.nama }));
      return filtered;
    });
    setFilteredNamaItems(updated);
  }, [principle, masterBarangList, items.length]);

  const updateItem = (index: number, field: keyof ItemInput, value: string) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === "namaBarang") {
      const match = masterBarangList.find(
        (item: any) =>
          item.nama === value &&
          item.brand?.toLowerCase() === principle.toLowerCase()
      );
      updated[index].kode = match ? match.kode : "";
    }

    setItems(updated);
  };

  const tambahItem = () => {
    setItems([
      ...items,
      { namaBarang: "", kode: "", ed: "", large: "", medium: "", small: "" },
    ]);
  };

  const hapusItem = (index: number) => {
    if (items.length === 1) return;
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const handleSubmit = async () => {
    try {
      const kodeKey = "kodeGdngCounter";
      let counter = parseInt((await AsyncStorage.getItem(kodeKey)) || "0") + 1;
      const finalKode = counter.toString().padStart(5, "0");

      const form: PurchaseForm = {
        gudang,
        kodeGdng: finalKode,
        kodeApos,
        suratJalan,
        principle,
        catatan,
        waktuInput: new Date().toISOString(),
        items,
      };

      const existing = await AsyncStorage.getItem("barangMasuk");
      const parsed = existing ? JSON.parse(existing) : [];
      parsed.push(form);
      await AsyncStorage.setItem("barangMasuk", JSON.stringify(parsed));
      await AsyncStorage.setItem(kodeKey, counter.toString());

      Alert.alert("Sukses", `Data disimpan sebagai kode ${finalKode}`);
      setKodeGdng((counter + 1).toString().padStart(5, "0"));
      setKodeApos("");
      setSuratJalan("");
      setPrinciple("");
      setCatatan("");
      setItems([
        { namaBarang: "", kode: "", ed: "", large: "", medium: "", small: "" },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal menyimpan data");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#fff" }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🛒 Form Pembelian</Text>

        <Text style={styles.label}>Gudang</Text>
        <DropDownPicker
          open={gudangOpen}
          setOpen={setGudangOpen}
          value={gudang}
          setValue={setGudang}
          items={gudangOptions}
          placeholder="Pilih Gudang"
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownContainer}
          listMode="MODAL"
        />

        <Text style={styles.label}>Kode Transaksi Gudang</Text>
        <TextInput
          value={kodeGdng}
          editable={false}
          style={styles.inputDisabled}
        />

        <TouchableOpacity
          onPress={async () => {
            await AsyncStorage.setItem("kodeGdngCounter", "0");
            previewKodeGdng();
            Alert.alert("Reset", "Kode Gudang berhasil di-reset ke 00001");
          }}
        >
          <Text style={{ color: "#3b82f6", marginBottom: 12 }}>
            🔁 Reset Kode Gudang
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Kode Transaksi Apos</Text>
        <TextInput
          value={kodeApos}
          onChangeText={setKodeApos}
          style={styles.input}
        />

        <Text style={styles.label}>Surat Jalan</Text>
        <TextInput
          value={suratJalan}
          onChangeText={setSuratJalan}
          style={styles.input}
        />

        <Text style={styles.label}>Principle</Text>
        <DropDownPicker
          open={principleOpen}
          setOpen={setPrincipleOpen}
          value={principle}
          setValue={setPrinciple}
          items={principleList}
          placeholder="Pilih Principle"
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownContainer}
          listMode="MODAL"
          searchable={true}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>🧾 Item</Text>
        {items.map((item, index) => (
          <View
            key={index}
            style={{ marginBottom: 16, zIndex: items.length - index }}
          >
            <TouchableOpacity onPress={() => hapusItem(index)}>
              <Text
                style={{ color: "red", textAlign: "right", marginBottom: 4 }}
              >
                ❌ Hapus
              </Text>
            </TouchableOpacity>
            <DropDownPicker
              items={filteredNamaItems[index] || []}
              open={openDropdownIndex === index}
              setOpen={() =>
                setOpenDropdownIndex(openDropdownIndex === index ? null : index)
              }
              value={item.namaBarang}
              setValue={(cb) => {
                const v = cb(item.namaBarang);
                updateItem(index, "namaBarang", v);
              }}
              placeholder="Pilih Nama Barang"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              listMode="MODAL"
              searchable={true}
              disabled={!principle}
            />
            <TextInput
              value={item.kode}
              editable={false}
              placeholder="Kode Barang"
              style={styles.inputDisabled}
            />
            <Text style={styles.label}>ED (Tanggal Kedaluwarsa)</Text>
            <TouchableOpacity
              onPress={() => setDatePickerIndex(index)}
              style={styles.input}
            >
              <Text>{item.ed ? item.ed : "Pilih Tanggal ED"}</Text>
            </TouchableOpacity>
            {datePickerIndex === index && (
              <DateTimePicker
                mode="date"
                display="default"
                value={item.ed ? new Date(item.ed) : new Date()}
                onChange={(event, selectedDate) => {
                  setDatePickerIndex(null);
                  if (selectedDate) {
                    const updated = [...items];
                    updated[index].ed = selectedDate
                      .toISOString()
                      .split("T")[0];
                    setItems(updated);
                  }
                }}
              />
            )}
            <Text style={styles.label}>Large</Text>
            <TextInput
              value={item.large}
              onChangeText={(t) => updateItem(index, "large", t)}
              style={styles.input}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Medium</Text>
            <TextInput
              value={item.medium}
              onChangeText={(t) => updateItem(index, "medium", t)}
              style={styles.input}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Small</Text>
            <TextInput
              value={item.small}
              onChangeText={(t) => updateItem(index, "small", t)}
              style={styles.input}
              keyboardType="numeric"
            />
          </View>
        ))}

        <TouchableOpacity onPress={tambahItem}>
          <Text style={{ color: "#3b82f6", marginBottom: 16 }}>
            ➕ Tambah Item
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Catatan</Text>
        <TextInput
          value={catatan}
          onChangeText={setCatatan}
          style={styles.input}
        />

        <TouchableOpacity style={styles.buttonContainer} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Simpan Pembelian</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#1f2937",
  },
  label: {
    marginTop: 12,
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#f9fafb",
    marginBottom: 8,
  },
  inputDisabled: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#eee",
    marginBottom: 8,
    color: "#6b7280",
  },
  dropdown: {
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    marginBottom: 8,
  },
  dropdownContainer: {
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  buttonContainer: {
    marginTop: 24,
    backgroundColor: "#3b82f6",
    borderRadius: 6,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    padding: 12,
    fontWeight: "bold",
  },
});
