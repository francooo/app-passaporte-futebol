import type { Metadata } from "next";
import { googleEnabled } from "@/auth";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <>
      <h1 className="rotulo-display mb-6 text-center text-xl text-estadio">Seu próximo carimbo começa aqui</h1>
      <LoginForm googleEnabled={googleEnabled} />
    </>
  );
}
