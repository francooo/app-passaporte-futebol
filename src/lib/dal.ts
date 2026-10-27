import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

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
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      premiumUntil: users.premiumUntil,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!user) redirect("/login");

  return user;
}
