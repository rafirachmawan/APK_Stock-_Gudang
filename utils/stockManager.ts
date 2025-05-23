import AsyncStorage from "@react-native-async-storage/async-storage";

// Struktur data barang
export interface Barang {
  kode: string;
  nama: string;
  stokLarge: number;
  stokMedium: number;
  stokSmall: number;
  ed: string;
  catatan: string;
  waktuInput: string;
  principle: string; // ✅ Brand/principle
}

// 🔢 Hitung stok akhir berdasarkan barangMasuk dan barangKeluar
export const getCurrentStock = async (): Promise<Barang[]> => {
  try {
    const [masuk, keluar] = await Promise.all([
      AsyncStorage.getItem("barangMasuk"),
      AsyncStorage.getItem("barangKeluar"),
    ]);

    const dataMasuk: Barang[] = masuk ? JSON.parse(masuk) : [];
    const dataKeluar: Barang[] = keluar ? JSON.parse(keluar) : [];

    const stockMap = new Map<string, Barang>();

    // Tambahkan barang masuk
    dataMasuk.forEach((item) => {
      if (!stockMap.has(item.kode)) {
        stockMap.set(item.kode, {
          kode: item.kode,
          nama: item.nama,
          stokLarge: item.stokLarge,
          stokMedium: item.stokMedium,
          stokSmall: item.stokSmall,
          ed: item.ed,
          catatan: "",
          waktuInput: "",
          principle: item.principle,
        });
      } else {
        const existing = stockMap.get(item.kode)!;
        existing.stokLarge += item.stokLarge;
        existing.stokMedium += item.stokMedium;
        existing.stokSmall += item.stokSmall;
      }
    });

    // Kurangi dengan barang keluar
    dataKeluar.forEach((item) => {
      const existing = stockMap.get(item.kode);
      if (existing) {
        existing.stokLarge -= item.stokLarge;
        existing.stokMedium -= item.stokMedium;
        existing.stokSmall -= item.stokSmall;

        if (existing.stokLarge < 0) existing.stokLarge = 0;
        if (existing.stokMedium < 0) existing.stokMedium = 0;
        if (existing.stokSmall < 0) existing.stokSmall = 0;
      }
    });

    return Array.from(stockMap.values());
  } catch (error) {
    console.error("Error mendapatkan stok:", error);
    return [];
  }
};

// 🧹 Hapus satu barang dari barangMasuk
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

// 🎯 Tambah barang masuk
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

// ✏️ Update barang masuk berdasarkan kode + waktuInput
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

// 📦 Struktur master barang (opsional)
export interface MasterBarang {
  kode: string;
  nama: string;
  satuan: string;
  kategori: string;
}

// 📥 Ambil master barang
export const getMasterBarang = async (): Promise<MasterBarang[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem("masterBarang");
    return jsonValue ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error("Gagal mengambil master barang:", error);
    return [];
  }
};

// 🗑 Hapus semua data barangMasuk dan barangKeluar
export const resetAllStock = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem("barangMasuk");
    await AsyncStorage.removeItem("barangKeluar");
    console.log("Semua stok berhasil dihapus.");
  } catch (error) {
    console.error("Gagal menghapus semua stok:", error);
  }
};
