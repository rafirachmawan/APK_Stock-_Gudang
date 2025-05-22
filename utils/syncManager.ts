import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Barang } from "./stockManager";

const COLLECTION = "barangMasuk";

// Ambil semua data dari Firestore & simpan ke AsyncStorage
export const syncDownload = async () => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const data: Barang[] = [];
  snapshot.forEach((doc) => {
    data.push(doc.data() as Barang);
  });
  await AsyncStorage.setItem("barangMasuk", JSON.stringify(data));
};

// Upload semua data dari AsyncStorage ke Firestore
export const syncUpload = async () => {
  const jsonValue = await AsyncStorage.getItem("barangMasuk");
  const data: Barang[] = jsonValue ? JSON.parse(jsonValue) : [];

  for (const item of data) {
    const id = `${item.kode}-${item.waktuInput}`;
    await setDoc(doc(db, COLLECTION, id), item);
  }
};
