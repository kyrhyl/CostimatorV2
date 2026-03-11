/**
 * Zod Validation Schemas for API Input Validation
 * Ensures data integrity before processing
 */

import { z } from 'zod'

// ============================================================================
// BOQ Schemas
// ============================================================================

export const BoqLineSchema = z.object({
  itemNo: z.string().min(1, 'Item number is required'),
  description: z.string().min(1, 'Description is required'),
  unit: z.string().min(1, 'Unit is required'),
  quantity: z.number().positive('Quantity must be positive'),
  payItemNumber: z.string().optional(),
  part: z.string().optional(),
  partDescription: z.string().optional(),
  division: z.string().optional(),
})

export const ImportBoqSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  projectLocation: z.string().optional(),
  implementingOffice: z.string().optional(),
  boqLines: z.array(BoqLineSchema).min(1, 'At least one BOQ line required'),
})

// ============================================================================
// Labor Schemas
// ============================================================================

export const LaborEntrySchema = z.object({
  designation: z.string().min(1, 'Designation required'),
  noOfPersons: z.number().positive('Number of persons must be positive'),
  noOfHours: z.number().positive('Hours must be positive'),
  hourlyRate: z.number().nonnegative('Hourly rate cannot be negative'),
  amount: z.number().nonnegative('Amount cannot be negative'),
})

// ============================================================================
// Equipment Schemas
// ============================================================================

export const EquipmentEntrySchema = z.object({
  nameAndCapacity: z.string().min(1, 'Equipment name required'),
  units: z.number().positive('Units must be positive'),
  noOfHours: z.number().positive('Hours must be positive'),
  hourlyRate: z.number().nonnegative('Hourly rate cannot be negative'),
  amount: z.number().nonnegative('Amount cannot be negative'),
})

// ============================================================================
// Material Schemas
// ============================================================================

export const MaterialEntrySchema = z.object({
  nameAndSpecification: z.string().min(1, 'Material name required'),
  unit: z.string().min(1, 'Unit required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitCost: z.number().nonnegative('Unit cost cannot be negative'),
  amount: z.number().nonnegative('Amount cannot be negative'),
})

// ============================================================================
// Rate Item (UPA) Schema
// ============================================================================

export const CreateRateItemSchema = z.object({
  payItemNumber: z.string().min(1, 'Pay item number required'),
  payItemDescription: z.string().min(1, 'Description required'),
  unitOfMeasurement: z.string().min(1, 'Unit required'),
  outputPerHourSubmitted: z.number().positive('Output per hour must be positive'),
  outputPerHourEvaluated: z.number().positive('Output per hour must be positive'),
  
  laborSubmitted: z.array(LaborEntrySchema),
  laborEvaluated: z.array(LaborEntrySchema),
  
  equipmentSubmitted: z.array(EquipmentEntrySchema),
  equipmentEvaluated: z.array(EquipmentEntrySchema),
  
  materialSubmitted: z.array(MaterialEntrySchema),
  materialEvaluated: z.array(MaterialEntrySchema),
  
  // Add-on percentages
  ocmSubmittedPercent: z.number().min(0).max(100).default(0),
  ocmEvaluatedPercent: z.number().min(0).max(100).default(15),
  cpSubmittedPercent: z.number().min(0).max(100).default(10),
  cpEvaluatedPercent: z.number().min(0).max(100).default(0),
  vatSubmittedPercent: z.number().min(0).max(100).default(12),
  vatEvaluatedPercent: z.number().min(0).max(100).default(0),
})

// ============================================================================
// Project Schemas
// ============================================================================

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name required'),
  location: z.string().optional(),
  description: z.string().optional(),
  client: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed', 'cancelled']).default('planning'),
})

// ============================================================================
// DUPA Template Schemas
// ============================================================================

export const DupaTemplateLabor = z.object({
  designation: z.string().min(1, 'Labor designation required'),
  noOfPersons: z.number().positive('Number of persons must be positive'),
  noOfHours: z.number().positive('Hours must be positive'),
})

export const DupaTemplateEquipment = z.object({
  equipmentId: z.string().optional(),
  nameAndCapacity: z.string().min(1, 'Equipment name required'),
  units: z.number().positive('Units must be positive'),
  noOfHours: z.number().positive('Hours must be positive'),
})

export const DupaTemplateMaterial = z.object({
  materialCode: z.string().optional(),
  nameAndSpecification: z.string().min(1, 'Material name required'),
  unit: z.string().min(1, 'Unit required'),
  quantity: z.number().positive('Quantity must be positive'),
})

export const CreateDupaTemplateSchema = z.object({
  payItemNumber: z.string().min(1, 'Pay item number required'),
  description: z.string().min(1, 'Description required'),
  unit: z.string().min(1, 'Unit required'),
  laborEntries: z.array(DupaTemplateLabor).default([]),
  equipmentEntries: z.array(DupaTemplateEquipment).default([]),
  materialEntries: z.array(DupaTemplateMaterial).default([]),
})

// ============================================================================
// Utility: Safe Parse with Error Formatting
// ============================================================================

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }))
    return { success: false, errors }
  }
  
  return { success: true, data: result.data }
}

// ============================================================================
// Type Exports (for TypeScript inference)
// ============================================================================

export type BoqLine = z.infer<typeof BoqLineSchema>
export type ImportBoq = z.infer<typeof ImportBoqSchema>
export type LaborEntry = z.infer<typeof LaborEntrySchema>
export type EquipmentEntry = z.infer<typeof EquipmentEntrySchema>
export type MaterialEntry = z.infer<typeof MaterialEntrySchema>
export type CreateRateItem = z.infer<typeof CreateRateItemSchema>
export type CreateProject = z.infer<typeof CreateProjectSchema>
export type CreateDupaTemplate = z.infer<typeof CreateDupaTemplateSchema>
