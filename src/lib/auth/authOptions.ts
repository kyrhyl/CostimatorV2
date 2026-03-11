import type { NextAuthOptions, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { UserRole } from '@/models/User';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/db/connect';
import User from '@/models/User';
import { verifyPassword } from '@/lib/auth/password';

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: Record<string, string> | undefined) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        await dbConnect();
        const user = await User.findOne({ email }).lean();

        if (!user || user.status !== 'active') {
          return null;
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          roles: user.roles || [],
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) {
        token.userId = (user as any).id;
        token.roles = (user as any).roles || [];
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.roles = (token.roles as UserRole[]) || [];
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};
