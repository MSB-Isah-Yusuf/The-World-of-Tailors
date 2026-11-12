import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// Vercel fix: explicit secret + clear error if missing in production
// AUTH_SECRET must be set in Vercel Env Vars (32+ chars). Generate with: openssl rand -base64 32
const secret = process.env.AUTH_SECRET;
if (!secret) {
  if (process.env.NODE_ENV === "production") {
    console.error("[auth][MissingSecret] AUTH_SECRET is not set. Add it in Vercel: Settings → Environment Variables → AUTH_SECRET (generate with: openssl rand -base64 32)");
  } else {
    console.warn("[auth] AUTH_SECRET missing — using dev fallback (insecure, dev only)");
  }
}

const SESSION_MAX_AGE_ADMIN = Number(process.env.SESSION_MAX_AGE_ADMIN || 8 * 60 * 60); // 8h absolute max for admin
const SESSION_MAX_AGE_USER = Number(process.env.SESSION_MAX_AGE_USER || 12 * 60 * 60); // 12h absolute max for others
const SESSION_IDLE_ADMIN = Number(process.env.SESSION_IDLE_ADMIN || 15 * 60); // 15m idle
const SESSION_IDLE_USER = Number(process.env.SESSION_IDLE_USER || 30 * 60); // 30m idle

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Use explicit secret; fallback only for local dev to prevent build-time crash
  secret: secret || (process.env.NODE_ENV !== "production" ? "dev-fallback-secret-change-me-32chars!!" : undefined),
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_USER },
  providers: [
    Credentials({
      name: "credentials",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } }) as any;
        if (!user || !user.passwordHash) return null;
        if (user.status === "SUSPENDED") return null;
        const ok = await bcrypt.compare(String(credentials.password), user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          emailVerified: user.emailVerified,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const now = Math.floor(Date.now()/1000);
      if (user) {
        (token as any).role = (user as any).role;
        (token as any).uid = (user as any).id;
        (token as any).iat0 = now; // absolute max start
        (token as any).lastActive = now;
      }
      if ((token as any).uid) {
        const dbUser = await prisma.user.findUnique({ where: { id: (token as any).uid } }) as any;
        if (!dbUser || dbUser.status === "SUSPENDED") return null as any;
        (token as any).role = dbUser.role;
        // Enforce absolute max + idle timeout
        const isAdmin = dbUser.role === "ADMIN";
        const idle = isAdmin ? SESSION_IDLE_ADMIN : SESSION_IDLE_USER;
        const max = isAdmin ? SESSION_MAX_AGE_ADMIN : SESSION_MAX_AGE_USER;
        const iat0 = (token as any).iat0 || (token as any).iat || now;
        const lastActive = (token as any).lastActive || now;
        if (now - iat0 > max) return null as any; // absolute max exceeded
        if (now - lastActive > idle) return null as any; // idle timeout
        (token as any).lastActive = now;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as any).id = (token as any).uid;
        (session.user as any).role = (token as any).role;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  trustHost: true,
});
