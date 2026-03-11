import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import AuditLog from '@/models/AuditLog';
import { getSessionUser } from '@/lib/auth/session';
import { MASTER_ADMIN_ROLES } from '@/lib/auth/roles';

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || !MASTER_ADMIN_ROLES.some(role => user.roles?.includes(role))) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('response' in auth) {
    return auth.response;
  }

  await dbConnect();

  const searchParams = request.nextUrl.searchParams;
  const entityType = searchParams.get('entityType') || '';
  const action = searchParams.get('action') || '';
  const status = searchParams.get('status') || '';
  const actor = searchParams.get('actor') || '';
  const projectId = searchParams.get('projectId') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);

  const filter: Record<string, any> = {};

  if (entityType) {
    filter.entityType = entityType;
  }
  if (action) {
    filter.action = action;
  }
  if (status) {
    filter.status = status;
  }
  if (projectId) {
    filter.projectId = projectId;
  }
  if (actor) {
    filter.$or = [
      { 'actor.email': { $regex: actor, $options: 'i' } },
      { 'actor.name': { $regex: actor, $options: 'i' } },
      { 'actor.userId': { $regex: actor, $options: 'i' } },
    ];
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) {
      filter.createdAt.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      filter.createdAt.$lte = new Date(dateTo);
    }
  }

  const total = await AuditLog.countDocuments(filter);
  const data = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
