import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db/connect';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth/password';
import { getSessionUser } from '@/lib/auth/session';
import { MASTER_ADMIN_ROLES } from '@/lib/auth/roles';
import { buildAuditActor, logAuditEvent } from '@/lib/audit/logger';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  roles: z.array(z.string()).min(1),
  status: z.enum(['active', 'disabled']).optional(),
});

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || !MASTER_ADMIN_ROLES.some(role => user.roles?.includes(role))) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if ('response' in auth) {
    return auth.response;
  }

  await dbConnect();
  const users = await User.find()
    .select('email name roles status createdAt updatedAt')
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ success: true, data: users });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('response' in auth) {
    return auth.response;
  }

  const payload = await request.json();
  const parsed = createUserSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  await dbConnect();
  const existing = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await User.create({
    email: parsed.data.email.toLowerCase(),
    name: parsed.data.name,
    passwordHash,
    roles: parsed.data.roles,
    status: parsed.data.status || 'active',
    createdBy: auth.user?.id,
  });

  await logAuditEvent({
    actor: buildAuditActor(auth.user),
    action: 'create',
    entityType: 'user',
    entityId: user._id.toString(),
    summary: `Created user ${user.email}`,
    request,
    changes: {
      after: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        roles: user.roles,
        status: user.status,
      },
    },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        roles: user.roles,
        status: user.status,
      },
    },
    { status: 201 }
  );
}
