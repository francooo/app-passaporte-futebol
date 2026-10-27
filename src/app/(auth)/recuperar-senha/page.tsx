import type { Metadata } from "next";
import { RecoverForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function RecuperarSenhaPage() {
  return (
    <>
      <h1 className="rotulo-display mb-6 text-center text-xl text-estadio">Vamos recuperar seu acesso</h1>
      <RecoverForm />
    </>
  );
}
