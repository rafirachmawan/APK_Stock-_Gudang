// firebase.ts - Final revisi untuk mencegah ID undefined dan menyesuaikan format untuk halaman detail
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  setDoc,
} from "firebase/firestore";
import { Barang } from "./stockManager";

const firebaseConfig = {
  apiKey: "AIzaSyDH-0zRYEORIkIfiUlh2Vbd4ZebruFlWtA",
  authDomain: "stockgudang-2c399.firebaseapp.com",
  projectId: "stockgudang-2c399",
  storageBucket: "stockgudang-2c399.appspot.com",
  messagingSenderId: "510255992661",
  appId: "1:510255992661:android:605bd663ff5d839d1ee9dc",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const COLLECTION_IN = "barangMasuk";
const COLLECTION_OUT = "barangKeluar";

export const syncDownload = async () => {
  try {
    const snapshotIn = await getDocs(collection(db, COLLECTION_IN));
    const groupedIn: any[] = [];
    const groupMap = new Map<string, any>();

    snapshotIn.forEach((docSnap) => {
      const d = docSnap.data();
      const id = `${d.kodeGdng}-${d.waktuInput}`;

      if (!groupMap.has(id)) {
        groupMap.set(id, {
          gudang: d.kategori || "",
          kodeGdng: d.kodeGdng || "",
          kodeApos: d.kodeApos || "",
          suratJalan: d.suratJalan || "",
          principle: d.principle || "",
          catatan: d.catatan || "",
          waktuInput: d.waktuInput,
          items: [],
        });
      }

      const parent = groupMap.get(id);
      parent.items.push({
        namaBarang: d.nama,
        kode: d.kode,
        large: String(d.stokLarge),
        medium: String(d.stokMedium),
        small: String(d.stokSmall),
        ed: d.ed,
      });
    });

    groupedIn.push(...groupMap.values());
    await AsyncStorage.setItem("barangMasuk", JSON.stringify(groupedIn));

    const snapshotOut = await getDocs(collection(db, COLLECTION_OUT));
    const dataOut: Barang[] = [];
    snapshotOut.forEach((doc) => {
      dataOut.push(doc.data() as Barang);
    });
    await AsyncStorage.setItem("barangKeluar", JSON.stringify(dataOut));
  } catch (error) {
    console.error("❌ Gagal syncDownload:", error);
    throw error;
  }
};

export const syncUpload = async () => {
  try {
    const [inValue, outValue] = await Promise.all([
      AsyncStorage.getItem("barangMasuk"),
      AsyncStorage.getItem("barangKeluar"),
    ]);

    const dataIn: any[] = inValue ? JSON.parse(inValue) : [];
    const dataOut: Barang[] = outValue ? JSON.parse(outValue) : [];

    const flatIn: Barang[] = [];
    for (const form of dataIn) {
      const waktuInput = form.waktuInput;
      const base = {
        kodeGdng: form.kodeGdng,
        kodeApos: form.kodeApos,
        suratJalan: form.suratJalan,
        principle: form.principle,
        catatan: form.catatan,
        waktuInput,
        kategori: form.gudang,
      };

      for (const item of form.items) {
        flatIn.push({
          ...base,
          kode: item.kode,
          nama: item.namaBarang,
          stokLarge: parseInt(item.large) || 0,
          stokMedium: parseInt(item.medium) || 0,
          stokSmall: parseInt(item.small) || 0,
          ed: item.ed,
        });
      }
    }

    const snapshotIn = await getDocs(collection(db, COLLECTION_IN));
    const firebaseInIds = snapshotIn.docs.map((doc) => doc.id);
    const localInIds = flatIn.map((item) => `${item.kode}-${item.waktuInput}`);
    const toDeleteIn = firebaseInIds.filter((id) => !localInIds.includes(id));
    for (const id of toDeleteIn) {
      await deleteDoc(doc(db, COLLECTION_IN, id));
    }
    for (const item of flatIn) {
      const id = `${item.kode}-${item.waktuInput}`;
      if (item.kode && item.waktuInput) {
        await setDoc(doc(db, COLLECTION_IN, id), item);
      }
    }

    const snapshotOut = await getDocs(collection(db, COLLECTION_OUT));
    const firebaseOutIds = snapshotOut.docs.map((doc) => doc.id);
    const localOutIds = dataOut.map(
      (item) => `${item.kode}-${item.waktuInput}`
    );
    const toDeleteOut = firebaseOutIds.filter(
      (id) => !localOutIds.includes(id)
    );
    for (const id of toDeleteOut) {
      await deleteDoc(doc(db, COLLECTION_OUT, id));
    }
    for (const item of dataOut) {
      const id = `${item.kode}-${item.waktuInput}`;
      if (item.kode && item.waktuInput) {
        await setDoc(doc(db, COLLECTION_OUT, id), item);
      }
    }
  } catch (error) {
    console.error("❌ Gagal syncUpload:", error);
    throw error;
  }
};

export const resetSemuaHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem("barangMasuk");
    await AsyncStorage.removeItem("barangKeluar");
    console.log("✅ Semua histori berhasil dihapus dari lokal");
  } catch (error) {
    console.error("❌ Gagal menghapus histori:", error);
  }
};
