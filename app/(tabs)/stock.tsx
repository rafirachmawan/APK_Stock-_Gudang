import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { db } from "../../utils/firebase";

interface Item {
  namaBarang: string;
  kode: string;
  large: string;
  medium: string;
  small: string;
  principle: string;
}

interface Transaksi {
  gudang?: string; // untuk transaksi masuk
  gudangAsal?: string; // untuk mutasi keluar
  gudangTujuan?: string; // untuk mutasi masuk
  principle: string;
  items: Item[];
}

export default function StockScreen() {
  const [stok, setStok] = useState<any[]>([]);
  const [barangMasuk, setBarangMasuk] = useState<Transaksi[]>([]);
  const [barangKeluar, setBarangKeluar] = useState<Transaksi[]>([]);
  const [searchText, setSearchText] = useState("");

  const [gudangOpen, setGudangOpen] = useState(false);
  const [gudangDipilih, setGudangDipilih] = useState<string | null>(null);
  const [gudangItems, setGudangItems] = useState([
    { label: "Gudang A", value: "Gudang A" },
    { label: "Gudang B", value: "Gudang B" },
    { label: "Gudang C", value: "Gudang C" },
    { label: "Gudang D", value: "Gudang D" },
    { label: "Gudang E", value: "Gudang E" },
  ]);

  useEffect(() => {
    const unsubIn = onSnapshot(collection(db, "barangMasuk"), (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data() as Transaksi);
      setBarangMasuk(data);
    });

    const unsubOut = onSnapshot(collection(db, "barangKeluar"), (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data() as Transaksi);
      setBarangKeluar(data);
    });

    return () => {
      unsubIn();
      unsubOut();
    };
  }, []);

  useEffect(() => {
    if (!gudangDipilih) return;

    const map = new Map();

    // Tambah stok dari barangMasuk (trx.gudang)
    barangMasuk
      .filter((trx) => trx.gudang === gudangDipilih)
      .forEach((trx) => {
        trx.items.forEach((item) => {
          const key = item.kode;
          if (!map.has(key)) {
            map.set(key, {
              kode: item.kode,
              nama: item.namaBarang,
              principle: item.principle,
              totalLarge: 0,
              totalMedium: 0,
              totalSmall: 0,
            });
          }
          const data = map.get(key);
          data.totalLarge += parseInt(item.large || "0");
          data.totalMedium += parseInt(item.medium || "0");
          data.totalSmall += parseInt(item.small || "0");
        });
      });

    // Kurangi stok dari barangKeluar asal (trx.gudangAsal)
    barangKeluar
      .filter((trx) => trx.gudangAsal === gudangDipilih)
      .forEach((trx) => {
        trx.items.forEach((item) => {
          const key = item.kode;
          if (!map.has(key)) return;
          const data = map.get(key);
          data.totalLarge -= parseInt(item.large || "0");
          data.totalMedium -= parseInt(item.medium || "0");
          data.totalSmall -= parseInt(item.small || "0");
        });
      });

    // Tambah stok ke gudang tujuan (trx.gudangTujuan)
    barangKeluar
      .filter((trx) => trx.gudangTujuan === gudangDipilih)
      .forEach((trx) => {
        trx.items.forEach((item) => {
          const key = item.kode;
          if (!map.has(key)) {
            map.set(key, {
              kode: item.kode,
              nama: item.namaBarang,
              principle: item.principle,
              totalLarge: 0,
              totalMedium: 0,
              totalSmall: 0,
            });
          }
          const data = map.get(key);
          data.totalLarge += parseInt(item.large || "0");
          data.totalMedium += parseInt(item.medium || "0");
          data.totalSmall += parseInt(item.small || "0");
        });
      });

    // Filter berdasarkan pencarian
    const final = Array.from(map.values()).filter((item: any) => {
      const match =
        item.nama.toLowerCase().includes(searchText.toLowerCase()) ||
        item.kode.toLowerCase().includes(searchText.toLowerCase());
      return match;
    });

    setStok(final);
  }, [barangMasuk, barangKeluar, searchText, gudangDipilih]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📦 STOK BARANG</Text>

      <DropDownPicker
        open={gudangOpen}
        value={gudangDipilih}
        items={gudangItems}
        setOpen={setGudangOpen}
        setValue={setGudangDipilih}
        setItems={setGudangItems}
        placeholder="Pilih Gudang"
        style={styles.dropdown}
        dropDownContainerStyle={{ zIndex: 999 }}
      />

      <TextInput
        placeholder="Cari nama/kode barang..."
        value={searchText}
        onChangeText={setSearchText}
        style={styles.search}
      />

      {stok.map((item, index) => (
        <View key={index} style={styles.card}>
          <Text style={styles.name}>{item.nama}</Text>
          <Text>Kode: {item.kode}</Text>
          <Text>Principle: {item.principle}</Text>
          <Text>Large: {item.totalLarge}</Text>
          <Text>Medium: {item.totalMedium}</Text>
          <Text>Small: {item.totalSmall}</Text>
        </View>
      ))}

      {stok.length === 0 && gudangDipilih && (
        <Text style={{ marginTop: 20, color: "gray" }}>
          Tidak ada data stok untuk gudang ini.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 80,
    backgroundColor: "white",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  dropdown: {
    marginBottom: 12,
    zIndex: 1000,
  },
  search: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  card: {
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    marginBottom: 10,
  },
  name: {
    fontWeight: "bold",
    fontSize: 16,
  },
});
