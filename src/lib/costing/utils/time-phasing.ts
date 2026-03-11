/**
 * Program of Works Time Phasing Utility
 * Distributes project costs over the contract duration
 */

export interface TimePhase {
  period: string;           // e.g., "Month 1", "Q1 2026"
  startDate: Date;
  endDate: Date;
  amount: number;
  cumulativeAmount: number;
  cumulativePercentage: number;
  workingDays: number;
}

export interface TimePhasingConfig {
  startDate: Date;
  contractDurationDays: number;
  workingDaysPerWeek?: number;  // Default 6 (excluding Sundays)
  holidays?: Date[];             // List of holidays to exclude
  rainyDaysPerMonth?: number;    // Average rainy days (unworkable)
}

/**
 * Calculate working days in a date range
 */
export function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  holidays: Date[] = [],
  rainyDaysPerMonth: number = 0
): number {
  let workingDays = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const isSunday = dayOfWeek === 0;
    const isHoliday = holidays.some(holiday => 
      holiday.toDateString() === currentDate.toDateString()
    );
    
    if (!isSunday && !isHoliday) {
      workingDays++;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Subtract estimated rainy days
  const months = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const estimatedRainyDays = months * rainyDaysPerMonth;
  
  return Math.max(0, workingDays - estimatedRainyDays);
}

/**
 * Generate monthly time phasing for program of works
 * Uses S-curve distribution (slow start, rapid middle, slow end)
 */
export function generateMonthlyTimePhasing(
  totalAmount: number,
  config: TimePhasingConfig
): TimePhase[] {
  const phases: TimePhase[] = [];
  const months = Math.ceil(config.contractDurationDays / 30);
  
  // S-curve distribution percentages (slow-rapid-slow pattern)
  const scurveDistribution = generateSCurveDistribution(months);
  
  let cumulativeAmount = 0;
  const currentDate = new Date(config.startDate);
  
  for (let i = 0; i < months; i++) {
    const periodStart = new Date(currentDate);
    const periodEnd = new Date(currentDate);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(periodEnd.getDate() - 1);
    
    // Calculate amount for this period
    const amount = totalAmount * (scurveDistribution[i] / 100);
    cumulativeAmount += amount;
    
    // Calculate working days for this period
    const workingDays = calculateWorkingDays(
      periodStart,
      periodEnd,
      config.holidays,
      config.rainyDaysPerMonth
    );
    
    phases.push({
      period: `Month ${i + 1}`,
      startDate: periodStart,
      endDate: periodEnd,
      amount: Math.round(amount * 100) / 100,
      cumulativeAmount: Math.round(cumulativeAmount * 100) / 100,
      cumulativePercentage: (cumulativeAmount / totalAmount) * 100,
      workingDays
    });
    
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return phases;
}

/**
 * Generate S-curve distribution percentages
 * Follows typical construction project cash flow pattern
 */
function generateSCurveDistribution(months: number): number[] {
  const distribution: number[] = [];
  
  if (months <= 3) {
    // Short project: linear distribution
    const perMonth = 100 / months;
    return Array(months).fill(perMonth);
  }
  
  // S-curve: 15% mobilization, 70% peak, 15% demobilization
  const mobilizationMonths = Math.ceil(months * 0.2);
  const peakMonths = Math.floor(months * 0.6);
  const demobilizationMonths = months - mobilizationMonths - peakMonths;
  
  // Mobilization phase (slow start) - 15% of budget
  for (let i = 0; i < mobilizationMonths; i++) {
    distribution.push(15 / mobilizationMonths);
  }
  
  // Peak phase (rapid progress) - 70% of budget
  for (let i = 0; i < peakMonths; i++) {
    distribution.push(70 / peakMonths);
  }
  
  // Demobilization phase (slow end) - 15% of budget
  for (let i = 0; i < demobilizationMonths; i++) {
    distribution.push(15 / demobilizationMonths);
  }
  
  return distribution;
}

/**
 * Generate quarterly time phasing
 */
export function generateQuarterlyTimePhasing(
  totalAmount: number,
  config: TimePhasingConfig
): TimePhase[] {
  const monthlyPhases = generateMonthlyTimePhasing(totalAmount, config);
  const quarterlyPhases: TimePhase[] = [];
  
  // Group by quarters (3 months each)
  for (let q = 0; q < Math.ceil(monthlyPhases.length / 3); q++) {
    const quarterMonths = monthlyPhases.slice(q * 3, (q + 1) * 3);
    if (quarterMonths.length === 0) continue;
    
    const quarterAmount = quarterMonths.reduce((sum, m) => sum + m.amount, 0);
    const quarterWorkingDays = quarterMonths.reduce((sum, m) => sum + m.workingDays, 0);
    
    quarterlyPhases.push({
      period: `Q${q + 1} ${quarterMonths[0].startDate.getFullYear()}`,
      startDate: quarterMonths[0].startDate,
      endDate: quarterMonths[quarterMonths.length - 1].endDate,
      amount: Math.round(quarterAmount * 100) / 100,
      cumulativeAmount: quarterMonths[quarterMonths.length - 1].cumulativeAmount,
      cumulativePercentage: quarterMonths[quarterMonths.length - 1].cumulativePercentage,
      workingDays: quarterWorkingDays
    });
  }
  
  return quarterlyPhases;
}

/**
 * Calculate project completion date
 */
export function calculateCompletionDate(config: TimePhasingConfig): Date {
  const completionDate = new Date(config.startDate);
  completionDate.setDate(completionDate.getDate() + config.contractDurationDays);
  return completionDate;
}
