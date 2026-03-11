import type { UserRole } from '@/models/User';

export const MASTER_ADMIN_ROLE: UserRole = 'master_admin';
export const ADMIN_ROLE: UserRole = 'admin';
export const PROJECT_CREATOR_ROLE: UserRole = 'project_creator';
export const VIEWER_ROLE: UserRole = 'viewer';

export const MASTER_ADMIN_ROLES: UserRole[] = [MASTER_ADMIN_ROLE, ADMIN_ROLE];
export const MASTER_WRITE_ROLES: UserRole[] = MASTER_ADMIN_ROLES;
export const MASTER_READ_ROLES: UserRole[] = MASTER_ADMIN_ROLES;

export const PROJECT_READ_ROLES: UserRole[] = [MASTER_ADMIN_ROLE, ADMIN_ROLE, PROJECT_CREATOR_ROLE];
export const PROJECT_WRITE_ROLES: UserRole[] = [MASTER_ADMIN_ROLE, ADMIN_ROLE, PROJECT_CREATOR_ROLE];
export const PROJECT_DELETE_ROLES: UserRole[] = [MASTER_ADMIN_ROLE, ADMIN_ROLE];

export const DUPA_READ_ROLES: UserRole[] = [MASTER_ADMIN_ROLE, ADMIN_ROLE, PROJECT_CREATOR_ROLE];
export const DUPA_WRITE_ROLES: UserRole[] = [MASTER_ADMIN_ROLE, ADMIN_ROLE, PROJECT_CREATOR_ROLE];
export const DUPA_DELETE_ROLES: UserRole[] = [MASTER_ADMIN_ROLE, ADMIN_ROLE];
