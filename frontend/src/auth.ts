import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { fetchMe } from "@/lib/api";
import type { Role } from "@/lib/roles";
import { ROLES } from "@/lib/roles";

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        accessToken: { label: "Access Token", type: "text" },
      },
      async authorize(credentials) {
        const accessToken = credentials?.accessToken as string | undefined;
        if (!accessToken) return null;
        try {
          const user = await fetchMe(accessToken);
          if (!isRole(user.role)) return null;
          return {
            id: String(user.id),
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId,
            accessToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.companyId = user.companyId;
        token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.companyId = token.companyId as string | undefined;
      }
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
  trustHost: true,
});