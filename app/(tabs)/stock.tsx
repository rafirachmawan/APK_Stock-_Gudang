import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getCurrentStokBarang } from "../../utils/stockManager";

interface StokBarang {
  kode: string;
  nama: string;
  totalLarge: number;
  totalMedium: number;
  totalSmall: number;
  principle: string;
}

interface Item {
  namaBarang: string;
  kode: string;
  large: string;
  medium: string;
  small: string;
  ed?: string;
  catatan?: string;
}

interface Transaksi {
  jenisForm: string;
  waktuInput: string;
  gudang?: string;
  kodeApos?: string;
  suratJalan?: string;
  principle?: string;
  kategori?: string;
  nomorKendaraan?: string;
  namaSopir?: string;
  items: Item[];
}

export default function StockScreen() {
  const [stockData, setStockData] = useState<StokBarang[]>([]);
  const [groupedPrinciple, setGroupedPrinciple] = useState<
    Record<string, StokBarang[]>
  >({});
  const [selectedPrinciple, setSelectedPrinciple] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<StokBarang | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [transaksiGabungan, setTransaksiGabungan] = useState<Transaksi[]>([]);

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) fetchStock();
  }, [isFocused]);

  const fetchStock = async () => {
    const data = await getCurrentStokBarang();
    const grouped: Record<string, StokBarang[]> = {};
    data.forEach((item) => {
      if (!grouped[item.principle]) grouped[item.principle] = [];
      grouped[item.principle].push(item);
    });
    setStockData(data);
    setGroupedPrinciple(grouped);
  };

  const handleSelectItem = async (item: StokBarang) => {
    setSelectedItem(item);
    await loadTransaksi(item.kode);
    setModalVisible(true);
  };

  const loadTransaksi = async (kodeBarang: string) => {
    const [jsonMasuk, jsonKeluar] = await Promise.all([
      AsyncStorage.getItem("barangMasuk"),
      AsyncStorage.getItem("barangKeluar"),
    ]);

    const masuk: Transaksi[] = (
      JSON.parse(jsonMasuk || "[]") as Transaksi[]
    ).flatMap((trx) =>
      trx.items.some((item) => item.kode === kodeBarang)
        ? [
            {
              jenisForm: trx.jenisForm || "Pembelian",
              waktuInput: trx.waktuInput,
              gudang: trx.gudang,
              kodeApos: trx.kodeApos,
              suratJalan: trx.suratJalan,
              principle: trx.principle,
              kategori: trx.kategori,
              items: trx.items.filter((item) => item.kode === kodeBarang),
            },
          ]
        : []
    );

    const keluar: Transaksi[] = (
      JSON.parse(jsonKeluar || "[]") as Transaksi[]
    ).flatMap((trx) =>
      trx.items.some((item) => item.kode === kodeBarang)
        ? [
            {
              jenisForm: trx.jenisForm || "Keluar",
              waktuInput: trx.waktuInput,
              gudang: trx.gudang,
              kodeApos: trx.kodeApos,
              nomorKendaraan: trx.nomorKendaraan,
              namaSopir: trx.namaSopir,
              kategori: trx.kategori,
              items: trx.items.filter((item) => item.kode === kodeBarang),
            },
          ]
        : []
    );

    const combined = [...masuk, ...keluar].sort(
      (a, b) =>
        new Date(a.waktuInput).getTime() - new Date(b.waktuInput).getTime()
    );

    setTransaksiGabungan(combined);
  };

  const renderPrincipleList = () => {
    const filteredPrinciples = Object.keys(groupedPrinciple).filter(
      (principle) => principle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <ScrollView>
        {filteredPrinciples.map((principle) => (
          <TouchableOpacity
            key={principle}
            onPress={() => {
              setSearchQuery(""); // reset pencarian barang
              setSelectedPrinciple(principle);
            }}
            style={styles.card}
          >
            <Text style={styles.nama}>{principle}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderBarangList = () => {
    const list = groupedPrinciple[selectedPrinciple!] || [];
    const filteredList = list.filter((item) =>
      item.nama.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <ScrollView>
        <Text style={styles.sectionTitle}>Barang dari {selectedPrinciple}</Text>
        <TextInput
          placeholder="Cari nama barang..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        {filteredList.map((item) => (
          <TouchableOpacity
            key={item.kode}
            onPress={() => handleSelectItem(item)}
            style={styles.card}
          >
            <Text style={styles.nama}>{item.nama}</Text>
            <Text style={styles.detail}>Kode: {item.kode}</Text>
            <Text style={styles.detail}>
              Stok: L:{item.totalLarge} M:{item.totalMedium} S:{item.totalSmall}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => {
            setSelectedPrinciple(null);
            setSearchQuery("");
          }}
          style={styles.closeButton}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>← Kembali</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderTransaksi = () =>
    transaksiGabungan.map((trx, i) => (
      <View key={i} style={styles.transaksiBox}>
        <Text style={styles.trxTitle}>
          [{trx.jenisForm}] {new Date(trx.waktuInput).toLocaleString()}
        </Text>
        <Text>Gudang: {trx.gudang || "-"}</Text>
        <Text>Principle: {trx.principle || "-"}</Text>
        <Text>Kode Apos: {trx.kodeApos || "-"}</Text>
        <Text>Surat Jalan: {trx.suratJalan || "-"}</Text>
        <Text>Kategori: {trx.kategori || "-"}</Text>
        <Text>Nomor Kendaraan: {trx.nomorKendaraan || "-"}</Text>
        <Text>Nama Sopir: {trx.namaSopir || "-"}</Text>
        {trx.items.map((item, j) => (
          <View key={j} style={styles.itemBox}>
            <Text>
              Large: {item.large} | Medium: {item.medium} | Small: {item.small}
            </Text>
            <Text>ED: {item.ed || "-"}</Text>
            <Text>Catatan: {item.catatan || "-"}</Text>
          </View>
        ))}
      </View>
    ));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stok Barang</Text>
      {!selectedPrinciple && (
        <TextInput
          placeholder="Cari principle..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      )}
      {!selectedPrinciple ? renderPrincipleList() : renderBarangList()}

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Riwayat: {selectedItem?.nama}</Text>
          <ScrollView>{renderTransaksi()}</ScrollView>
          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            style={styles.closeButton}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 10,
    color: "#333",
  },
  card: {
    padding: 12,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    marginBottom: 10,
  },
  nama: { fontSize: 16, fontWeight: "bold" },
  detail: { fontSize: 14, marginTop: 4 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  modalContainer: { flex: 1, backgroundColor: "#fff", padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  transaksiBox: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  trxTitle: { fontWeight: "bold", marginBottom: 6 },
  itemBox: {
    backgroundColor: "#fff",
    padding: 8,
    marginTop: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  closeButton: {
    backgroundColor: "#007bff",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
});
