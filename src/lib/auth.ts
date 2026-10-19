import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
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
      if (user) {
        (token as any).role = (user as any).role;
        (token as any).uid = (user as any).id;
      }
      // refresh role/status on each request
      if ((token as any).uid) {
        const dbUser = await prisma.user.findUnique({ where: { id: (token as any).uid } }) as any;
        if (!dbUser || dbUser.status === "SUSPENDED") return null as any;
        (token as any).role = dbUser.role;
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
