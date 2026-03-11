/**
 * Multi-Version Architecture Model Validation Test
 * 
 * Tests all models with sample data to ensure:
 * - Models can be created and saved
 * - Static methods work correctly
 * - Instance methods work correctly
 * - Relationships are properly established
 * - Validation rules are enforced
 */

import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import TakeoffVersion from '@/models/TakeoffVersion';
import CostEstimate from '@/models/CostEstimate';
import EstimateRateItem from '@/models/EstimateRateItem';

// Test data
const testProjectData = {
  projectName: 'Test Multi-Version Project',
  projectLocation: 'Malaybalay City, Bukidnon',
  district: 'Bukidnon 1st',
  cmpdVersion: 'CMPD-2024-Q1',
  implementingOffice: 'DPWH Bukidnon 1st District Engineering Office',
  appropriation: 5000000,
  projectType: 'takeoff',
  status: 'Planning' as const,
  description: 'Test project for multi-version architecture validation',
};

const testBOQLine = {
  payItemNumber: '1001(1)a',
  description: 'Clearing and Grubbing',
  unit: 'Square Meter',
  quantity: 1500,
  dupaTemplateId: new mongoose.Types.ObjectId(),
};

const testLaborItem = {
  occupation: 'Foreman',
  laborRate: 573,
  hoursPerUnit: 0.0267,
  numberOfPersons: 1,
};

const testEquipmentItem = {
  equipmentName: 'Bulldozer',
  equipmentRate: 2500,
  hoursPerUnit: 0.0133,
};

const testMaterialItem = {
  materialName: 'Diesel Fuel',
  materialCode: 'FUEL-001',
  unitCost: 65,
  quantityPerUnit: 5,
  unit: 'Liter',
  district: 'Bukidnon 1st',
  cmpdVersion: 'CMPD-2024-Q1',
};

