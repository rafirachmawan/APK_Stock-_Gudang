import { collection, getDocs } from "firebase/firestore";
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
import { db } from "../../utils/firebase";

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

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    const [snapIn, snapOut] = await Promise.all([
      getDocs(collection(db, "barangMasuk")),
      getDocs(collection(db, "barangKeluar")),
    ]);

    const masuk: any[] = snapIn.docs.map((d) => d.data());
    const keluar: any[] = snapOut.docs.map((d) => d.data());

    const stokMap: Record<string, StokBarang> = {};

    masuk.forEach((trx) => {
      if (!Array.isArray(trx.items)) return;
      trx.items.forEach((item: any) => {
        const key = item.kode;
        if (!stokMap[key]) {
          stokMap[key] = {
            kode: item.kode,
            nama: item.namaBarang,
            totalLarge: 0,
            totalMedium: 0,
            totalSmall: 0,
            principle: item.principle || trx.principle || "-",
          };
        }
        stokMap[key].totalLarge += parseInt(item.large || "0");
        stokMap[key].totalMedium += parseInt(item.medium || "0");
        stokMap[key].totalSmall += parseInt(item.small || "0");
      });
    });

    keluar.forEach((trx) => {
      if (!Array.isArray(trx.items)) return;
      trx.items.forEach((item: any) => {
        const key = item.kode;
        if (!stokMap[key]) return;
        stokMap[key].totalLarge -= parseInt(item.large || "0");
        stokMap[key].totalMedium -= parseInt(item.medium || "0");
        stokMap[key].totalSmall -= parseInt(item.small || "0");
      });
    });

    const grouped: Record<string, StokBarang[]> = {};
    Object.values(stokMap).forEach((item) => {
      if (!grouped[item.principle]) grouped[item.principle] = [];
      grouped[item.principle].push(item);
    });

    setStockData(Object.values(stokMap));
    setGroupedPrinciple(grouped);
  };

  const handleSelectItem = async (item: StokBarang) => {
    setSelectedItem(item);
    const [snapIn, snapOut] = await Promise.all([
      getDocs(collection(db, "barangMasuk")),
      getDocs(collection(db, "barangKeluar")),
    ]);

    const masuk: Transaksi[] = snapIn.docs
      .map((d) => d.data() as any)
      .filter((trx) => trx.items?.some((i: any) => i.kode === item.kode))
      .map((trx) => ({
        jenisForm: trx.jenisForm || "Pembelian",
        waktuInput: trx.waktuInput,
        gudang: trx.gudang,
        kodeApos: trx.kodeApos,
        suratJalan: trx.suratJalan,
        principle: trx.principle,
        items: trx.items.filter((i: any) => i.kode === item.kode),
      }));

    const keluar: Transaksi[] = snapOut.docs
      .map((d) => d.data() as any)
      .filter((trx) => trx.items?.some((i: any) => i.kode === item.kode))
      .map((trx) => ({
        jenisForm: trx.jenisForm || "Keluar",
        waktuInput: trx.waktuInput,
        kategori: trx.kategori,
        kodeApos: trx.kodeApos,
        nomorKendaraan: trx.nomorKendaraan,
        namaSopir: trx.namaSopir,
        items: trx.items.filter((i: any) => i.kode === item.kode),
      }));

    const combined = [...masuk, ...keluar].sort(
      (a, b) =>
        new Date(a.waktuInput).getTime() - new Date(b.waktuInput).getTime()
    );

    setTransaksiGabungan(combined);
    setModalVisible(true);
  };

  const renderPrincipleList = () => {
    const filtered = Object.keys(groupedPrinciple).filter((key) =>
      key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <ScrollView>
        {filtered.map((principle) => (
          <TouchableOpacity
            key={principle}
            onPress={() => setSelectedPrinciple(principle)}
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
    return (
      <ScrollView>
        <Text style={styles.sectionTitle}>Barang dari {selectedPrinciple}</Text>
        {list.map((item) => (
          <TouchableOpacity
            key={item.kode}
            onPress={() => handleSelectItem(item)}
            style={styles.card}
          >
            <Text style={styles.nama}>{item.nama}</Text>
            <Text>Kode: {item.kode}</Text>
            <Text>
              Stok: L:{item.totalLarge} M:{item.totalMedium} S:{item.totalSmall}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => setSelectedPrinciple(null)}
          style={styles.closeButton}
        >
          <Text style={{ color: "#fff" }}>← Kembali</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

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
          <Text style={styles.modalTitle}>
            Riwayat: {selectedItem?.nama || "-"}
          </Text>
          <ScrollView>
            {transaksiGabungan.map((trx, idx) => (
              <View key={idx} style={styles.card}>
                <Text style={styles.nama}>
                  [{trx.jenisForm}] {trx.waktuInput}
                </Text>
                <Text>Gudang: {trx.gudang || trx.kategori}</Text>
                <Text>Surat Jalan: {trx.suratJalan}</Text>
                <Text>Faktur: {trx.kodeApos}</Text>
                <Text>Supir: {trx.namaSopir}</Text>
                <Text>Kendaraan: {trx.nomorKendaraan}</Text>
                {trx.items.map((item, j) => (
                  <View key={j} style={styles.itemBox}>
                    <Text>
                      L:{item.large} M:{item.medium} S:{item.small}
                    </Text>
                    <Text>ED: {item.ed}</Text>
                    <Text>Catatan: {item.catatan}</Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            style={styles.closeButton}
          >
            <Text style={{ color: "#fff" }}>Tutup</Text>
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
