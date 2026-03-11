/**
 * API Route: /api/projects/[id]/schedule-items/[itemId]
 * Individual schedule item operations (PUT, DELETE)
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import type { ScheduleItem } from '@/types';
import catalog from '@/data/dpwh-catalog.json';

// PUT /api/projects/[id]/schedule-items/[itemId] - Update schedule item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    await dbConnect();
    const { id, itemId } = await params;
    const body = await request.json();

    if (body.dpwhItemNumberRaw) {
      const catalogItem = catalog.items.find((item: { itemNumber: string; unit: string }) =>
        item.itemNumber === body.dpwhItemNumberRaw
      );
      if (!catalogItem) {
        return NextResponse.json(
          { error: `DPWH item "${body.dpwhItemNumberRaw}" not found in catalog` },
          { status: 400 }
        );
      }

      if (body.unit && catalogItem.unit !== body.unit) {
        return NextResponse.json(
          { error: `Unit mismatch: expected "${catalogItem.unit}" but got "${body.unit}"` },
          { status: 400 }
        );
      }
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.scheduleItems) {
      return NextResponse.json({ error: 'No schedule items found' }, { status: 404 });
    }

    const itemIndex = project.scheduleItems.findIndex((item: ScheduleItem) => item.id === itemId);
    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Schedule item not found' }, { status: 404 });
    }

    const updatedItem: ScheduleItem = {
      ...project.scheduleItems[itemIndex],
      category: body.category ?? project.scheduleItems[itemIndex].category,
      dpwhItemNumberRaw: body.dpwhItemNumberRaw ?? project.scheduleItems[itemIndex].dpwhItemNumberRaw,
      itemName: body.descriptionOverride ?? body.dpwhItemNumberRaw ?? project.scheduleItems[itemIndex].itemName,
      descriptionOverride: body.descriptionOverride ?? project.scheduleItems[itemIndex].descriptionOverride,
      unit: body.unit ?? project.scheduleItems[itemIndex].unit,
      qty: body.qty ?? project.scheduleItems[itemIndex].qty,
      quantity: body.qty ?? body.quantity ?? project.scheduleItems[itemIndex].quantity,
      basisNote: body.basisNote ?? project.scheduleItems[itemIndex].basisNote,
      tags: body.tags ?? project.scheduleItems[itemIndex].tags,
      mark: body.mark ?? project.scheduleItems[itemIndex].mark,
      width_m: body.width_m ?? project.scheduleItems[itemIndex].width_m,
      height_m: body.height_m ?? project.scheduleItems[itemIndex].height_m,
      location: body.location ?? project.scheduleItems[itemIndex].location,
    };

    project.scheduleItems[itemIndex] = updatedItem;
    await project.save();

    return NextResponse.json({ scheduleItem: updatedItem });
  } catch (error) {
    console.error('Error updating schedule item:', error);
    return NextResponse.json({ error: 'Failed to update schedule item' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/schedule-items/[itemId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    await dbConnect();
    const { id, itemId } = await params;

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
