// app/(tabs)/out.tsx
// ✅ OutScreen.tsx — akses gudang berdasar user, alokasi dengan leftover,
//    simpan consumed*, leftover*, dan net*,
//    + builder stok anti-race (konsisten dengan StockScreen) +
//    perbaikan leftover (ditambahkan ke stok) dan scope variable (rowItem).

import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import * as XLSX from "xlsx";
import { db } from "../../utils/firebase";
import { expandAllowed, getUserProfile } from "../../utils/userProfile";

const APPSCRIPT_OUT_URL =
  "https://script.google.com/macros/s/AKfycbzkDVSLqa_f8RHi6kFc8DJuutR92q5JATIxuZq3GTlB9jtJNtFsADTJIl1OzwKNcO5R/exec";

/* ===================== Types ===================== */
interface ItemOut {
  namaBarang: string;
  kode: string;
  large: string;
  medium: string;
  small: string;
  principle: string;
  gdg?: string;
  ed?: string;
  catatan?: string;

  consumedL?: string;
  consumedM?: string;
  consumedS?: string;

  leftoverM?: string;
  leftoverS?: string;

  netDL?: string;
  netDM?: string;
  netDS?: string;
}

interface TransaksiOut {
  jenisGudang: string; // gudang asal
  kodeGdng: string;
  kodeApos: string;
  kategori: string;
  catatan: string;
  nomorKendaraan: string;
  namaSopir: string;
  waktuInput: string;
  jenisForm: "DR" | "MB" | "RB";
  tujuanGudang?: string;
  items: ItemOut[];
  createdAt?: any;
  gudangAsal?: string;
  runId?: string;
}

/* ===================== Helpers ===================== */
const formatDate = (date: Date) =>
  `${String(date.getDate()).padStart(2, "0")}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${date.getFullYear()}`;

const toInt = (v: any) => {
  const n = parseInt(String(v ?? "0").trim(), 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
};

const norm = (s: any) =>
  String(s ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]/g, "");

const canonicalGudang = (g: any): string => {
  const x = String(g ?? "").trim();
  const U = x.toUpperCase();
  if (!x) return "Unknown";
  if (U.includes("E (BAD STOCK)")) return "Gudang E (Bad Stock)";
  if (U.includes("BCD")) return "Gudang BCD";
  if (
    U.includes("GUDANG B") ||
    U.includes("GUDANG C") ||
    U.includes("GUDANG D")
  )
    return "Gudang BCD";
  if (U.includes("GUDANG A")) return "Gudang A";
  return x;
};

