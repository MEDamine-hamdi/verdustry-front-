import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { fetchMe, loginWithGoogleApi } from "@/lib/api";
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
        googleIdToken: { label: "Google ID Token", type: "text" },
      },
      async authorize(credentials) {
        const accessToken = credentials?.accessToken as string | undefined;
        const googleIdToken = credentials?.googleIdToken as string | undefined;

        // --- Flow Google ---
        if (googleIdToken) {
          try {
            const result = await loginWithGoogleApi(googleIdToken);
            if (!result.access_token || !result.user) return null;
            const role = result.user.role;
            if (!isRole(role)) return null;
            return {
              id: String(result.user.id),
              email: result.user.email,
              name: result.user.name,
              role,
              companyId: result.user.companyId,
              accessToken: result.access_token,
            };
          } catch {
            return null;
          }
        }

        // --- Flow classique (token déjà obtenu via /auth/login) ---
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