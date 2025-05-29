import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
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
import { Barang, getCurrentStock } from "../../utils/stockManager";

interface ItemOut {
  namaBarang: string;
  kode: string;
  large: string;
  medium: string;
  small: string;
  principle: string;
}

export default function OutScreen() {
  const [kodeGdng, setKodeGdng] = useState("");
  const [kodeApos, setKodeApos] = useState("");
  const [catatan, setCatatan] = useState("");
  const [nomorKendaraan, setNomorKendaraan] = useState("");
  const [namaSopir, setNamaSopir] = useState("");

  const [kategori, setKategori] = useState("Gudang A");
  const [kategoriOpen, setKategoriOpen] = useState(false);
  const kategoriList = [
    { label: "Gudang A", value: "Gudang A" },
    { label: "Gudang B", value: "Gudang B" },
    { label: "Gudang C", value: "Gudang C" },
    { label: "Gudang D", value: "Gudang D" },
    { label: "Gudang E", value: "Gudang E" },
  ];

  const [items, setItems] = useState<ItemOut[]>([
    {
      namaBarang: "",
      kode: "",
      large: "",
      medium: "",
      small: "",
      principle: "",
    },
  ]);

  const [dataMasuk, setDataMasuk] = useState<Barang[]>([]);
  const [namaItems, setNamaItems] = useState<
    { label: string; value: string }[]
  >([]);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(
    null
  );

  const isFocused = useIsFocused();

  const previewKode = async () => {
    const kodeKey = "kodeGdngOutCounter";
    let counter = parseInt((await AsyncStorage.getItem(kodeKey)) || "0") + 1;
    setKodeGdng(counter.toString().padStart(5, "0"));
  };

  const resetKodeGudang = async () => {
    await AsyncStorage.setItem("kodeGdngOutCounter", "0");
    Alert.alert("Reset", "Kode Gudang berhasil direset ke 00001");
    previewKode();
  };

  useEffect(() => {
    previewKode();
  }, []);

  const loadData = async () => {
    const currentStock = await getCurrentStock();
    setDataMasuk(currentStock);
    const uniqueNames = Array.from(new Set(currentStock.map((b) => b.nama)));
    setNamaItems(uniqueNames.map((name) => ({ label: name, value: name })));
  };

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused]);

  const updateItem = (index: number, field: keyof ItemOut, value: string) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === "namaBarang") {
      const match = dataMasuk.find((item) => item.nama === value);
      if (match) {
        updated[index].kode = match.kode;
        updated[index].principle = match.principle;
      } else {
        updated[index].kode = "";
        updated[index].principle = "";
      }
    }

    setItems(updated);
  };

  const hapusItem = (index: number) => {
    if (items.length === 1) return;
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const tambahItem = () => {
    setItems([
      ...items,
      {
        namaBarang: "",
        kode: "",
        large: "",
        medium: "",
        small: "",
        principle: "",
      },
    ]);
  };

  const handleSubmit = async () => {
    try {
      const kodeKey = "kodeGdngOutCounter";
      let counter = parseInt((await AsyncStorage.getItem(kodeKey)) || "0") + 1;
      const finalKode = counter.toString().padStart(5, "0");

      for (const item of items) {
        const stok = dataMasuk.find((b) => b.kode === item.kode);
        if (!stok) {
          Alert.alert("Error", `Barang ${item.namaBarang} tidak ditemukan.`);
          return;
        }
        if (
          stok.stokLarge < parseInt(item.large || "0") ||
          stok.stokMedium < parseInt(item.medium || "0") ||
          stok.stokSmall < parseInt(item.small || "0")
        ) {
          Alert.alert("Error", `Stok tidak cukup untuk ${item.namaBarang}`);
          return;
        }
      }

      const transaksiBaru = {
        kodeGdng: finalKode,
        kodeApos,
        kategori,
        catatan,
        nomorKendaraan,
        namaSopir,
        waktuInput: new Date().toISOString(),
        items: items.map((item) => ({
          namaBarang: item.namaBarang,
          kode: item.kode,
          large: parseInt(item.large || "0"),
          medium: parseInt(item.medium || "0"),
          small: parseInt(item.small || "0"),
          principle: item.principle,
        })),
      };

      const existing = await AsyncStorage.getItem("barangKeluar");
      const parsed = existing ? JSON.parse(existing) : [];
      parsed.push(transaksiBaru);
      await AsyncStorage.setItem("barangKeluar", JSON.stringify(parsed));
      await AsyncStorage.setItem(kodeKey, counter.toString());

      Alert.alert(
        "Sukses",
        `Barang berhasil dikeluarkan dengan kode ${finalKode}`
      );

      setKodeGdng((counter + 1).toString().padStart(5, "0"));
      setKodeApos("");
      setCatatan("");
      setNomorKendaraan("");
      setNamaSopir("");
      setItems([
        {
          namaBarang: "",
          kode: "",
          large: "",
          medium: "",
          small: "",
          principle: "",
        },
      ]);
      await loadData();
    } catch (error) {
      console.error("Gagal menyimpan:", error);
      Alert.alert("Error", "Gagal menyimpan data!");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#fff" }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📤 Form Barang Keluar</Text>

        <Text style={styles.label}>Gudang</Text>
        <DropDownPicker
          open={kategoriOpen}
          setOpen={setKategoriOpen}
          value={kategori}
          setValue={setKategori}
          items={kategoriList}
          placeholder="Pilih Gudang"
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownContainer}
        />

        <Text style={styles.label}>Kode Transaksi Gudang</Text>
        <TextInput
          style={styles.inputDisabled}
          value={kodeGdng}
          editable={false}
        />
        <TouchableOpacity onPress={resetKodeGudang}>
          <Text style={{ color: "#3b82f6", marginBottom: 12 }}>
            🔁 Reset Kode Gudang
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Nomor Kendaraan</Text>
        <TextInput
          style={styles.input}
          value={nomorKendaraan}
          onChangeText={setNomorKendaraan}
          placeholder="Masukkan nomor kendaraan"
        />

        <Text style={styles.label}>Nama Sopir</Text>
        <TextInput
          style={styles.input}
          value={namaSopir}
          onChangeText={setNamaSopir}
          placeholder="Masukkan nama sopir"
        />

        <Text style={styles.label}>Kode Transaksi Apos</Text>
        <TextInput
          style={styles.input}
          value={kodeApos}
          onChangeText={setKodeApos}
        />

        <Text style={styles.label}>🧾 Item</Text>
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
              items={namaItems}
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
              searchable={true}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              listMode="MODAL"
            />
            <TextInput
              value={item.kode}
              editable={false}
              placeholder="Kode Barang"
              style={styles.inputDisabled}
            />
            <TextInput
              value={item.principle}
              editable={false}
              placeholder="Principle"
              style={styles.inputDisabled}
            />
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
          <Text style={styles.buttonText}>Simpan Pengeluaran</Text>
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
  label: { marginTop: 12, color: "#111827" },
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
    backgroundColor: "#ef4444",
    borderRadius: 6,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    padding: 12,
    fontWeight: "bold",
  },
});
