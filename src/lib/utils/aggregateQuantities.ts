import type { TakeoffLine } from '@/types';

/**
 * Extract DPWH part from tags (e.g., "part:D" → "D")
 */
function extractPartFromTags(tags: string[]): string | null {
  for (const tag of tags) {
    if (tag.startsWith('part:')) {
      return tag.split(':')[1];
    }
  }
  return null;
}

/**
 * Classify DPWH part based on trade
 * Fallback classification when tags don't specify part
 */
function classifyPartByTrade(trade: string): string {
  const tradeToPartMap: Record<string, string> = {
    'Earthwork': 'C',
    'Concrete': 'D',
    'Rebar': 'D',
    'Formwork': 'D',
    'Structural': 'D',
    'Foundation': 'D',
    'Finishes': 'E',
    'Painting': 'E',
    'Carpentry': 'E',
    'Doors & Windows': 'E',
    'Glass & Glazing': 'E',
    'Roofing': 'E',
    'Waterproofing': 'E',
    'Masonry': 'E',
    'Hardware': 'E',
    'Plumbing': 'F',
    'MEPF': 'G',
  };
  return tradeToPartMap[trade] || 'Unknown';
}

/**
 * Aggregate total earthwork volume from takeoff lines
 * @param takeoffLines Array of takeoff lines
 * @returns Total earthwork volume in m³
 */
export function aggregateEarthworkVolume(takeoffLines: TakeoffLine[]): number {
  return takeoffLines
    .filter(line => line.trade === 'Earthwork')
    .reduce((sum, line) => sum + (line.quantity || 0), 0);
}

/**
 * Aggregate quantities by DPWH Part
 * @param takeoffLines Array of takeoff lines
 * @returns Record of part to total quantity
 */
export function aggregateByPart(takeoffLines: TakeoffLine[]): Record<string, number> {
  const byPart: Record<string, number> = {};
  
  takeoffLines.forEach(line => {
    // Try to get part from tags first, then fallback to trade classification
    const part = extractPartFromTags(line.tags || []) || classifyPartByTrade(line.trade);
    byPart[part] = (byPart[part] || 0) + (line.quantity || 0);
  });
  
  return byPart;
}

/**
 * Aggregate quantities by DPWH Part with detailed info
 * @param takeoffLines Array of takeoff lines
 * @returns Array of part data for chart visualization
 */
export function aggregateByPartForChart(takeoffLines: TakeoffLine[]): Array<{
  name: string;
  value: number;
  color: string;
  part: string;
}> {
  const byPart = aggregateByPart(takeoffLines);
  
  const partColors: Record<string, string> = {
    'C': '#F59E0B', // Amber
    'D': '#3B82F6', // Blue
    'E': '#10B981', // Green
    'F': '#FACC15', // Yellow
    'G': '#A855F7', // Purple
  };
  
  const partNames: Record<string, string> = {
    'A': 'Part A - General',
    'B': 'Part B - Other General Requirements',
    'C': 'Part C - Earthwork',
    'D': 'Part D - Reinforced Concrete / Buildings',
    'E': 'Part E - Finishings and Other Civil Works',
    'F': 'Part F - Electrical',
    'G': 'Part G - Mechanical',
  };
  
  return Object.entries(byPart)
    .filter(([part]) => part !== 'Unknown')
    .map(([part, value]) => ({
      name: partNames[part] || `Part ${part}`,
      value: Math.round(value * 100) / 100, // Round to 2 decimals
      color: partColors[part] || '#6B7280',
      part,
    }))
    .sort((a, b) => a.part.localeCompare(b.part));
}

/**
 * Calculate summary statistics from takeoff lines
 * @param takeoffLines Array of takeoff lines
 * @returns Summary statistics
 */
export function calculateTakeoffStats(takeoffLines: TakeoffLine[]): {
  totalLines: number;
  byTrade: Record<string, number>;
  byPart: Record<string, number>;
} {
  const byTrade: Record<string, number> = {};
  const byPart: Record<string, number> = {};
  
  takeoffLines.forEach(line => {
    // Count by trade
    if (line.trade) {
      byTrade[line.trade] = (byTrade[line.trade] || 0) + 1;
    }
    
    // Count by part
    const part = extractPartFromTags(line.tags || []) || classifyPartByTrade(line.trade);
    byPart[part] = (byPart[part] || 0) + 1;
  });
  
  return {
    totalLines: takeoffLines.length,
    byTrade,
    byPart,
  };
}

/**
 * Calculate comprehensive dashboard metrics from CalcRun data
 * @param takeoffLines Array of takeoff lines
 * @param boqLines Array of BOQ lines
 * @returns Dashboard metrics
 */
export function calculateDashboardMetrics(
  takeoffLines: TakeoffLine[],
  boqLines: any[] = []
) {
  // Initialize metrics
  const metrics = {
    // Part D - Concrete & Reinforcement
    totalConcrete: 0,
    totalRebar: 0,
    totalFormwork: 0,
    totalEarthwork: 0,
    
    // Part E - Finishes
    totalFloorArea: 0,
    totalWallArea: 0,
    totalCeilingArea: 0,
    totalRoofArea: 0,
    
    // Element counts
    beamCount: 0,
    columnCount: 0,
    slabCount: 0,
    
    // Total counts
    elementCount: takeoffLines.length,
    boqItemCount: boqLines.length,
  };
  
  // Process takeoff lines
  takeoffLines.forEach(line => {
    const trade = line.trade;
    const resourceKey = line.resourceKey?.toLowerCase() || '';
    const quantity = line.quantity || 0;
    
    // Aggregate by trade
    if (trade === 'Concrete') {
      metrics.totalConcrete += quantity;
    } else if (trade === 'Rebar') {
      metrics.totalRebar += quantity;
    } else if (trade === 'Formwork') {
      metrics.totalFormwork += quantity;
    } else if (trade === 'Earthwork') {
      metrics.totalEarthwork += quantity;
    } else if (trade === 'Finishes') {
      // Classify finishes by type based on resourceKey or tags
      if (resourceKey.includes('floor') || resourceKey.includes('tile')) {
        metrics.totalFloorArea += quantity;
      } else if (resourceKey.includes('wall') || resourceKey.includes('plaster')) {
        metrics.totalWallArea += quantity;
      } else if (resourceKey.includes('ceiling')) {
        metrics.totalCeilingArea += quantity;
      }
    } else if (trade === 'Roofing') {
      metrics.totalRoofArea += quantity;
    }
    
    // Count structural elements by resourceKey
    if (resourceKey.includes('beam')) {
      metrics.beamCount++;
    } else if (resourceKey.includes('column')) {
      metrics.columnCount++;
    } else if (resourceKey.includes('slab')) {
      metrics.slabCount++;
    }
  });
  
  return metrics;
}
