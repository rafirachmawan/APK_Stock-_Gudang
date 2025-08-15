// ✅ OutScreen.tsx — akses gudang berdasar user, principle auto, alokasi dengan leftover
//    dan simpan NET DEDUCTION (netDL/netDM/netDS) agar stok selalu akurat.

import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import {
  collection,
  doc,
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

/* ====== URL Apps Script BARANG KELUAR ====== */
const APPSCRIPT_OUT_URL =
  "https://script.google.com/macros/s/AKfycbzYtiZ87LBEJWjOnAF80W__inuO9dYNOdA8JgijUmonSmV7kG_BhElizoT22-fbZOE1/exec";

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

  // Pemakaian kotor (sumber):
  consumedL?: string;
  consumedM?: string;
  consumedS?: string;

  // Sisa pecahan kembali ke stok:
  leftoverM?: string; // sisa M dari L→M
  leftoverS?: string; // sisa S dari M→S atau L→M→S

  // 🔑 Pemakaian bersih (langsung mengurangi stok):
  netDL?: string; // net deduction Large
  netDM?: string; // net deduction Medium
  netDS?: string; // net deduction Small
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

  // Data realtime
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

  // Ambil file konversi (dukung 2 versi header)
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
          const { uri } = await downloadResumable.downloadAsync();
          const b64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const workbook = XLSX.read(b64, { type: "base64" });
          const wsname = workbook.SheetNames[0];
          const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[wsname]);
          const konversiFinal = sheet.map((row: any) => ({
            Kode: String(row["Kode"] ?? "").trim(),
            KonversiL: parseInt(
              (row["KonversiL"] ??
                row["Konversi Dari Large Ke Medium"] ??
                "0") as string,
              10
            ),
            KonversiM: parseInt(
              (row["KonversiM"] ??
                row["Konversi Dari Medium Ke Small"] ??
                "0") as string,
              10
            ),
          }));
          setKonversiData(konversiFinal);
        } catch (e) {
          console.error("Gagal ambil konversi:", e);
        }
      };
      loadKonversi();
    }, [])
  );

  /* ====== Stok neto per (gudang,kode) ====== */
  const netStockMap = useMemo(() => {
    const map = new Map<
      string,
      { L: number; M: number; S: number; nama: string; principle: string }
    >();

    // + barangMasuk
    for (const trx of masukDocs) {
      const gudang = trx.gudang || "Unknown";
      const items = Array.isArray(trx.items) ? trx.items : [];
      for (const it of items) {
        const key = `${gudang}|${norm(it.kode)}`;
        if (!map.has(key)) {
          map.set(key, {
            L: 0,
            M: 0,
            S: 0,
            nama: it.namaBarang || "",
            principle: it.principle || trx.principle || "-",
          });
        }
        const row = map.get(key)!;
        row.L += toInt(it.large);
        row.M += toInt(it.medium);
        row.S += toInt(it.small);
      }
    }

    // - barangKeluar (asal) → pakai NET DEDUCTION bila tersedia
    for (const trx of keluarDocs) {
      const items = Array.isArray(trx.items) ? trx.items : [];
      for (const it of items) {
        const asal =
          it.gdg && String(it.gdg).trim() !== "" ? it.gdg : trx.jenisGudang;
        const key = `${asal}|${norm(it.kode)}`;
        if (!map.has(key)) {
          map.set(key, {
            L: 0,
            M: 0,
            S: 0,
            nama: it.namaBarang || "",
            principle: it.principle || trx.principle || "-",
          });
        }
        const row = map.get(key)!;

        // Prefer netDL/netDM/netDS → jika tidak ada, fallback ke consumed*, lalu ke input lama
        const useL = toInt((it as any).netDL ?? it.consumedL ?? it.large);
        const useM = toInt((it as any).netDM ?? it.consumedM ?? it.medium);
        const useS = toInt((it as any).netDS ?? it.consumedS ?? it.small);

        row.L = Math.max(0, row.L - useL);
        row.M = Math.max(0, row.M - useM);
        row.S = Math.max(0, row.S - useS);
      }
    }

    // + mutasi masuk (tujuan) — tetap menambah sesuai nilai input (barang diterima)
    for (const trx of keluarDocs) {
      if (!trx.gudangTujuan) continue;
      const tujuan = trx.gudangTujuan;
      const items = Array.isArray(trx.items) ? trx.items : [];
      for (const it of items) {
        const key = `${tujuan}|${norm(it.kode)}`;
        if (!map.has(key)) {
          map.set(key, {
            L: 0,
            M: 0,
            S: 0,
            nama: it.namaBarang || "",
            principle: it.principle || trx.principle || "-",
          });
        }
        const row = map.get(key)!;
        // Di tujuan, yang diterima adalah sesuai REQUEST (bukan consumed*)
        row.L += toInt(it.large);
        row.M += toInt(it.medium);
        row.S += toInt(it.small);
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
        kode: kodeKey,
        principle: val.principle || "-",
      });
    });
    Object.keys(result).forEach((g) =>
      result[g].sort((a, b) => a.label.localeCompare(b.label))
    );
    return result;
  }, [netStockMap]);

  /* ====== Alokasi permintaan dengan konversi ====== */
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

    // L: hanya pakai L
    if (reqL > 0) {
      const useL = Math.min(reqL, stock.L);
      consumedL += useL;
      stock.L -= useL;
      reqL -= useL;
      if (reqL > 0) return null;
    }

    // M: pakai M lalu L→M
    if (reqM > 0) {
      const useM = Math.min(reqM, stock.M);
      consumedM += useM;
      stock.M -= useM;
      reqM -= useM;

      if (reqM > 0 && konv.LtoM > 0) {
        const needL = Math.ceil(reqM / konv.LtoM);
        const useFromL = Math.min(stock.L, needL);
        consumedL += useFromL;
        stock.L -= useFromL;

        const producedM = useFromL * konv.LtoM;
        const takeM = Math.min(reqM, producedM);
        reqM -= takeM;

        const leftoverM = producedM - takeM;
        if (leftoverM > 0) {
          addBackM += leftoverM;
          stock.M += leftoverM; // kembali ke stok
        }
      }

      if (reqM > 0) return null;
    }

    // S: pakai S, lalu M→S, lalu L→M→S
    if (reqS > 0) {
      const useS = Math.min(reqS, stock.S);
      consumedS += useS;
      stock.S -= useS;
      reqS -= useS;

      if (reqS > 0 && konv.MtoS > 0) {
        const needM = Math.ceil(reqS / konv.MtoS);
        const useM2 = Math.min(stock.M, needM);
        consumedM += useM2;
        stock.M -= useM2;

        const producedS1 = useM2 * konv.MtoS;
        const takeS1 = Math.min(reqS, producedS1);
        reqS -= takeS1;

        const leftoverS1 = producedS1 - takeS1;
        if (leftoverS1 > 0) {
          addBackS += leftoverS1;
          stock.S += leftoverS1;
        }
      }

      if (reqS > 0 && konv.LtoM > 0 && konv.MtoS > 0) {
        const sPerL = konv.LtoM * konv.MtoS;
        const needL2 = Math.ceil(reqS / sPerL);
        const useL2 = Math.min(stock.L, needL2);
        consumedL += useL2;
        stock.L -= useL2;

        const producedS2 = useL2 * sPerL;
        const takeS2 = Math.min(reqS, producedS2);
        reqS -= takeS2;

        const leftoverS2 = producedS2 - takeS2;
        if (leftoverS2 > 0) {
          addBackS += leftoverS2;
          stock.S += leftoverS2;
        }
      }

      if (reqS > 0) return null;
    }

    // 🔑 pemakaian bersih
    const netDL = consumedL; // L tidak punya leftover
    const netDM = consumedM - addBackM; // M yang benar-benar hilang dari stok
    const netDS = consumedS - addBackS; // S yang benar-benar hilang dari stok

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

    const list = itemsByGudang[gdgDipilih] || [];
    const found = list.find((x) => x.value === nama);
    if (!found) {
      Alert.alert("Barang tidak ada stoknya di gudang ini");
      return;
    }

    updated[index] = {
      ...updated[index],
      namaBarang: nama,
      kode: found.kode,
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
    updated[i][key] = value;
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

    const waktuInput = tanggalTransaksi.toISOString();
    const tanggalFormatted = formatDate(tanggalTransaksi);
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    const docId = `${kodeApos}-${tanggalFormatted}-${Math.floor(
      Date.now() / 1000
    )}-${rand}`;
    const kodeGdngFinal = jenisForm === "MB" ? itemList[0]?.gdg || "-" : "-";
    const hasilItems: ItemOut[] = [];

    for (const [i, item] of itemList.entries()) {
      const gdg = item.gdg && item.gdg.trim() !== "" ? item.gdg : jenisGudang;
      if (!item.kode) {
        Alert.alert(`Pilih barang untuk item #${i + 1}`);
        return;
      }

      const key = `${gdg}|${norm(item.kode)}`;
      const cur = netStockMap.get(key) || {
        L: 0,
        M: 0,
        S: 0,
        nama: "",
        principle: "-",
      };

      // konversi per kode
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

        // 🔑 simpan pemakaian bersih
        netDL: String(alloc.netDL),
        netDM: String(alloc.netDM),
        netDS: String(alloc.netDS),
      });
    }

    // identitas operator
    const operatorUsername = profile?.username || "-";
    const operatorName =
      (profile?.guestName && String(profile.guestName).trim()) ||
      (profile?.displayName && String(profile.displayName).trim()) ||
      operatorUsername;
    const operatorGuestName =
      (profile?.guestName && String(profile.guestName).trim()) || "";

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
      // 🔥 Firestore
      await setDoc(doc(db, "barangKeluar", docId), newEntry);

      // 📤 Kirim ke Google Spreadsheet
      const sheetPayload = {
        ...newEntry,
        operatorName,
        operatorUsername,
        operatorGuestName,
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
            setValue={setJenisGudang}
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
            setValue={setJenisForm}
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
                setValue={setTujuanGudang}
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
                setValue={setNamaSopir}
                items={[
                  {
                    label: "Dedi - Deny Mp ",
                    value: "Dedi - Deny MP",
                  },
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
                setValue={setNomorKendaraan}
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
            const candidates = gdg ? itemsByGudang[gdg] || [] : [];
            return (
              <View key={`item-${i}`} style={styles.itemBox}>
                <Text style={styles.label}>Pilih Gudang untuk Barang Ini</Text>
                <DropDownPicker
                  open={openGudangPerItem[i] || false}
                  setOpen={(val) => {
                    const copy = [...openGudangPerItem];
                    copy[i] = val;
                    setOpenGudangPerItem(copy);
                  }}
                  value={item.gdg}
                  setValue={(cb) => {
                    const val = cb(item.gdg);
                    handleChangeItem(i, "gdg", val);
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
                    const copy = [...openNamaBarang];
                    copy[i] = val;
                    setOpenNamaBarang(copy);
                  }}
                  value={item.namaBarang}
                  setValue={(cb) => {
                    const val = cb(item.namaBarang);
                    if (!item.gdg && !jenisGudang) {
                      Alert.alert("Pilih gudang dulu");
                      return;
                    }
                    handleSelectBarang(i, val);
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
