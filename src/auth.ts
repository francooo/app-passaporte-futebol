import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { loginSchema } from "@shared/schemas";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { verifyCredentials } from "@/lib/auth-core";
import { claimForGoogle } from "@/lib/google-auth";

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

declare module "next-auth" {
  interface Session {
    /** Quando este login aconteceu (ms). Comparado com users.sessionsValidAfter. */
    authAt?: number;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // Credentials exige sessão JWT.
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  providers: [
    ...(googleEnabled
      ? [
          // O Google confirma o e-mail, então vinculamos à conta já existente com o mesmo
          // e-mail. Se essa conta tinha senha nunca confirmada, o Google assume a conta
          // (ver claimForGoogle e o evento linkAccount abaixo).
          Google({
            allowDangerousEmailAccountLinking: true,
            profile: (p) => ({ id: p.sub, name: p.name, email: p.email?.toLowerCase(), image: p.picture }),
          }),
        ]
      : []),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await verifyCredentials(parsed.data.email, parsed.data.password);
        if (!user) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    signIn({ account, profile }) {
      // Só aceitamos contas Google com e-mail confirmado pelo Google.
      if (account?.provider === "google") return profile?.email_verified === true;
      return true;
    },
    jwt({ token, user }) {
      // `user` só vem no momento do login: marca quando a sessão começou.
      if (user) token.authAt = Date.now();
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (typeof token.authAt === "number") session.authAt = token.authAt;
      return session;
    },
  },
  events: {
    async linkAccount({ user, account, profile }) {
      // profile.email é o e-mail confirmado pelo Google (user.email é o da conta).
      if (account.provider === "google" && user.id) await claimForGoogle(user.id, profile.email);
    },
  },
});
