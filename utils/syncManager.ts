import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Barang } from "./stockManager";

const COLLECTION_MASUK = "barangMasuk";
const COLLECTION_KELUAR = "barangKeluar";

// Tidak hapus string kosong, hanya undefined yang dibuang
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

export const syncUpload = async () => {
  console.log("🟡 Mulai Sync Upload...");

  // Upload barangMasuk
  const jsonMasuk = await AsyncStorage.getItem("barangMasuk");
  const dataMasuk = jsonMasuk ? JSON.parse(jsonMasuk) : [];

  for (const trx of dataMasuk) {
    if (!trx.kodeGdng || !trx.waktuInput) continue;

    // 🔍 DEBUG: tampilkan isi transaksi
    console.log("📦 Upload barangMasuk:");
    console.log(JSON.stringify(trx, null, 2));

    if (!trx.items || !Array.isArray(trx.items)) {
      console.log("⚠️ Tidak ada items, dilewati");
      continue;
    }

    trx.items.forEach((item: any, index: number) => {
      console.log(`🔹 Item #${index + 1}:`, item);
    });

    // Perbaiki data agar tidak undefined
    const fixedItems = trx.items.map((item: any) => ({
      namaBarang: item.namaBarang ?? "",
      kode: item.kode ?? "",
      ed: item.ed ?? "",
      large: item.large ?? "",
      medium: item.medium ?? "",
      small: item.small ?? "",
      catatan: item.catatan ?? "", // 💡 ini kunci
    }));

    const cleaned = deepClean({
      ...trx,
      items: fixedItems,
    });

    const id = `${trx.kodeGdng}-${trx.waktuInput}`;

    try {
      await setDoc(doc(db, COLLECTION_MASUK, id), cleaned);
      console.log(`✅ Berhasil upload barangMasuk ID: ${id}`);
    } catch (err: any) {
      console.error("❌ Gagal upload barangMasuk:", err);
    }
  }

  // Upload barangKeluar
  const jsonKeluar = await AsyncStorage.getItem("barangKeluar");
  const dataKeluar = jsonKeluar ? JSON.parse(jsonKeluar) : [];

  for (const trx of dataKeluar) {
    if (!trx.kodeApos || !trx.waktuInput) continue;

    console.log("📦 Upload barangKeluar:");
    console.log(JSON.stringify(trx, null, 2));

    const fixedItems =
      trx.items?.map((item: any) => ({
        namaBarang: item.namaBarang ?? "",
        kode: item.kode ?? "",
        large: item.large ?? "",
        medium: item.medium ?? "",
        small: item.small ?? "",
        principle: item.principle ?? "",
        catatan: item.catatan ?? "",
      })) ?? [];

    const cleaned = deepClean({
      ...trx,
      items: fixedItems,
    });

    const id = `${trx.kodeApos}-${trx.waktuInput}`;

    try {
      await setDoc(doc(db, COLLECTION_KELUAR, id), cleaned);
      console.log(`✅ Berhasil upload barangKeluar ID: ${id}`);
    } catch (err: any) {
      console.error("❌ Gagal upload barangKeluar:", err);
    }
  }

  console.log("🟢 Selesai Sync Upload.");
};

export const syncDownload = async () => {
  const snapshot = await getDocs(collection(db, COLLECTION_MASUK));
  const data: Barang[] = [];
  snapshot.forEach((doc) => {
    data.push(doc.data() as Barang);
  });
  await AsyncStorage.setItem("barangMasuk", JSON.stringify(data));
};

export const resetSemuaHistory = async () => {
  await AsyncStorage.removeItem("barangMasuk");
  await AsyncStorage.removeItem("barangKeluar");
};
