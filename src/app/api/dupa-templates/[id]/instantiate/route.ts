/**
 * POST /api/dupa-templates/:id/instantiate
 * Instantiate a DUPA template with location-specific rates
 * 
 * Converts template into actual RateItem by fetching current rates:
 * - Labor rates from LaborRate model (by location)
 * - Equipment rates from Equipment model (by equipmentId)
 * - Material prices from MaterialPrice model (by materialCode + location)
 */

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import DUPATemplate from '@/models/DUPATemplate';
import LaborRate from '@/models/LaborRate';
import Equipment from '@/models/Equipment';
import Material from '@/models/Material';
import MaterialPrice from '@/models/MaterialPrice';
import Project from '@/models/Project';
import mongoose from 'mongoose';
import { z } from 'zod';
import { computeHaulingCost } from '@/lib/calc/hauling';

const InstantiateRequestSchema = z.object({
  location: z.string().min(1, 'Location is required'),
  district: z.string().optional(),
  laborVersion: z.string().optional(),
  useEvaluated: z.boolean().default(false),
  effectiveDate: z.string().optional(), // For fetching historical prices
  projectId: z.string().optional(),
  projectOcmPercentage: z.number().optional(), // Override with project-level OCM %
  projectCpPercentage: z.number().optional(), // Override with project-level CP %
});

