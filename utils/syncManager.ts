import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Barang } from "./stockManager";

const COLLECTION_MASUK = "barangMasuk";
const COLLECTION_KELUAR = "barangKeluar";

// Fungsi untuk membersihkan data sebelum dikirim ke Firebase
const deepClean = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(deepClean).filter((v) => v !== undefined);
  } else if (typeof obj === "object" && obj !== null) {
    const cleaned: any = {};
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        cleaned[k] = deepClean(v);
      }
    });
    return cleaned;
  }
  return obj;
};

export const syncUpload = async () => {
  // Upload barangMasuk
  const jsonMasuk = await AsyncStorage.getItem("barangMasuk");
  const dataMasuk = jsonMasuk ? JSON.parse(jsonMasuk) : [];

  for (const trx of dataMasuk) {
    if (!trx.kodeGdng || !trx.waktuInput) continue;
    const id = `${trx.kodeGdng}-${trx.waktuInput}`;
    const cleaned = deepClean(trx);
    await setDoc(doc(db, COLLECTION_MASUK, id), cleaned);
  }

  // Upload barangKeluar
  const jsonKeluar = await AsyncStorage.getItem("barangKeluar");
  const dataKeluar = jsonKeluar ? JSON.parse(jsonKeluar) : [];

  for (const trx of dataKeluar) {
    if (!trx.kodeApos || !trx.waktuInput) continue;
    const id = `${trx.kodeApos}-${trx.waktuInput}`;
    const cleaned = deepClean(trx);
    await setDoc(doc(db, COLLECTION_KELUAR, id), cleaned);
  }
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
