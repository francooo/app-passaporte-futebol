import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Nova senha" };

export default function RedefinirSenhaPage({ searchParams }: PageProps<"/redefinir-senha">) {
  return (
    <>
      <h1 className="rotulo-display mb-6 text-center text-xl text-estadio">Crie sua nova senha</h1>
      <Suspense fallback={<p className="text-center text-suave">Carregando…</p>}>
        <ResetWithToken searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ResetWithToken({ searchParams }: Pick<PageProps<"/redefinir-senha">, "searchParams">) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !token) {
    return (
      <p className="text-center text-suave">
        Link incompleto.{" "}
        <Link href="/recuperar-senha" className="font-semibold text-estadio underline">
          Peça um novo link
        </Link>
        .
      </p>
    );
  }
  return <ResetPasswordForm token={token} />;
}
