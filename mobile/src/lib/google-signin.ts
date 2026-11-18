import { Platform } from "react-native";

/**
 * Login com Google nativo (@react-native-google-signin/google-signin).
 *
 * O ID token pedido é para o client ID **web** (o mesmo AUTH_GOOGLE_ID do servidor),
 * que confere a assinatura e o `aud` em POST /api/mobile/auth/google. No Android,
 * o Google também exige um client OAuth "Android" (pacote + SHA-1 do keystore do EAS)
 * no mesmo projeto do Google Cloud, mas ele não entra no código.
 *
 * A biblioteca é carregada só quando usada: no Expo Go e no preview web o módulo
 * nativo não existe e o botão nem aparece.
 */
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const googleAvailable = Platform.OS !== "web" && Boolean(WEB_CLIENT_ID);

/** O usuário fechou o seletor de contas: não é erro, não mostra mensagem. */
export class GoogleCancelled extends Error {}

let configured = false;

async function lib() {
  const mod = await import("@react-native-google-signin/google-signin");
  if (!configured) {
    mod.GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
    configured = true;
  }
  return mod;
}

export async function getGoogleIdToken(): Promise<string> {
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = await lib();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new GoogleCancelled();
    if (!response.data.idToken) throw new Error("Google não devolveu o ID token");
    return response.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error) && (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS)) {
      throw new GoogleCancelled();
    }
    throw error;
  }
}

/** Esquece a conta Google escolhida, para o próximo login mostrar o seletor de novo. */
export async function googleSignOut() {
  if (!googleAvailable) return;
  try {
    const { GoogleSignin } = await lib();
    await GoogleSignin.signOut();
  } catch {
    // Sem sessão Google no aparelho: nada a fazer.
  }
}
