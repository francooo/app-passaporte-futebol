import type { Metadata } from "next";
import { Suspense } from "react";
import { googleEnabled } from "@/auth";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <h1 className="rotulo-display mb-6 text-center text-xl text-estadio">Seu próximo carimbo começa aqui</h1>
      <Suspense fallback={<LoginForm googleEnabled={googleEnabled} />}>
        <LoginWithParams searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function LoginWithParams({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const notice =
    params.senha === "redefinida"
      ? "Senha redefinida. Entre com a nova senha."
      : params.error === "OAuthAccountNotLinked"
        ? "Este e-mail já está ligado a outra forma de login."
        : undefined;
  return <LoginForm next={next} googleEnabled={googleEnabled} notice={notice} />;
}
