import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth-context";

/** Ponto de entrada ("/"): fica fora dos guards e manda para a área certa conforme a sessão. */
export default function Index() {
  const { status } = useAuth();
  return <Redirect href={status === "signedIn" ? "/home" : "/login"} />;
}
