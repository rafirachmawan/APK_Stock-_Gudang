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
const COLLECTION_GENERATE = "hasilGenerate";

// ------------------ SYNC DOWNLOAD ------------------
export const syncDownload = async () => {
  try {
    // Barang Masuk
    const snapshotIn = await getDocs(collection(db, COLLECTION_IN));
    const groupMapIn = new Map<string, any>();
    snapshotIn.forEach((docSnap) => {
      const d = docSnap.data();
      const id = `${d.kodeGdng}-${d.waktuInput}`;
      if (!groupMapIn.has(id)) {
        groupMapIn.set(id, {
          gudang: d.kategori ?? "",
          kodeGdng: d.kodeGdng ?? "",
          kodeApos: d.kodeApos ?? "",
          suratJalan: d.suratJalan ?? "",
          principle: d.principle ?? "",
          catatan: d.catatan ?? "",
          waktuInput: d.waktuInput,
          items: [],
        });
      }
      const parent = groupMapIn.get(id);
      parent.items.push({
        namaBarang: d.nama ?? "",
        kode: d.kode ?? "",
        large: String(d.stokLarge ?? 0),
        medium: String(d.stokMedium ?? 0),
        small: String(d.stokSmall ?? 0),
        ed: d.ed ?? "",
        catatan: d.catatan ?? "",
      });
    });
    const groupedIn = [...groupMapIn.values()];
    await AsyncStorage.setItem("barangMasuk", JSON.stringify(groupedIn));

    // Barang Keluar
    const snapshotOut = await getDocs(collection(db, COLLECTION_OUT));
    const groupMapOut = new Map<string, any>();
    snapshotOut.forEach((docSnap) => {
      const d = docSnap.data();
      const id = `${d.kodeGdng}-${d.waktuInput}`;
      if (!groupMapOut.has(id)) {
        groupMapOut.set(id, {
          kodeApos: d.kodeApos ?? "",
          kodeGdng: d.kodeGdng ?? "",
          kategori: d.kategori ?? "",
          catatan: d.catatan ?? "",
          nomorKendaraan: d.nomorKendaraan ?? "",
          namaSopir: d.namaSopir ?? "",
          waktuInput: d.waktuInput,
          items: [],
        });
      }
      const parent = groupMapOut.get(id);
      parent.items.push({
        namaBarang: d.nama ?? "",
        kode: d.kode ?? "",
        large: String(d.stokLarge ?? 0),
        medium: String(d.stokMedium ?? 0),
        small: String(d.stokSmall ?? 0),
        ed: d.ed ?? "",
        principle: d.principle ?? "",
        catatan: d.catatan ?? "",
      });
    });
    const groupedOut = [...groupMapOut.values()];
    await AsyncStorage.setItem("barangKeluar", JSON.stringify(groupedOut));

    // Hasil Generate
    const snapshotGen = await getDocs(collection(db, COLLECTION_GENERATE));
    const dataGenerate = snapshotGen.docs.map((doc) => doc.data());
    await AsyncStorage.setItem("hasilGenerate", JSON.stringify(dataGenerate));

    console.log("✅ syncDownload selesai mengambil data terbaru.");
  } catch (error) {
    console.error("❌ Gagal syncDownload:", error);
    throw error;
  }
};

// ------------------ SYNC UPLOAD ------------------
export const syncUpload = async () => {
  try {
    const [inValue, outValue, genValue] = await Promise.all([
      AsyncStorage.getItem("barangMasuk"),
      AsyncStorage.getItem("barangKeluar"),
      AsyncStorage.getItem("hasilGenerate"),
    ]);

    const dataIn: any[] = inValue ? JSON.parse(inValue) : [];
    const dataOut: any[] = outValue ? JSON.parse(outValue) : [];
    const dataGen: any[] = genValue ? JSON.parse(genValue) : [];

    const flatIn: Barang[] = [];
    for (const form of dataIn) {
      const waktuInput = form.waktuInput;
      const base = {
        kodeGdng: form.kodeGdng ?? "",
        kodeApos: form.kodeApos ?? "",
        suratJalan: form.suratJalan ?? "",
        principle: form.principle ?? "",
        catatan: typeof form.catatan === "string" ? form.catatan : "",
        waktuInput: waktuInput ?? new Date().toISOString(),
        kategori: form.gudang ?? "",
      };
      for (const item of form.items ?? []) {
        flatIn.push({
          ...base,
          kode: item.kode ?? "",
          nama: item.namaBarang ?? "",
          stokLarge: parseInt(item.large) || 0,
          stokMedium: parseInt(item.medium) || 0,
          stokSmall: parseInt(item.small) || 0,
          ed: item.ed ?? "",
          catatan: typeof item.catatan === "string" ? item.catatan : "",
        });
      }
    }

    const flatOut: Barang[] = [];
    for (const trx of dataOut) {
      const waktuInput = trx.waktuInput;
      const base = {
        kodeApos: trx.kodeApos ?? "",
        kodeGdng: trx.kodeGdng ?? "",
        kategori: trx.kategori ?? "",
        catatan: trx.catatan ?? "",
        waktuInput: waktuInput ?? new Date().toISOString(),
        nomorKendaraan: trx.nomorKendaraan ?? "",
        namaSopir: trx.namaSopir ?? "",
      };
      for (const item of trx.items ?? []) {
        flatOut.push({
          ...base,
          kode: item.kode ?? "",
          nama: item.namaBarang ?? "",
          stokLarge: parseInt(item.large) || 0,
          stokMedium: parseInt(item.medium) || 0,
          stokSmall: parseInt(item.small) || 0,
          ed: item.ed ?? "",
          principle: item.principle ?? "",
          catatan: item.catatan ?? "",
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
    const localOutIds = flatOut.map(
      (item) => `${item.kode}-${item.waktuInput}`
    );
    const toDeleteOut = firebaseOutIds.filter(
      (id) => !localOutIds.includes(id)
    );
    for (const id of toDeleteOut) {
      await deleteDoc(doc(db, COLLECTION_OUT, id));
    }
    for (const item of flatOut) {
      const id = `${item.kode}-${item.waktuInput}`;
      if (item.kode && item.waktuInput) {
        await setDoc(doc(db, COLLECTION_OUT, id), item);
      }
    }

    for (const item of dataGen) {
      const id = `${item.brand}-${item.waktu}`;
      await setDoc(doc(db, COLLECTION_GENERATE, id), item);
    }

    console.log("✅ Upload barangMasuk, barangKeluar, hasilGenerate selesai.");
  } catch (error) {
    console.error("❌ Gagal syncUpload:", error);
    throw error;
  }
};

// ------------------ RESET ------------------
export const resetSemuaHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
    console.log("✅ Semua histori berhasil dihapus dari lokal");
  } catch (error) {
    console.error("❌ Gagal menghapus histori:", error);
  }
};
