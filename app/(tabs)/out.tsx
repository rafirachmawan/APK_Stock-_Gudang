import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
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
import { db } from "../../utils/firebase";

interface ItemOut {
  namaBarang: string;
  kode: string;
  large: string;
  medium: string;
  small: string;
  principle: string;
  gdg?: string;
}

interface TransaksiOut {
  jenisGudang: string;
  kodeGdng: string;
  kodeApos: string;
  kategori: string;
  catatan: string;
  nomorKendaraan: string;
  namaSopir: string;
  waktuInput: string;
  jenisForm: "DR" | "MB" | "RB";
  tujuanGudang?: string;
  items: ItemOut[];
  createdAt?: any;
}

export default function OutScreen() {
  const [jenisGudang, setJenisGudang] = useState("");
  const [openJenisGudang, setOpenJenisGudang] = useState(false);
  const [jenisForm, setJenisForm] = useState<"DR" | "MB" | "RB">("DR");
  const [openJenis, setOpenJenis] = useState(false);
  const [tujuanGudang, setTujuanGudang] = useState("");
  const [openTujuanGudang, setOpenTujuanGudang] = useState(false);
  const [kodeApos, setKodeApos] = useState("");
  const [kategori, setKategori] = useState("");
  const [catatan, setCatatan] = useState("");
  const [namaSopir, setNamaSopir] = useState("");
  const [nomorKendaraan, setNomorKendaraan] = useState("");
  const [tanggalTransaksi, setTanggalTransaksi] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [openNamaBarang, setOpenNamaBarang] = useState<boolean[]>([]);
  const [openKendaraan, setOpenKendaraan] = useState(false);
  const [openSopir, setOpenSopir] = useState(false);
  const [openJenisReturn, setOpenJenisReturn] = useState(false);

  const kendaraanList = [
    { label: "B 1234 XY", value: "B 1234 XY" },
    { label: "B 5678 ZZ", value: "B 5678 ZZ" },
    { label: "B 9012 AA", value: "B 9012 AA" },
  ];
  const sopirList = [
    { label: "Andi", value: "Andi" },
    { label: "Budi", value: "Budi" },
    { label: "Citra", value: "Citra" },
  ];
  const jenisReturnList = [
    { label: "Mutasi Antar Depo", value: "Mutasi Antar Depo" },
    { label: "Hangover (ReturnBeli)", value: "Hangover (ReturnBeli)" },
    { label: "Ke Pabrik", value: "Ke Pabrik" },
    { label: "Pemusnahan", value: "Pemusnahan" },
  ];

  const [dataBarangMasuk, setDataBarangMasuk] = useState<ItemOut[]>([]);
  const [itemList, setItemList] = useState<ItemOut[]>([]);

  useFocusEffect(
    useCallback(() => {
      const unsub = onSnapshot(collection(db, "barangMasuk"), (snapshot) => {
        const allItems = snapshot.docs.flatMap((doc) => {
          const data = doc.data();
          if (!data || !Array.isArray(data.items)) return [];
          return data.items.map((item: any) => ({
            ...item,
            principle: item.principle || data.principle || "-",
            gdg: data.gudang || data.kodeGdng || "-",
          }));
        });
        setDataBarangMasuk(allItems);
      });
      return () => unsub();
    }, [])
  );

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const barangFiltered = dataBarangMasuk.filter((b) => b.gdg === jenisGudang);

  const handleSelectBarang = (index: number, nama: string) => {
    const found = barangFiltered.find((b) => b.namaBarang === nama);
    if (found) {
      const updated = [...itemList];
      updated[index] = {
        ...updated[index],
        namaBarang: found.namaBarang,
        kode: found.kode,
        principle: found.principle,
        gdg: found.gdg,
        large: "",
        medium: "",
        small: "",
      };
      setItemList(updated);
    }
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

  const removeItem = (index: number) => {
    const updated = [...itemList];
    updated.splice(index, 1);
    setItemList(updated);

    const updatedOpen = [...openNamaBarang];
    updatedOpen.splice(index, 1);
    setOpenNamaBarang(updatedOpen);
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
        gdg: jenisGudang,
      },
    ]);
    setOpenNamaBarang((prev) => [...prev, false]);
  };

  const handleSubmit = async () => {
    if (!kodeApos || !jenisGudang || itemList.length === 0) {
      Alert.alert("Harap lengkapi semua data penting");
      return;
    }

    const waktuInput = tanggalTransaksi.toISOString();
    const kodeGdngFinal = jenisForm === "MB" ? itemList[0]?.gdg || "-" : "-";

    const newEntry: TransaksiOut = {
      jenisGudang,
      kodeGdng: kodeGdngFinal,
      kodeApos,
      kategori,
      catatan,
      nomorKendaraan,
      namaSopir,
      jenisForm,
      waktuInput,
      items: itemList,
      createdAt: serverTimestamp(),
      gudangAsal: jenisGudang,
      ...(jenisForm === "MB" && { tujuanGudang }),
    };

    try {
      // Simpan transaksi barang keluar
      await addDoc(collection(db, "barangKeluar"), newEntry);

      // Jika mutasi antar gudang, otomatis tambahkan ke barangMasuk
      if (jenisForm === "MB" && tujuanGudang) {
        const barangMasukBaru = {
          jenisForm: "Mutasi Masuk",
          kodeApos,
          principle: itemList[0]?.principle || "-",
          waktuInput,
          gudang: tujuanGudang,
          kodeGdng: tujuanGudang + "-" + new Date().getTime(), // ID unik
          catatan: "Hasil mutasi dari " + jenisGudang,
          items: itemList.map((item) => ({
            ...item,
            gdg: tujuanGudang,
          })),
          createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, "barangMasuk"), barangMasukBaru);
      }

      Alert.alert("Transaksi berhasil disimpan ke cloud");
      setItemList([]);
      setKodeApos("");
      setKategori("");
      setCatatan("");
      setNomorKendaraan("");
      setNamaSopir("");
      setTujuanGudang("");
    } catch (err) {
      console.error("Gagal simpan ke Firestore:", err);
      Alert.alert("Gagal simpan ke server");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Jenis Gudang</Text>
      <DropDownPicker
        open={openJenisGudang}
        value={jenisGudang}
        items={[
          { label: "Gudang A", value: "Gudang A" },
          { label: "Gudang B", value: "Gudang B" },
          { label: "Gudang C", value: "Gudang C" },
          { label: "Gudang D", value: "Gudang D" },
          { label: "Gudang E", value: "Gudang E" },
        ]}
        setOpen={setOpenJenisGudang}
        setValue={setJenisGudang}
        placeholder="Pilih Jenis Gudang"
        style={styles.dropdown}
        zIndex={6000}
        listMode="SCROLLVIEW"
      />

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

      <Text style={styles.label}>Tanggal</Text>
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
          <DropDownPicker
            open={openTujuanGudang}
            value={tujuanGudang}
            items={[
              { label: "Gudang A", value: "Gudang A" },
              { label: "Gudang B", value: "Gudang B" },
              { label: "Gudang C", value: "Gudang C" },
              { label: "Gudang D", value: "Gudang D" },
              { label: "Gudang E", value: "Gudang E" },
            ]}
            setOpen={setOpenTujuanGudang}
            setValue={setTujuanGudang}
            placeholder="Pilih Gudang Tujuan"
            style={styles.dropdown}
            zIndex={4800}
            listMode="SCROLLVIEW"
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
              const exists = barangFiltered.some((b) => b.namaBarang === val);
              if (exists) {
                handleSelectBarang(i, val);
              } else {
                Alert.alert("Barang tidak tersedia di gudang ini");
              }
            }}
            items={
              jenisGudang
                ? barangFiltered.map((b) => ({
                    label: b.namaBarang,
                    value: b.namaBarang,
                  }))
                : []
            }
            placeholder="Pilih Nama Barang"
            searchable
            style={styles.dropdown}
            listMode="SCROLLVIEW"
            zIndex={1000 - i}
            zIndexInverse={i}
            disabled={!jenisGudang}
          />

          <Text style={styles.label}>Kode</Text>
          <TextInput style={styles.input} value={item.kode} editable={false} />
          <Text style={styles.label}>Principle</Text>
          <TextInput
            style={styles.input}
            value={item.principle}
            editable={false}
          />
          <Text style={styles.label}>Large</Text>
          <TextInput
            style={styles.input}
            value={item.large}
            onChangeText={(t) => handleChangeItem(i, "large", t)}
          />
          <Text style={styles.label}>Medium</Text>
          <TextInput
            style={styles.input}
            value={item.medium}
            onChangeText={(t) => handleChangeItem(i, "medium", t)}
          />
          <Text style={styles.label}>Small</Text>
          <TextInput
            style={styles.input}
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
    marginBottom: 20,
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
  addText: { color: "#fff", fontWeight: "bold" },
  submitButton: {
    backgroundColor: "#28a745",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "bold" },
});
