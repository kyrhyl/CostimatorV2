/**
 * ABC Analysis Utility
 * Classifies BOQ items by cost significance following Pareto principle
 * 
 * Class A: Top items contributing to 70% of total cost
 * Class B: Next items contributing to 20% of total cost  
 * Class C: Remaining items contributing to 10% of total cost
 */

export type ABCClass = 'A' | 'B' | 'C';

export interface ABCClassifiedItem {
  id: string;
  description: string;
  totalAmount: number;
  cumulativeAmount: number;
  cumulativePercentage: number;
  abcClass: ABCClass;
  rank: number;
}

/**
 * Classify BOQ items using ABC analysis
 * 
 * @param items - Array of items with id, description, and totalAmount
 * @returns Array of classified items sorted by cost (descending)
 */
export function classifyItemsABC<T extends { id: string; description: string; totalAmount: number }>(
  items: T[]
): (T & ABCClassifiedItem)[] {
  // Sort items by total amount (descending)
  const sortedItems = [...items].sort((a, b) => b.totalAmount - a.totalAmount);
  
  // Calculate total cost
  const totalCost = sortedItems.reduce((sum, item) => sum + item.totalAmount, 0);
  
  // Calculate cumulative amounts and classify
  let cumulativeAmount = 0;
  const classifiedItems = sortedItems.map((item, index) => {
    cumulativeAmount += item.totalAmount;
    const cumulativePercentage = (cumulativeAmount / totalCost) * 100;
    
    // Determine ABC class
    let abcClass: ABCClass;
    if (cumulativePercentage <= 70) {
      abcClass = 'A';
    } else if (cumulativePercentage <= 90) {
      abcClass = 'B';
    } else {
      abcClass = 'C';
    }
    
    return {
      ...item,
      cumulativeAmount,
      cumulativePercentage,
      abcClass,
      rank: index + 1
    };
  });
  
  return classifiedItems;
}

/**
 * Get ABC class statistics
 */
export function getABCStatistics<T extends ABCClassifiedItem>(items: T[]) {
  const classA = items.filter(item => item.abcClass === 'A');
  const classB = items.filter(item => item.abcClass === 'B');
  const classC = items.filter(item => item.abcClass === 'C');
  
  const totalCost = items.reduce((sum, item) => sum + item.totalAmount, 0);
  
  return {
    classA: {
      count: classA.length,
      totalAmount: classA.reduce((sum, item) => sum + item.totalAmount, 0),
      percentage: (classA.reduce((sum, item) => sum + item.totalAmount, 0) / totalCost) * 100
    },
    classB: {
      count: classB.length,
      totalAmount: classB.reduce((sum, item) => sum + item.totalAmount, 0),
      percentage: (classB.reduce((sum, item) => sum + item.totalAmount, 0) / totalCost) * 100
    },
    classC: {
      count: classC.length,
      totalAmount: classC.reduce((sum, item) => sum + item.totalAmount, 0),
      percentage: (classC.reduce((sum, item) => sum + item.totalAmount, 0) / totalCost) * 100
    },
    totalItems: items.length,
    totalCost
  };
}

/**
 * Get badge color for ABC class
 */
export function getABCBadgeColor(abcClass: ABCClass): string {
  switch (abcClass) {
    case 'A':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'B':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'C':
      return 'bg-green-100 text-green-800 border-green-300';
  }
}

/**
 * Get description for ABC class
 */
export function getABCDescription(abcClass: ABCClass): string {
  switch (abcClass) {
    case 'A':
      return 'High Value - Top 70% of cost (Requires close monitoring)';
    case 'B':
      return 'Medium Value - Next 20% of cost (Regular monitoring)';
    case 'C':
      return 'Low Value - Last 10% of cost (Periodic review)';
  }
}
