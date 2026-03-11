/**
 * DPWH Part and Subcategory Classification
 * Based on DPWH Standard Pay Items for Infrastructure Projects
 */

export interface DPWHClassification {
  part: string;
  partName: string;
  subcategory: string;
}

/**
 * Extract the numeric prefix from a DPWH item number
 * Examples: "900 (1) a" → 900, "1046 (3)" → 1046, "800 (2)" → 800
 */
function getItemNumberPrefix(itemNumber: string): number {
  const match = itemNumber.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Determine the DPWH Part based on item number ranges
 */
function getDPWHPart(itemNumber: string): { part: string; partName: string } {
  const prefix = getItemNumberPrefix(itemNumber);

  if (prefix >= 800 && prefix < 900) {
    return { part: 'PART C', partName: 'EARTHWORK' };
  } else if (prefix >= 900 && prefix < 1000) {
    return { part: 'PART D', partName: 'REINFORCED CONCRETE / BUILDINGS' };
  } else if (prefix >= 1000 && prefix < 1100) {
    return { part: 'PART E', partName: 'FINISHINGS AND OTHER CIVIL WORKS' };
  } else if (prefix >= 1100 && prefix < 1500) {
    return { part: 'PART F', partName: 'ELECTRICAL' };
  } else if (prefix >= 1500) {
    return { part: 'PART G', partName: 'MECHANICAL' };
  } else {
    return { part: 'PART A', partName: 'GENERAL' };
  }
}

/**
 * Determine the subcategory within a part based on category field
 */
function getSubcategory(itemNumber: string, category?: string): string {
  const prefix = getItemNumberPrefix(itemNumber);

  // Part E - Finishing Works (more detailed subcategories)
  if (prefix >= 1000 && prefix < 1100) {
    if (!category) return 'Other Finishes';

    // Use category field to determine subcategory
    const categoryLower = category.toLowerCase();

    if (categoryLower.includes('termite')) return 'Termite Control';
    if (categoryLower.includes('plumbing') || categoryLower.includes('drainage') || categoryLower.includes('sewer') || categoryLower.includes('water') || categoryLower.includes('pipe')) return 'Plumbing Works';
    if (categoryLower.includes('door') || categoryLower.includes('window')) return 'Doors and Windows';
    if (categoryLower.includes('glass') || categoryLower.includes('glazing')) return 'Glass and Glazing';
    if (categoryLower.includes('tile') || categoryLower.includes('tiling')) return 'Tiling Works';
    if (categoryLower.includes('floor')) return 'Flooring';
    if (categoryLower.includes('plaster') || categoryLower.includes('plastering')) return 'Plastering Works';
    if (categoryLower.includes('ceiling')) return 'Ceiling Works';
    if (categoryLower.includes('paint') || categoryLower.includes('coating') || categoryLower.includes('varnish')) return 'Painting Works';
    if (categoryLower.includes('railing')) return 'Railings';
    if (categoryLower.includes('masonry') || categoryLower.includes('chb') || categoryLower.includes('block')) return 'Masonry Works';
    if (categoryLower.includes('roofing')) return 'Roofing Works';
    if (categoryLower.includes('insulation')) return 'Insulation';
    if (categoryLower.includes('waterproof')) return 'Waterproofing';

    return category; // Use original category if no match
  }

  // Part D - Concrete Works
  if (prefix >= 900 && prefix < 1000) {
    if (!category) return 'Concrete Works';

    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('formwork')) return 'Formwork';
    if (categoryLower.includes('reinforc')) return 'Reinforcing Steel';
    if (categoryLower.includes('precast')) return 'Precast Concrete';

    return category;
  }

  // Part C - Earthwork
  if (prefix >= 800 && prefix < 900) {
    if (!category) return 'Earthwork';

    const categoryLower = category.toLowerCase();
    
    // Handle specific earthworks categories
    if (categoryLower.includes('earthworks-clearing') || categoryLower.includes('clearing') || categoryLower.includes('grubbing')) {
      return 'Clearing and Grubbing';
    }
    if (categoryLower.includes('earthworks-removal-trees') || (categoryLower.includes('removal') && categoryLower.includes('tree'))) {
      return 'Removal of Trees';
    }
    if (categoryLower.includes('earthworks-removal-structures') || (categoryLower.includes('removal') && categoryLower.includes('structure'))) {
      return 'Removal of Structures';
    }
    if (categoryLower.includes('earthworks-excavation') || categoryLower.includes('excavat')) {
      return 'Excavation';
    }
    if (categoryLower.includes('earthworks-structure-excavation') || (categoryLower.includes('structure') && categoryLower.includes('excavat'))) {
      return 'Structure Excavation';
    }
    if (categoryLower.includes('earthworks-embankment') || categoryLower.includes('embankment') || categoryLower.includes('fill')) {
      return 'Embankment';
    }
    if (categoryLower.includes('earthworks-site-development') || categoryLower.includes('site development')) {
      return 'Site Development';
    }

    return category;
  }

  // Part F - Metal & Electrical Works
  if (prefix >= 1100 && prefix < 1500) {
    if (!category) return 'Metal & Electrical Works';

    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('electric') || categoryLower.includes('wiring') || categoryLower.includes('conduit')) return 'Electrical Works';
    if (categoryLower.includes('steel') || categoryLower.includes('metal')) return 'Metal Works';

    return category;
  }

  // Part G - Marine & Other Works
  if (prefix >= 1500) {
    if (!category) return 'Marine & Other Works';
    return category;
  }

  // Default
  return category || 'Other Works';
}

/**
 * Get the complete DPWH classification for an item
 */
export function classifyDPWHItem(itemNumber: string, category?: string): DPWHClassification {
  // Handle empty or missing item numbers
  if (!itemNumber || itemNumber === '-' || itemNumber.trim() === '') {
    return {
      part: 'PART A: GENERAL',
      partName: 'GENERAL',
      subcategory: category || 'Other Works',
    };
  }

  const { part, partName } = getDPWHPart(itemNumber);
  const subcategory = getSubcategory(itemNumber, category);

  return {
    part: `${part}: ${partName}`,
    partName,
    subcategory,
  };
}

/**
 * Sort function for DPWH parts (to maintain correct order: C, D, E, F, G)
 */
export function sortDPWHParts(a: string, b: string): number {
  const partOrder = ['PART A', 'PART C', 'PART D', 'PART E', 'PART F', 'PART G'];
  const partA = a.split(':')[0];
  const partB = b.split(':')[0];

  const indexA = partOrder.indexOf(partA);
  const indexB = partOrder.indexOf(partB);

  if (indexA === -1) return 1;
  if (indexB === -1) return -1;

  return indexA - indexB;
}
