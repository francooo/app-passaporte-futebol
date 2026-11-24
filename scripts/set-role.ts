/**
 * Papel de uma conta (quem vê a moderação de locais e times).
 *   npm run user:role -- pessoa@exemplo.com admin      (user | moderator | admin)
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !["user", "moderator", "admin"].includes(role)) throw new Error("Uso: npm run user:role -- <email> <user|moderator|admin>");
  const [row] = await db
    .update(users)
    .set({ role: role as "user" | "moderator" | "admin" })
    .where(eq(users.email, email.toLowerCase()))
    .returning({ id: users.id, name: users.name });
  if (!row) throw new Error(`Nenhuma conta com o e-mail ${email}.`);
  console.log(`${row.name ?? email}: papel ${role}`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
