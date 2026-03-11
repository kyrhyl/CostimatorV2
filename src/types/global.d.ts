import type mongoose from 'mongoose';
import type { UserRole } from '@/models/User';

declare global {
  var mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;

  namespace NodeJS {
    interface ProcessEnv {
      MONGODB_URI: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roles: UserRole[];
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    roles: UserRole[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    roles: UserRole[];
  }
}

export {};
