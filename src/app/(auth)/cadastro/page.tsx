import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Criar conta" };

export default function CadastroPage() {
  return (
    <>
      <h1 className="rotulo-display mb-6 text-center text-xl text-estadio">Comece sua coleção de carimbos</h1>
      <SignupForm />
    </>
  );
}