function normalizeEquipmentDescription(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMaterialDescription(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get material price with CMPD-version-first priority.
 * Priority:
 * 1. CMPD-version price by material code, regardless of location
 * 2. CMPD-version price by description, regardless of location
 * 3. Location/district fallback lookups for legacy/local canvass rows
 */
async function getMaterialPrice(
  materialCode: string,
  location?: string,
  district?: string,
  effectiveDate?: Date,
  cmpdVersion?: string,
  materialDescription?: string,
): Promise<number | null> {
  const normalizedCode = String(materialCode || '').trim().toUpperCase();
  const codeRegex = normalizedCode ? new RegExp(`^${normalizedCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null;
  const normalizedDescription = String(materialDescription || '').trim();
  const normalizedDescriptionLoose = normalizedDescription.replace(/\s+/g, ' ').trim();

  if (cmpdVersion) {
    const versionCodeQuery: any = {
      materialCode: codeRegex || normalizedCode,
      cmpd_version: cmpdVersion,
      isActive: true,
      effectiveDate: effectiveDate ? { $lte: effectiveDate } : { $exists: true },
    };

    const versionCodePrice: any = await MaterialPrice.findOne(versionCodeQuery)
      .sort({ priceSource: 1, effectiveDate: -1 })
      .lean();

    if (versionCodePrice) {
      console.log(`Using CMPD-version price for ${materialCode} (${cmpdVersion}): P${versionCodePrice.unitCost}`);
      return versionCodePrice.unitCost;
    }

    if (normalizedDescription) {
      const strictDescRegex = new RegExp(`^${normalizedDescription.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      const looseDescRegex = new RegExp(normalizedDescriptionLoose.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

      const versionDescPrice: any = await MaterialPrice.findOne({
        description: { $in: [strictDescRegex, looseDescRegex] },
        cmpd_version: cmpdVersion,
        isActive: true,
        effectiveDate: effectiveDate ? { $lte: effectiveDate } : { $exists: true },
      })
        .sort({ priceSource: 1, effectiveDate: -1 })
        .lean();

      if (versionDescPrice) {
        console.log(`Using CMPD-version description price for ${normalizedDescription} (${cmpdVersion}): P${versionDescPrice.unitCost}`);
        return versionDescPrice.unitCost;
      }
    }
  }

  // Legacy fallback: location-specific price
  if (location) {
    const locationQuery: any = {
      materialCode: codeRegex || normalizedCode,
      location,
      isActive: true,
      effectiveDate: effectiveDate ? { $lte: effectiveDate } : { $exists: true },
    };

    if (cmpdVersion) locationQuery.cmpd_version = cmpdVersion;

    const locationPrice: any = await MaterialPrice.findOne(locationQuery)
      .sort({ effectiveDate: -1 })
      .lean();

    if (locationPrice) {
      console.log(`Using location-specific price for ${materialCode} in ${location}${cmpdVersion ? ` (${cmpdVersion})` : ''}: ₱${locationPrice.unitCost}`);
      return locationPrice.unitCost;
    }

  }

  // Legacy fallback: district-specific price
  if (district) {
    const query: any = {
      materialCode: codeRegex || normalizedCode,
      district: district,
      isActive: true,
      effectiveDate: effectiveDate 
        ? { $lte: effectiveDate } 
        : { $exists: true }
    };
    
    // If CMPD version is specified, prefer that version
    if (cmpdVersion) query.cmpd_version = cmpdVersion;
    
    const districtPrice: any = await MaterialPrice.findOne(query)
      .sort({ effectiveDate: -1 }) // Get most recent price
      .lean();
    
    if (districtPrice) {
      console.log(`Using district-specific price for ${materialCode} in ${district}${cmpdVersion ? ` (${cmpdVersion})` : ''}: ₱${districtPrice.unitCost}`);
      return districtPrice.unitCost;
    }
    
  }

  // Priority 1.5: Description-based lookup (handles bad/missing material codes)
  if (normalizedDescription) {
    const strictDescRegex = new RegExp(`^${normalizedDescription.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const looseDescRegex = new RegExp(normalizedDescriptionLoose.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    if (location) {
      const byDescLocation: any = await MaterialPrice.findOne({
        description: { $in: [strictDescRegex, looseDescRegex] },
        location,
        isActive: true,
        ...(cmpdVersion ? { cmpd_version: cmpdVersion } : {}),
        effectiveDate: effectiveDate ? { $lte: effectiveDate } : { $exists: true },
      })
        .sort({ effectiveDate: -1 })
        .lean();

      if (byDescLocation) {
        console.log(`Using location description price for ${normalizedDescription} in ${location}: ₱${byDescLocation.unitCost}`);
        return byDescLocation.unitCost;
      }

    }

    if (district) {
      const byDescDistrict: any = await MaterialPrice.findOne({
        description: { $in: [strictDescRegex, looseDescRegex] },
        district,
        isActive: true,
        ...(cmpdVersion ? { cmpd_version: cmpdVersion } : {}),
        effectiveDate: effectiveDate ? { $lte: effectiveDate } : { $exists: true },
      })
        .sort({ effectiveDate: -1 })
        .lean();

      if (byDescDistrict) {
        console.log(`Using district description price for ${normalizedDescription} in ${district}: ₱${byDescDistrict.unitCost}`);
        return byDescDistrict.unitCost;
      }

    }
  }

  console.warn(`No price found for material ${materialCode}${normalizedDescription ? ` (${normalizedDescription})` : ''}`);
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID format' },
        { status: 400 }
      );
    }

    // Validate request body
    const body = await request.json();
    let validated;
    try {
      validated = InstantiateRequestSchema.parse(body);
    } catch (validationError: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: validationError.errors,
        },
        { status: 400 }
      );
    }

      const { location, projectId, projectOcmPercentage, projectCpPercentage } = validated;
    
    console.log(`Instantiating template with location: "${location}", projectId: ${projectId}, OCM: ${projectOcmPercentage}%, CP: ${projectCpPercentage}%`);

    // Fetch project for hauling configuration and district
    let haulingCostPerCuM = 0;
    let projectDistrict: string | undefined = undefined;
    let projectCmpdVersion: string | undefined = undefined;
    let manualPowConfig: any = null;

    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      const project: any = await Project.findById(projectId).lean();
      manualPowConfig = project?.manualPowConfig || null;
      projectDistrict = manualPowConfig?.district || project?.district;
      projectCmpdVersion = manualPowConfig?.cmpdVersion || project?.cmpdVersion;
      console.log('Project fetched:', {
        name: project?.projectName,
        district: projectDistrict,
        cmpdVersion: projectCmpdVersion,
        distanceFromOffice: project?.distanceFromOffice,
        haulingCostPerKm: project?.haulingCostPerKm,
        hasHaulingConfig: !!project?.haulingConfig
      });
      
      if (project && project.distanceFromOffice && project.distanceFromOffice > 0) {
        console.log(`Project distance: ${project.distanceFromOffice} km`);
        
        // Check if project has detailed hauling config
        if (project.haulingConfig && project.haulingConfig.routeSegments) {
          const config = project.haulingConfig;
          const haulingTemplate = {
            totalDistanceKm: config.totalDistance || project.distanceFromOffice,
            freeHaulingDistanceKm: config.freeHaulingDistance || 3,
            routeSegments: config.routeSegments,
            equipmentHourlyRatePhp: config.equipmentRentalRate || 1420,
            equipmentCapacityCuM: config.equipmentCapacity || 10,
          };
          console.log('Using project hauling config:', JSON.stringify(haulingTemplate, null, 2));
          const haulingResult = computeHaulingCost(haulingTemplate);
          console.log('Hauling calculation result:', JSON.stringify(haulingResult, null, 2));
          haulingCostPerCuM = haulingResult.costPerCuMPhp;
        } else {
          // Fallback to simple calculation using default values
          // Use DPWH standard dump truck rate (₱1,420/hr) as minimum
          const DPWH_DUMP_TRUCK_RATE = 1420;
          const TRUCK_CAPACITY_CUM = 6;
          
          const haulingEquipment: any = await Equipment.findOne({
            category: { $regex: /truck|hauling|dump/i }
          }).sort({ hourlyRate: 1 }).lean();
          
          // Use equipment rate if available and reasonable (> ₱500/hr), otherwise use DPWH standard
          let equipmentRate = DPWH_DUMP_TRUCK_RATE;
          if (haulingEquipment && haulingEquipment.hourlyRate >= 500) {
            equipmentRate = haulingEquipment.hourlyRate;
            console.log(`Using equipment: ${haulingEquipment.name || 'N/A'} at ₱${equipmentRate}/hr`);
          } else {
            console.log(`⚠️ No suitable hauling equipment found or rate too low, using DPWH standard ₱${DPWH_DUMP_TRUCK_RATE}/hr`);
          }
          
          const haulingTemplate = {
            totalDistanceKm: project.distanceFromOffice,
            freeHaulingDistanceKm: 3,
            routeSegments: [{
              distanceKm: project.distanceFromOffice,
              speedUnloadedKmh: 40,
              speedLoadedKmh: 30,
            }],
            equipmentHourlyRatePhp: equipmentRate,
            equipmentCapacityCuM: TRUCK_CAPACITY_CUM,
          };
          console.log('Fallback hauling config:', JSON.stringify(haulingTemplate, null, 2));
          const haulingResult = computeHaulingCost(haulingTemplate);
          console.log('Hauling calculation result:', JSON.stringify(haulingResult, null, 2));
          haulingCostPerCuM = haulingResult.costPerCuMPhp;
        }
      } else if (project) {
        console.log(`⚠️ Project has no distance or distance is 0 - hauling cost will be 0`);
      }
    } else {
      console.log(`⚠️ No valid projectId provided - hauling cost will be 0`);
    }
    
    console.log(`✅ Final hauling cost per cu.m.: ₱${haulingCostPerCuM.toFixed(2)}`);

    // Fetch template
    const template = await DUPATemplate.findById(id);
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'DUPA template not found' },
        { status: 404 }
      );
    }

    // Fetch location-specific labor rates with resilient fallback order
    const requestedDistrict = validated.district || projectDistrict;
    const requestedVersion = validated.laborVersion;
    const escapedLocation = location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const locationRegex = new RegExp(`^${escapedLocation}$`, 'i');

    const candidateQueries: Array<Record<string, unknown>> = [];

    // 1) strict match (location + district + version)
    candidateQueries.push({
      location,
      ...(requestedDistrict ? { district: requestedDistrict } : {}),
      ...(requestedVersion ? { laborVersion: requestedVersion } : {}),
    });

    // 2) ignore district (if district may not align with project metadata)
    if (requestedDistrict) {
      candidateQueries.push({
        location,
        ...(requestedVersion ? { laborVersion: requestedVersion } : {}),
      });
    }

    // 3) case-insensitive location variants
    candidateQueries.push({
      location: locationRegex,
      ...(requestedDistrict ? { district: requestedDistrict } : {}),
      ...(requestedVersion ? { laborVersion: requestedVersion } : {}),
    });

    if (requestedDistrict) {
      candidateQueries.push({
        location: locationRegex,
        ...(requestedVersion ? { laborVersion: requestedVersion } : {}),
      });
    }

    // 4) if requested version has no rows for the location, fallback to latest available
    if (requestedVersion) {
      candidateQueries.push({
        location,
        ...(requestedDistrict ? { district: requestedDistrict } : {}),
      });
      candidateQueries.push({
        location: locationRegex,
        ...(requestedDistrict ? { district: requestedDistrict } : {}),
      });
      candidateQueries.push({ location });
      candidateQueries.push({ location: locationRegex });
    }

    let laborRates: any = null;
    for (const query of candidateQueries) {
      laborRates = await LaborRate.findOne(query).sort({ effectiveDate: -1, updatedAt: -1 }).lean();
      if (laborRates) break;
    }

    if (!laborRates) {
      return NextResponse.json(
        {
          success: false,
          error: `No labor rates found for location: ${location}${requestedVersion ? ` (version: ${requestedVersion})` : ''}`,
        },
        { status: 404 }
      );
    }

    // Map labor designations to database field names
    const laborRateMap: Record<string, string> = {
      'Foreman': 'foreman',
      'Leadman': 'leadman',
      'Equipment Operator - Heavy': 'equipmentOperatorHeavy',
      'Equipment Operator - High Skilled': 'equipmentOperatorHighSkilled',
      'Equipment Operator - Light Skilled': 'equipmentOperatorLightSkilled',
      'Driver': 'driver',
      'Skilled Labor': 'laborSkilled',
      'Semi-Skilled Labor': 'laborSemiSkilled',
      'Unskilled Labor': 'laborUnskilled',
    };

    // Instantiate labor entries
    const laborEntries = await Promise.all(
      template.laborTemplate.map(async (labor: any) => {
        const rateField = laborRateMap[labor.designation] || labor.designation.toLowerCase().replace(/[\s-]+/g, '');
        const hourlyRate = (laborRates as any)[rateField] || 0;
        
        return {
          designation: labor.designation,
          noOfPersons: labor.noOfPersons,
          noOfHours: labor.noOfHours,
          hourlyRate,
          amount: labor.noOfPersons * labor.noOfHours * hourlyRate,
        };
      })
    );

    // Instantiate equipment entries (filter out empty entries)
    const unresolvedEquipment: string[] = [];
    const equipmentEntriesRaw = await Promise.all(
      template.equipmentTemplate
        .filter((equip: any) => equip.equipmentId || equip.description) // Only process entries with data
        .map(async (equip: any) => {
          let hourlyRate = 0;
          let description = equip.description || '';
          let equipmentId = equip.equipmentId || null;
          let equipment: any = null;

          if (equip.equipmentId) {
            equipment = await Equipment.findById(equip.equipmentId).lean();
            if (equipment) {
              hourlyRate = equipment.hourlyRate || 0;
              description = equipment.completeDescription || equipment.description || description;
              equipmentId = equipment._id;
            }
          }

          if (!equipment && description) {
            const normalizedDescription = normalizeEquipmentDescription(description);
            if (normalizedDescription) {
              equipment = await Equipment.findOne({
                $or: [
                  { completeDescription: new RegExp(`^${normalizedDescription.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}$`, 'i') },
                  { description: new RegExp(`^${normalizedDescription.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}$`, 'i') },
                ],
              }).lean();

              if (!equipment) {
                const allMatches = await Equipment.find({
                  $or: [
                    { completeDescription: { $exists: true, $ne: '' } },
                    { description: { $exists: true, $ne: '' } },
                  ],
                })
                  .select('description completeDescription hourlyRate')
                  .lean();

                equipment = allMatches.find((entry: any) => {
                  const complete = normalizeEquipmentDescription(entry.completeDescription || '');
                  const short = normalizeEquipmentDescription(entry.description || '');
                  return complete === normalizedDescription || short === normalizedDescription;
                }) || null;
              }

              if (equipment) {
                hourlyRate = Number(equipment.hourlyRate || 0);
                description = equipment.completeDescription || equipment.description || description;
                equipmentId = equipment._id;
              }
            }
          }

          if ((!equipmentId || hourlyRate <= 0) && description.trim()) {
            unresolvedEquipment.push(description.trim());
          }
          
          // Ensure we have a valid description
          if (!description || description.trim() === '') {
            description = 'Equipment Item';
          }
          
          const noOfUnits = Number(equip.noOfUnits) || 0;
          const noOfHours = Number(equip.noOfHours) || 0;
          const amount = noOfUnits * noOfHours * hourlyRate;
          
          return {
            equipmentId: equipmentId || undefined,
            description: description.trim(),
            noOfUnits,
            noOfHours,
            hourlyRate,
            amount: isNaN(amount) ? 0 : amount,
          };
        })
    );

    if (unresolvedEquipment.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Unable to resolve equipment rate for: ${Array.from(new Set(unresolvedEquipment)).join(', ')}. Update the DUPA template to link these rows to master equipment records.`,
        },
        { status: 422 }
      );
    }
    
    const equipmentEntries = equipmentEntriesRaw;

    // Handle Minor Tools
    const laborCost = laborEntries.reduce((sum, labor) => sum + labor.amount, 0);
    if (template.includeMinorTools) {
      const minorToolsPercentage = Number(template.minorToolsPercentage || 10);
      const minorToolsCost = laborCost * (minorToolsPercentage / 100);
      equipmentEntries.push({
        equipmentId: undefined,
        description: `Minor Tools (${minorToolsPercentage}% of Labor Cost)`,
        noOfUnits: 1,
        noOfHours: 1,
        hourlyRate: minorToolsCost,
        amount: minorToolsCost,
      });
    }

    // Instantiate material entries (filter out empty entries)
    console.log(`Instantiating materials with hauling cost per cu.m.: ₱${haulingCostPerCuM.toFixed(2)}`);
    console.log(`Project district: ${projectDistrict || 'N/A'}`);
    console.log(`Project CMPD version: ${projectCmpdVersion || 'N/A (using latest)'}`);
    
    if (!projectCmpdVersion) {
      return NextResponse.json(
        {
          success: false,
          error: 'CMPD version is required before DUPA instantiation. Set CMPD version in project/manual settings.',
        },
        { status: 422 }
      );
    }

    const missingMaterials: Array<{ materialCode: string; description: string; reason: string }> = [];
    const unresolvedMaterials: string[] = [];

    const materialEntries = await Promise.all(
      template.materialTemplate
        .filter((material: any) => material.materialCode || material.description)
        .map(async (material: any) => {
          let basePrice = 0;
          let materialDoc: any = null;
          let requiresCanvass = false;
          let materialCode = String(material.materialCode || '').trim().toUpperCase();
          let materialDescription = String(material.description || '').trim();

          if (materialCode) {
            materialDoc = await Material.findOne({ 
              materialCode: new RegExp(`^${materialCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
            }).lean();
          }

          if (!materialDoc && materialDescription) {
            const normalizedDescription = normalizeMaterialDescription(materialDescription);
            const exactRegex = new RegExp(`^${normalizedDescription.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}$`, 'i');
            materialDoc = await Material.findOne({
              materialDescription: exactRegex,
            }).lean();

            if (!materialDoc) {
              const materialCandidates = await Material.find({ isActive: true })
                .select('materialCode materialDescription unit includeHauling')
                .lean();

              materialDoc = materialCandidates.find((entry: any) => {
                const normalizedCandidate = normalizeMaterialDescription(entry.materialDescription || '');
                return normalizedCandidate === normalizedDescription;
              }) || null;
            }

            if (materialDoc) {
              materialCode = String(materialDoc.materialCode || '').trim().toUpperCase();
              materialDescription = String(materialDoc.materialDescription || materialDescription).trim();
            }
          }

          if (materialCode) {
            // Get price with district priority and CMPD version
            const effectiveDate = validated.effectiveDate ? new Date(validated.effectiveDate) : new Date();
            const resolvedPrice = await getMaterialPrice(
              materialCode,
              location,
              projectDistrict,
              effectiveDate,
              projectCmpdVersion,
              materialDescription,
            );
            if (resolvedPrice === null) {
              requiresCanvass = true;
              missingMaterials.push({
                materialCode,
                description: materialDescription,
                reason: `No active CMPD/canvass price found for version ${projectCmpdVersion}`,
              });
              unresolvedMaterials.push(materialDescription || materialCode);
              basePrice = 0;
            } else {
              basePrice = resolvedPrice;
            }
          } else if (materialDescription) {
            const effectiveDate = validated.effectiveDate ? new Date(validated.effectiveDate) : new Date();
            const resolvedPrice = await getMaterialPrice(
              '',
              location,
              projectDistrict,
              effectiveDate,
              projectCmpdVersion,
              materialDescription,
            );

            if (resolvedPrice === null) {
              requiresCanvass = true;
              missingMaterials.push({
                materialCode: '',
                description: materialDescription,
                reason: `No active CMPD/canvass price found for version ${projectCmpdVersion}`,
              });
              unresolvedMaterials.push(materialDescription);
              basePrice = 0;
            } else {
              basePrice = resolvedPrice;
            }
          }

          if (basePrice <= 0 && materialDescription) {
            if (materialDescription) {
              unresolvedMaterials.push(materialDescription);
            }
          }

          // Calculate unit cost with hauling if applicable
          let unitCost = basePrice;
          const includeHauling = materialDoc?.includeHauling !== false; // Default to true if not set
          
          if (includeHauling && haulingCostPerCuM > 0) {
            unitCost += haulingCostPerCuM;
            console.log(`Material ${material.materialCode}: Base price ₱${basePrice.toFixed(2)}, Hauling ₱${haulingCostPerCuM.toFixed(2)}, Total ₱${unitCost.toFixed(2)}`);
          } else {
            console.log(`Material ${material.materialCode}: Base price ₱${basePrice.toFixed(2)}, Hauling EXCLUDED, Total ₱${unitCost.toFixed(2)}`);
          }

          const quantity = Number(material.quantity) || 0;
          const amount = quantity * unitCost;
          const haulingWasAdded = includeHauling && haulingCostPerCuM > 0;
          const haulingCostApplied = haulingWasAdded ? haulingCostPerCuM : 0;
          
          const result = {
            materialCode: materialCode || String(material.materialCode || '').trim(),
            description: materialDescription || 'Material Item',
            unit: String(material.unit || materialDoc?.unit || '').trim() || 'unit',
            quantity,
            unitCost,
            amount: isNaN(amount) ? 0 : amount,
            haulingIncluded: haulingWasAdded,
            basePrice: basePrice,
            haulingCost: haulingCostApplied,
            requiresCanvass,
          };
          
          console.log(`Material entry created:`, JSON.stringify(result, null, 2));
          return result;
        })
    );

    if (unresolvedMaterials.length > 0 || missingMaterials.length > 0) {
      const uniqueUnresolved = Array.from(new Set(unresolvedMaterials.filter(Boolean)));
      return NextResponse.json(
        {
          success: false,
          error: `Unable to resolve material unit cost for: ${uniqueUnresolved.join(', ')}. Link these rows to valid master materials with active CMPD/canvass prices before instantiating the DUPA template.`,
          details: missingMaterials,
        },
        { status: 422 }
      );
    }

    if (template.includeConsumables) {
      const consumablesPercentage = Number(template.consumablesPercentage || 10);
      const baseMaterialCost = materialEntries.reduce((sum, item) => sum + item.amount, 0);
      const consumablesCost = baseMaterialCost * (consumablesPercentage / 100);

      materialEntries.push({
        materialCode: 'CONSUMABLES',
        description: `Consumables (${consumablesPercentage}% of Materials Cost)`,
        unit: 'LS',
        quantity: 1,
        unitCost: consumablesCost,
        amount: consumablesCost,
        haulingIncluded: false,
        basePrice: consumablesCost,
        haulingCost: 0,
        requiresCanvass: false,
      });
    }

    // Calculate costs
    const laborCostTotal = laborEntries.reduce((sum, item) => sum + item.amount, 0);
    const equipmentCostTotal = equipmentEntries.reduce((sum, item) => sum + item.amount, 0);
    const materialCostTotal = materialEntries.reduce((sum, item) => sum + item.amount, 0);

    // Align with DUPA worksheet math:
    // direct unit cost = (labor + equipment) / outputPerHour
    // direct + materials = direct unit cost + materials
    const outputPerHour = Number(template.outputPerHour || 0) > 0 ? Number(template.outputPerHour) : 0;
    const directLaborEquipmentCost = laborCostTotal + equipmentCostTotal;
    const directUnitCost = outputPerHour > 0 ? directLaborEquipmentCost / outputPerHour : 0;
    const directCost = directUnitCost + materialCostTotal;
    
    // Use project-level percentages if provided, otherwise fall back to template percentages
    const ocmPercentage = projectOcmPercentage !== undefined ? projectOcmPercentage : template.ocmPercentage;
    const cpPercentage = projectCpPercentage !== undefined ? projectCpPercentage : template.cpPercentage;
    
    const ocmCost = directCost * (ocmPercentage / 100);
    const cpCost = directCost * (cpPercentage / 100);
    const subtotalWithMarkup = directCost + ocmCost + cpCost;
    const vatCost = subtotalWithMarkup * (template.vatPercentage / 100);
    const totalCost = subtotalWithMarkup + vatCost;
    const unitCost = totalCost; // Cost per unit of measurement

    // Debug: Log material entries before returning
    console.log('Final material entries count:', materialEntries.length);
    materialEntries.forEach((item, idx) => {
      console.log(`Material ${idx}: basePrice=${item.basePrice}, haulingCost=${item.haulingCost}, unitCost=${item.unitCost}`);
    });

    // Return computed data for BOQ creation
    const computedData = {
      classificationId: String((template as any).classificationId || ''),
      payItemNumber: template.payItemNumber,
      payItemDescription: template.payItemDescription,
      unitOfMeasurement: template.unitOfMeasurement,
      outputPerHour,
      part: template.part || '',
      category: template.category,
      subCategory: (template as any).subCategory || '',
      
      // Computed arrays with rates
      laborComputed: laborEntries,
      equipmentComputed: equipmentEntries,
      materialComputed: materialEntries,
      
      // Cost breakdown
      directCost,
      ocmPercentage: ocmPercentage,
      ocmCost,
      cpPercentage: cpPercentage,
      cpCost,
      subtotalWithMarkup,
      vatPercentage: template.vatPercentage,
      vatCost,
      totalCost,
      unitCost,
      
      // Metadata
      location,
      instantiatedAt: new Date().toISOString(),
      missingMaterialPrices: missingMaterials,
    };

    return NextResponse.json(
      {
        success: true,
        data: computedData,
        message: `Template instantiated successfully for location: ${location}`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error instantiating DUPA template:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to instantiate DUPA template',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
