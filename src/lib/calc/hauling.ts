interface RouteSegment {
  distanceKm: number;
  speedUnloadedKmh: number;
  speedLoadedKmh: number;
}

export interface HaulingTemplate {
  totalDistanceKm: number;
  freeHaulingDistanceKm: number;
  routeSegments: RouteSegment[];
  equipmentHourlyRatePhp: number;
  equipmentCapacityCuM: number;
}

export interface HaulingResult {
  chargeableDistanceKm: number;
  timeUnloadedHr: number;
  timeLoadedHr: number;
  delayAllowanceHr: number;
  maneuverAllowanceHr: number;
  cycleTimeHr: number;
  costPerTripPhp: number;
  costPerCuMPhp: number;
}

export function computeHaulingCost(template: HaulingTemplate): HaulingResult {
  const chargeableDistanceKm = template.totalDistanceKm - template.freeHaulingDistanceKm;
  
  let timeUnloadedHr = 0;
  let timeLoadedHr = 0;
  
  for (const segment of template.routeSegments) {
    timeUnloadedHr += segment.distanceKm / segment.speedUnloadedKmh;
    timeLoadedHr += segment.distanceKm / segment.speedLoadedKmh;
  }
  
  const delayAllowanceHr = 0.10 * (timeUnloadedHr + timeLoadedHr);
  const maneuverAllowanceHr = 0.25;
  
  const cycleTimeHr = timeUnloadedHr + timeLoadedHr + delayAllowanceHr + maneuverAllowanceHr;
  
  const costPerTripPhp = cycleTimeHr * template.equipmentHourlyRatePhp;
  const costPerCuMPhp = costPerTripPhp / template.equipmentCapacityCuM;
  
  return {
    chargeableDistanceKm: Math.round(chargeableDistanceKm * 100) / 100,
    timeUnloadedHr: Math.round(timeUnloadedHr * 100) / 100,
    timeLoadedHr: Math.round(timeLoadedHr * 100) / 100,
    delayAllowanceHr: Math.round(delayAllowanceHr * 100) / 100,
    maneuverAllowanceHr: Math.round(maneuverAllowanceHr * 100) / 100,
    cycleTimeHr: Math.round(cycleTimeHr * 100) / 100,
    costPerTripPhp: Math.round(costPerTripPhp * 100) / 100,
    costPerCuMPhp: Math.round(costPerCuMPhp * 100) / 100,
  };
}
