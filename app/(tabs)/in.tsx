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

      if (!result || !result.uri)
        throw new Error("Gagal mengunduh file Excel.");

      const fileContent = await FileSystem.readAsStringAsync(result.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const workbook = XLSX.read(fileContent, { type: "base64" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      setMasterBarangList(jsonData);

      const uniqueBrands = [
        ...new Set(jsonData.map((item: any) => item.brand)),
      ];
      setBrandItems(
        uniqueBrands.map((brand) => ({ label: brand, value: brand }))
      );

      const uniqueKodes = [...new Set(jsonData.map((item: any) => item.kode))];
      setKodeItems(uniqueKodes.map((kode) => ({ label: kode, value: kode })));

      const uniqueNamas = [...new Set(jsonData.map((item: any) => item.nama))];
      setNamaItems(uniqueNamas.map((nama) => ({ label: nama, value: nama })));

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
    if (form.kode) {
      const item = masterBarangList.find((item) => item.kode === form.kode);
      if (item) {
        setBrand(item.brand);
        setForm((prev) => ({ ...prev, nama: item.nama }));
      }
    } else {
      setBrand("");
      setForm((prev) => ({ ...prev, nama: "" }));
    }
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
      principle: brand || "-",
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

          <View style={{ zIndex: 3000 }}>
            <Text style={styles.label}>Kode</Text>
            <DropDownPicker
              open={kodeOpen}
              setOpen={setKodeOpen}
              value={form.kode}
              setValue={(cb) => {
                const v = cb(form.kode);
                setForm((prev) => ({ ...prev, kode: v }));
              }}
              items={kodeItems}
              searchable
              placeholder="Pilih Kode"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={styles.dropdownText}
              labelStyle={styles.dropdownText}
              placeholderStyle={styles.dropdownPlaceholder}
              listMode="SCROLLVIEW"
            />
          </View>

          <View style={{ zIndex: 2000 }}>
            <Text style={styles.label}>Brand</Text>
            <DropDownPicker
              open={brandOpen}
              setOpen={setBrandOpen}
              value={brand}
              setValue={setBrand}
              items={brandItems}
              placeholder="Brand (otomatis)"
              disabled
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={styles.dropdownText}
              labelStyle={styles.dropdownText}
              placeholderStyle={styles.dropdownPlaceholder}
              listMode="SCROLLVIEW"
            />
          </View>

          <View style={{ zIndex: 1000 }}>
            <Text style={styles.label}>Nama</Text>
            <DropDownPicker
              open={namaOpen}
              setOpen={setNamaOpen}
              value={form.nama}
              setValue={(cb) => {
                const v = cb(form.nama);
                setForm((prev) => ({ ...prev, nama: v }));
              }}
              items={namaItems}
              placeholder="Nama (otomatis)"
              disabled
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={styles.dropdownText}
              labelStyle={styles.dropdownText}
              placeholderStyle={styles.dropdownPlaceholder}
              listMode="SCROLLVIEW"
            />
          </View>

          {["stokLarge", "stokMedium", "stokSmall", "ed", "catatan"].map(
            (key, i) => (
              <View key={key} style={styles.inputWrapper}>
                <Text style={styles.label}>
                  {
                    [
                      "Stok Large",
                      "Stok Medium",
                      "Stok Small",
                      "ED",
                      "Catatan",
                    ][i]
                  }
                </Text>
                <TextInput
                  style={styles.input}
                  value={form[key as keyof BarangForm]}
                  onChangeText={(t) => handleChange(key as keyof BarangForm, t)}
                  keyboardType={key.includes("stok") ? "numeric" : "default"}
                  placeholderTextColor="#999"
                  placeholder={key}
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
    zIndex: 0,
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
  dropdownText: {
    color: "#fff",
  },
  dropdownPlaceholder: {
    color: "#aaa",
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
