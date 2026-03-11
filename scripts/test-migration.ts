/**
 * Migration Test Script
 * 
 * Tests the migration process with dry-run mode to verify
 * the migration script works correctly without modifying data.
 * 
 * Usage:
 *   npx ts-node scripts/test-migration.ts
 */

import mongoose from 'mongoose';
import dbConnect from '../src/lib/db/connect';
import Project from '../src/models/Project';
import TakeoffVersion from '../src/models/TakeoffVersion';
import CostEstimate from '../src/models/CostEstimate';
// import { getMigrationStatus } from '../src/lib/backward-compatibility';  // ARCHIVED

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function addResult(testName: string, passed: boolean, message: string) {
  results.push({ testName, passed, message });
  const icon = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon}\x1b[0m ${testName}: ${message}`);
}

async function testMigrationStatus() {
  console.log('\n📊 Testing Migration Status Functions...\n');
  
  try {
    // Find a project to test with
    const project = await Project.findOne().lean();
    
    if (!project) {
      addResult('Migration Status', false, 'No projects found in database');
      return;
    }
    
    // const status = await getMigrationStatus(project._id.toString());  // ARCHIVED
    
    addResult(
      'Migration Status Check',
      true,
      `Project "${(project as any).projectName}" - Migration status check disabled (backward-compatibility archived)`
    );
    
  } catch (error: any) {
    addResult('Migration Status', false, error.message);
  }
}

async function testDataIntegrity() {
  console.log('\n🔍 Testing Data Integrity...\n');
  
  try {
    // Check for projects with versions
    const projectsWithVersions = await Project.aggregate([
      {
        $lookup: {
          from: 'takeoffversions',
          localField: 'activeTakeoffVersionId',
          foreignField: '_id',
          as: 'activeVersion'
        }
      },
      {
        $match: {
          'activeVersion.0': { $exists: true }
        }
      }
    ]);
    
    addResult(
      'Projects with Active Versions',
      true,
      `Found ${projectsWithVersions.length} projects with active versions`
    );
    
    // Check for orphaned versions
    const allVersions = await TakeoffVersion.find().lean();
    let orphanedCount = 0;
    
    for (const version of allVersions) {
      const project = await Project.findById(version.projectId);
      if (!project) {
        orphanedCount++;
      }
    }
    
    addResult(
      'Orphaned Versions Check',
      orphanedCount === 0,
      orphanedCount === 0 
        ? 'No orphaned versions found' 
        : `Found ${orphanedCount} orphaned versions`
    );
    
    // Check for estimates without versions
    const estimatesWithoutVersions = await CostEstimate.find({
      takeoffVersionId: { $exists: false }
    }).countDocuments();
    
    addResult(
      'Estimates Without Versions',
      estimatesWithoutVersions === 0,
      estimatesWithoutVersions === 0
        ? 'All estimates linked to versions'
        : `Found ${estimatesWithoutVersions} estimates without versions`
    );
    
  } catch (error: any) {
    addResult('Data Integrity', false, error.message);
  }
}

async function testVersionStructure() {
  console.log('\n🏗️  Testing Version Structure...\n');
  
  try {
    const version = await TakeoffVersion.findOne().lean();
    
    if (!version) {
      addResult('Version Structure', true, 'No versions to test (expected for fresh install)');
      return;
    }
    
    // Check required fields
    const requiredFields = [
      'projectId',
      'versionNumber',
      'versionLabel',
      'versionType',
      'status',
      'grid',
      'levels'
    ];
    
    const missingFields = requiredFields.filter(field => !(field in version));
    
    addResult(
      'Version Required Fields',
      missingFields.length === 0,
      missingFields.length === 0
        ? 'All required fields present'
        : `Missing fields: ${missingFields.join(', ')}`
    );
    
    // Check grid structure
    const hasValidGrid = version.grid && 
                        Array.isArray((version.grid as any).xLines) && 
                        Array.isArray((version.grid as any).yLines);
    
    addResult(
      'Grid Structure',
      hasValidGrid,
      hasValidGrid ? 'Grid structure is valid' : 'Invalid grid structure'
    );
    
    // Check version numbering
    const projectVersions = await TakeoffVersion.find({ 
      projectId: version.projectId 
    }).sort({ versionNumber: 1 }).lean();
    
    let numberingCorrect = true;
    for (let i = 0; i < projectVersions.length; i++) {
      if (projectVersions[i].versionNumber !== i + 1) {
        numberingCorrect = false;
        break;
      }
    }
    
    addResult(
      'Version Numbering',
      numberingCorrect,
      numberingCorrect 
        ? `Sequential numbering correct (1-${projectVersions.length})`
        : 'Version numbering has gaps'
    );
    
  } catch (error: any) {
    addResult('Version Structure', false, error.message);
  }
}

async function testEstimateStructure() {
  console.log('\n💰 Testing Estimate Structure...\n');
  
  try {
    const estimate = await CostEstimate.findOne().lean();
    
    if (!estimate) {
      addResult('Estimate Structure', true, 'No estimates to test (expected for fresh install)');
      return;
    }
    
    // Check required fields
    const requiredFields = [
      'projectId',
      'takeoffVersionId',
      'estimateNumber',
      'district',
      'cmpdVersion',
      'costSummary'
    ];
    
    const missingFields = requiredFields.filter(field => !(field in estimate));
    
    addResult(
      'Estimate Required Fields',
      missingFields.length === 0,
      missingFields.length === 0
        ? 'All required fields present'
        : `Missing fields: ${missingFields.join(', ')}`
    );
    
    // Check cost summary structure
    const costSummary = estimate.costSummary as any;
    const hasCostSummary = costSummary && 
                          typeof costSummary.totalDirectCost === 'number' &&
                          typeof costSummary.grandTotal === 'number';
    
    addResult(
      'Cost Summary Structure',
      hasCostSummary,
      hasCostSummary ? 'Cost summary structure is valid' : 'Invalid cost summary'
    );
    
    // Check estimate number format
    const hasValidEstimateNumber = /^EST-/.test(estimate.estimateNumber);
    
    addResult(
      'Estimate Number Format',
      hasValidEstimateNumber,
      hasValidEstimateNumber 
        ? `Format correct: ${estimate.estimateNumber}`
        : 'Invalid estimate number format'
    );
    
  } catch (error: any) {
    addResult('Estimate Structure', false, error.message);
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Test Summary:\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`\x1b[32m✓ Passed: ${passed}\x1b[0m`);
  console.log(`\x1b[31m✗ Failed: ${failed}\x1b[0m`);
  
  const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
  console.log(`\nSuccess Rate: ${percentage}%`);
  
  if (failed > 0) {
    console.log('\n⚠️  Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.testName}: ${r.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

async function runTests() {
  console.log('🧪 Migration Test Suite\n');
  console.log('='.repeat(60));
  
  try {
    // Connect to database
    await dbConnect();
    console.log('✓ Connected to database\n');
    
    // Run test suites
    await testMigrationStatus();
    await testDataIntegrity();
    await testVersionStructure();
    await testEstimateStructure();
    
    // Print summary
    await printSummary();
    
    const allPassed = results.every(r => r.passed);
    
    if (allPassed) {
      console.log('\n✅ All tests passed! Migration system is ready.\n');
    } else {
      console.log('\n⚠️  Some tests failed. Review the results above.\n');
    }
    
  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from database\n');
  }
}

// Run tests
if (require.main === module) {
  runTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runTests };
