import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { UserProfile, WarehouseKey } from "../../utils/userProfile";

/** ===== Konfigurasi akun per kelompok gudang ===== */
type PicCfg = { username: string; password: string; displayName: string };
type GuestCfg = { username: string; password: string };

type AccountGroup = {
  key: WarehouseKey; // "Gudang A" | "Gudang BCD" | "Gudang E (Bad Stock)"
  pic: PicCfg; // akun PIC
  guest: GuestCfg; // akun Guest (punya username+password)
  title: string; // hanya untuk tampilan
  subtitle: string; // hanya untuk tampilan
};

const GROUPS: AccountGroup[] = [
  {
    key: "Gudang A",
    pic: { username: "deny", password: "1234", displayName: "Pak Deny" },
    guest: { username: "ga", password: "0000" },
    title: "Login — Multi Gudang",
    subtitle: "Akun: Gudang A (PIC/Guest)",
  },
  {
    key: "Gudang BCD",
    pic: { username: "alvin", password: "1234", displayName: "Pak Alvin" },
    guest: { username: "gbcd", password: "0000" },
    title: "Login — Multi Gudang",
    subtitle: "Akun: Gudang BCD (PIC/Guest)",
  },
  {
    key: "Gudang E (Bad Stock)",
    pic: { username: "anas", password: "1234", displayName: "Pak Anas" },
    guest: { username: "ge", password: "0000" },
    title: "Login — Multi Gudang",
    subtitle: "Akun: Gudang E (Bad Stock) (PIC/Guest)",
  },
];

/** util untuk mencocokkan username/password ke salah satu group */
function matchAccount(
  username: string,
  password: string
): { group: AccountGroup; role: "pic" | "guest" } | null {
  const u = (username || "").trim();
  const p = (password || "").trim();
  for (const g of GROUPS) {
    if (u === g.pic.username && p === g.pic.password) {
      return { group: g, role: "pic" };
    }
    if (u === g.guest.username && p === g.guest.password) {
      return { group: g, role: "guest" };
    }
  }
  return null;
}

/** ======================= UI ======================= */
export default function LoginScreen() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [asGuest, setAsGuest] = useState(true); // switch hanya utk menampilkan input "Nama operator"
  const [operatorName, setOperatorName] = useState("");

  const wave = useMemo(
    () => (
      <Svg
        height="160"
        width="100%"
        viewBox="0 0 1440 320"
        style={{ marginTop: -45 }}
      >
        <Path
          fill="#007AFF"
          d="M0,96L60,122.7C120,149,240,203,360,224C480,245,600,235,720,208C840,181,960,139,1080,144C1200,149,1320,203,1380,229.3L1440,256L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
        />
      </Svg>
    ),
    []
  );

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Peringatan", "Harap isi username & password");
      return;
    }

    const match = matchAccount(username, password);
    if (!match) {
      Alert.alert(
        "Login Gagal",
        "Username atau password salah untuk gudang ini."
      );
      return;
    }

    // Jika yang cocok adalah akun guest → wajib isi nama operator agar tercatat di detail
    if (match.role === "guest") {
      const name = operatorName.trim();
      if (!name) {
        Alert.alert(
          "Perlu Nama",
          "Masukkan nama operator (Guest) agar tercatat."
        );
        return;
      }
      const profile: UserProfile = {
        username,
        displayName: name, // nama bebas yg diisi operator guest
        role: "guest",
        allowed: [match.group.key], // kunci akses gudang (Gudang A / BCD / E(BS))
      };
      await AsyncStorage.setItem("userProfile", JSON.stringify(profile));
      await AsyncStorage.setItem("userLoggedIn", "true");
      router.replace("/(tabs)");
      return;
    }

    // Akun PIC → displayName tetap sesuai konfigurasi
    if (match.role === "pic") {
      const profile: UserProfile = {
        username,
        displayName: match.group.pic.displayName,
        role: "pic",
        allowed: [match.group.key],
      };
      await AsyncStorage.setItem("userProfile", JSON.stringify(profile));
      await AsyncStorage.setItem("userLoggedIn", "true");
      router.replace("/(tabs)");
      return;
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* HEADER WAVE */}
          <View style={styles.waveWrapper}>{wave}</View>

          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={styles.title}>Gudang Astro</Text>
            <Text style={{ color: "#6b7280", marginTop: 4 }}>
              Login Multi Gudang — PIC & Guest
            </Text>
          </View>

          {/* FORM */}
          <View style={styles.form}>
            <View style={styles.row}>
              <Text style={styles.switchLabel}>Masuk sebagai Guest</Text>
              <Switch value={asGuest} onValueChange={setAsGuest} />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Username (mis. deny / alvin / anas / ga / gbcd / ge)"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholderTextColor="#888"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="#888"
            />

            {asGuest && (
              <TextInput
                style={styles.input}
                placeholder="Nama operator (wajib untuk Guest)"
                value={operatorName}
                onChangeText={setOperatorName}
                placeholderTextColor="#888"
              />
            )}

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>

            <View style={styles.helpBox}>
              <Text style={styles.helpTitle}>Contoh Akun</Text>
              <Text style={styles.helpLine}>
                Gudang A → PIC: deny/1234, Guest: ga/0000
              </Text>
              <Text style={styles.helpLine}>
                Gudang BCD → PIC: alvin/1234, Guest: gbcd/0000
              </Text>
              <Text style={styles.helpLine}>
                Gudang E (Bad Stock) → PIC: anas/1234, Guest: ge/0000
              </Text>
              <Text style={[styles.helpLine, { marginTop: 6 }]}>
                Nama operator akan tampil di In/Out Detail & Spreadsheet.
              </Text>
            </View>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © {new Date().getFullYear()} Gudang Astro — Rapi, Cepat, Akurat.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const { height } = Dimensions.get("window");

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "space-between",
    backgroundColor: "#fff",
    minHeight: height,
    paddingBottom: 100,
  },
  container: { flex: 1 },
  waveWrapper: { backgroundColor: "#fff", alignItems: "center" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007AFF",
    marginTop: -30,
  },
  form: { paddingHorizontal: 20, marginTop: 40 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  footer: {
    paddingVertical: 40,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  footerText: { color: "#888", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  switchLabel: { flex: 1, color: "#374151", fontWeight: "600" },
  helpBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    backgroundColor: "#f9fafb",
  },
  helpTitle: { fontWeight: "700", marginBottom: 6, color: "#111827" },
  helpLine: { color: "#374151", fontSize: 12 },
});
