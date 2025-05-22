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

// ✅ Konfigurasi Firebase dari google-services.json
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

const COLLECTION = "barangMasuk"; // Nama koleksi di Firestore

// 🔽 Ambil semua data dari Firebase dan simpan ke local AsyncStorage
export const syncDownload = async () => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const data: Barang[] = [];
  snapshot.forEach((doc) => {
    data.push(doc.data() as Barang);
  });
  await AsyncStorage.setItem("barangMasuk", JSON.stringify(data));
};

// 🔼 Sinkronisasi penuh: Hapus data lama di Firebase, lalu upload ulang dari lokal
export const syncUpload = async () => {
  const jsonValue = await AsyncStorage.getItem("barangMasuk");
  const localData: Barang[] = jsonValue ? JSON.parse(jsonValue) : [];

  // Ambil semua ID dari Firestore
  const snapshot = await getDocs(collection(db, COLLECTION));
  const firebaseIds = snapshot.docs.map((doc) => doc.id);
  const localIds = localData.map((item) => `${item.kode}-${item.waktuInput}`);

  // 🗑️ Hapus dokumen di Firebase yang tidak ada di lokal
  const toDelete = firebaseIds.filter((id) => !localIds.includes(id));
  for (const id of toDelete) {
    await deleteDoc(doc(db, COLLECTION, id));
  }

  // 🔼 Upload semua data lokal ke Firebase
  for (const item of localData) {
    const id = `${item.kode}-${item.waktuInput}`;
    await setDoc(doc(db, COLLECTION, id), item);
  }
};
