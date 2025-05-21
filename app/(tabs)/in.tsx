// ...import tetap
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { Barang } from "../../utils/stockManager";

const EXCEL_URL =
  "https://docs.google.com/spreadsheets/d/1c9E19bcynRxJg_47GFu0GWE6LbldI5L8_YFSxxCsFwI/export?format=xlsx";

interface BarangForm {
  kode: string;
  nama: string;
  stokLarge: string;
  stokMedium: string;
  stokSmall: string;
  ed: string;
  catatan: string;
}

type DropDownItem = {
  label: string;
  value: string;
};

export default function InScreen() {
  const [form, setForm] = useState<BarangForm>({
    kode: "",
    nama: "",
    stokLarge: "",
    stokMedium: "",
    stokSmall: "",
    ed: "",
    catatan: "",
  });

  const [masterBarangList, setMasterBarangList] = useState<any[]>([]);
  const [brand, setBrand] = useState("");
  const [brandItems, setBrandItems] = useState<DropDownItem[]>([]);
  const [kodeItems, setKodeItems] = useState<DropDownItem[]>([]);
  const [namaItems, setNamaItems] = useState<DropDownItem[]>([]);

  const [brandOpen, setBrandOpen] = useState(false);
  const [kodeOpen, setKodeOpen] = useState(false);
  const [namaOpen, setNamaOpen] = useState(false);

  const importExcelFromUrl = async () => {
    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        EXCEL_URL,
        FileSystem.cacheDirectory + "temp-list.xlsx"
      );

      const result = await downloadResumable.downloadAsync();

      if (!result || !result.uri) {
        throw new Error("Gagal mengunduh file Excel.");
      }

      const fileContent = await FileSystem.readAsStringAsync(result.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const workbook = XLSX.read(fileContent, { type: "base64" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      setMasterBarangList(jsonData);

      const uniqueBrands = Array.from(
        new Set(jsonData.map((item: any) => item.brand))
      ).map((brand) => ({
        label: brand,
        value: brand,
      }));

      setBrandItems(uniqueBrands);
      Alert.alert("Sukses", `Ditemukan ${jsonData.length} item.`);
    } catch (error) {
      console.error("Gagal fetch dari URL:", error);
      Alert.alert("Error", "Gagal memuat data dari spreadsheet.");
    }
  };

  useEffect(() => {
    importExcelFromUrl();
  }, []);

  useEffect(() => {
    if (brand) {
      const filteredKode = masterBarangList
        .filter((item) => item.brand === brand)
        .map((item) => ({
          label: item.kode,
          value: item.kode,
        }));
      setKodeItems(filteredKode);
    } else {
      setKodeItems([]);
    }
    setForm((prev) => ({ ...prev, kode: "", nama: "" }));
  }, [brand]);

  useEffect(() => {
    if (form.kode) {
      const filteredNama = masterBarangList
        .filter((item) => item.kode === form.kode)
        .map((item) => ({
          label: item.nama,
          value: item.nama,
        }));
      setNamaItems(filteredNama);
    } else {
      setNamaItems([]);
    }
    setForm((prev) => ({ ...prev, nama: "" }));
  }, [form.kode]);

  const handleChange = (name: keyof BarangForm, value: string) => {
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async () => {
    const barangBaru: Barang = {
      kode: form.kode.trim(),
      nama: form.nama.trim(),
      stokLarge: parseInt(form.stokLarge) || 0,
      stokMedium: parseInt(form.stokMedium) || 0,
      stokSmall: parseInt(form.stokSmall) || 0,
      ed: form.ed.trim(),
      catatan: form.catatan.trim(),
      waktuInput: new Date().toISOString(),
    };

    try {
      const existing = await AsyncStorage.getItem("barangMasuk");
      const parsed: Barang[] = existing ? JSON.parse(existing) : [];
      parsed.push(barangBaru);
      await AsyncStorage.setItem("barangMasuk", JSON.stringify(parsed));
      Alert.alert("Sukses", "Barang berhasil disimpan!");
      setForm({
        kode: "",
        nama: "",
        stokLarge: "",
        stokMedium: "",
        stokSmall: "",
        ed: "",
        catatan: "",
      });
      setBrand("");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal menyimpan data!");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <Text style={styles.title}>Form Barang Masuk</Text>

          {/* Dropdown Brand */}
          <View style={{ zIndex: 3000 }}>
            <Text style={styles.label}>Master Brand</Text>
            <DropDownPicker
              open={brandOpen}
              setOpen={setBrandOpen}
              value={brand}
              setValue={setBrand}
              items={brandItems}
              placeholder="Pilih Brand"
              searchable
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={{ color: "#fff" }}
              labelStyle={{ color: "#fff" }}
              placeholderStyle={{ color: "#aaa" }}
            />
          </View>

          {/* Dropdown Kode */}
          <View style={{ zIndex: 2000 }}>
            <Text style={styles.label}>Kode Barang</Text>
            <DropDownPicker
              open={kodeOpen}
              setOpen={setKodeOpen}
              value={form.kode}
              setValue={(callback) => {
                const value = callback(form.kode);
                setForm((prev) => ({ ...prev, kode: value, nama: "" }));
              }}
              items={kodeItems}
              placeholder="Pilih Kode"
              searchable
              disabled={!brand}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={{ color: "#fff" }}
              labelStyle={{ color: "#fff" }}
              placeholderStyle={{ color: "#aaa" }}
            />
          </View>

          {/* Dropdown Nama */}
          <View style={{ zIndex: 1000 }}>
            <Text style={styles.label}>Nama Barang</Text>
            <DropDownPicker
              open={namaOpen}
              setOpen={setNamaOpen}
              value={form.nama}
              setValue={(callback) => {
                const value = callback(form.nama);
                setForm((prev) => ({ ...prev, nama: value }));
              }}
              items={namaItems}
              placeholder="Pilih Nama Barang"
              searchable
              disabled={!form.kode}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={{ color: "#fff" }}
              labelStyle={{ color: "#fff" }}
              placeholderStyle={{ color: "#aaa" }}
            />
          </View>

          {["stokLarge", "stokMedium", "stokSmall", "ed", "catatan"].map(
            (key, index) => (
              <View key={key} style={styles.inputWrapper}>
                <Text style={styles.label}>
                  {
                    [
                      "Stok Besar (Large)",
                      "Stok Sedang (Medium)",
                      "Stok Kecil (Small)",
                      "Expired Date (ED)",
                      "Catatan",
                    ][index]
                  }
                </Text>
                <TextInput
                  style={styles.input}
                  value={form[key as keyof BarangForm]}
                  onChangeText={(text) =>
                    handleChange(key as keyof BarangForm, text)
                  }
                  keyboardType={key.includes("stok") ? "numeric" : "default"}
                  placeholderTextColor="#999"
                />
              </View>
            )
          )}

          <TouchableOpacity
            style={styles.buttonContainer}
            onPress={handleSubmit}
          >
            <Text style={styles.buttonText}>Simpan Barang</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#121212",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    alignSelf: "center",
    color: "#fff",
  },
  label: {
    color: "#fff",
    marginBottom: 4,
    marginTop: 12,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 6,
    padding: 12,
    backgroundColor: "#222",
    color: "#fff",
  },
  dropdown: {
    borderColor: "#444",
    backgroundColor: "#222",
    marginBottom: 12,
  },
  dropdownContainer: {
    borderColor: "#444",
    backgroundColor: "#222",
  },
  buttonContainer: {
    marginTop: 20,
    backgroundColor: "#6200ee",
    borderRadius: 6,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    padding: 12,
    fontWeight: "bold",
  },
});