/* ====== Builder stok fresh anti-race (selaras StockScreen) ====== */
async function buildFreshNetStockMap() {
  const masukSnap = await getDocs(collection(db, "barangMasuk"));
  const keluarSnap = await getDocs(collection(db, "barangKeluar"));

  const map = new Map<
    string,
    { L: number; M: number; S: number; nama: string; principle: string }
  >();

  const toIntAnyLocal = (v: any) => {
    const n = parseInt(String(v ?? "0").trim(), 10);
    return Number.isNaN(n) ? 0 : n;
  };

  // + barangMasuk
  masukSnap.docs.forEach((d) => {
    const trx = d.data() as any;
    const gudang = canonicalGudang(trx.gudang);
    const items = Array.isArray(trx.items) ? trx.items : [];
    items.forEach((rowItem: any) => {
      const key = `${gudang}|${norm(rowItem.kode)}`;
      if (!map.has(key)) {
        map.set(key, {
          L: 0,
          M: 0,
          S: 0,
          nama: rowItem.namaBarang || "",
          principle: rowItem.principle || trx.principle || "-",
        });
      }
      const row = map.get(key)!;
      row.L += toIntAnyLocal(rowItem.large);
      row.M += toIntAnyLocal(rowItem.medium);
      row.S += toIntAnyLocal(rowItem.small);
    });
  });

  // - barangKeluar (asal) — NET hanya utk ADJ-OUT, NORMAL: konsumsi + leftover ditambahkan ke stok
  keluarSnap.docs.forEach((d) => {
    const trx = d.data() as any;
    const items = Array.isArray(trx.items) ? trx.items : [];
    items.forEach((rowItem: any) => {
      const asal = canonicalGudang(
        rowItem.gdg && String(rowItem.gdg).trim() !== ""
          ? rowItem.gdg
          : trx.jenisGudang
      );
      const key = `${asal}|${norm(rowItem.kode)}`;
      if (!map.has(key)) {
        map.set(key, {
          L: 0,
          M: 0,
          S: 0,
          nama: rowItem.namaBarang || "",
          principle: rowItem.principle || trx.principle || "-",
        });
      }
      const row = map.get(key)!;

      const isAdjOut =
        rowItem._adjustment === true &&
        toIntAnyLocal(rowItem.large) === 0 &&
        toIntAnyLocal(rowItem.medium) === 0 &&
        toIntAnyLocal(rowItem.small) === 0;

      if (isAdjOut) {
        const useL = Math.max(0, toIntAnyLocal(rowItem.netDL));
        const useM = Math.max(0, toIntAnyLocal(rowItem.netDM));
        const useS = Math.max(0, toIntAnyLocal(rowItem.netDS));
        row.L = Math.max(0, row.L - useL);
        row.M = Math.max(0, row.M - useM);
        row.S = Math.max(0, row.S - useS);
      } else {
        const consumedL = Math.max(
          0,
          toIntAnyLocal(rowItem.consumedL ?? rowItem.large)
        );
        const consumedM = Math.max(
          0,
          toIntAnyLocal(rowItem.consumedM ?? rowItem.medium)
        );
        const consumedS = Math.max(
          0,
          toIntAnyLocal(rowItem.consumedS ?? rowItem.small)
        );
        const leftoverM = Math.max(0, toIntAnyLocal(rowItem.leftoverM));
        const leftoverS = Math.max(0, toIntAnyLocal(rowItem.leftoverS));

        row.L = Math.max(0, row.L - consumedL);
        row.M = Math.max(0, row.M - consumedM + leftoverM);
        row.S = Math.max(0, row.S - consumedS + leftoverS);
      }
    });
  });

  // + mutasi masuk (tujuan) — hanya MB
  keluarSnap.docs.forEach((d) => {
    const trx = d.data() as any;
    if (String(trx.jenisForm ?? "").toUpperCase() !== "MB") return;
    const tujuan = canonicalGudang(trx.tujuanGudang ?? trx.gudangTujuan);
    const items = Array.isArray(trx.items) ? trx.items : [];
    items.forEach((rowItem: any) => {
      const key = `${tujuan}|${norm(rowItem.kode)}`;
      if (!map.has(key)) {
        map.set(key, {
          L: 0,
          M: 0,
          S: 0,
          nama: rowItem.namaBarang || "",
          principle: rowItem.principle || trx.principle || "-",
        });
      }
      const row = map.get(key)!;
      row.L += toIntAnyLocal(rowItem.large);
      row.M += toIntAnyLocal(rowItem.medium);
      row.S += toIntAnyLocal(rowItem.small);
    });
  });

  return map;
}

