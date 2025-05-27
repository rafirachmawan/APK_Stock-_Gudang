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
  principle: string;
  kategori: string;
  nomorKendaraan?: string;
  namaSopir?: string;
}

export const getCurrentStock = async (): Promise<Barang[]> => {
  try {
    const [masuk, keluar] = await Promise.all([
      AsyncStorage.getItem("barangMasuk"),
      AsyncStorage.getItem("barangKeluar"),
    ]);

    const dataMasuk = JSON.parse(masuk || "[]");
    const dataKeluar = JSON.parse(keluar || "[]");

    if (!Array.isArray(dataMasuk) || !Array.isArray(dataKeluar)) {
      throw new Error("Format data stok tidak valid");
    }

    const stockMap = new Map<string, Barang>();

    dataMasuk.forEach((form: any) => {
      if (!form.items || !Array.isArray(form.items)) return;
      form.items.forEach((item: any) => {
        const kode = item.kode;
        if (!stockMap.has(kode)) {
          stockMap.set(kode, {
            kode,
            nama: item.namaBarang,
            stokLarge: parseInt(item.large) || 0,
            stokMedium: parseInt(item.medium) || 0,
            stokSmall: parseInt(item.small) || 0,
            ed: "",
            catatan: form.catatan,
            waktuInput: form.waktuInput,
            principle: form.principle,
            kategori: form.gudang,
            nomorKendaraan: form.nomorKendaraan || "",
            namaSopir: form.namaSopir || "",
          });
        } else {
          const existing = stockMap.get(kode)!;
          existing.stokLarge += parseInt(item.large) || 0;
          existing.stokMedium += parseInt(item.medium) || 0;
          existing.stokSmall += parseInt(item.small) || 0;
        }
      });
    });

    dataKeluar.forEach((item: any) => {
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

export const deleteBarang = async (
  kode: string,
  waktuInput: string
): Promise<boolean> => {
  try {
    const jsonValue = await AsyncStorage.getItem("barangMasuk");
    const data: any[] = jsonValue ? JSON.parse(jsonValue) : [];

    const newData = data.filter(
      (form) =>
        !form.items.some(
          (item: any) => item.kode === kode && form.waktuInput === waktuInput
        )
    );

    await AsyncStorage.setItem("barangMasuk", JSON.stringify(newData));
    return true;
  } catch (error) {
    console.error("Gagal menghapus barang:", error);
    return false;
  }
};

export const resetAllStock = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem("barangMasuk");
    await AsyncStorage.removeItem("barangKeluar");
    console.log("Semua stok berhasil dihapus.");
  } catch (error) {
    console.error("Gagal menghapus semua stok:", error);
  }
};
