import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { supabase } from "@/lib/supabase";

// The same bracket-and-square mark used on menuko.net — gives the login
// screen actual brand recognition instead of a plain text label.
function Mark({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path d="M14 34V21.5a3 3 0 0 1 3-3h13" stroke="#ea7c1f" strokeWidth={8} strokeLinecap="round" />
      <Path d="M86 34V21.5a3 3 0 0 0-3-3H70" stroke="#ea7c1f" strokeWidth={8} strokeLinecap="round" />
      <Path d="M14 66V78.5a3 3 0 0 0 3 3h13" stroke="#ea7c1f" strokeWidth={8} strokeLinecap="round" />
      <Path d="M86 66V78.5a3 3 0 0 1-3 3H70" stroke="#ea7c1f" strokeWidth={8} strokeLinecap="round" />
      <Rect x={41} y={41} width={18} height={18} rx={5} fill="#ea7c1f" />
    </Svg>
  );
}

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError("Incorrect email or password.");
    }
    // On success, onAuthStateChange in ctx.tsx updates session and the
    // Stack.Protected guards in _layout.tsx take over routing.
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.brand}>
        <Mark size={52} />
        <Text style={styles.title}>Menuko</Text>
        <Text style={styles.subtitle}>KITCHEN · CASHIER · OWNER</Text>
      </View>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#a89a86"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#a89a86"
          secureTextEntry
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdf8ee",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  brand: { alignItems: "center", gap: 10, marginBottom: 36 },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#231f1a",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#a3937d",
    letterSpacing: 2,
  },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: "#3d2f1f",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ece2d3",
    backgroundColor: "#fdfaf5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: "#231f1a",
  },
  error: { color: "#dc2626", fontSize: 13, alignSelf: "flex-start" },
  button: {
    width: "100%",
    backgroundColor: "#ea7c1f",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#ea7c1f",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
});
