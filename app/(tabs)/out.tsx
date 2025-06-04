import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";

interface ItemOut {
  namaBarang: string;
  kode: string;
  large: string;
  medium: string;
  small: string;
  principle: string;
  catatan?: string;
  harga?: string;
  disc1?: string;
  disc2?: string;
  disc3?: string;
  discRp?: string;
  total?: string;
  gdg?: string;
}

interface TransaksiOut {
  kodeGdng: string;
  kodeApos: string;
  kategori: string;
  catatan: string;
  nomorKendaraan: string;
  namaSopir: string;
  waktuInput: string;
  jenisForm: "DR" | "MB" | "RB";
  items: ItemOut[];
}

export default function OutScreen() {
  const [jenisForm, setJenisForm] = useState<"DR" | "MB" | "RB">("DR");
  const [openJenis, setOpenJenis] = useState(false);

  const [kodeApos, setKodeApos] = useState("");
  const [kategori, setKategori] = useState("");
  const [catatan, setCatatan] = useState("");
  const [namaSopir, setNamaSopir] = useState("");

  const [tanggalTransaksi, setTanggalTransaksi] = useState(new Date());
  const [showDate, setShowDate] = useState(false);

  const [nomorKendaraan, setNomorKendaraan] = useState("");
  const [openKendaraan, setOpenKendaraan] = useState(false);

  const [openJenisReturn, setOpenJenisReturn] = useState(false);

  const kendaraanList = [
    { label: "B 1234 XY", value: "B 1234 XY" },
    { label: "B 5678 ZZ", value: "B 5678 ZZ" },
    { label: "B 9012 AA", value: "B 9012 AA" },
  ];

  const jenisReturnList = [
    { label: "Mutasi Antar Depo", value: "Mutasi Antar Depo" },
    { label: "Hangover (ReturnBeli)", value: "Hangover (ReturnBeli)" },
    { label: "Ke Pabrik", value: "Ke Pabrik" },
    { label: "Pemusnahan", value: "Pemusnahan" },
  ];

  const [itemList, setItemList] = useState<ItemOut[]>([]);
  const [dataBarangMasuk, setDataBarangMasuk] = useState<ItemOut[]>([]);
  const [openNamaBarang, setOpenNamaBarang] = useState<boolean[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadBarangMasuk();
    }, [])
  );

  const loadBarangMasuk = async () => {
    const json = await AsyncStorage.getItem("barangMasuk");
    const parsed = json ? JSON.parse(json) : [];
    const items = parsed.flatMap((trx: any) =>
      trx.items.map((item: any) => ({
        ...item,
        principle: item.principle || trx.principle || "-",
        gudang: trx.gudang || trx.kodeGdng || "-",
      }))
    );
    const unique = Array.from(
      new Map(items.map((i) => [i.namaBarang, i])).values()
    );
    setDataBarangMasuk(unique);
  };

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const addItem = () => {
    setItemList((prev) => [
      ...prev,
      {
        namaBarang: "",
        kode: "",
        large: "",
        medium: "",
        small: "",
        principle: "",
        gdg: "",
      },
    ]);
    setOpenNamaBarang((prev) => [...prev, false]); // 🔧 fix untuk zIndex dropdown per item
  };

  const removeItem = (index: number) => {
    const updated = [...itemList];
    updated.splice(index, 1);
    setItemList(updated);
    const openCopy = [...openNamaBarang];
    openCopy.splice(index, 1);
    setOpenNamaBarang(openCopy);
  };

  const handleChangeItem = (
    index: number,
    key: keyof ItemOut,
    value: string
  ) => {
    const updated = [...itemList];
    updated[index][key] = value;
    setItemList(updated);
  };

  const handleSelectBarang = (index: number, nama: string) => {
    const found = dataBarangMasuk.find((b) => b.namaBarang === nama);
    if (found) {
      const updated = [...itemList];
      updated[index] = {
        ...updated[index],
        namaBarang: found.namaBarang,
        kode: found.kode,
        principle: found.principle,
        gdg: found.gudang || "-",
      };
      setItemList(updated);
    }
  };

  const handleSubmit = async () => {
    if (!kodeApos || !itemList.length) {
      Alert.alert("Lengkapi semua data wajib");
      return;
    }

    const waktuInput = new Date(
      tanggalTransaksi.getFullYear(),
      tanggalTransaksi.getMonth(),
      tanggalTransaksi.getDate()
    ).toISOString();

    const kodeGdngFinal = jenisForm === "MB" ? itemList[0]?.gdg || "-" : "-";

    const newEntry: TransaksiOut = {
      kodeGdng: kodeGdngFinal,
      kodeApos,
      kategori,
      catatan,
      nomorKendaraan,
      namaSopir,
      jenisForm,
      waktuInput,
      items: itemList,
    };

    const existing = await AsyncStorage.getItem("barangKeluar");
    const parsed = existing ? JSON.parse(existing) : [];
    parsed.push(newEntry);
    await AsyncStorage.setItem("barangKeluar", JSON.stringify(parsed));

    Alert.alert("Barang keluar disimpan");
    setItemList([]);
    setOpenNamaBarang([]);
    setKodeApos("");
    setKategori("");
    setCatatan("");
    setNomorKendaraan("");
    setNamaSopir("");
    setTanggalTransaksi(new Date());
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Form Barang Keluar</Text>

      <Text style={styles.label}>Jenis Form</Text>
      <DropDownPicker
        open={openJenis}
        value={jenisForm}
        items={[
          { label: "Pengiriman (DR)", value: "DR" },
          { label: "Mutasi Stock (MB)", value: "MB" },
          { label: "Return Pembelian (RB)", value: "RB" },
        ]}
        setOpen={setOpenJenis}
        setValue={setJenisForm}
        style={styles.dropdown}
        zIndex={5000}
        listMode="SCROLLVIEW"
      />

      <Text style={styles.label}>Tanggal Transaksi</Text>
      <TouchableOpacity onPress={() => setShowDate(true)} style={styles.input}>
        <Text>{formatDate(tanggalTransaksi)}</Text>
      </TouchableOpacity>
      {showDate && (
        <DateTimePicker
          value={tanggalTransaksi}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(e, selectedDate) => {
            setShowDate(false);
            if (selectedDate) setTanggalTransaksi(selectedDate);
          }}
        />
      )}

      <Text style={styles.label}>No Faktur</Text>
      <TextInput
        style={styles.input}
        value={kodeApos}
        onChangeText={setKodeApos}
      />

      {jenisForm === "MB" && (
        <>
          <Text style={styles.label}>Gudang Tujuan</Text>
          <TextInput
            style={styles.input}
            value={kategori}
            onChangeText={setKategori}
          />
          <Text style={styles.label}>Keterangan</Text>
          <TextInput
            style={styles.input}
            value={catatan}
            onChangeText={setCatatan}
          />
        </>
      )}

      {jenisForm === "DR" && (
        <>
          <Text style={styles.label}>Nomor Kendaraan</Text>
          <DropDownPicker
            open={openKendaraan}
            value={nomorKendaraan}
            items={kendaraanList}
            setOpen={setOpenKendaraan}
            setValue={setNomorKendaraan}
            style={styles.dropdown}
            zIndex={4000}
            listMode="SCROLLVIEW"
          />
          <Text style={styles.label}>Nama Sopir</Text>
          <TextInput
            style={styles.input}
            value={namaSopir}
            onChangeText={setNamaSopir}
          />
          <Text style={styles.label}>Keterangan</Text>
          <TextInput
            style={styles.input}
            value={catatan}
            onChangeText={setCatatan}
          />
        </>
      )}

      {jenisForm === "RB" && (
        <>
          <Text style={styles.label}>Jenis Return</Text>
          <DropDownPicker
            open={openJenisReturn}
            value={kategori}
            items={jenisReturnList}
            setOpen={setOpenJenisReturn}
            setValue={setKategori}
            style={styles.dropdown}
            zIndex={3000}
            listMode="SCROLLVIEW"
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
              const val = cb(item.namaBarang);
              handleSelectBarang(i, val);
            }}
            items={dataBarangMasuk.map((b) => ({
              label: b.namaBarang,
              value: b.namaBarang,
            }))}
            placeholder="Pilih Nama Barang"
            searchable
            style={styles.dropdown}
            zIndex={1000 - i}
            zIndexInverse={i}
            listMode="SCROLLVIEW"
          />

          <Text style={styles.label}>Kode</Text>
          <TextInput style={styles.input} value={item.kode} editable={false} />

          <Text style={styles.label}>Principle</Text>
          <TextInput
            style={styles.input}
            value={item.principle}
            editable={false}
          />

          {jenisForm === "MB" && (
            <>
              <Text style={styles.label}>Gudang Asal</Text>
              <TextInput
                style={styles.input}
                value={item.gdg || "-"}
                editable={false}
              />
            </>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  label: { marginBottom: 4, fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
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
  removeButton: {
    backgroundColor: "#dc3545",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },
  removeText: { color: "#fff", fontWeight: "bold" },
  addText: { color: "#fff" },
  submitButton: {
    backgroundColor: "#28a745",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "bold" },
});
