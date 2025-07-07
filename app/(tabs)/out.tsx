import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import React, { useCallback, useState } from "react";
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
import { db } from "../../utils/firebase";

interface ItemOut {
  namaBarang: string;
  kode: string;
  large: string;
  medium: string;
  small: string;
  principle: string;
  gdg?: string;
  ed?: string; // ✅ tambahkan ini
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
  gudangAsal?: string;
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
  const [openJenisReturn, setOpenJenisReturn] = useState(false);
  const [dataBarangMasuk, setDataBarangMasuk] = useState<ItemOut[]>([]);
  const [itemList, setItemList] = useState<ItemOut[]>([]);

  const [openNamaSopir, setOpenNamaSopir] = useState(false);
  const [openPlat, setOpenPlat] = useState(false);

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
    const foundItems = barangFiltered.filter((b) => b.namaBarang === nama);
    if (foundItems.length > 0) {
      // Ambil ED paling pendek
      const sorted = foundItems.sort((a, b) => {
        const edA = new Date(a.ed || "9999-12-31");
        const edB = new Date(b.ed || "9999-12-31");
        return edA.getTime() - edB.getTime();
      });
      const found = sorted[0];

      const updated = [...itemList];
      updated[index] = {
        ...updated[index],
        namaBarang: found.namaBarang,
        kode: found.kode,
        principle: found.principle,
        gdg: found.gdg,
        ed: found.ed || "", // ✅ ini akan jadi ED paling pendek
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
    const tanggalFormatted = formatDate(tanggalTransaksi);
    const kodeGdngFinal = jenisForm === "MB" ? itemList[0]?.gdg || "-" : "-";
    const docId = `${kodeApos}-${tanggalFormatted}`;

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

    //
    // Validasi pengurangan stok
    for (const item of itemList) {
      const barangSama = dataBarangMasuk.filter(
        (b) => b.kode === item.kode && b.gdg === jenisGudang
      );

      let stokLarge = 0,
        stokMedium = 0,
        stokSmall = 0;

      for (const b of barangSama) {
        stokLarge += parseInt(b.large || "0");
        stokMedium += parseInt(b.medium || "0");
        stokSmall += parseInt(b.small || "0");
      }

      const outLarge = parseInt(item.large || "0");
      const outMedium = parseInt(item.medium || "0");
      const outSmall = parseInt(item.small || "0");

      if (
        outLarge > stokLarge ||
        outMedium > stokMedium ||
        outSmall > stokSmall
      ) {
        Alert.alert(
          "Stok tidak cukup",
          `Stok tidak mencukupi untuk ${item.namaBarang}\n` +
            `Stok tersedia - Large: ${stokLarge}, Medium: ${stokMedium}, Small: ${stokSmall}\n` +
            `Permintaan - Large: ${outLarge}, Medium: ${outMedium}, Small: ${outSmall}`
        );
        return; // Batalkan submit
      }
    }

    try {
      await setDoc(doc(db, "barangKeluar", docId), newEntry);
      if (jenisForm === "MB" && tujuanGudang) {
        const barangMasukBaru = {
          jenisForm: "Mutasi Masuk",
          kodeApos,
          principle: itemList[0]?.principle || "-",
          waktuInput,
          gudang: tujuanGudang,
          kodeGdng: docId,
          catatan: `Hasil mutasi dari ${jenisGudang}`,
          items: itemList.map((item) => ({
            ...item,
            gdg: tujuanGudang,
          })),
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "barangMasuk", docId), barangMasukBaru);
      }

      Alert.alert("✅ Transaksi berhasil disimpan ke cloud");
      setItemList([]);
      setKodeApos("");
      setKategori("");
      setCatatan("");
      setNomorKendaraan("");
      setNamaSopir("");
      setTujuanGudang("");
    } catch (err) {
      console.error("❌ Gagal simpan ke Firestore:", err);
      Alert.alert("Gagal simpan ke server");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "android" ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.container}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 300 }}
        >
          {/* Jenis Gudang */}
          <Text style={styles.label}>Jenis Gudang</Text>
          <DropDownPicker
            open={openJenisGudang}
            value={jenisGudang}
            setOpen={setOpenJenisGudang}
            setValue={setJenisGudang}
            items={[
              { label: "Gudang A", value: "Gudang A" },
              { label: "Gudang B", value: "Gudang B" },
              { label: "Gudang C", value: "Gudang C" },
              { label: "Gudang D", value: "Gudang D" },
              // { label: "Gudang E (Good Stock)", value: "Gudang E" },
              { label: "Gudang E (Bad Stock)", value: "Gudang E (Bad Stock)" },
            ]}
            style={styles.dropdown}
            zIndex={6000}
            listMode="SCROLLVIEW"
          />

          {/* Jenis Form */}
          <Text style={styles.label}>Jenis Form</Text>
          <DropDownPicker
            open={openJenis}
            value={jenisForm}
            setOpen={setOpenJenis}
            setValue={setJenisForm}
            items={[
              { label: "Pengiriman (DR)", value: "DR" },
              { label: "Mutasi Stock (MB)", value: "MB" },
              { label: "Return Pembelian (RB)", value: "RB" },
            ]}
            style={styles.dropdown}
            zIndex={5000}
            listMode="SCROLLVIEW"
          />

          {/* Tanggal */}
          <Text style={styles.label}>Tanggal</Text>
          <TouchableOpacity
            onPress={() => setShowDate(true)}
            style={styles.input}
          >
            <Text>{formatDate(tanggalTransaksi)}</Text>
          </TouchableOpacity>
          {showDate && (
            <DateTimePicker
              value={tanggalTransaksi}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                if (Platform.OS === "android") setShowDate(false);
                if (selectedDate) setTanggalTransaksi(selectedDate);
              }}
            />
          )}

          {/* No Faktur */}
          <Text style={styles.label}>No Faktur</Text>
          <TextInput
            style={styles.input}
            value={kodeApos}
            onChangeText={setKodeApos}
          />

          {/* Gudang Tujuan */}
          {jenisForm === "MB" && (
            <>
              <Text style={styles.label}>Gudang Tujuan</Text>
              <DropDownPicker
                open={openTujuanGudang}
                value={tujuanGudang}
                setOpen={setOpenTujuanGudang}
                setValue={setTujuanGudang}
                items={[
                  { label: "Gudang A", value: "Gudang A" },
                  { label: "Gudang B", value: "Gudang B" },
                  { label: "Gudang C", value: "Gudang C" },
                  { label: "Gudang D", value: "Gudang D" },
                  { label: "Gudang E (Good Stock)", value: "Gudang E" },
                  {
                    label: "Gudang E (Bad Stock)",
                    value: "Gudang E (Bad Stock)",
                  },
                ]}
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
          {jenisForm !== "MB" && (
            <>
              <Text style={styles.label}>Nama Sopir</Text>
              <DropDownPicker
                open={openNamaSopir}
                value={namaSopir}
                setOpen={setOpenNamaSopir}
                setValue={setNamaSopir}
                items={[
                  { label: "Budi", value: "Budi" },
                  { label: "Soleh", value: "Soleh" },
                  { label: "Anto", value: "Anto" },
                ]}
                placeholder="Pilih Sopir"
                style={styles.dropdown}
                zIndex={4400}
                listMode="SCROLLVIEW"
              />

              <Text style={styles.label}>Plat Nomor Kendaraan</Text>
              <DropDownPicker
                open={openPlat}
                value={nomorKendaraan}
                setOpen={setOpenPlat}
                setValue={setNomorKendaraan}
                items={[
                  { label: "B 1234 XY", value: "B 1234 XY" },
                  { label: "D 5678 AB", value: "D 5678 AB" },
                  { label: "F 9012 CD", value: "F 9012 CD" },
                ]}
                placeholder="Pilih Plat Nomor"
                style={styles.dropdown}
                zIndex={4300}
                listMode="SCROLLVIEW"
              />
            </>
          )}

          {/* Item List */}
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
                  const exists = barangFiltered.some(
                    (b) => b.namaBarang === val
                  );
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
                scrollViewProps={{ nestedScrollEnabled: true }}
                zIndex={1000 - i}
                zIndexInverse={i}
                disabled={!jenisGudang}
              />

              <Text style={styles.label}>Kode</Text>
              <TextInput
                style={styles.input}
                value={item.kode}
                editable={false}
              />
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
              {/*  */}
              <Text style={styles.label}>ED (dd-mm-yyyy)</Text>
              <TextInput
                style={styles.input}
                value={item.ed || ""}
                onChangeText={(t) => handleChangeItem(i, "ed", t)}
                placeholder="ED (dd-mm-yyyy)"
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
