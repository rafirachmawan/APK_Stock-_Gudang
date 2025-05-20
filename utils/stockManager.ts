import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Barang {
  kode: string;
  nama: string;
  stokLarge: number;
  stokMedium: number;
  stokSmall: number;
  ed: string;
  catatan: string;
  waktuInput: string;
}

export const getCurrentStock = async (): Promise<Barang[]> => {
  try {
    const [masuk, keluar] = await Promise.all([
      AsyncStorage.getItem("barangMasuk"),
      AsyncStorage.getItem("barangKeluar"),
    ]);

    const dataMasuk: Barang[] = masuk ? JSON.parse(masuk) : [];
    const dataKeluar: Barang[] = keluar ? JSON.parse(keluar) : [];

    const stockMap = new Map<string, Barang>();

    // Proses data masuk
    dataMasuk.forEach((item) => {
      if (!stockMap.has(item.kode)) {
        stockMap.set(item.kode, { ...item });
      } else {
        const existing = stockMap.get(item.kode)!;
        existing.stokLarge += item.stokLarge;
        existing.stokMedium += item.stokMedium;
        existing.stokSmall += item.stokSmall;
      }
    });

    // Proses data keluar
    dataKeluar.forEach((item) => {
      if (!stockMap.has(item.kode)) return;
      const existing = stockMap.get(item.kode)!;
      existing.stokLarge -= item.stokLarge;
      existing.stokMedium -= item.stokMedium;
      existing.stokSmall -= item.stokSmall;
    });

    return Array.from(stockMap.values());
  } catch (error) {
    console.error("Error mendapatkan stok:", error);
    return [];
  }
};

export const deleteBarang = async (
  kode: string,
  waktuInput: string
): Promise<boolean> => {
  try {
    const jsonValue = await AsyncStorage.getItem("barangMasuk");
    const data: Barang[] = jsonValue ? JSON.parse(jsonValue) : [];

    const newData = data.filter(
      (item) => !(item.kode === kode && item.waktuInput === waktuInput)
    );

    await AsyncStorage.setItem("barangMasuk", JSON.stringify(newData));
    return true;
  } catch (error) {
    console.error("Gagal menghapus barang:", error);
    return false;
  }
};

//
export interface MasterBarang {
  kode: string;
  nama: string;
  satuan: string;
  kategori: string;
}

// Fungsi untuk mendapatkan data master barang
export const getMasterBarang = async (): Promise<MasterBarang[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem("masterBarang");
    return jsonValue ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error("Gagal mengambil master barang:", error);
    return [];
  }
};

// Fungsi untuk menambah barang masuk dengan referensi ke master barang
export const addBarangMasuk = async (barang: Barang): Promise<boolean> => {
  try {
    const jsonValue = await AsyncStorage.getItem("barangMasuk");
    const data: Barang[] = jsonValue ? JSON.parse(jsonValue) : [];
    data.push(barang);
    await AsyncStorage.setItem("barangMasuk", JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Gagal menambah barang masuk:", error);
    return false;
  }
};

// Fungsi untuk update barang masuk
export const updateBarangMasuk = async (
  kodeLama: string,
  waktuInputLama: string,
  barangBaru: Barang
): Promise<boolean> => {
  try {
    const jsonValue = await AsyncStorage.getItem("barangMasuk");
    const data: Barang[] = jsonValue ? JSON.parse(jsonValue) : [];

    const newData = data.map((item) =>
      item.kode === kodeLama && item.waktuInput === waktuInputLama
        ? barangBaru
        : item
    );

    await AsyncStorage.setItem("barangMasuk", JSON.stringify(newData));
    return true;
  } catch (error) {
    console.error("Gagal mengupdate barang masuk:", error);
    return false;
  }
};
