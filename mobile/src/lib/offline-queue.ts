import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

export type QueuedMutation<T> = {
  id: string;
  payload: T;
  createdAt: number;
};

// A tiny persisted retry queue for the one or two mutations each screen
// needs offline (mark served / settle paid). No conflict resolution and no
// partial-failure bookkeeping beyond "retry from the front" — appropriate
// for a single device per small restaurant, not a distributed sync engine.
export function createMutationQueue<T>(storageKey: string, apply: (payload: T) => Promise<void>) {
  let flushing = false;

  async function load(): Promise<QueuedMutation<T>[]> {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as QueuedMutation<T>[]) : [];
    } catch {
      return [];
    }
  }

  async function save(queue: QueuedMutation<T>[]): Promise<void> {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(queue));
    } catch {
      // best-effort
    }
  }

  async function enqueue(payload: T): Promise<void> {
    const queue = await load();
    queue.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, payload, createdAt: Date.now() });
    await save(queue);
    void flush();
  }

  async function flush(): Promise<void> {
    if (flushing) return;
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    flushing = true;
    try {
      let queue = await load();
      while (queue.length > 0) {
        const [next, ...rest] = queue;
        try {
          await apply(next.payload);
          queue = rest;
          await save(queue);
        } catch {
          // Leave it at the front and stop — probably still offline or the
          // backend rejected it; next flush() call (reconnect / retry
          // button) will try again.
          break;
        }
      }
    } finally {
      flushing = false;
    }
  }

  return { load, enqueue, flush };
}
