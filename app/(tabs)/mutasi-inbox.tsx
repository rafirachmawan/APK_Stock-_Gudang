// app/(tabs)/mutasi-inbox.tsx
// ✅ Inbox untuk gudang tujuan: lihat daftar mutasi PENDING, Approve/Reject.
//    Filter otomatis berdasarkan gudang yang diizinkan user (canonical).
import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../utils/firebase";
import { approveMutasi, rejectMutasi } from "../../utils/mutasiActions";
import { expandAllowed, getUserProfile } from "../../utils/userProfile";

// samakan dengan out.tsx
const canonicalGudang = (g: any): string => {
  const x = String(g ?? "").trim();
  const U = x.toUpperCase();
  if (!x) return "Unknown";
  if (U.includes("E (BAD STOCK)")) return "Gudang E";
  if (U.includes("GUDANG E")) return "Gudang E";
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

export default function MutasiInboxScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [allowedCanon, setAllowedCanon] = useState<string[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    (async () => {
      const prof = await getUserProfile();
      setProfile(prof);
      const expanded = prof ? expandAllowed(prof.allowed) : [];
      const canonList = expanded.map(canonicalGudang);
      setAllowedCanon(canonList);
    })();
  }, []);

  // Dengarkan semua inbox, lalu filter di client (karena where-in array bisa ribet)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "mutasiInbox"), (s) => {
      const all = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(all);
    });
    return () => unsub();
  }, []);

  // Filter: hanya tujuanKey yang user punya, status PENDING
  const rows = useMemo(() => {
    const needle = filterText.trim().toUpperCase();
    return items
      .filter((it: any) => it.status === "PENDING")
      .filter((it: any) => allowedCanon.includes(it.tujuanKey || it.tujuan))
      .filter((it: any) => {
        if (!needle) return true;
        const hay =
          `${it.runId} ${it.asal} ${it.tujuan} ${it.operatorName}`.toUpperCase();
        return hay.includes(needle);
      })
      .sort(
        (a: any, b: any) =>
          (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
      );
  }, [items, allowedCanon, filterText]);

  const onApprove = async (runId: string) => {
    try {
      await approveMutasi(runId, {
        username: profile?.username,
        displayName: profile?.displayName,
        guestName: profile?.guestName,
      });
      Alert.alert("✅ Disetujui", `Mutasi ${runId} sudah di-approve`);
    } catch (e) {
      console.error(e);
      Alert.alert("Gagal", "Approve gagal, coba lagi.");
    }
  };

  const onReject = async (runId: string) => {
    // RN iOS only; di Android biasanya undefined. Pakai cast any agar types TS aman.
    const promptFn = (Alert as any).prompt as
      | ((
          title: string,
          message?: string,
          callbackOrButtons?: any,
          type?: any,
          defaultValue?: string,
          keyboardType?: any
        ) => void)
      | undefined;

    if (typeof promptFn === "function") {
      // iOS: tampilkan prompt alasan
      promptFn("Alasan penolakan", "Opsional", async (reason?: string) => {
        try {
          await rejectMutasi(
            runId,
            {
              username: profile?.username,
              displayName: profile?.displayName,
              guestName: profile?.guestName,
            },
            reason
          );
          Alert.alert("✅ Ditolak", `Mutasi ${runId} sudah ditolak`);
        } catch (e) {
          console.error(e);
          Alert.alert("Gagal", "Reject gagal, coba lagi.");
        }
      });
    } else {
      // Android / non-iOS: langsung reject tanpa alasan
      try {
        await rejectMutasi(runId, {
          username: profile?.username,
          displayName: profile?.displayName,
          guestName: profile?.guestName,
        });
        Alert.alert(
          "✅ Ditolak",
          `Mutasi ${runId} sudah ditolak (tanpa alasan)`
        );
      } catch (e) {
        console.error(e);
        Alert.alert("Gagal", "Reject gagal, coba lagi.");
      }
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.runId}</Text>
      <Text style={styles.row}>Asal: {item.asal}</Text>
      <Text style={styles.row}>Tujuan: {item.tujuanKey || item.tujuan}</Text>
      <Text style={styles.row}>Operator: {item.operatorName || "-"}</Text>
      {item.needsSuratJalan ? (
        <Text style={[styles.row, { color: "#b22222" }]}>
          Surat Jalan: {item.suratJalanNo || "(kosong)"} — Wajib GS→BS
        </Text>
      ) : (
        <Text style={styles.row}>Surat Jalan: (tidak wajib)</Text>
      )}
      <View style={styles.itemsBox}>
        {(item.items || []).map((it: any, idx: number) => (
          <Text key={idx} style={styles.itemLine}>
            • {it.namaBarang} — L:{it.large || 0} M:{it.medium || 0} S:
            {it.small || 0}
          </Text>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => onReject(item.runId)}
          style={[styles.btn, styles.btnReject]}
        >
          <Text style={styles.btnText}>Tolak</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onApprove(item.runId)}
          style={[styles.btn, styles.btnApprove]}
        >
          <Text style={styles.btnText}>Setujui</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Inbox Mutasi (Gudang Tujuan)</Text>
      <TextInput
        style={styles.search}
        placeholder="Cari runId/asal/tujuan/operator…"
        value={filterText}
        onChangeText={setFilterText}
      />
      <FlatList
        data={rows}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40 }}>
            Tidak ada mutasi pending
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { fontWeight: "bold", fontSize: 18, padding: 12 },
  search: {
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e2e2e2",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  title: { fontWeight: "bold", marginBottom: 6 },
  row: { marginBottom: 4 },
  itemsBox: {
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
  },
  itemLine: { fontSize: 12, color: "#333" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  btn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  btnReject: { backgroundColor: "#dc3545" },
  btnApprove: { backgroundColor: "#28a745" },
  btnText: { color: "#fff", fontWeight: "bold" },
});
