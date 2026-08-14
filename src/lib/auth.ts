import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      name: "Staff Login",

      credentials: {
        email: { label: "Email or phone", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const identifier = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!identifier || !password) return null;

        const user = await prisma.user.findFirst({
          where: {
            OR: [{ email: identifier }, { phone: identifier }],
            isActive: true,
            role: {
              in: [
                "ADMIN",
                "MANAGER",
                "KITCHEN",
                "BAR",
                "WAITRESS",
                "CASHIER",
              ],
            },
          },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);

        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email ?? undefined,
          role: user.role,
          restaurantId: user.restaurantId,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.restaurantId = (
          user as { restaurantId: string | null }
        ).restaurantId;
        token.id = (user as { id: string }).id;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;

        (session.user as { restaurantId?: string | null }).restaurantId =
          token.restaurantId as string | null;

        (session.user as { id?: string }).id = token.id as string;
      }

      return session;
    },
  },
});