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
}

export default function OutScreen() {
  const [gudang] = useState("Gudang A");
  const [kodeGdng, setKodeGdng] = useState("");
  const [kodeApos, setKodeApos] = useState("");
  const [principle, setPrinciple] = useState("");
  const [catatan, setCatatan] = useState("");
  const [nomorKendaraan, setNomorKendaraan] = useState("");
  const [namaSopir, setNamaSopir] = useState("");

  const [items, setItems] = useState<ItemOut[]>([
    { namaBarang: "", kode: "", large: "", medium: "", small: "" },
  ]);

  const [dataMasuk, setDataMasuk] = useState<Barang[]>([]);
  const [namaItems, setNamaItems] = useState<
    { label: string; value: string }[][]
  >([]);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(
    null
  );
  const [kategori] = useState("Gudang A");

  const isFocused = useIsFocused();

  const previewKode = async () => {
    const kodeKey = "kodeGdngOutCounter";
    let counter = parseInt((await AsyncStorage.getItem(kodeKey)) || "0") + 1;
    setKodeGdng(counter.toString().padStart(5, "0"));
  };

  useEffect(() => {
    previewKode();
  }, []);

  const loadData = async () => {
    const currentStock = await getCurrentStock();
    setDataMasuk(currentStock);
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  useEffect(() => {
    const updated = items.map(() => {
      const filtered = dataMasuk
        .filter(
          (item) => item.principle?.toLowerCase() === principle.toLowerCase()
        )
        .map((item) => ({ label: item.nama, value: item.nama }));
      return filtered;
    });
    setNamaItems(updated);
  }, [principle, dataMasuk, items.length]);

  const updateItem = (index: number, field: keyof ItemOut, value: string) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === "namaBarang") {
      const match = dataMasuk.find(
        (item) =>
          item.nama === value &&
          item.principle?.toLowerCase() === principle.toLowerCase()
      );
      updated[index].kode = match ? match.kode : "";
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
      { namaBarang: "", kode: "", large: "", medium: "", small: "" },
    ]);
  };

  const handleSubmit = async () => {
    try {
      const kodeKey = "kodeGdngOutCounter";
      let counter = parseInt((await AsyncStorage.getItem(kodeKey)) || "0") + 1;
      const finalKode = counter.toString().padStart(5, "0");

      const updatedStock = [...dataMasuk];

      for (const item of items) {
        if (!item.namaBarang || !item.kode) {
          Alert.alert("Peringatan", "Nama dan Kode barang harus diisi.");
          return;
        }

        const largeOut = parseInt(item.large) || 0;
        const mediumOut = parseInt(item.medium) || 0;
        const smallOut = parseInt(item.small) || 0;

        const stokIndex = updatedStock.findIndex((b) => b.kode === item.kode);
        if (stokIndex === -1) {
          Alert.alert("Error", `Barang ${item.namaBarang} tidak ditemukan.`);
          return;
        }

        const stok = updatedStock[stokIndex];
        if (
          stok.stokLarge < largeOut ||
          stok.stokMedium < mediumOut ||
          stok.stokSmall < smallOut
        ) {
          Alert.alert("Error", `Stok tidak cukup untuk ${item.namaBarang}`);
          return;
        }

        stok.stokLarge -= largeOut;
        stok.stokMedium -= mediumOut;
        stok.stokSmall -= smallOut;

        const barangKeluar: Barang = {
          kode: item.kode,
          nama: item.namaBarang,
          stokLarge: largeOut,
          stokMedium: mediumOut,
          stokSmall: smallOut,
          catatan,
          ed: stok.ed,
          waktuInput: new Date().toISOString(),
          principle,
          kategori,
          // ⬇️ Tambahan info kendaraan dan sopir
          nomorKendaraan,
          namaSopir,
        };

        const existing = await AsyncStorage.getItem("barangKeluar");
        const parsed = existing ? JSON.parse(existing) : [];
        parsed.push(barangKeluar);
        await AsyncStorage.setItem("barangKeluar", JSON.stringify(parsed));
      }

      await AsyncStorage.setItem(kodeKey, counter.toString());

      Alert.alert(
        "Sukses",
        `Barang berhasil dikeluarkan dengan kode ${finalKode}`
      );
      setKodeGdng((counter + 1).toString().padStart(5, "0"));
      setKodeApos("");
      setPrinciple("");
      setCatatan("");
      setNomorKendaraan("");
      setNamaSopir("");
      setItems([
        { namaBarang: "", kode: "", large: "", medium: "", small: "" },
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
        <TextInput
          style={styles.inputDisabled}
          value={gudang}
          editable={false}
        />

        <Text style={styles.label}>Kode Gudang</Text>
        <TextInput
          style={styles.inputDisabled}
          value={kodeGdng}
          editable={false}
        />

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

        <Text style={styles.label}>Kode Apos</Text>
        <TextInput
          style={styles.input}
          value={kodeApos}
          onChangeText={setKodeApos}
        />

        <Text style={styles.label}>Principle</Text>
        <TextInput
          style={styles.input}
          value={principle}
          onChangeText={setPrinciple}
        />

        {/* Items list */}
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
              items={namaItems[index] || []}
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
            />
            <TextInput
              value={item.kode}
              editable={false}
              placeholder="Kode Barang"
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
  dropdownContainer: { borderColor: "#d1d5db", backgroundColor: "#ffffff" },
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