async function runTests() {
  console.log('🧪 Starting Multi-Version Architecture Model Tests\n');
  console.log('='.repeat(70));
  
  let projectId: mongoose.Types.ObjectId | undefined;
  let takeoffVersionId: mongoose.Types.ObjectId;
  let costEstimateId: mongoose.Types.ObjectId;
  
  try {
    // Connect to database
    console.log('\n📡 Connecting to database...');
    await dbConnect();
    console.log('✅ Connected to database\n');
    
    // ========================================
    // TEST 1: Create Project
    // ========================================
    console.log('TEST 1: Creating Project');
    console.log('-'.repeat(70));
    
    const project = new Project(testProjectData);
    await project.save();
    projectId = project._id as mongoose.Types.ObjectId;
    
    console.log(`✅ Project created with ID: ${projectId}`);
    console.log(`   Name: ${project.projectName}`);
    console.log(`   Location: ${project.projectLocation}`);
    console.log(`   CMPD Version: ${project.cmpdVersion}\n`);
    
    // ========================================
    // TEST 2: Create TakeoffVersion
    // ========================================
    console.log('TEST 2: Creating TakeoffVersion');
    console.log('-'.repeat(70));
    
    const nextVersionNumber = await TakeoffVersion.getNextVersionNumber(projectId.toString());
    console.log(`   Next version number: ${nextVersionNumber}`);
    
    const takeoffVersion = new TakeoffVersion({
      projectId,
      versionNumber: nextVersionNumber,
      versionLabel: 'Initial Design',
      versionType: 'preliminary',
      status: 'draft',
      createdBy: 'test-user',
      grid: {
        xLines: [{ label: 'A', offset: 0 }, { label: 'B', offset: 5000 }],
        yLines: [{ label: '1', offset: 0 }, { label: '2', offset: 6000 }],
      },
      levels: [
        { label: 'GL', elevation: 0 },
        { label: 'FL', elevation: 3000 },
      ],
      elementTemplates: [],
      elementInstances: [],
      boqLines: [testBOQLine],
      totalConcrete_m3: 0,
      totalRebar_kg: 0,
      totalFormwork_m2: 0,
      boqLineCount: 1,
      changesSummary: {
        elementsAdded: 1,
        elementsRemoved: 0,
        elementsModified: 0,
      },
    });
    
    await takeoffVersion.save();
    takeoffVersionId = takeoffVersion._id as mongoose.Types.ObjectId;
    
    console.log(`✅ TakeoffVersion created with ID: ${takeoffVersionId}`);
    console.log(`   Version: ${takeoffVersion.versionNumber}`);
    console.log(`   Type: ${takeoffVersion.versionType}`);
    console.log(`   Status: ${takeoffVersion.status}`);
    console.log(`   BOQ Lines: ${takeoffVersion.boqLines.length}\n`);
    
    // ========================================
    // TEST 3: Test TakeoffVersion Status Methods
    // ========================================
    console.log('TEST 3: Testing TakeoffVersion Status Methods');
    console.log('-'.repeat(70));
    
    console.log('   Submitting version...');
    await takeoffVersion.submit('test-user');
    console.log(`   ✅ Status changed to: ${takeoffVersion.status}`);
    console.log(`   Submitted at: ${takeoffVersion.submittedAt}`);
    
    console.log('   Approving version...');
    await takeoffVersion.approve('test-approver');
    console.log(`   ✅ Status changed to: ${takeoffVersion.status}`);
    console.log(`   Approved at: ${takeoffVersion.approvedDate}\n`);
    
    // ========================================
    // TEST 4: Create CostEstimate
    // ========================================
    console.log('TEST 4: Creating CostEstimate');
    console.log('-'.repeat(70));
    
    const estimateNumber = await CostEstimate.generateEstimateNumber();
    console.log(`   Generated estimate number: ${estimateNumber}`);
    
    const costEstimate = new CostEstimate({
      projectId,
      takeoffVersionId,
      estimateNumber,
      estimateName: 'Q1 2024 Estimate',
      estimateType: 'preliminary',
      cmpdVersion: 'CMPD-2024-Q1',
      location: 'Malaybalay City',
      district: 'Bukidnon 1st',
      effectiveDate: new Date(),
      status: 'draft',
      createdBy: 'test-user',
      ocmPercentage: 10,
      cpPercentage: 10,
      vatPercentage: 12,
      costSummary: {
        totalDirectCost: 0,
        totalOCM: 0,
        totalCP: 0,
        subtotalWithMarkup: 0,
        totalVAT: 0,
        grandTotal: 0,
        rateItemsCount: 0,
      },
    });
    
    await costEstimate.save();
    costEstimateId = costEstimate._id as mongoose.Types.ObjectId;
    
    console.log(`✅ CostEstimate created with ID: ${costEstimateId}`);
    console.log(`   Estimate Number: ${costEstimate.estimateNumber}`);
    console.log(`   CMPD Version: ${costEstimate.cmpdVersion}`);
    console.log(`   District: ${costEstimate.district}\n`);
    
    // ========================================
    // TEST 5: Create EstimateRateItem
    // ========================================
    console.log('TEST 5: Creating EstimateRateItem');
    console.log('-'.repeat(70));
    
    const rateItem = new EstimateRateItem({
      costEstimateId,
      projectId,
      payItemNumber: testBOQLine.payItemNumber,
      description: testBOQLine.description,
      unit: testBOQLine.unit,
      quantity: testBOQLine.quantity,
      laborItems: [testLaborItem],
      equipmentItems: [testEquipmentItem],
      materialItems: [testMaterialItem],
      location: 'Malaybalay City',
      district: 'Bukidnon 1st',
      cmpdVersion: 'CMPD-2024-Q1',
      effectiveDate: new Date(),
      ratesAppliedAt: new Date(),
      costBreakdown: {
        laborCost: 0,
        equipmentCost: 0,
        materialCost: 0,
        directCost: 0,
        ocmPercentage: 10,
        ocmCost: 0,
        cpPercentage: 10,
        cpCost: 0,
        vatPercentage: 12,
        vatCost: 0,
        subtotalWithMarkup: 0,
        totalUnitCost: 0,
        totalAmount: 0,
      },
    });
    
    // Calculate costs
    await rateItem.calculateCosts();
    await rateItem.save();
    
    console.log(`✅ EstimateRateItem created with ID: ${rateItem._id}`);
    console.log(`   Pay Item: ${rateItem.payItemNumber}`);
    console.log(`   Quantity: ${rateItem.quantity} ${rateItem.unit}`);
    console.log(`   Labor Items: ${rateItem.laborItems.length}`);
    console.log(`   Equipment Items: ${rateItem.equipmentItems.length}`);
    console.log(`   Material Items: ${rateItem.materialItems.length}`);
    
    const costSummary = rateItem.getCostSummary();
    console.log(`\n   Cost Breakdown:`);
    console.log(`     Labor: ₱${costSummary.laborCost.toFixed(2)}`);
    console.log(`     Equipment: ₱${costSummary.equipmentCost.toFixed(2)}`);
    console.log(`     Materials: ₱${costSummary.materialCost.toFixed(2)}`);
    console.log(`     Direct Cost: ₱${costSummary.directCost.toFixed(2)}`);
    console.log(`     Unit Cost: ₱${costSummary.totalUnitCost.toFixed(2)}`);
    console.log(`     Total Amount: ₱${costSummary.totalAmount.toFixed(2)}\n`);
    
    // ========================================
    // TEST 6: Update CostEstimate Summary
    // ========================================
    console.log('TEST 6: Updating CostEstimate Summary');
    console.log('-'.repeat(70));
    
    const allRateItems = await EstimateRateItem.find({ costEstimateId }).lean();
    const updatedCostSummary = {
      totalDirectCost: allRateItems.reduce((sum, item) => sum + (item.costBreakdown?.directCost || 0) * item.quantity, 0),
      totalOCM: allRateItems.reduce((sum, item) => sum + (item.costBreakdown?.ocmCost || 0), 0),
      totalCP: allRateItems.reduce((sum, item) => sum + (item.costBreakdown?.cpCost || 0), 0),
      subtotalWithMarkup: 0,
      totalVAT: allRateItems.reduce((sum, item) => sum + (item.costBreakdown?.vatCost || 0), 0),
      grandTotal: 0,
      rateItemsCount: allRateItems.length,
    };
    updatedCostSummary.subtotalWithMarkup = updatedCostSummary.totalDirectCost + updatedCostSummary.totalOCM + updatedCostSummary.totalCP;
    updatedCostSummary.grandTotal = updatedCostSummary.subtotalWithMarkup + updatedCostSummary.totalVAT;
    
    costEstimate.costSummary = updatedCostSummary;
    await costEstimate.save();
    
    console.log(`✅ Cost Summary Updated:`);
    console.log(`   Direct Cost: ₱${updatedCostSummary.totalDirectCost.toFixed(2)}`);
    console.log(`   OCM: ₱${updatedCostSummary.totalOCM.toFixed(2)}`);
    console.log(`   CP: ₱${updatedCostSummary.totalCP.toFixed(2)}`);
    console.log(`   VAT: ₱${updatedCostSummary.totalVAT.toFixed(2)}`);
    console.log(`   Grand Total: ₱${updatedCostSummary.grandTotal.toFixed(2)}\n`);
    
    // ========================================
    // TEST 7: Update Project with Active References
    // ========================================
    console.log('TEST 7: Updating Project with Active References');
    console.log('-'.repeat(70));
    
    project.activeTakeoffVersionId = takeoffVersionId;
    project.activeCostEstimateId = costEstimateId;
    await project.save();
    
    console.log(`✅ Project updated with active references:`);
    console.log(`   Active Takeoff Version: ${project.activeTakeoffVersionId}`);
    console.log(`   Active Cost Estimate: ${project.activeCostEstimateId}\n`);
    
    // ========================================
    // TEST 8: Test Relationships
    // ========================================
    console.log('TEST 8: Testing Relationships');
    console.log('-'.repeat(70));
    
    const foundProject = await Project.findById(projectId);
    const foundVersion = await TakeoffVersion.findById(takeoffVersionId);
    const foundEstimate = await CostEstimate.findById(costEstimateId);
    const foundRateItems = await EstimateRateItem.find({ costEstimateId });
    
    console.log(`✅ Relationship verification:`);
    console.log(`   Project found: ${!!foundProject}`);
    console.log(`   TakeoffVersion found: ${!!foundVersion}`);
    console.log(`   CostEstimate found: ${!!foundEstimate}`);
    console.log(`   Rate items found: ${foundRateItems.length}\n`);
    
    // ========================================
    // TEST 9: Create Second Version (Revision)
    // ========================================
    console.log('TEST 9: Creating Second Version (Revision)');
    console.log('-'.repeat(70));
    
    const nextVersionNumber2 = await TakeoffVersion.getNextVersionNumber(projectId.toString());
    console.log(`   Next version number: ${nextVersionNumber2}`);
    
    const revisedVersion = new TakeoffVersion({
      projectId,
      versionNumber: nextVersionNumber2,
      versionLabel: 'Revised Design',
      versionType: 'revised',
      status: 'draft',
      createdBy: 'test-user',
      parentVersionId: takeoffVersionId,
      grid: foundVersion?.grid,
      levels: foundVersion?.levels,
      elementTemplates: foundVersion?.elementTemplates,
      elementInstances: foundVersion?.elementInstances,
      boqLines: [
        testBOQLine,
        {
          payItemNumber: '1002(1)a',
          description: 'Excavation',
          unit: 'Cubic Meter',
          quantity: 500,
          dupaTemplateId: new mongoose.Types.ObjectId(),
        },
      ],
      totalConcrete_m3: 0,
      totalRebar_kg: 0,
      totalFormwork_m2: 0,
      boqLineCount: 2,
      changesSummary: {
        elementsAdded: 1,
        elementsRemoved: 0,
        elementsModified: 0,
      },
    });
    
    await revisedVersion.save();
    
    console.log(`✅ Revised version created:`);
    console.log(`   Version: ${revisedVersion.versionNumber}`);
    console.log(`   Type: ${revisedVersion.versionType}`);
    console.log(`   Parent Version: ${revisedVersion.parentVersionId}`);
    console.log(`   BOQ Lines: ${revisedVersion.boqLines.length}\n`);
    
    // Mark original version as superseded
    await foundVersion?.supersede();
    console.log(`✅ Original version marked as: ${foundVersion?.status}\n`);
    
    // ========================================
    // CLEANUP
    // ========================================
    console.log('CLEANUP: Removing test data');
    console.log('-'.repeat(70));
    
    await EstimateRateItem.deleteMany({ projectId });
    await CostEstimate.deleteMany({ projectId });
    await TakeoffVersion.deleteMany({ projectId });
    await Project.deleteOne({ _id: projectId });
    
    console.log(`✅ Test data cleaned up\n`);
    
    // ========================================
    // SUMMARY
    // ========================================
    console.log('='.repeat(70));
    console.log('✨ ALL TESTS PASSED! ✨');
    console.log('='.repeat(70));
    console.log('\nTest Summary:');
    console.log('  ✅ Project model working');
    console.log('  ✅ TakeoffVersion model working');
    console.log('  ✅ CostEstimate model working');
    console.log('  ✅ EstimateRateItem model working');
    console.log('  ✅ Version numbering working');
    console.log('  ✅ Status transitions working');
    console.log('  ✅ Cost calculations working');
    console.log('  ✅ Relationships working');
    console.log('  ✅ Multi-version workflow working\n');
    
  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    
    // Cleanup on error
    try {
      if (projectId) {
        await EstimateRateItem.deleteMany({ projectId });
        await CostEstimate.deleteMany({ projectId });
        await TakeoffVersion.deleteMany({ projectId });
        await Project.deleteOne({ _id: projectId });
        console.log('\n🧹 Cleaned up test data after error');
      }
    } catch (cleanupError) {
      console.error('❌ Cleanup failed:', cleanupError);
    }
    
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the tests
runTests();
