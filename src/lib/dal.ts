import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { sessionUser } from "@/lib/api-auth";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: "user" | "moderator" | "admin";
  premiumUntil: Date | null;
};

/**
 * Data Access Layer: único ponto que lê a sessão e devolve um usuário enxuto.
 * Lê cookies, então quem chamar precisa estar dentro de <Suspense>.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  // auth() renova o cookie JWT (IV aleatório): só pode rodar no request real,
  // nunca no prerender/prefetch do Cache Components.
  await connection();
  // Mesma regra das rotas /api/*: sessão revogada conta como deslogado.
  const user = await sessionUser();
  if (!user) redirect("/login");

  const { id, name, email, image, role, premiumUntil } = user;
  return { id, name, email, image, role, premiumUntil };
}
