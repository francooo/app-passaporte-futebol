"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  googleSignInAction,
  loginAction,
  recoverAction,
  resetPasswordAction,
  signupAction,
  type FormState,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

const initial: FormState = {};

function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p role="status" className={state.ok ? "text-sm text-estadio" : "text-sm text-erro"}>
      {state.message}
    </p>
  );
}

function Divider() {
  return <div aria-hidden className="my-1 h-px bg-linha" />;
}

type LoginProps = { next?: string; googleEnabled: boolean; notice?: string };

export function LoginForm({ next, googleEnabled, notice }: LoginProps) {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <div className="flex flex-col gap-4">
      {notice && (
        <p role="status" className="rounded-lg bg-visita px-3 py-2 text-sm text-estadio">
          {notice}
        </p>
      )}
      <form action={action} className="flex flex-col gap-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        <TextField label="E-mail" name="email" type="email" icon="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} required error={state.errors?.email?.[0]} />
        <TextField label="Senha" name="password" type="password" icon="lock" autoComplete="current-password" required error={state.errors?.password?.[0]} />
        <Link href="/recuperar-senha" className="self-end text-sm font-semibold text-estadio underline-offset-4 hover:underline">
          Esqueci minha senha
        </Link>
        <FormMessage state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      {googleEnabled && <GoogleButton next={next} />}
      <Divider />
      <Link href="/cadastro" className="text-center font-display text-lg font-semibold text-estadio">
        Criar conta
      </Link>
    </div>
  );
}

function GoogleButton({ next }: { next?: string }) {
  return (
    <form action={googleSignInAction}>
      {next && <input type="hidden" name="next" value={next} />}
      <Button type="submit" variant="secundario" className="w-full text-lg">
        <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
        </svg>
        Entrar com Google
      </Button>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <TextField label="Nome" name="name" icon="profile" autoComplete="name" defaultValue={state.values?.name} required error={state.errors?.name?.[0]} />
      <TextField label="E-mail" name="email" type="email" icon="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} required error={state.errors?.email?.[0]} />
      <TextField label="Senha" name="password" type="password" icon="lock" autoComplete="new-password" hint="Mínimo de 8 caracteres." required error={state.errors?.password?.[0]} />
      <TextField label="Confirmar senha" name="confirm" type="password" icon="lock" autoComplete="new-password" required error={state.errors?.confirm?.[0]} />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Criando…" : "Criar conta"}
      </Button>
      <Divider />
      <p className="text-center text-sm text-suave">
        Já tem conta?{" "}
        <Link href="/login" className="font-display text-lg font-semibold text-estadio">
          Entrar
        </Link>
      </p>
    </form>
  );
}

export function RecoverForm() {
  const [state, action, pending] = useActionState(recoverAction, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <p className="text-center text-suave">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
      <TextField label="E-mail" name="email" type="email" icon="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} required error={state.errors?.email?.[0]} />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar link"}
      </Button>
      <Divider />
      <Link href="/login" className="text-center font-display text-lg font-semibold text-estadio">
        Voltar para o login
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <TextField label="Nova senha" name="password" type="password" icon="lock" autoComplete="new-password" hint="Mínimo de 8 caracteres." required error={state.errors?.password?.[0]} />
      <TextField label="Confirmar nova senha" name="confirm" type="password" icon="lock" autoComplete="new-password" required error={state.errors?.confirm?.[0]} />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar nova senha"}
      </Button>
      <Divider />
      <Link href="/recuperar-senha" className="text-center font-display text-lg font-semibold text-estadio">
        Pedir novo link
      </Link>
    </form>
  );
}
