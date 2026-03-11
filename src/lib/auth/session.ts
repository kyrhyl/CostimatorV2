import { getServerSession } from 'next-auth';
import { authOptions } from './authOptions';
import type { UserRole } from '@/models/User';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return null;
    }
    return session.user as SessionUser;
  } catch (error) {
    console.error('Error getting session user:', error);
    return null;
  }
}

export function hasRequiredRole(user: SessionUser | null, requiredRoles: UserRole[]): boolean {
  if (!user || !user.roles) {
    return false;
  }
  return requiredRoles.some(role => user.roles.includes(role));
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireRole(requiredRoles: UserRole[]) {
  const user = await requireAuth();
  if (!hasRequiredRole(user, requiredRoles)) {
    throw new Error('Forbidden');
  }
  return user;
}
