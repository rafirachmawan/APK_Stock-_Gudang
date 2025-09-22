// utils/mutasiActions.ts
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type MutasiStatus = "PENDING" | "APPROVED" | "REJECTED";

interface Approver {
  username?: string;
  displayName?: string;
  guestName?: string;
}

async function _touchNotification(
  runId: string,
  targetGudang: string,
  status: "READ" | "DONE" | "REJECTED"
) {
  try {
    await setDoc(
      doc(db, "notifications", `mutasi-${runId}`),
      {
        status,
        updatedAt: serverTimestamp(),
        targetGudang,
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Notif update failed:", e);
  }
}

export async function approveMutasi(runId: string, approver: Approver) {
  const reqRef = doc(db, "mutasiRequests", runId);
  const outRef = doc(db, "barangKeluar", runId);

  const reqSnap = await getDoc(reqRef);
  const reqData = reqSnap.data() as any;
  const tujuanKey = reqData?.tujuan || reqData?.tujuanKey || "Unknown";

  // 1) Update transaksi utama
  await updateDoc(outRef, {
    mutasiStatus: "APPROVED",
    confirmedAt: serverTimestamp(),
    confirmedBy:
      (approver?.guestName && approver.guestName.trim()) ||
      (approver?.displayName && approver.displayName.trim()) ||
      (approver?.username && approver.username.trim()) ||
      "approver",
  });

  // 2) Update request global
  await updateDoc(reqRef, {
    status: "APPROVED",
    confirmedAt: serverTimestamp(),
  });

  // 3) Update inbox tujuan
  await setDoc(
    doc(db, "mutasiInbox", `${tujuanKey}-${runId}`),
    {
      status: "APPROVED",
      confirmedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // 4) Notifikasi
  await _touchNotification(runId, tujuanKey, "DONE");
}

export async function rejectMutasi(
  runId: string,
  approver: Approver,
  reason?: string
) {
  const reqRef = doc(db, "mutasiRequests", runId);
  const outRef = doc(db, "barangKeluar", runId);

  const reqSnap = await getDoc(reqRef);
  const reqData = reqSnap.data() as any;
  const tujuanKey = reqData?.tujuan || reqData?.tujuanKey || "Unknown";

  await updateDoc(outRef, {
    mutasiStatus: "REJECTED",
    confirmedAt: serverTimestamp(),
    confirmedBy:
      (approver?.guestName && approver.guestName.trim()) ||
      (approver?.displayName && approver.displayName.trim()) ||
      (approver?.username && approver.username.trim()) ||
      "approver",
    catatan: reason || reqData?.note || "",
  });

  await updateDoc(reqRef, {
    status: "REJECTED",
    confirmedAt: serverTimestamp(),
    reason: reason || "",
  });

  await setDoc(
    doc(db, "mutasiInbox", `${tujuanKey}-${runId}`),
    {
      status: "REJECTED",
      confirmedAt: serverTimestamp(),
      reason: reason || "",
    },
    { merge: true }
  );

  await _touchNotification(runId, tujuanKey, "REJECTED");
}
