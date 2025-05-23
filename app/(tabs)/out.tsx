import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { Barang, getCurrentStock } from "../../utils/stockManager";

type DropDownItem = {
  label: string;
  value: string;
};

export default function OutScreen() {
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [large, setLarge] = useState("");
  const [medium, setMedium] = useState("");
  const [small, setSmall] = useState("");
  const [catatan, setCatatan] = useState("");
  const [kategori, setKategori] = useState("");
  const [dataMasuk, setDataMasuk] = useState<Barang[]>([]);

  const [kodeOpen, setKodeOpen] = useState(false);
  const [kodeItems, setKodeItems] = useState<DropDownItem[]>([]);

  const [kategoriOpen, setKategoriOpen] = useState(false);
  const kategoriItems: DropDownItem[] = [
    { label: "Gudang A", value: "Gudang A" },
    { label: "Gudang B", value: "Gudang B" },
    { label: "Gudang C", value: "Gudang C" },
  ];

  const isFocused = useIsFocused();

  const loadData = async () => {
    try {
      const currentStock = await getCurrentStock();
      setDataMasuk(currentStock);
      const kodeList = currentStock.map((item) => ({
        label: `${item.kode} (${item.nama})`,
        value: item.kode,
      }));
      setKodeItems(kodeList);
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  useEffect(() => {
    const selected = dataMasuk.find((item) => item.kode === kode);
    if (selected) {
      setNama(selected.nama);
    } else {
      setNama("");
    }
  }, [kode, dataMasuk]);

  const handleSubmit = async () => {
    if (!kode || !nama || !kategori) {
      Alert.alert("Peringatan", "Kode, Nama, dan Kategori wajib diisi!");
      return;
    }

    const largeOut = parseInt(large) || 0;
    const mediumOut = parseInt(medium) || 0;
    const smallOut = parseInt(small) || 0;

    const currentStock = await getCurrentStock();
    const barang = currentStock.find((item) => item.kode === kode);

    if (!barang) {
      Alert.alert("Error", "Barang tidak ditemukan di stok!");
      return;
    }

    if (
      barang.stokLarge < largeOut ||
      barang.stokMedium < mediumOut ||
      barang.stokSmall < smallOut
    ) {
      Alert.alert(
        "Error",
        `Stok tidak mencukupi!\nTersedia: L:${barang.stokLarge}, M:${barang.stokMedium}, S:${barang.stokSmall}`
      );
      return;
    }

    const dataOut: Barang = {
      kode,
      nama,
      stokLarge: largeOut,
      stokMedium: mediumOut,
      stokSmall: smallOut,
      catatan,
      ed: barang.ed,
      waktuInput: new Date().toISOString(),
      principle: barang.principle,
      kategori,
    };

    try {
      const existing = await AsyncStorage.getItem("barangKeluar");
      const parsed = existing ? JSON.parse(existing) : [];
      parsed.push(dataOut);
      await AsyncStorage.setItem("barangKeluar", JSON.stringify(parsed));

      const updatedStock = await getCurrentStock();
      setDataMasuk(updatedStock);

      Alert.alert("Berhasil", "Data berhasil dikeluarkan!");
      setKode("");
      setNama("");
      setLarge("");
      setMedium("");
      setSmall("");
      setCatatan("");
      setKategori("");
    } catch (error) {
      console.error("Gagal menyimpan:", error);
      Alert.alert("Error", "Gagal menyimpan data!");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Form Barang Keluar</Text>

          <View style={{ zIndex: 3000 }}>
            <Text style={styles.label}>Kode Barang</Text>
            <DropDownPicker
              open={kodeOpen}
              setOpen={setKodeOpen}
              value={kode}
              setValue={setKode}
              items={kodeItems}
              placeholder="Pilih Kode Barang"
              searchable={true}
              searchPlaceholder="Cari kode atau nama"
              dropDownDirection="AUTO"
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownContainer}
            />
          </View>

          <Text style={styles.label}>Nama Barang</Text>
          <TextInput
            style={styles.input}
            placeholder="Nama Barang"
            value={nama}
            editable={false}
            placeholderTextColor="#888"
          />

          <View style={{ zIndex: 2000 }}>
            <Text style={styles.label}>Kategori Gudang</Text>
            <DropDownPicker
              open={kategoriOpen}
              setOpen={setKategoriOpen}
              value={kategori}
              setValue={setKategori}
              items={kategoriItems}
              placeholder="Pilih Kategori Gudang"
              dropDownDirection="AUTO"
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownContainer}
            />
          </View>

          <Text style={styles.label}>Jumlah Large</Text>
          <TextInput
            style={styles.input}
            placeholder="Jumlah Large"
            keyboardType="numeric"
            value={large}
            onChangeText={setLarge}
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>Jumlah Medium</Text>
          <TextInput
            style={styles.input}
            placeholder="Jumlah Medium"
            keyboardType="numeric"
            value={medium}
            onChangeText={setMedium}
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>Jumlah Small</Text>
          <TextInput
            style={styles.input}
            placeholder="Jumlah Small"
            keyboardType="numeric"
            value={small}
            onChangeText={setSmall}
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>Catatan</Text>
          <TextInput
            style={styles.input}
            placeholder="Catatan"
            value={catatan}
            onChangeText={setCatatan}
            placeholderTextColor="#888"
          />

          <View style={styles.buttonContainer}>
            <Button
              title="Keluarkan Barang"
              onPress={handleSubmit}
              color="#fff"
            />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#121212",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#fff",
  },
  label: {
    color: "#fff",
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#444",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#222",
    color: "#fff",
  },
  dropdown: {
    borderColor: "#444",
    backgroundColor: "#222",
    marginBottom: 12,
  },
  dropdownText: {
    color: "#fff",
  },
  dropdownContainer: {
    borderColor: "#444",
    backgroundColor: "#222",
  },
  buttonContainer: {
    backgroundColor: "#6200ee",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 16,
    marginBottom: 16,
  },
});
