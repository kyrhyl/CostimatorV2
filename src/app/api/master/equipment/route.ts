/**
 * Master Data API - Equipment Rates
 * Manages equipment rate data
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Equipment from '@/models/Equipment';
import EquipmentRate from '@/models/EquipmentRate';
import EquipmentRateScenario from '@/models/EquipmentRateScenario';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const EquipmentSchema = z.object({
  no: z.number().int().positive('Equipment number must be positive'),
  completeDescription: z.string().min(1, 'Complete description is required'),
  description: z.string().optional(),
  equipmentModel: z.string().optional(),
  capacity: z.string().optional(),
  flywheelHorsepower: z.number().min(0).optional(),
  fuelConsumptionAvgLph: z.number().min(0).optional(),
  lubeConsumptionAvgLph: z.number().min(0).optional(),
  hourlyRate: z.number().min(0).optional(),
  rentalRate: z.number().min(0).optional(),
  rateEdition: z.string().optional(),
  syncRateEntries: z.boolean().optional(),
});

const BulkEquipmentSchema = z.array(EquipmentSchema).min(1, 'At least one equipment required');

// ============================================================================
// Helper Functions
// ============================================================================

function validateInput<T>(schema: z.ZodSchema<T>, data: unknown) {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    return { success: false, error: 'Validation failed' };
  }
}

async function syncEquipmentRates(
  equipmentId: string,
  rateEdition: string,
  equipmentData: {
    hourlyRate?: number;
    fuelConsumptionAvgLph?: number;
    lubeConsumptionAvgLph?: number;
  }
) {
  const edition = rateEdition.trim().toUpperCase();
  if (!edition) {
    return;
  }

  const hourlyRate = Number(equipmentData.hourlyRate || 0);
  const fuelAvg = Number(equipmentData.fuelConsumptionAvgLph || 0);
  const lubeAvg = Number(equipmentData.lubeConsumptionAvgLph || 0);

  await EquipmentRate.updateOne(
    { equipmentId, edition, mode: 'fixed' },
    {
      $set: {
        source: 'manual',
        ratePerHour: hourlyRate,
        dryRate: hourlyRate,
        isActive: true,
      },
    },
    { upsert: true }
  );

  await EquipmentRate.updateOne(
    { equipmentId, edition, mode: 'variable_fuel_lube' },
    {
      $set: {
        source: 'manual',
        ratePerHour: hourlyRate,
        dryRate: hourlyRate,
        fuel: {
          avgLph: fuelAvg,
          unitCostPerLiter: 0,
          costPerHour: 0,
        },
        lube: {
          avgLph: lubeAvg,
          unitCostPerLiter: 0,
          costPerHour: 0,
        },
        isActive: true,
      },
    },
    { upsert: true }
  );
}

// ============================================================================
// API Routes
// ============================================================================

/**
 * GET /api/master/equipment
 * List all equipment with optional filtering
 * 
 * Query Parameters:
 * - search: Search in description or completeDescription (partial match)
 * - sortBy: Field to sort by (default: no)
 * - order: Sort order 'asc' or 'desc' (default: asc)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'no';
    const order = searchParams.get('order') === 'desc' ? -1 : 1;
    const edition = (searchParams.get('edition') || '').trim().toUpperCase();
    const mode = (searchParams.get('mode') || 'fixed').trim() as 'fixed' | 'variable_fuel_lube';
    const equipmentVersion = (searchParams.get('equipmentVersion') || '').trim().toUpperCase();
    const scenarioName = (searchParams.get('scenario') || 'BASE').trim().toUpperCase();
    
    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { completeDescription: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query
    let equipment = await Equipment.find(query)
      .sort({ [sortBy]: order })
      .lean();

    if (edition && (mode === 'fixed' || mode === 'variable_fuel_lube')) {
      const ids = equipment.map((e: any) => e._id);
      const rates = await EquipmentRate.find({
        equipmentId: { $in: ids },
        edition,
        mode,
        isActive: true,
      })
        .select('equipmentId ratePerHour dryRate fuel lube')
        .lean();

      let fuelPricePerLiter: number | null = null;
      let lubePricePerLiter: number | null = null;
      if (mode === 'variable_fuel_lube' && equipmentVersion) {
        const scenario = await EquipmentRateScenario.findOne({
          projectId: null,
          equipmentVersion,
          edition,
          name: scenarioName,
          isActive: true,
        })
          .select('fuelPricePerLiter lubePricePerLiter')
          .lean();
        fuelPricePerLiter = Number(scenario?.fuelPricePerLiter ?? NaN);
        lubePricePerLiter = Number(scenario?.lubePricePerLiter ?? NaN);
      }

      const rateMap = new Map<string, any>(
        rates.map((r: any) => {
          let resolved = Number(r.ratePerHour || 0);
          const dryRate = Number(r.dryRate || 0);
          const fuelAvgRaw = Number(r.fuel?.avgLph || 0);
          const lubeAvgRaw = Number(r.lube?.avgLph || 0);
          let fuelCost = 0;
          let lubeCost = 0;
          if (
            mode === 'variable_fuel_lube' &&
            Number.isFinite(fuelPricePerLiter as number) &&
            Number.isFinite(lubePricePerLiter as number)
          ) {
            fuelCost = fuelAvgRaw * (fuelPricePerLiter as number);
            lubeCost = lubeAvgRaw * (lubePricePerLiter as number);
            resolved = dryRate + fuelCost + lubeCost;
          }
          return [String(r.equipmentId), { resolved, fuelAvg: fuelAvgRaw, lubeAvg: lubeAvgRaw, dryRate, fuelCost, lubeCost }];
        })
      );

      for (const eq of equipment as any[]) {
        const rateData = rateMap.get(String(eq._id));
        eq.hasRate = Boolean(rateData);
        eq.usingMasterRate = false;
        if (!rateData) {
          const masterHourlyRate = Number(eq.hourlyRate || 0);
          eq.usingMasterRate = masterHourlyRate > 0;
          eq.basePrice = masterHourlyRate > 0 ? masterHourlyRate : null;
          eq.fuelCost = null;
          eq.lubeCost = null;
          eq.calculatedRate = masterHourlyRate > 0 ? masterHourlyRate : null;
          eq.hourlyRate = masterHourlyRate > 0 ? masterHourlyRate : null;
          continue;
        }

        if (
          mode === 'variable_fuel_lube' &&
          Number.isFinite(fuelPricePerLiter as number) &&
          Number.isFinite(lubePricePerLiter as number)
        ) {
          const fuelAvg = rateData.fuelAvg > 0 ? rateData.fuelAvg : Number(eq.fuelConsumptionAvgLph || 0);
          const lubeAvg = rateData.lubeAvg > 0 ? rateData.lubeAvg : Number(eq.lubeConsumptionAvgLph || 0);
          const fuelCost = fuelAvg * (fuelPricePerLiter as number);
          const lubeCost = lubeAvg * (lubePricePerLiter as number);
          eq.basePrice = rateData.dryRate;
          eq.fuelCost = fuelCost;
          eq.lubeCost = lubeCost;
          eq.calculatedRate = rateData.dryRate + fuelCost + lubeCost;
          eq.hourlyRate = eq.calculatedRate;
        } else if (typeof rateData.resolved === 'number' && rateData.resolved > 0) {
          eq.hourlyRate = rateData.resolved;
        }
      }
    }


    return NextResponse.json({
      success: true,
      count: equipment.length,
      data: equipment,
      meta:
        edition && (mode === 'fixed' || mode === 'variable_fuel_lube')
          ? {
              edition,
              mode,
              note: 'Showing only equipment covered by selected ACEL edition/mode',
            }
          : undefined,
    });
  } catch (error: any) {
    console.error('GET /api/master/equipment error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/master/equipment
 * Create new equipment or bulk import
 * 
 * Body:
 * - Single: EquipmentSchema
 * - Bulk: Array of EquipmentSchema
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    
    if (Array.isArray(body)) {
      // Bulk import
      const validation = validateInput(BulkEquipmentSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
      
      // Check for duplicates by equipment number
      const numbers = validation.data!.map(eq => eq.no);
      const existingEquipment = await Equipment.find({
        no: { $in: numbers }
      }).select('no description');
      
      if (existingEquipment.length > 0) {
        const duplicates = existingEquipment.map(eq => `#${eq.no} (${eq.description})`).join(', ');
        return NextResponse.json(
          { 
            success: false, 
            error: `Equipment already exists: ${duplicates}` 
          },
          { status: 409 }
        );
      }
      
      // Insert all equipment
      const equipment = await Equipment.insertMany(validation.data, { 
        ordered: false 
      });
      
      return NextResponse.json({
        success: true,
        message: `Successfully imported ${equipment.length} equipment items`,
        count: equipment.length,
        data: equipment
      }, { status: 201 });
      
    } else {
      // Single creation
      const validation = validateInput(EquipmentSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
      
      const equipmentData = validation.data!;
      const { rateEdition, syncRateEntries, ...equipmentFields } = equipmentData;
      const payload = {
        ...equipmentFields,
        description: (equipmentFields.description || equipmentFields.completeDescription).trim(),
      };
      
      // Check if equipment number already exists
      const existing = await Equipment.findOne({ no: equipmentFields.no });
      
      if (existing) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Equipment #${equipmentFields.no} already exists` 
          },
          { status: 409 }
        );
      }
      
      // Create new equipment
      const equipment = await Equipment.create(payload);

      if (syncRateEntries && rateEdition) {
        await syncEquipmentRates(String(equipment._id), rateEdition, equipmentFields);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Equipment created successfully',
        data: equipment
      }, { status: 201 });
    }
  } catch (error: any) {
    console.error('POST /api/master/equipment error:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Equipment with this number already exists' 
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create equipment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/master/equipment
 * Clear all equipment (for re-import scenarios)
 * 
 * Query Parameters:
 * - confirm: Must be 'true' to execute deletion
 */
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get('confirm');
    
    if (confirm !== 'true') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please confirm deletion by adding ?confirm=true to the URL' 
        },
        { status: 400 }
      );
    }
    
    const result = await Equipment.deleteMany({});
    
    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} equipment items`,
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    console.error('DELETE /api/master/equipment error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete equipment' },
      { status: 500 }
    );
  }
}
