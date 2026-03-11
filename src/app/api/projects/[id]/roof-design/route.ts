import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await context.params;
    
    const project = await Project.findById(id).select('trussDesign').lean();
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    return NextResponse.json(project.trussDesign || null);
  } catch (error) {
    console.error('Error fetching truss design:', error);
    return NextResponse.json({ error: 'Failed to fetch truss design' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();
    
    const project = await Project.findByIdAndUpdate(
      id,
      {
        $set: {
          'trussDesign.trussParams': body.trussParams,
          'trussDesign.buildingLength_mm': body.buildingLength_mm,
          'trussDesign.framingParams': body.framingParams,
          'trussDesign.dpwhItemMappings': body.dpwhItemMappings,
          'trussDesign.lastModified': new Date()
        }
      },
      { new: true, runValidators: true }
    );
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      trussDesign: project.trussDesign 
    });
  } catch (error) {
    console.error('Error saving truss design:', error);
    return NextResponse.json({ error: 'Failed to save truss design' }, { status: 500 });
  }
}
