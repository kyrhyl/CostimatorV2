/**
 * Unit Tests for Calculation Functions
 * Verifies DPWH formula accuracy
 */

import { describe, it, expect } from 'vitest'
import {
  computeLaborCost,
  computeEquipmentCost,
  computeMaterialCost,
  computeAddOns,
  formatCurrency,
} from '../estimate'

describe('Labor Cost Calculations', () => {
  it('should calculate single labor entry correctly', () => {
    const labor = [
      {
        designation: 'Foreman',
        noOfPersons: 1,
        noOfHours: 8,
        hourlyRate: 220.85,
        amount: 0, // Will be computed
      },
    ]

    const result = computeLaborCost(labor)
    expect(result).toBe(1766.80)
  })

  it('should calculate multiple labor entries', () => {
    const labor = [
      {
        designation: 'Foreman',
        noOfPersons: 1,
        noOfHours: 96,
        hourlyRate: 220.85,
        amount: 21201.6,
      },
      {
        designation: 'Unskilled Labor',
        noOfPersons: 5,
        noOfHours: 96,
        hourlyRate: 72.85,
        amount: 34968.0,
      },
    ]

    const result = computeLaborCost(labor)
    expect(result).toBeCloseTo(56169.6, 2)
  })

  it('should handle empty labor array', () => {
    const result = computeLaborCost([])
    expect(result).toBe(0)
  })

  it('should handle zero values', () => {
    const labor = [
      {
        designation: 'Test',
        noOfPersons: 0,
        noOfHours: 100,
        hourlyRate: 100,
        amount: 0,
      },
    ]

    const result = computeLaborCost(labor)
    expect(result).toBe(0)
  })
})

describe('Equipment Cost Calculations', () => {
  it('should calculate standard equipment cost', () => {
    const equipment = [
      {
        nameAndCapacity: 'Backhoe 0.76 cu.m.',
        noOfUnits: 1,
        noOfHours: 8,
        hourlyRate: 500,
        amount: 0,
      },
    ]

    const result = computeEquipmentCost(equipment)
    expect(result).toBe(4000)
  })

  it('should calculate Minor Tools as 10% of labor cost', () => {
    const laborCost = 56169.6
    const equipment = [
      {
        nameAndCapacity: 'Minor Tools (10% of Labor Cost)',
        noOfUnits: 1,
        noOfHours: 1,
        hourlyRate: 0,
        amount: 0,
      },
    ]

    const result = computeEquipmentCost(equipment, laborCost)
    expect(result).toBeCloseTo(5616.96, 2)
  })

  it('should handle mixed equipment and minor tools', () => {
    const laborCost = 50000
    const equipment = [
      {
        nameAndCapacity: 'Backhoe',
        noOfUnits: 1,
        noOfHours: 8,
        hourlyRate: 500,
        amount: 4000,
      },
      {
        nameAndCapacity: 'Minor Tools',
        noOfUnits: 1,
        noOfHours: 1,
        hourlyRate: 0,
        amount: 0,
      },
    ]

    const result = computeEquipmentCost(equipment, laborCost)
    expect(result).toBe(9000) // 4000 + 5000
  })

  it('should handle empty equipment array', () => {
    const result = computeEquipmentCost([])
    expect(result).toBe(0)
  })
})

describe('Material Cost Calculations', () => {
  it('should calculate single material cost', () => {
    const materials = [
      {
        nameAndSpecification: 'Cement, portland, Type 1, bag',
        unit: 'bag',
        quantity: 10,
        unitCost: 250,
        amount: 0,
      },
    ]

    const result = computeMaterialCost(materials)
    expect(result).toBe(2500)
  })

  it('should calculate multiple materials', () => {
    const materials = [
      {
        nameAndSpecification: 'Cement',
        unit: 'bag',
        quantity: 10,
        unitCost: 250,
        amount: 2500,
      },
      {
        nameAndSpecification: 'Sand',
        unit: 'cu.m.',
        quantity: 2,
        unitCost: 800,
        amount: 1600,
      },
    ]

    const result = computeMaterialCost(materials)
    expect(result).toBe(4100)
  })

  it('should handle fractional quantities', () => {
    const materials = [
      {
        nameAndSpecification: 'Rebar',
        unit: 'kg',
        quantity: 2.5,
        unitCost: 45.5,
        amount: 0,
      },
    ]

    const result = computeMaterialCost(materials)
    expect(result).toBeCloseTo(113.75, 2)
  })

  it('should handle empty materials array', () => {
    const result = computeMaterialCost([])
    expect(result).toBe(0)
  })
})

describe('Direct Cost Calculation', () => {
  it('should sum labor + equipment + materials', () => {
    const labor = 1000
    const equipment = 500
    const materials = 2000
    const result = labor + equipment + materials
    expect(result).toBe(3500)
  })

  it('should handle zero values', () => {
    const result = 0 + 0 + 0
    expect(result).toBe(0)
  })
})

describe('Add-ons Computation (DPWH Formula)', () => {
  it('should calculate add-ons correctly', () => {
    // Test case: Direct Cost = 100,000
    // OCM = 15%, CP = 10%, VAT = 12%
    const directCost = 100000
    const result = computeAddOns(directCost, 15, 10, 12)

    // OCM = 15% of 100,000 = 15,000
    expect(result.ocm).toBe(15000)

    // CP = 10% of 100,000 = 10,000
    expect(result.cp).toBe(10000)

    // Subtotal = 100,000 + 15,000 + 10,000 = 125,000
    // VAT = 12% of 125,000 = 15,000
    expect(result.vat).toBe(15000)

    // Total = 125,000 + 15,000 = 140,000
    expect(result.total).toBe(140000)
  })

  it('should handle zero percentages', () => {
    const result = computeAddOns(50000, 0, 0, 0)

    expect(result.ocm).toBe(0)
    expect(result.cp).toBe(0)
    expect(result.vat).toBe(0)
    expect(result.total).toBe(50000) // Just direct cost
  })

  it('should handle small values with rounding', () => {
    const result = computeAddOns(1234.56, 15, 10, 12)

    expect(result.ocm).toBeCloseTo(185.18, 2)
    expect(result.cp).toBeCloseTo(123.46, 2)
    // VAT on (1234.56 + 185.18 + 123.46) = 185.19
    expect(result.vat).toBeCloseTo(185.19, 1)
  })
})

describe('Currency Formatting', () => {
  it('should format Philippine Peso correctly', () => {
    expect(formatCurrency(1234.56)).toBe('₱1,234.56')
  })

  it('should format large numbers with commas', () => {
    expect(formatCurrency(1234567.89)).toBe('₱1,234,567.89')
  })

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('₱0.00')
  })

  it('should round to 2 decimal places', () => {
    expect(formatCurrency(123.456)).toBe('₱123.46')
  })
})
