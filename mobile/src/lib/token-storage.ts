import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "passaporte.session";

/** Token no Keystore (Android) / Keychain (iOS). No web (só pré-visualização), localStorage. */
export const tokenStorage = {
  async get() {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(KEY) ?? null;
    return SecureStore.getItemAsync(KEY);
  },
  async set(token: string) {
    if (Platform.OS === "web") return globalThis.localStorage?.setItem(KEY, token);
    await SecureStore.setItemAsync(KEY, token);
  },
  async clear() {
    if (Platform.OS === "web") return globalThis.localStorage?.removeItem(KEY);
    await SecureStore.deleteItemAsync(KEY);
  },
};
