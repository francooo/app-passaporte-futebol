import Constants from "expo-constants";
import type { ImageSourcePropType } from "react-native";

/**
 * O Wikimedia (fotos dos estádios) responde 403 a requisições sem User-Agent identificado —
 * e o padrão do Android ("okhttp/…") é bloqueado. Por isso toda imagem remota do app leva este cabeçalho.
 * https://meta.wikimedia.org/wiki/User-Agent_policy
 */
const USER_AGENT = `PassaporteEsportivo/${Constants.expoConfig?.version ?? "0"} (https://app-passaporte-futebol.vercel.app; app mobile)`;

export function remoteImage(uri: string): ImageSourcePropType {
  return { uri, headers: { "User-Agent": USER_AGENT } };
}
