import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const cekLogin = async () => {
      const isLoggedIn = await AsyncStorage.getItem("userLoggedIn");
      if (isLoggedIn === "true") {
        router.replace("/");
      }
    };
    cekLogin();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Peringatan", "Harap isi semua field");
      return;
    }

    if (username === "admin" && password === "1234") {
      await AsyncStorage.setItem("userLoggedIn", "true");
      router.replace("/");
    } else {
      Alert.alert("Login Gagal", "Username atau password salah");
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
          <View style={styles.waveWrapper}>
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
          </View>

          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={styles.title}>Gudang Astro</Text>
          </View>

          {/* FORM */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholderTextColor="#888"
            />
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                value={password}
                secureTextEntry={!showPassword}
                onChangeText={setPassword}
                placeholderTextColor="#888"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.toggleButton}
              >
                <Text style={{ color: "#007AFF" }}>
                  {showPassword ? "Sembunyikan" : "Lihat"}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2025 Gudang Astro — Rapi, Cepat, Akurat.
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
    paddingBottom: 100, // ✅ ini penting biar form bisa scroll saat keyboard muncul
  },
  container: {
    flex: 1,
  },
  waveWrapper: {
    backgroundColor: "#fff",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007AFF",
    marginTop: -30,
  },
  form: {
    paddingHorizontal: 20,
    marginTop: 50,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  toggleButton: {
    paddingHorizontal: 10,
  },
  loginButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  footer: {
    paddingVertical: 50,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  footerText: {
    color: "#888",
    fontSize: 13,
  },
});
