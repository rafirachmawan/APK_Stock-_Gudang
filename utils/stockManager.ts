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

    // Proses barang masuk
    dataMasuk.forEach((form: any) => {
      if (!form.items || !Array.isArray(form.items)) return;

      form.items.forEach((item: any) => {
        const kode = item.kode;
        const key = kode;

        const large = parseInt(item.large) || 0;
        const medium = parseInt(item.medium) || 0;
        const small = parseInt(item.small) || 0;

        if (!stockMap.has(key)) {
          stockMap.set(key, {
            kode,
            nama: item.namaBarang,
            stokLarge: large,
            stokMedium: medium,
            stokSmall: small,
            ed: item.ed || "-",
            catatan: item.catatan || form.catatan || "",
            waktuInput: form.waktuInput,
            principle: form.principle,
            kategori: form.gudang,
            nomorKendaraan: form.nomorKendaraan || "",
            namaSopir: form.namaSopir || "",
          });
        } else {
          const existing = stockMap.get(key)!;
          existing.stokLarge += large;
          existing.stokMedium += medium;
          existing.stokSmall += small;

          if (item.ed) {
            const currentED = new Date(existing.ed || "1900-01-01");
            const newED = new Date(item.ed);
            if (newED > currentED) {
              existing.ed = item.ed;
            }
          }
        }
      });
    });

    // Proses barang keluar
    dataKeluar.forEach((trx: any) => {
      if (!trx.items || !Array.isArray(trx.items)) return;

      trx.items.forEach((item: any) => {
        const kode = item.kode;
        const existing = stockMap.get(kode);

        if (existing) {
          existing.stokLarge -= parseInt(item.large) || 0;
          existing.stokMedium -= parseInt(item.medium) || 0;
          existing.stokSmall -= parseInt(item.small) || 0;

          if (existing.stokLarge < 0) existing.stokLarge = 0;
          if (existing.stokMedium < 0) existing.stokMedium = 0;
          if (existing.stokSmall < 0) existing.stokSmall = 0;
        }
      });
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

// 🔄 Fungsi opsional untuk migrasi data lama (flat item) ke bentuk transaksi
export const migrateOldOutFormat = async (): Promise<void> => {
  try {
    const json = await AsyncStorage.getItem("barangKeluar");
    const oldData = json ? JSON.parse(json) : [];

    const grouped: Record<string, any> = {};

    for (const item of oldData) {
      if (!item.kodeApos || item.items) continue; // skip jika sudah format baru

      const key = item.kodeApos;
      if (!grouped[key]) {
        grouped[key] = {
          kodeApos: item.kodeApos,
          kodeGdng: item.kodeGdng || "",
          kategori: item.kategori || "",
          catatan: item.catatan || "",
          nomorKendaraan: item.nomorKendaraan || "",
          namaSopir: item.namaSopir || "",
          waktuInput: item.waktuInput || new Date().toISOString(),
          items: [],
        };
      }

      grouped[key].items.push({
        namaBarang: item.nama || item.namaBarang,
        kode: item.kode,
        large: item.stokLarge || 0,
        medium: item.stokMedium || 0,
        small: item.stokSmall || 0,
        principle: item.principle || "",
        ed: item.ed || "",
        catatan: item.catatan || "",
      });
    }

    const final = Object.values(grouped);
    await AsyncStorage.setItem("barangKeluar", JSON.stringify(final));
    console.log("✅ Migrasi selesai. Data sudah dalam format transaksi.");
  } catch (error) {
    console.error("Gagal migrasi data lama:", error);
  }
};
