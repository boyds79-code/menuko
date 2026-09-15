import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { supabase } from "@/lib/supabase";

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
      <Text style={styles.title}>Menuko</Text>
      <Text style={styles.subtitle}>Kitchen / Cashier login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#8a7c68"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#8a7c68"
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffaf3",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  title: { fontSize: 28, fontWeight: "700", color: "#ea7c1f" },
  subtitle: { fontSize: 14, color: "#8a7c68", marginBottom: 12 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ece2d3",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: { color: "#dc2626", fontSize: 13, alignSelf: "flex-start" },
  button: {
    width: "100%",
    backgroundColor: "#ea7c1f",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#ffffff", fontWeight: "600", fontSize: 16 },
});
