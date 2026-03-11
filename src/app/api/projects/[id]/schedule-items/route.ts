/**
 * API Route: /api/projects/[id]/schedule-items
 * CRUD operations for schedule items (Mode C: direct quantity items)
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import { v4 as uuidv4 } from 'uuid';
import type { ScheduleItem } from '@/types';
import catalog from '@/data/dpwh-catalog.json';

// GET /api/projects/[id]/schedule-items - List all schedule items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    let items = project.scheduleItems || [];

    if (category) {
      items = items.filter((item: ScheduleItem) => item.category === category);
    }

    return NextResponse.json({ scheduleItems: items });
  } catch (error) {
    console.error('Error fetching schedule items:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule items' }, { status: 500 });
  }
}

// POST /api/projects/[id]/schedule-items - Create new schedule item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const catalogItem = catalog.items.find((item: { itemNumber: string; unit: string }) =>
      item.itemNumber === body.dpwhItemNumberRaw
    );
    if (!catalogItem) {
      return NextResponse.json(
        { error: `DPWH item "${body.dpwhItemNumberRaw}" not found in catalog` },
        { status: 400 }
      );
    }

    if (catalogItem.unit !== body.unit) {
      return NextResponse.json(
        { error: `Unit mismatch: expected "${catalogItem.unit}" but got "${body.unit}"` },
        { status: 400 }
      );
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const newItem: ScheduleItem = {
      id: uuidv4(),
      category: body.category,
      dpwhItemNumberRaw: body.dpwhItemNumberRaw,
      itemName: body.descriptionOverride || body.dpwhItemNumberRaw,
      descriptionOverride: body.descriptionOverride,
      unit: body.unit,
      qty: body.qty,
      quantity: body.qty ?? body.quantity,
      basisNote: body.basisNote,
      tags: body.tags || [],
      mark: body.mark,
      width_m: body.width_m,
      height_m: body.height_m,
      location: body.location,
    };

    if (!project.scheduleItems) {
      project.scheduleItems = [];
    }
    project.scheduleItems.push(newItem);

    await project.save();

    return NextResponse.json({ scheduleItem: newItem }, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule item:', error);
    return NextResponse.json(
      {
        error: 'Failed to create schedule item',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/schedule-items?itemId=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json({ error: 'itemId required' }, { status: 400 });
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.scheduleItems) {
      return NextResponse.json({ error: 'No schedule items found' }, { status: 404 });
    }

    project.scheduleItems = project.scheduleItems.filter((item: ScheduleItem) => item.id !== itemId);
    await project.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule item:', error);
    return NextResponse.json({ error: 'Failed to delete schedule item' }, { status: 500 });
  }
}
