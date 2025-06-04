import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION_MASUK = "barangMasuk";
const COLLECTION_KELUAR = "barangKeluar";

// Membersihkan object dari field undefined atau kosong
const deepClean = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(deepClean).filter((v) => v !== undefined);
  } else if (typeof obj === "object" && obj !== null) {
    const cleaned: any = {};
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== undefined) {
        cleaned[k] = deepClean(v);
      }
    });
    return cleaned;
  }
  return obj;
};

// Upload barangMasuk dan barangKeluar ke Firebase
export const syncUpload = async () => {
  console.log("🟡 Mulai Sync Upload...");

  // Upload barangMasuk
  const jsonMasuk = await AsyncStorage.getItem("barangMasuk");
  const dataMasuk = jsonMasuk ? JSON.parse(jsonMasuk) : [];

  for (const trx of dataMasuk) {
    if (!trx.kodeGdng || !trx.waktuInput || !trx.items?.length) continue;

    const cleanedItems = trx.items.map((item: any) => ({
      namaBarang: item.namaBarang ?? "",
      kode: item.kode ?? "",
      ed: item.ed ?? "",
      large: item.large ?? "",
      medium: item.medium ?? "",
      small: item.small ?? "",
      catatan: item.catatan ?? "",
    }));

    const cleaned = deepClean({
      ...trx,
      jenisForm: trx.jenisForm ?? "Pembelian",
      items: cleanedItems,
    });

    const id = `${trx.kodeGdng}-${trx.jenisForm ?? "Pembelian"}-${
      trx.waktuInput
    }`;

    try {
      await setDoc(doc(db, COLLECTION_MASUK, id), cleaned);
      console.log(`✅ Upload barangMasuk: ${id}`);
    } catch (err) {
      console.error("❌ Gagal upload barangMasuk:", err);
    }
  }

  // Upload barangKeluar
  const jsonKeluar = await AsyncStorage.getItem("barangKeluar");
  const dataKeluar = jsonKeluar ? JSON.parse(jsonKeluar) : [];

  for (const trx of dataKeluar) {
    if (!trx.kodeApos || !trx.waktuInput || !trx.items?.length) continue;

    const cleanedItems = trx.items.map((item: any) => ({
      namaBarang: item.namaBarang ?? "",
      kode: item.kode ?? "",
      large: item.large ?? "",
      medium: item.medium ?? "",
      small: item.small ?? "",
      principle: item.principle ?? "",
      ed: item.ed ?? "",
      catatan: item.catatan ?? "",
    }));

    const cleaned = deepClean({
      ...trx,
      jenisForm: trx.jenisForm ?? "DR",
      items: cleanedItems,
    });

    const id = `${trx.kodeApos}-${trx.jenisForm ?? "DR"}-${trx.waktuInput}`;

    try {
      await setDoc(doc(db, COLLECTION_KELUAR, id), cleaned);
      console.log(`✅ Upload barangKeluar: ${id}`);
    } catch (err) {
      console.error("❌ Gagal upload barangKeluar:", err);
    }
  }

  console.log("🟢 Selesai Sync Upload.");
};

// Download semua data dari Firebase ke AsyncStorage
export const syncDownload = async () => {
  try {
    console.log("⏬ Mulai download dari Firebase...");

    const snapshotMasuk = await getDocs(collection(db, COLLECTION_MASUK));
    const dataMasuk = snapshotMasuk.docs.map((doc) => doc.data());
    await AsyncStorage.setItem("barangMasuk", JSON.stringify(dataMasuk));
    console.log(`✅ Download barangMasuk: ${dataMasuk.length} data`);

    const snapshotKeluar = await getDocs(collection(db, COLLECTION_KELUAR));
    const dataKeluar = snapshotKeluar.docs.map((doc) => doc.data());
    await AsyncStorage.setItem("barangKeluar", JSON.stringify(dataKeluar));
    console.log(`✅ Download barangKeluar: ${dataKeluar.length} data`);

    console.log("🟢 Selesai syncDownload.");
  } catch (err) {
    console.error("❌ Gagal syncDownload:", err);
    throw err;
  }
};

// Menghapus semua histori dari local
export const resetSemuaHistory = async () => {
  await AsyncStorage.removeItem("barangMasuk");
  await AsyncStorage.removeItem("barangKeluar");
  console.log("🧹 Semua histori berhasil dihapus dari lokal.");
};
