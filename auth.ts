import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import {
  authenticateLocalCredentials,
  findOrCreateGoogleAccount,
  getActiveSessionVersion,
} from "@/modules/auth/auth.service";

const providers = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: authenticateLocalCredentials,
  }),
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost:
    process.env.NODE_ENV !== "production" ||
    process.env.AUTH_TRUST_HOST === "true",
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }

      const googleUser = await findOrCreateGoogleAccount({
        sub: typeof profile?.sub === "string" ? profile.sub : undefined,
        email: typeof profile?.email === "string" ? profile.email : undefined,
        email_verified: profile?.email_verified === true,
        name: typeof profile?.name === "string" ? profile.name : undefined,
        picture:
          typeof profile?.picture === "string" ? profile.picture : undefined,
      });
      if (!googleUser) {
        return false;
      }

      user.id = googleUser.id;
      user.name = googleUser.name;
      user.email = googleUser.email;
      user.image = googleUser.image;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      if (!token.sub) {
        return token;
      }

      const sessionVersion = await getActiveSessionVersion(token.sub);
      if (
        sessionVersion === null ||
        (token.sessionVersion !== undefined &&
          token.sessionVersion !== sessionVersion)
      ) {
        delete token.sub;
        delete token.sessionVersion;
        delete token.name;
        delete token.email;
        delete token.picture;
        return token;
      }

      token.sessionVersion = sessionVersion;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
