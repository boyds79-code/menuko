import AsyncStorage from "@react-native-async-storage/async-storage";

// Generic read-through cache: callers show cached data immediately on
// mount, then overwrite it once a fresh fetch succeeds. Failures (offline)
// just mean the cached value stays on screen — no error UI needed for that.
export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full / disabled — the screen just won't have a warm cache
    // next launch, not fatal.
  }
}
