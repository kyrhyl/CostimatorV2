/**
 * Wall Surface Validation Analysis
 * 
 * VERIFICATION RESULT:
 * ===================
 * 
 * Based on the code analysis in src/lib/math/finishes/wallSurface.ts:128-198
 * 
 * VALIDATION LOGIC:
 * ----------------
 * For axis 'X':
 *   - Grid line LABEL is looked up in gridX
 *   - Span labels (start, end) are looked up in gridY
 * 
 * For axis 'Y':
 *   - Grid line LABEL is looked up in gridY  
 *   - Span labels (start, end) are looked up in gridX
 * 
 * YOUR ERROR ANALYSIS:
 * --------------------
 * Error: "Grid line A not found in gridX"
 *        "Span start 1 not found"
 *        "Span end 2 not found"
 * 
 * This means:
 * 1. You selected AXIS = 'X' (X Axis)
 * 2. You selected Grid Line = 'A'
 * 3. You selected Span Start = '1', Span End = '2'
 * 
 * But your project has:
 * - gridX array does NOT contain a label 'A'
 * - gridY array does NOT contain labels '1' and '2'
 * 
 * COMMON GRID SETUPS:
 * -------------------
 * 
 * Setup A (Letters for X, Numbers for Y):
 *   gridX = [{label: 'A', offset: 0}, {label: 'B', offset: 5}]
 *   gridY = [{label: '1', offset: 0}, {label: '2', offset: 4}]
 *   → Use X Axis with Grid Line 'A' and Span '1' to '2' ✓
 * 
 * Setup B (Numbers for X, Letters for Y):
 *   gridX = [{label: '1', offset: 0}, {label: '2', offset: 5}]
 *   gridY = [{label: 'A', offset: 0}, {label: 'B', offset: 4}]
 *   → Use X Axis with Grid Line '1' and Span 'A' to 'B' ✓
 *   → CANNOT use Grid Line 'A' (it doesn't exist in gridX) ✗
 * 
 * Setup C (Both numeric):
 *   gridX = [{label: '1', offset: 0}, {label: '2', offset: 5}]
 *   gridY = [{label: '3', offset: 0}, {label: '4', offset: 4}]
 *   → Use X Axis with Grid Line '1' and Span '3' to '4' ✓
 * 
 * SOLUTION:
 * ---------
 * Check your Grid Editor to see what labels your project actually uses.
 * Then match those labels exactly when creating wall surfaces.
 * 
 * The validation code is at:
 * src/lib/math/finishes/wallSurface.ts:152-178
 */

console.log('Wall Surface Validation Analysis');
console.log('=================================');
console.log('');
console.log('To fix your error:');
console.log('1. Go to your Project > Grid Editor tab');
console.log('2. Check the labels in the X grid lines column');
console.log('3. Check the labels in the Y grid lines column');
console.log('4. When creating wall surfaces, use THOSE exact labels');
console.log('');
console.log('Current validation logic expects:');
console.log('- X Axis: Grid Line from gridX, Span from gridY');
console.log('- Y Axis: Grid Line from gridY, Span from gridX');
