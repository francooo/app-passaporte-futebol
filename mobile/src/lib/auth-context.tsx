import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApiUser, AuthResponse, MessageResponse } from "@shared/api-types";
import type { LoginInput, RecoverInput, SignupInput } from "@shared/schemas";
import { api, ApiRequestError } from "./api";
import { tokenStorage } from "./token-storage";

type Status = "loading" | "signedOut" | "signedIn";

type AuthContextValue = {
  status: Status;
  user: ApiUser | null;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: SignupInput) => Promise<void>;
  recover: (input: RecoverInput) => Promise<string>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Restaura a sessão salva ao abrir o app.
  useEffect(() => {
    (async () => {
      const saved = await tokenStorage.get();
      if (!saved) return setStatus("signedOut");
      try {
        setUser(await api<ApiUser>("/api/mobile/me", { token: saved }));
        setToken(saved);
        setStatus("signedIn");
      } catch (error) {
        // Só descarta o token se o servidor recusou; sem rede, mantém para tentar depois.
        if (error instanceof ApiRequestError && error.status === 401) await tokenStorage.clear();
        setStatus("signedOut");
      }
    })();
  }, []);

  const start = useCallback(async (res: AuthResponse) => {
    await tokenStorage.set(res.token);
    setToken(res.token);
    setUser(res.user);
    setStatus("signedIn");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signIn: async (input) => start(await api<AuthResponse>("/api/mobile/auth/login", { method: "POST", body: input })),
      signUp: async (input) => start(await api<AuthResponse>("/api/mobile/auth/register", { method: "POST", body: input })),
      recover: async (input) =>
        (await api<MessageResponse>("/api/mobile/auth/recover", { method: "POST", body: input })).message,
      signOut: async () => {
        await api("/api/mobile/auth/logout", { method: "POST", token }).catch(() => {});
        await tokenStorage.clear();
        setToken(null);
        setUser(null);
        setStatus("signedOut");
      },
    }),
    [status, user, token, start],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
