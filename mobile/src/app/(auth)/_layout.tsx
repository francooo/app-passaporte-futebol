import { Stack } from "expo-router";

// Sem sessão, o app abre no login.
export const unstable_settings = { anchor: "login" };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: "fade" }} />;
}
