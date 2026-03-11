import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import ProjectBOQ from '@/models/ProjectBOQ';
import Project from '@/models/Project';

// GET /api/project-boq?projectId=xxx - List BOQ items for a project
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }
    
    const boqItems = await ProjectBOQ.find({ projectId })
      .populate('templateId')
      .sort({ payItemNumber: 1 });
    
    return NextResponse.json({
      success: true,
      data: boqItems
    });
  } catch (error: any) {
    console.error('Error fetching BOQ items:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/project-boq - Create BOQ item from template instantiation
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.projectId || !body.templateId) {
      return NextResponse.json(
        { success: false, error: 'projectId and templateId are required' },
        { status: 400 }
      );
    }

    const project = await Project.findById(body.projectId).select('powMode');
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.powMode !== 'manual') {
      return NextResponse.json(
        { success: false, error: 'Manual BOQ is read-only while Takeoff Linked mode is active' },
        { status: 403 }
      );
    }
    
    // Log what we're receiving for debugging
    console.log('Creating BOQ item with data:', {
      projectId: body.projectId,
      templateId: body.templateId,
      equipmentItemsCount: body.equipmentItems?.length || 0,
      materialItemsCount: body.materialItems?.length || 0,
      laborItemsCount: body.laborItems?.length || 0,
    });
    
    // Validate nested arrays have required fields
    if (body.equipmentItems) {
      body.equipmentItems.forEach((item: any, idx: number) => {
        if (!item.description || item.description.trim() === '') {
          console.error(`Equipment item ${idx} missing description:`, item);
        }
      });
    }
    
    if (body.materialItems) {
      body.materialItems.forEach((item: any, idx: number) => {
        if (!item.materialCode || item.materialCode.trim() === '') {
          console.error(`Material item ${idx} missing materialCode:`, item);
        }
        if (!item.description || item.description.trim() === '') {
          console.error(`Material item ${idx} missing description:`, item);
        }
      });
    }
    
    // Body should contain computed DUPA from instantiation + projectId + quantity
    const boqItem = await ProjectBOQ.create(body);
    
    return NextResponse.json(
      {
        success: true,
        data: boqItem
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating BOQ item:', error);
    console.error('Validation errors:', error.errors);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: error.errors ? Object.values(error.errors).map((e: any) => e.message).join(', ') : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE /api/project-boq?projectId=xxx - Remove all BOQ items for a project
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const project = await Project.findById(projectId).select('powMode');
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.powMode !== 'manual') {
      return NextResponse.json(
        { success: false, error: 'Manual BOQ is read-only while Takeoff Linked mode is active' },
        { status: 403 }
      );
    }

    const result = await ProjectBOQ.deleteMany({ projectId });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error('Error deleting project BOQ items:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
