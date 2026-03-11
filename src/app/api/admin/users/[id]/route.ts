import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db/connect';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth/password';
import { getSessionUser } from '@/lib/auth/session';
import { MASTER_ADMIN_ROLES } from '@/lib/auth/roles';
import { buildAuditActor, diffAuditFields, logAuditEvent } from '@/lib/audit/logger';

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  roles: z.array(z.string()).min(1).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  password: z.string().min(8).optional(),
});

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || !MASTER_ADMIN_ROLES.some(role => user.roles?.includes(role))) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user };
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ('response' in auth) {
    return auth.response;
  }

  const payload = await request.json();
  const parsed = updateUserSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  await dbConnect();
  const beforeUser = await User.findById(context.params.id)
    .select('email name roles status')
    .lean();

  if (!beforeUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.name) update.name = parsed.data.name;
  if (parsed.data.roles) update.roles = parsed.data.roles;
  if (parsed.data.status) update.status = parsed.data.status;
  if (parsed.data.password) {
    update.passwordHash = await hashPassword(parsed.data.password);
  }

  const user = await User.findByIdAndUpdate(context.params.id, update, { new: true })
    .select('email name roles status updatedAt')
    .lean();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await logAuditEvent({
    actor: buildAuditActor(auth.user),
    action: 'update',
    entityType: 'user',
    entityId: context.params.id,
    summary: `Updated user ${user.email}`,
    request,
    changes: {
      fields: diffAuditFields(beforeUser, user),
    },
  });

  return NextResponse.json({ success: true, data: user });
}