/* ===================== Komponen ===================== */
export default function OutScreen() {
  // Header
  const [jenisGudang, setJenisGudang] = useState("");
  const [openJenisGudang, setOpenJenisGudang] = useState(false);
  const [jenisForm, setJenisForm] = useState<"DR" | "MB" | "RB">("DR");
  const [openJenis, setOpenJenis] = useState(false);
  const [tujuanGudang, setTujuanGudang] = useState("");
  const [openTujuanGudang, setOpenTujuanGudang] = useState(false);
  const [kodeApos, setKodeApos] = useState("");
  const [kategori, setKategori] = useState("");
  const [catatan, setCatatan] = useState("");
  const [namaSopir, setNamaSopir] = useState("");
  const [nomorKendaraan, setNomorKendaraan] = useState("");
  const [tanggalTransaksi, setTanggalTransaksi] = useState(new Date());
  const [showDate, setShowDate] = useState(false);

  // Items
  const [itemList, setItemList] = useState<ItemOut[]>([]);
  const [openNamaBarang, setOpenNamaBarang] = useState<boolean[]>([]);
  const [openGudangPerItem, setOpenGudangPerItem] = useState<boolean[]>([]);
  const [openNamaSopir, setOpenNamaSopir] = useState(false);
  const [openPlat, setOpenPlat] = useState(false);

  // Data realtime (untuk UI list)
  const [masukDocs, setMasukDocs] = useState<any[]>([]);
  const [keluarDocs, setKeluarDocs] = useState<any[]>([]);

  // Konversi
  const [konversiData, setKonversiData] = useState<
    { Kode: string; KonversiL: number; KonversiM: number }[]
  >([]);

  // Akses user
  const [allowedGdg, setAllowedGdg] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(null);

  /* ====== Ambil data realtime & profile ====== */
  useEffect(() => {
    const unsubIn = onSnapshot(collection(db, "barangMasuk"), (s) => {
      setMasukDocs(s.docs.map((d) => d.data()));
    });
    const unsubOut = onSnapshot(collection(db, "barangKeluar"), (s) => {
      setKeluarDocs(s.docs.map((d) => d.data()));
    });
    (async () => {
      const prof = await getUserProfile();
      setProfile(prof);
      const expanded = prof ? expandAllowed(prof.allowed) : [];
      setAllowedGdg(expanded);
      if (expanded.length === 1) setJenisGudang(expanded[0]);
    })();
    return () => {
      unsubIn();
      unsubOut();
    };
  }, []);

  // Ambil file konversi (robust header)
  useFocusEffect(
    useCallback(() => {
      const loadKonversi = async () => {
        try {
          const downloadUrl =
            "https://docs.google.com/spreadsheets/d/1Y_o_mSdv6J0mHLlZQvDPL3hRVWQquNn80J3wNb1-bYM/export?format=xlsx";
          const localPath = FileSystem.documentDirectory + "konversi.xlsx";
          const downloadResumable = FileSystem.createDownloadResumable(
            downloadUrl,
            localPath
          );
          const res = await downloadResumable.downloadAsync();
          const uri = res?.uri ?? localPath;

          const b64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const wb = XLSX.read(b64, { type: "base64" });
          const wsname = wb.SheetNames[0];
          const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wsname], {
            raw: true,
          });

          const normKey = (s: any) =>
            String(s ?? "")
              .toLowerCase()
              .replace(/\s+/g, " ")
              .trim();

          const getNum = (v: any) => {
            const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
            return Number.isFinite(n) ? n : 0;
          };

          const konversiFinal = rows.map((r) => {
            const keys = Object.keys(r).reduce<Record<string, any>>(
              (acc, k) => {
                acc[normKey(k)] = r[k];
                return acc;
              },
              {}
            );

            const kode =
              keys["kode"] ??
              keys["code"] ??
              keys["product code"] ??
              keys["item code"] ??
              "";

            // C = Large -> Medium
            const cRaw =
              keys["konversi dari large ke medium"] ??
              keys["konversi large ke medium"] ??
              keys["konversi l ke m"] ??
              keys["konversil"] ??
              keys["l->m"] ??
              keys["l to m"] ??
              keys["konversilargemedium"] ??
              keys["konversi l"] ??
              0;

            // D = Medium -> Small
            const dRaw =
              keys["konversi dari medium ke small"] ??
              keys["konversi medium ke small"] ??
              keys["konversi m ke s"] ??
              keys["konversim"] ??
              keys["m->s"] ??
              keys["m to s"] ??
              keys["konversimediumsmall"] ??
              keys["konversi m"] ??
              0;

            return {
              Kode: String(kode ?? "").trim(),
              KonversiL: getNum(cRaw), // L->M (kolom C)
              KonversiM: getNum(dRaw), // M->S (kolom D)
            };
          });

          setKonversiData(konversiFinal);
        } catch (e) {
          console.error("Gagal ambil konversi:", e);
        }
      };
      loadKonversi();
    }, [])
  );

  /* ====== Stok neto per (gudang,kode) untuk UI (pakai snapshot) ====== */
  const netStockMap = useMemo(() => {
    const map = new Map<
      string,
      { L: number; M: number; S: number; nama: string; principle: string }
    >();

    // + barangMasuk
    for (const trx of masukDocs) {
      const gudang = canonicalGudang(trx.gudang);
      const items = Array.isArray(trx.items) ? trx.items : [];
      for (const rowItem of items) {
        const key = `${gudang}|${norm(rowItem.kode)}`;
        if (!map.has(key)) {
          map.set(key, {
            L: 0,
            M: 0,
            S: 0,
            nama: rowItem.namaBarang || "",
            principle: rowItem.principle || trx.principle || "-",
          });
        }
        const row = map.get(key)!;
        row.L += toInt(rowItem.large);
        row.M += toInt(rowItem.medium);
        row.S += toInt(rowItem.small);
      }
    }

    // - barangKeluar (asal) → konsumsi + leftover (untuk tampilan)
    for (const trx of keluarDocs) {
      const items = Array.isArray(trx.items) ? trx.items : [];
      for (const rowItem of items) {
        const asal = canonicalGudang(
          rowItem.gdg && String(rowItem.gdg).trim() !== ""
            ? rowItem.gdg
            : trx.jenisGudang
        );
        const key = `${asal}|${norm(rowItem.kode)}`;
        if (!map.has(key)) {
          map.set(key, {
            L: 0,
            M: 0,
            S: 0,
            nama: rowItem.namaBarang || "",
            principle: rowItem.principle || trx.principle || "-",
          });
        }
        const row = map.get(key)!;

        const isAdjOut =
          (rowItem as any)._adjustment === true &&
          toInt((rowItem as any).large) === 0 &&
          toInt((rowItem as any).medium) === 0 &&
          toInt((rowItem as any).small) === 0;

        if (isAdjOut) {
          const useL = toInt((rowItem as any).netDL);
          const useM = toInt((rowItem as any).netDM);
          const useS = toInt((rowItem as any).netDS);
          row.L = Math.max(0, row.L - useL);
          row.M = Math.max(0, row.M - useM);
          row.S = Math.max(0, row.S - useS);
        } else {
          const consumedL = toInt(
            (rowItem as any).consumedL ?? (rowItem as any).large
          );
          const consumedM = toInt(
            (rowItem as any).consumedM ?? (rowItem as any).medium
          );
          const consumedS = toInt(
            (rowItem as any).consumedS ?? (rowItem as any).small
          );
          const leftoverM = toInt((rowItem as any).leftoverM);
          const leftoverS = toInt((rowItem as any).leftoverS);

          row.L = Math.max(0, row.L - consumedL);
          row.M = Math.max(0, row.M - consumedM + leftoverM);
          row.S = Math.max(0, row.S - consumedS + leftoverS);
        }
      }
    }

    // + mutasi masuk (tujuan)
    for (const trx of keluarDocs) {
      const tujuan = canonicalGudang(trx.tujuanGudang ?? trx.gudangTujuan);
      if (!tujuan) continue;
      const items = Array.isArray(trx.items) ? trx.items : [];
      for (const rowItem of items) {
        const key = `${tujuan}|${norm(rowItem.kode)}`;
        if (!map.has(key)) {
          map.set(key, {
            L: 0,
            M: 0,
            S: 0,
            nama: rowItem.namaBarang || "",
            principle: rowItem.principle || trx.principle || "-",
          });
        }
        const row = map.get(key)!;
        row.L += toInt(rowItem.large);
        row.M += toInt(rowItem.medium);
        row.S += toInt(rowItem.small);
      }
    }

    return map;
  }, [masukDocs, keluarDocs]);

  // Daftar barang per gudang > 0
  const itemsByGudang = useMemo(() => {
    const result: Record<
      string,
      { label: string; value: string; kode: string; principle: string }[]
    > = {};
    netStockMap.forEach((val, key) => {
      const [gdg, kodeKey] = key.split("|");
      const total = val.L + val.M + val.S;
      if (total <= 0) return;
      if (!result[gdg]) result[gdg] = [];
      result[gdg].push({
        label: val.nama || kodeKey,
        value: val.nama || kodeKey,
        kode: kodeKey, // sudah norm
        principle: val.principle || "-",
      });
    });
    Object.keys(result).forEach((g) =>
      result[g].sort((a, b) => a.label.localeCompare(b.label))
    );
    return result;
  }, [netStockMap]);

  /* ====== Alokasi permintaan dengan konversi (alur tegas) ====== */
  function allocateOut(
    reqL: number,
    reqM: number,
    reqS: number,
    stock: { L: number; M: number; S: number },
    konv: { LtoM: number; MtoS: number }
  ) {
    let consumedL = 0,
      consumedM = 0,
      consumedS = 0;
    let addBackM = 0,
      addBackS = 0;

    const { LtoM, MtoS } = konv;

    // 1) L hanya dari stok L
    if (reqL > 0) {
      const take = Math.min(reqL, stock.L);
      consumedL += take;
      stock.L -= take;
      reqL -= take;
      if (reqL > 0) return null;
    }

    // 2) M: stok M dulu, jika kurang baru dari L via C (L->M)
    if (reqM > 0) {
      const takeM = Math.min(reqM, stock.M);
      consumedM += takeM;
      stock.M -= takeM;
      reqM -= takeM;

      if (reqM > 0) {
        if (LtoM <= 0) return null;
        const needL = Math.ceil(reqM / LtoM);
        const useL = Math.min(stock.L, needL);
        consumedL += useL;
        stock.L -= useL;

        const producedM = useL * LtoM;
        const takeM2 = Math.min(reqM, producedM);
        reqM -= takeM2;

        const leftoverM2 = producedM - takeM2;
        if (leftoverM2 > 0) {
          addBackM += leftoverM2;
          stock.M += leftoverM2;
        }
      }

      if (reqM > 0) return null;
    }

    // 3) S: stok S dulu, lalu dari M via D (M->S), terakhir dari L via C×D
    if (reqS > 0) {
      const takeS = Math.min(reqS, stock.S);
      consumedS += takeS;
      stock.S -= takeS;
      reqS -= takeS;

      if (reqS > 0 && MtoS > 0) {
        const needM = Math.ceil(reqS / MtoS);
        const useM = Math.min(stock.M, needM);
        consumedM += useM;
        stock.M -= useM;

        const producedS = useM * MtoS;
        const takeS2 = Math.min(reqS, producedS);
        reqS -= takeS2;

        const leftoverS2 = producedS - takeS2;
        if (leftoverS2 > 0) {
          addBackS += leftoverS2;
          stock.S += leftoverS2;
        }
      }

      if (reqS > 0) {
        if (LtoM <= 0 || MtoS <= 0) return null;
        const sPerL = LtoM * MtoS;
        const needL2 = Math.ceil(reqS / sPerL);
        const useL2 = Math.min(stock.L, needL2);
        consumedL += useL2;
        stock.L -= useL2;

        const producedS2 = useL2 * sPerL;
        const takeS3 = Math.min(reqS, producedS2);
        reqS -= takeS3;

        const leftoverS3 = producedS2 - takeS3;
        if (leftoverS3 > 0) {
          addBackS += leftoverS3;
          stock.S += leftoverS3;
        }
      }

      if (reqS > 0) return null;
    }

    const netDL = consumedL;
    const netDM = consumedM - addBackM;
    const netDS = consumedS - addBackS;

    return {
      consumedL,
      consumedM,
      consumedS,
      addBackM,
      addBackS,
      netDL,
      netDM,
      netDS,
      leftStock: stock,
    };
  }

  /* ====== Handlers ====== */
  const handleSelectBarang = (index: number, nama: string) => {
    const updated = [...itemList];
    const gdgDipilih = updated[index].gdg || jenisGudang;
    if (!gdgDipilih) {
      Alert.alert("Pilih gudang dahulu untuk item ini");
      return;
    }

    const list = itemsByGudang[canonicalGudang(gdgDipilih)] || [];
    const found = list.find((x) => x.value === nama);
    if (!found) {
      Alert.alert("Barang tidak ada stoknya di gudang ini");
      return;
    }

    updated[index] = {
      ...updated[index],
      namaBarang: nama,
      kode: found.kode, // sudah norm
      principle: found.principle || "-",
      gdg: gdgDipilih,
      large: "",
      medium: "",
      small: "",
    };
    setItemList(updated);
  };

  const handleChangeItem = (i: number, key: keyof ItemOut, value: string) => {
    const updated = [...itemList];
    (updated[i] as any)[key] = value;
    setItemList(updated);
  };

  const addItem = () => {
    setItemList((prev) => [
      ...prev,
      {
        namaBarang: "",
        kode: "",
        large: "",
        medium: "",
        small: "",
        principle: "",
        gdg: "",
      },
    ]);
    setOpenNamaBarang((p) => [...p, false]);
    setOpenGudangPerItem((p) => [...p, false]);
  };

  const removeItem = (index: number) => {
    const updated = [...itemList];
    updated.splice(index, 1);
    setItemList(updated);
    const a = [...openNamaBarang];
    a.splice(index, 1);
    setOpenNamaBarang(a);
    const b = [...openGudangPerItem];
    b.splice(index, 1);
    setOpenGudangPerItem(b);
  };

  const handleSubmit = async () => {
    if (!kodeApos || !jenisGudang || itemList.length === 0) {
      Alert.alert("Harap lengkapi semua data penting");
      return;
    }
    if (!allowedGdg.includes(jenisGudang)) {
      Alert.alert(
        "Akses ditolak",
        "Anda tidak boleh mengeluarkan dari gudang ini."
      );
      return;
    }
    for (let i = 0; i < itemList.length; i++) {
      const g = itemList[i].gdg || jenisGudang;
      if (!allowedGdg.includes(g)) {
        Alert.alert(
          "Akses ditolak",
          `Item #${i + 1}: gudang ${g} tidak diizinkan`
        );
        return;
      }
    }

    // Ambil stok paling baru (selaras StockScreen)
    const freshMap = await buildFreshNetStockMap();

    const waktuInput = tanggalTransaksi.toISOString();
    const tanggalFormatted = formatDate(tanggalTransaksi);
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    const docId = `${kodeApos}-${tanggalFormatted}-${Math.floor(
      Date.now() / 1000
    )}-${rand}`;
    const kodeGdngFinal = jenisForm === "MB" ? itemList[0]?.gdg || "-" : "-";
    const hasilItems: ItemOut[] = [];

    for (const [i, item] of itemList.entries()) {
      const gdgRaw =
        item.gdg && item.gdg.trim() !== "" ? item.gdg : jenisGudang;
      const gdgKey = canonicalGudang(gdgRaw);
      if (!item.kode) {
        Alert.alert(`Pilih barang untuk item #${i + 1}`);
        return;
      }

      const key = `${gdgKey}|${norm(item.kode)}`;
      const cur = freshMap.get(key) || {
        L: 0,
        M: 0,
        S: 0,
        nama: "",
        principle: "-",
      };

      const k = konversiData.find((z) => norm(z.Kode) === norm(item.kode));
      const LtoM = k?.KonversiL ?? 0;
      const MtoS = k?.KonversiM ?? 0;

      const reqL = toInt(item.large);
      const reqM = toInt(item.medium);
      const reqS = toInt(item.small);

      const alloc = allocateOut(
        reqL,
        reqM,
        reqS,
        { L: cur.L, M: cur.M, S: cur.S },
        { LtoM, MtoS }
      );
      if (!alloc) {
        Alert.alert(
          "Stok tidak cukup",
          `${item.namaBarang || item.kode} (L=${cur.L}, M=${cur.M}, S=${cur.S})`
        );
        return;
      }

      hasilItems.push({
        ...item,
        principle: item.principle || cur.principle || "-",
        consumedL: String(alloc.consumedL),
        consumedM: String(alloc.consumedM),
        consumedS: String(alloc.consumedS),
        leftoverM: String(alloc.addBackM),
        leftoverS: String(alloc.addBackS),
        netDL: String(alloc.netDL),
        netDM: String(alloc.netDM),
        netDS: String(alloc.netDS),
      });
    }

    const profileData = profile;
    const operatorUsername = profileData?.username || "-";
    const operatorName =
      (profileData?.guestName && String(profileData.guestName).trim()) ||
      (profileData?.displayName && String(profileData.displayName).trim()) ||
      operatorUsername;
    const operatorGuestName =
      (profileData?.guestName && String(profileData.guestName).trim()) || "";

    const newEntry: TransaksiOut = {
      jenisGudang,
      kodeGdng: kodeGdngFinal,
      kodeApos,
      kategori,
      catatan,
      nomorKendaraan,
      namaSopir,
      jenisForm,
      waktuInput,
      items: hasilItems,
      createdAt: serverTimestamp(),
      gudangAsal: jenisGudang,
      ...(jenisForm === "MB" && { tujuanGudang }),
      runId: docId,
    };

    try {
      await setDoc(doc(db, "barangKeluar", docId), newEntry);

      // ✅ Kirim ke Google Sheets: kolom utama = INPUT operator (L/M/S)
      const itemsForExcel = hasilItems.map((it) => ({
        namaBarang: it.namaBarang,
        kode: it.kode,
        principle: it.principle || "-",
        ed: it.ed || "",
        catatan: it.catatan || "",
        large: String(it.large ?? "0"),
        medium: String(it.medium ?? "0"),
        small: String(it.small ?? "0"),
      }));

      const auditForStock = hasilItems.map((it) => ({
        namaBarang: it.namaBarang,
        kode: it.kode,
        consumedL: String(it.consumedL ?? "0"),
        consumedM: String(it.consumedM ?? "0"),
        consumedS: String(it.consumedS ?? "0"),
        leftoverM: String(it.leftoverM ?? "0"),
        leftoverS: String(it.leftoverS ?? "0"),
        netDL: String(it.netDL ?? "0"),
        netDM: String(it.netDM ?? "0"),
        netDS: String(it.netDS ?? "0"),
      }));

      const sheetPayload = {
        jenisGudang,
        kodeGdng: kodeGdngFinal,
        kodeApos,
        kategori,
        catatan,
        nomorKendaraan,
        namaSopir,
        jenisForm,
        waktuInput,
        ...(jenisForm === "MB" && { tujuanGudang }),

        operatorName,
        operatorUsername,
        operatorGuestName,

        items: itemsForExcel, // ⬅️ hanya INPUT
        audit: auditForStock, // ⬅️ catatan
        sheetMode: "SHOW_INPUT",
      };

      try {
        await fetch(APPSCRIPT_OUT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sheetPayload),
        });
      } catch (e) {
        console.warn("Gagal kirim ke Spreadsheet:", e);
      }

      Alert.alert("✅ Transaksi disimpan");
      setItemList([]);
      setKodeApos("");
      setKategori("");
      setCatatan("");
      setNomorKendaraan("");
      setNamaSopir("");
      setTujuanGudang("");
    } catch (err) {
      console.error("Gagal simpan:", err);
      Alert.alert("Gagal simpan ke server");
    }
  };

  /* ===================== UI ===================== */
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "android" ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.container}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 300 }}
        >
          {/* Gudang asal */}
          <Text style={styles.label}>Jenis Gudang (Asal)</Text>
          <DropDownPicker
            open={openJenisGudang}
            value={jenisGudang}
            setOpen={setOpenJenisGudang}
            setValue={setJenisGudang as any}
            items={allowedGdg.map((g) => ({ label: g, value: g }))}
            placeholder={
              allowedGdg.length ? "Pilih Gudang Asal" : "Tidak ada gudang"
            }
            style={styles.dropdown}
            zIndex={6000}
            listMode="SCROLLVIEW"
          />

          {/* Jenis Form */}
          <Text style={styles.label}>Jenis Form</Text>
          <DropDownPicker
            open={openJenis}
            value={jenisForm}
            setOpen={setOpenJenis}
            setValue={setJenisForm as any}
            items={[
              { label: "Pengiriman (DR)", value: "DR" },
              { label: "Mutasi Stock (MB)", value: "MB" },
              { label: "Return Pembelian (RB)", value: "RB" },
            ]}
            style={styles.dropdown}
            zIndex={5000}
            listMode="SCROLLVIEW"
          />

          {/* Tanggal */}
          <Text style={styles.label}>Tanggal</Text>
          <TouchableOpacity
            onPress={() => setShowDate(true)}
            style={styles.input}
          >
            <Text>{formatDate(tanggalTransaksi)}</Text>
          </TouchableOpacity>
          {showDate && (
            <DateTimePicker
              value={tanggalTransaksi}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                if (Platform.OS === "android") setShowDate(false);
                if (selectedDate) setTanggalTransaksi(selectedDate);
              }}
            />
          )}

          {/* No Faktur */}
          <Text style={styles.label}>No Faktur</Text>
          <TextInput
            style={styles.input}
            value={kodeApos}
            onChangeText={setKodeApos}
          />

          {/* Gudang Tujuan (MB) */}
          {jenisForm === "MB" && (
            <>
              <Text style={styles.label}>Gudang Tujuan</Text>
              <DropDownPicker
                open={openTujuanGudang}
                value={tujuanGudang}
                setOpen={setOpenTujuanGudang}
                setValue={setTujuanGudang as any}
                items={allowedGdg.map((g) => ({ label: g, value: g }))}
                style={styles.dropdown}
                zIndex={4800}
                listMode="SCROLLVIEW"
              />

              <Text style={styles.label}>Keterangan</Text>
              <TextInput
                style={styles.input}
                value={catatan}
                onChangeText={setCatatan}
              />
            </>
          )}

          {/* Non-MB: sopir & plat */}
          {jenisForm !== "MB" && (
            <>
              <Text style={styles.label}>Nama Sopir</Text>
              <DropDownPicker
                open={openNamaSopir}
                value={namaSopir}
                setOpen={setOpenNamaSopir}
                setValue={setNamaSopir as any}
                items={[
                  { label: "Dedi - Deny Mp ", value: "Dedi - Deny MP" },
                  { label: "Deny SP - Eko", value: "Deny SP - Eko" },
                  { label: "Anwar - Afif", value: "Anwar - Afif" },
                  { label: "Fila - Mizan ", value: "Fila - Mizan" },
                  { label: "-", value: "-" },
                ]}
                placeholder="Pilih Sopir"
                style={styles.dropdown}
                zIndex={4400}
                listMode="SCROLLVIEW"
              />

              <Text style={styles.label}>Plat Nomor Kendaraan</Text>
              <DropDownPicker
                open={openPlat}
                value={nomorKendaraan}
                setOpen={setOpenPlat}
                setValue={setNomorKendaraan as any}
                items={[
                  {
                    label: "AG 8574 AJ ( HIJAU ) ( KANVAS )",
                    value: "AG 8574 AJ ( HIJAU ) ( KANVAS )",
                  },
                  {
                    label: "AG 8602 RO ( PUTIH ) ",
                    value: "AG 8602 RO ( PUTIH ) ",
                  },
                  {
                    label: "AG 8796 RU ( KUNING )",
                    value: "AG 8796 RU ( KUNING )",
                  },
                  {
                    label: "AG 9115 RK ( MERAH BOX )",
                    value: "AG 9115 RK ( MERAH BOX )",
                  },
                  {
                    label: "B 9513 KDC ( MERAH KAYU )",
                    value: "B 9513 KDC ( MERAH KAYU )",
                  },
                  {
                    label: "AG 9121 RL ( BIRU ) ",
                    value: "AG 9121 RL ( BIRU ) ",
                  },
                  {
                    label: "AG 8709 AF ( TATA )",
                    value: "AG 8709 AF ( TATA )",
                  },
                ]}
                placeholder="Pilih Plat Nomor"
                style={styles.dropdown}
                zIndex={4300}
                listMode="SCROLLVIEW"
              />
            </>
          )}

          {/* Item List */}
          {itemList.map((item, i) => {
            const gdg = item.gdg || "";
            const candidates = gdg
              ? itemsByGudang[canonicalGudang(gdg)] || []
              : [];
            return (
              <View key={`item-${i}`} style={styles.itemBox}>
                <Text style={styles.label}>Pilih Gudang untuk Barang Ini</Text>
                <DropDownPicker
                  open={openGudangPerItem[i] || false}
                  setOpen={(val) => {
                    const next =
                      typeof val === "function"
                        ? val(openGudangPerItem[i] || false)
                        : val;
                    const copy = [...openGudangPerItem];
                    copy[i] = !!next;
                    setOpenGudangPerItem(copy);
                  }}
                  value={item.gdg}
                  setValue={(v) => {
                    const val =
                      typeof v === "function" ? v(item.gdg || null) : v;
                    const str = String(val ?? "");
                    handleChangeItem(i, "gdg", str);
                    // reset barang ketika ganti gudang
                    handleChangeItem(i, "namaBarang", "");
                    handleChangeItem(i, "kode", "");
                    handleChangeItem(i, "principle", "");
                  }}
                  items={allowedGdg.map((g) => ({ label: g, value: g }))}
                  placeholder="Pilih Gudang"
                  style={styles.dropdown}
                  zIndex={9000 - i}
                  zIndexInverse={i}
                />

                <Text style={styles.label}>Nama Barang</Text>
                <DropDownPicker
                  open={openNamaBarang[i] || false}
                  setOpen={(val) => {
                    const next =
                      typeof val === "function"
                        ? val(openNamaBarang[i] || false)
                        : val;
                    const copy = [...openNamaBarang];
                    copy[i] = !!next;
                    setOpenNamaBarang(copy);
                  }}
                  value={item.namaBarang}
                  setValue={(v) => {
                    const val =
                      typeof v === "function" ? v(item.namaBarang || null) : v;
                    if (!item.gdg && !jenisGudang) {
                      Alert.alert("Pilih gudang dulu");
                      return;
                    }
                    handleSelectBarang(i, String(val ?? "")); // set kode/principle otomatis
                  }}
                  items={candidates}
                  placeholder="Pilih Nama Barang"
                  searchable
                  style={styles.dropdown}
                  listMode="SCROLLVIEW"
                  scrollViewProps={{ nestedScrollEnabled: true }}
                  zIndex={8000 - i}
                  zIndexInverse={i}
                  disabled={!item.gdg && !jenisGudang}
                />

                <Text style={styles.label}>Kode</Text>
                <TextInput
                  style={styles.input}
                  value={item.kode}
                  editable={false}
                />
                <Text style={styles.label}>Principle</Text>
                <TextInput
                  style={styles.input}
                  value={item.principle}
                  editable={false}
                />

                <Text style={styles.label}>Large</Text>
                <TextInput
                  style={styles.input}
                  value={item.large}
                  onChangeText={(t) => handleChangeItem(i, "large", t)}
                  keyboardType="numeric"
                />
                <Text style={styles.label}>Medium</Text>
                <TextInput
                  style={styles.input}
                  value={item.medium}
                  onChangeText={(t) => handleChangeItem(i, "medium", t)}
                  keyboardType="numeric"
                />
                <Text style={styles.label}>Small</Text>
                <TextInput
                  style={styles.input}
                  value={item.small}
                  onChangeText={(t) => handleChangeItem(i, "small", t)}
                  keyboardType="numeric"
                />

                <TouchableOpacity
                  onPress={() => removeItem(i)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeText}>Hapus Item</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <TouchableOpacity onPress={addItem} style={styles.addButton}>
            <Text style={styles.addText}>+ Tambah Item</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
            <Text style={styles.submitText}>Simpan</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

/* ===================== Styles ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  label: { marginBottom: 4, fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  dropdown: { marginBottom: 12 },
  itemBox: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: "#6c757d",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: "center",
  },
  removeButton: {
    backgroundColor: "#dc3545",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },
  removeText: { color: "#fff", fontWeight: "bold" },
  addText: { color: "#fff", fontWeight: "bold" },
  submitButton: {
    backgroundColor: "#28a745",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "bold" },
});
