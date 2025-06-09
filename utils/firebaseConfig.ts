// utils/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "ISI_DENGAN_API_KEY_KAMU",
  authDomain: "ISI_DENGAN_PROJECT.firebaseapp.com",
  projectId: "ISI_DENGAN_PROJECT_ID",
  storageBucket: "ISI_DENGAN_PROJECT.appspot.com",
  messagingSenderId: "ISI_DENGAN_SENDER_ID",
  appId: "ISI_DENGAN_APP_ID",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
