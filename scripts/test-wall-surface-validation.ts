/**
 * TEST: Wall Surface Grid Validation
 * Run with: npx ts-node scripts/test-wall-surface-validation.ts
 */

import { validateWallSurface } from '../src/lib/math/finishes/wallSurface';

// Test Case 1: Standard grid (A, B, C in gridX; 1, 2, 3 in gridY)
console.log('=== TEST CASE 1: Standard Grid Setup ===');
const standardGridX = [
  { label: 'A', offset: 0 },
  { label: 'B', offset: 5 },
  { label: 'C', offset: 10 },
];
const standardGridY = [
  { label: '1', offset: 0 },
  { label: '2', offset: 4 },
  { label: '3', offset: 8 },
];

const testWall1 = {
  name: 'Test Wall',
  gridLine: {
    axis: 'X' as const,
    label: 'A',
    span: ['1', '2'] as [string, string],
  },
  levelStart: 'GF',
  levelEnd: '2F',
  surfaceType: 'exterior' as const,
};

const levels = [
  { label: 'GF', elevation: 0 },
  { label: '2F', elevation: 3 },
];

const result1 = validateWallSurface(
  testWall1,
  { gridX: standardGridX, gridY: standardGridY },
  levels
);
console.log('Result:', result1);
console.log('Expected: Valid (no errors)');
console.log('');

// Test Case 2: Missing grid lines (simulates the error)
console.log('=== TEST CASE 2: Missing Grid Lines ===');
const emptyGrid = { gridX: [], gridY: [] };

const result2 = validateWallSurface(
  testWall1,
  emptyGrid,
  levels
);
console.log('Result:', result2);
console.log('Expected: 3 errors (Grid line A not found, Span start 1 not found, Span end 2 not found)');
console.log('');

// Test Case 3: Numeric gridX labels instead of letters
console.log('=== TEST CASE 3: Numeric GridX Labels ===');
const numericGridX = [
  { label: '1', offset: 0 },
  { label: '2', offset: 5 },
  { label: '3', offset: 10 },
];
const numericGridY = [
  { label: 'A', offset: 0 },
  { label: 'B', offset: 4 },
  { label: 'C', offset: 8 },
];

const result3 = validateWallSurface(
  testWall1,
  { gridX: numericGridX, gridY: numericGridY },
  levels
);
console.log('Result:', result3);
console.log('Expected: Error - Grid line A not found in gridX (because gridX has 1,2,3 not A)');
console.log('');

// Test Case 4: Correct axis selection for numeric grid
console.log('=== TEST CASE 4: Correct Labels for Numeric Grid ===');
const testWall4 = {
  name: 'Test Wall Numeric',
  gridLine: {
    axis: 'X' as const,
    label: '1',  // Now using '1' which exists in numericGridX
    span: ['A', 'B'] as [string, string],  // Using 'A', 'B' from numericGridY
  },
  levelStart: 'GF',
  levelEnd: '2F',
  surfaceType: 'exterior' as const,
};

const result4 = validateWallSurface(
  testWall4,
  { gridX: numericGridX, gridY: numericGridY },
  levels
);
console.log('Result:', result4);
console.log('Expected: Valid (no errors)');
console.log('');

console.log('=== SUMMARY ===');
console.log('The error "Grid line A not found in gridX" means your project\'s gridX array');
console.log('does not have a label "A". Check what labels your grid actually has in the Grid Editor.');
console.log('');
console.log('Axis X: looks for grid line label in gridX, span labels in gridY');
console.log('Axis Y: looks for grid line label in gridY, span labels in gridX');
