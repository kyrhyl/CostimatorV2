import DUPATemplate, { IDUPATemplate, ILaborTemplate, IEquipmentTemplate, IMaterialTemplate } from '@/models/DUPATemplate';
import LaborRate from '@/models/LaborRate';
import Equipment from '@/models/Equipment';
import Material from '@/models/Material';
import Project from '@/models/Project';
import dbConnect from '@/lib/db/connect';

// =============================================
// Computed DUPA Instance Interfaces
// =============================================

export interface IComputedLabor extends ILaborTemplate {
  hourlyRate: number;
  amount: number;
}

export interface IComputedEquipment extends IEquipmentTemplate {
  hourlyRate: number;
  amount: number;
}

export interface IComputedMaterial extends IMaterialTemplate {
  unitCost: number;
  amount: number;
}

export interface IComputedDUPA {
  templateId: string;
  payItemNumber: string;
  payItemDescription: string;
  unitOfMeasurement: string;
  outputPerHour: number;
  location: string;
  
  // Computed entries with rates applied
  laborComputed: IComputedLabor[];
  equipmentComputed: IComputedEquipment[];
  materialComputed: IComputedMaterial[];
  
  // Cost breakdowns
  laborCost: number;
  equipmentCost: number;
  materialCost: number;
  directCost: number;
  
  ocmPercentage: number;
  ocmCost: number;
  cpPercentage: number;
  cpCost: number;
  
  subtotalWithMarkup: number;
  
  vatPercentage: number;
  vatCost: number;
  
  totalCost: number;
  unitCost: number;  // Per unit of measurement
}

// =============================================
// Designation mapping for labor rates
// =============================================
const DESIGNATION_MAP: { [key: string]: string } = {
  'foreman': 'foreman',
  'leadman': 'leadman',
  'equipment operator - heavy': 'equipmentOperatorHeavy',
  'equipment operator - high skilled': 'equipmentOperatorHighSkilled',
  'equipment operator - light skilled': 'equipmentOperatorLightSkilled',
  'driver': 'driver',
  'skilled labor': 'laborSkilled',
  'semi-skilled labor': 'laborSemiSkilled',
  'unskilled labor': 'laborUnskilled'
};

// Normalize designation to match labor rate fields
function normalizeDesignation(designation: string): string {
  const normalized = designation.toLowerCase().trim();
  return DESIGNATION_MAP[normalized] || normalized;
}

// =============================================
// Main Function: Instantiate DUPA Template with Location
// =============================================
export async function instantiateDUPA(
  templateId: string,
  location: string,
  quantity: number = 1,
  projectId?: string
): Promise<IComputedDUPA> {
  await dbConnect();
  
  // 1. Load template
  const template = await DUPATemplate.findById(templateId);
  if (!template) {
    throw new Error('DUPA template not found');
  }
  
  // 2. Load location-based labor rates
  const laborRates = await LaborRate.findOne({ location });
  if (!laborRates) {
    throw new Error(`Labor rates not found for location: ${location}`);
  }
  
  // 3. Load project for hauling cost calculation
  let haulingCostPerUnit = 0;
  if (projectId) {
    const project = await Project.findById(projectId);
    if (project && project.haulingCostPerKm && project.distanceFromOffice) {
      haulingCostPerUnit = project.haulingCostPerKm * project.distanceFromOffice;
    }
  }
  
  // 4. Compute labor costs
  const laborComputed: IComputedLabor[] = [];
  let laborCost = 0;
  
  for (const labor of template.laborTemplate) {
    const designationField = normalizeDesignation(labor.designation);
    const hourlyRate = (laborRates as any)[designationField] || 0;
    const amount = labor.noOfPersons * labor.noOfHours * hourlyRate;
    
    laborComputed.push({
      ...labor.toObject(),
      hourlyRate,
      amount
    });
    
    laborCost += amount;
  }
  
  // 5. Compute equipment costs
  const equipmentComputed: IComputedEquipment[] = [];
  let equipmentCost = 0;
  
  for (const equip of template.equipmentTemplate) {
    let hourlyRate = 0;
    
    if (equip.equipmentId) {
      const equipment = await Equipment.findById(equip.equipmentId);
      if (equipment) {
        hourlyRate = equipment.hourlyRate;
      }
    }
    
    const amount = equip.noOfUnits * equip.noOfHours * hourlyRate;
    
    equipmentComputed.push({
      ...equip.toObject(),
      hourlyRate,
      amount
    });
    
    equipmentCost += amount;
  }
  
  // 5.1. Add Minor Tools if configured in template
  if (template.includeMinorTools) {
    const minorToolsAmount = laborCost * (template.minorToolsPercentage / 100);
    
    equipmentComputed.push({
      equipmentId: undefined,
      description: `Minor Tools (${template.minorToolsPercentage}% of Labor Cost)`,
      noOfUnits: 1,
      noOfHours: 1,
      hourlyRate: minorToolsAmount,
      amount: minorToolsAmount
    });
    
    equipmentCost += minorToolsAmount;
  }
  
  // 6. Compute material costs (base price + hauling cost)
  const materialComputed: IComputedMaterial[] = [];
  let materialCost = 0;
  
  for (const material of template.materialTemplate) {
    let unitCost = 0;
    
    if (material.materialCode) {
      const materialRef = await Material.findOne({
        materialCode: material.materialCode,
        isActive: true
      });
      
      if (materialRef) {
        // Final unit cost = base price + hauling cost per unit
        unitCost = materialRef.basePrice + haulingCostPerUnit;
      } else {
        console.warn(`Material not found: ${material.materialCode}`);
      }
    }
    
    const amount = material.quantity * unitCost;
    
    materialComputed.push({
      ...material.toObject(),
      unitCost,
      amount
    });
    
    materialCost += amount;
  }
  
  // 7. Calculate costs
  const directCost = laborCost + equipmentCost + materialCost;
  
  const ocmCost = directCost * (template.ocmPercentage / 100);
  const cpCost = directCost * (template.cpPercentage / 100);
  
  const subtotalWithMarkup = directCost + ocmCost + cpCost;
  
  const vatCost = subtotalWithMarkup * (template.vatPercentage / 100);
  
  const totalCost = subtotalWithMarkup + vatCost;
  const unitCost = totalCost / template.outputPerHour;
  
  return {
    templateId: template._id.toString(),
    payItemNumber: template.payItemNumber,
    payItemDescription: template.payItemDescription,
    unitOfMeasurement: template.unitOfMeasurement,
    outputPerHour: template.outputPerHour,
    location,
    
    laborComputed,
    equipmentComputed,
    materialComputed,
    
    laborCost,
    equipmentCost,
    materialCost,
    directCost,
    
    ocmPercentage: template.ocmPercentage,
    ocmCost,
    cpPercentage: template.cpPercentage,
    cpCost,
    
    subtotalWithMarkup,
    
    vatPercentage: template.vatPercentage,
    vatCost,
    
    totalCost,
    unitCost
  };
}

// =============================================
// Batch instantiation for multiple templates
// =============================================
export async function instantiateMultipleDUPAs(
  templateIds: string[],
  location: string
): Promise<IComputedDUPA[]> {
  const results: IComputedDUPA[] = [];
  
  for (const templateId of templateIds) {
    try {
      const computed = await instantiateDUPA(templateId, location);
      results.push(computed);
    } catch (error) {
      console.error(`Failed to instantiate template ${templateId}:`, error);
    }
  }
  
  return results;
}
