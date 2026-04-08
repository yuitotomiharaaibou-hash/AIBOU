import { Platform } from "react-native";

const memory = new Map<string, string>();

type AsyncStore = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

function nativeAsyncStorage(): AsyncStore | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@react-native-async-storage/async-storage") as {
      default: AsyncStore;
    };
    return mod.default ?? null;
  } catch {
    return null;
  }
}

/**
 * Web は localStorage。ネイティブは @react-native-async-storage が入っていればそちら、なければメモリ。
 */
export async function simpleStorageGet(key: string): Promise<string | null> {
  if (Platform.OS === "web" && typeof globalThis !== "undefined") {
    const ls = (globalThis as unknown as { localStorage?: Storage }).localStorage;
    if (ls) return ls.getItem(key);
  }
  const as = nativeAsyncStorage();
  if (as) {
    try {
      const v = await as.getItem(key);
      if (v != null) return v;
    } catch {
      /* fall through */
    }
  }
  return memory.get(key) ?? null;
}

export async function simpleStorageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web" && typeof globalThis !== "undefined") {
    const ls = (globalThis as unknown as { localStorage?: Storage }).localStorage;
    if (ls) {
      ls.setItem(key, value);
      return;
    }
  }
  const as = nativeAsyncStorage();
  if (as) {
    try {
      await as.setItem(key, value);
      memory.set(key, value);
      return;
    } catch {
      /* fall through */
    }
  }
  memory.set(key, value);
}
