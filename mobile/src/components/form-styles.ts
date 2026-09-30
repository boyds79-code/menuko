import { StyleSheet } from "react-native";
import { colors } from "@/theme";

// Shared look for the owner app's edit screens (Menu + Store tabs): one
// input, label, button and chip style so every form reads as one system.
// Touch targets are ≥44px; destructive actions are icon buttons with a
// confirm, not underlined text links.
export const form = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "700", color: colors.ink },
  hint: { fontSize: 12.5, color: colors.muted, lineHeight: 18 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
  },
  inputMultiline: { minHeight: 84, textAlignVertical: "top" },
  primaryButton: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryButtonText: { color: colors.onAccent, fontSize: 15, fontWeight: "700" },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.ink },
  chipTextActive: { color: colors.onAccent },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  warnBox: { gap: 4, borderRadius: 16, backgroundColor: colors.saffronSoft, padding: 14 },
  warnTitle: { fontSize: 13, fontWeight: "700", color: "#6B4A0E" },
  warnText: { fontSize: 12.5, color: "#6B4A0E", lineHeight: 18 },
  error: { color: colors.danger, fontSize: 13 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 4 },
});
