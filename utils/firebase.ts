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

// ✅ Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDH-0zRYEORIkIfiUlh2Vbd4ZebruFlWtA",
  authDomain: "stockgudang-2c399.firebaseapp.com",
  projectId: "stockgudang-2c399",
  storageBucket: "stockgudang-2c399.appspot.com",
  messagingSenderId: "510255992661",
  appId: "1:510255992661:android:605bd663ff5d839d1ee9dc",
};

// 🔌 Inisialisasi Firebase App & Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Koleksi
const COLLECTION_IN = "barangMasuk";
const COLLECTION_OUT = "barangKeluar";

// 🔽 Download semua data dari Firebase ke local AsyncStorage
export const syncDownload = async () => {
  try {
    // Download barangMasuk
    const snapshotIn = await getDocs(collection(db, COLLECTION_IN));
    const dataIn: Barang[] = [];
    snapshotIn.forEach((doc) => {
      dataIn.push(doc.data() as Barang);
    });
    await AsyncStorage.setItem("barangMasuk", JSON.stringify(dataIn));

    // Download barangKeluar
    const snapshotOut = await getDocs(collection(db, COLLECTION_OUT));
    const dataOut: Barang[] = [];
    snapshotOut.forEach((doc) => {
      dataOut.push(doc.data() as Barang);
    });
    await AsyncStorage.setItem("barangKeluar", JSON.stringify(dataOut));
  } catch (error) {
    console.error("Gagal syncDownload:", error);
    throw error;
  }
};

// 🔼 Upload semua data dari local ke Firebase (sinkronisasi penuh)
export const syncUpload = async () => {
  try {
    // Ambil data lokal
    const [inValue, outValue] = await Promise.all([
      AsyncStorage.getItem("barangMasuk"),
      AsyncStorage.getItem("barangKeluar"),
    ]);

    const dataIn: Barang[] = inValue ? JSON.parse(inValue) : [];
    const dataOut: Barang[] = outValue ? JSON.parse(outValue) : [];

    // ---- Sinkron barangMasuk ----
    const snapshotIn = await getDocs(collection(db, COLLECTION_IN));
    const firebaseInIds = snapshotIn.docs.map((doc) => doc.id);
    const localInIds = dataIn.map((item) => `${item.kode}-${item.waktuInput}`);

    const toDeleteIn = firebaseInIds.filter((id) => !localInIds.includes(id));
    for (const id of toDeleteIn) {
      await deleteDoc(doc(db, COLLECTION_IN, id));
    }
    for (const item of dataIn) {
      const id = `${item.kode}-${item.waktuInput}`;
      await setDoc(doc(db, COLLECTION_IN, id), item);
    }

    // ---- Sinkron barangKeluar ----
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
      await setDoc(doc(db, COLLECTION_OUT, id), item);
    }
  } catch (error) {
    console.error("Gagal syncUpload:", error);
    throw error;
  }
};
