import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Offline — will sync automatically once reconnected</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#7c2d12",
    paddingVertical: 6,
    alignItems: "center",
  },
  text: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
});
