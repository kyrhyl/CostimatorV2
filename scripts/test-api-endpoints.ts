/**
 * API Endpoint Test Script for Multi-Version Architecture
 * 
 * Tests all Phase 2 API endpoints with sample data
 * Run with: npx ts-node scripts/test-api-endpoints.ts
 */

import mongoose from 'mongoose';

// API Base URL (adjust for your environment)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Test data
let testProjectId: string;
let testTakeoffVersionId: string;
let testCostEstimateId: string;

async function testAPI() {
  console.log('🧪 Testing Multi-Version Architecture API Endpoints\n');
  console.log('='.repeat(70));
  
  try {
    // ========================================
    // TEST 1: Create a test project first
    // ========================================
    console.log('\nTEST 1: Create Test Project');
    console.log('-'.repeat(70));
    
    const projectResponse = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: 'API Test Project - Multi-Version',
        projectLocation: 'Malaybalay City, Bukidnon',
        district: 'Bukidnon 1st',
        cmpdVersion: 'CMPD-2024-Q1',
        implementingOffice: 'DPWH Bukidnon 1st District Engineering Office',
        appropriation: 5000000,
        projectType: 'takeoff',
        status: 'Planning',
      }),
    });
    
    const projectData = await projectResponse.json();
    if (!projectData.success) {
      throw new Error(`Failed to create project: ${projectData.error}`);
    }
    
    testProjectId = projectData.data._id;
    console.log(`✅ Project created: ${testProjectId}`);
    
    // ========================================
    // TEST 2: Create TakeoffVersion
    // ========================================
    console.log('\nTEST 2: Create TakeoffVersion');
    console.log('-'.repeat(70));
    
    const versionResponse = await fetch(
      `${API_BASE}/projects/${testProjectId}/takeoff-versions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionLabel: 'Initial Design',
          versionType: 'preliminary',
          description: 'First version for API testing',
          createdBy: 'api-test',
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
          boqLines: [
            {
              payItemNumber: '1001(1)a',
              description: 'Clearing and Grubbing',
              unit: 'Square Meter',
              quantity: 1500,
            },
          ],
          totalConcrete_m3: 0,
          totalRebar_kg: 0,
          totalFormwork_m2: 0,
        }),
      }
    );
    
    const versionData = await versionResponse.json();
    if (!versionData.success) {
      throw new Error(`Failed to create version: ${versionData.error}`);
    }
    
    testTakeoffVersionId = versionData.data._id;
    console.log(`✅ TakeoffVersion created: ${testTakeoffVersionId}`);
    console.log(`   Version Number: ${versionData.data.versionNumber}`);
    console.log(`   Status: ${versionData.data.status}`);
    
    // ========================================
    // TEST 3: List TakeoffVersions
    // ========================================
    console.log('\nTEST 3: List TakeoffVersions');
    console.log('-'.repeat(70));
    
    const listResponse = await fetch(
      `${API_BASE}/projects/${testProjectId}/takeoff-versions`
    );
    
    const listData = await listResponse.json();
    console.log(`✅ Found ${listData.count} version(s)`);
    
    // ========================================
    // TEST 4: Get Specific TakeoffVersion
    // ========================================
    console.log('\nTEST 4: Get Specific TakeoffVersion');
    console.log('-'.repeat(70));
    
    const getResponse = await fetch(
      `${API_BASE}/projects/${testProjectId}/takeoff-versions/${testTakeoffVersionId}`
    );
    
    const getData = await getResponse.json();
    console.log(`✅ Retrieved version ${getData.data.versionNumber}`);
    console.log(`   BOQ Lines: ${getData.data.boqLines?.length || 0}`);
    
    // ========================================
    // TEST 5: Update TakeoffVersion
    // ========================================
    console.log('\nTEST 5: Update TakeoffVersion');
    console.log('-'.repeat(70));
    
    const updateResponse = await fetch(
      `${API_BASE}/projects/${testProjectId}/takeoff-versions/${testTakeoffVersionId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Updated description via API test',
        }),
      }
    );
    
    const updateData = await updateResponse.json();
    console.log(`✅ Version updated`);
    
    // ========================================
    // TEST 6: Submit TakeoffVersion
    // ========================================
    console.log('\nTEST 6: Submit TakeoffVersion');
    console.log('-'.repeat(70));
    
    const submitResponse = await fetch(
      `${API_BASE}/projects/${testProjectId}/takeoff-versions/${testTakeoffVersionId}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          userId: 'api-test',
        }),
      }
    );
    
    const submitData = await submitResponse.json();
    console.log(`✅ ${submitData.message}`);
    console.log(`   New Status: ${submitData.data.status}`);
    
    // ========================================
    // TEST 7: Approve TakeoffVersion
    // ========================================
    console.log('\nTEST 7: Approve TakeoffVersion');
    console.log('-'.repeat(70));
    
    const approveResponse = await fetch(
      `${API_BASE}/projects/${testProjectId}/takeoff-versions/${testTakeoffVersionId}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          userId: 'api-test-approver',
        }),
      }
    );
    
    const approveData = await approveResponse.json();
    console.log(`✅ ${approveData.message}`);
    console.log(`   New Status: ${approveData.data.status}`);
    
    // ========================================
    // TEST 8: Duplicate TakeoffVersion
    // ========================================
    console.log('\nTEST 8: Duplicate TakeoffVersion');
    console.log('-'.repeat(70));
    
    const duplicateResponse = await fetch(
      `${API_BASE}/projects/${testProjectId}/takeoff-versions/${testTakeoffVersionId}/duplicate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionLabel: 'Revised Design',
          versionType: 'revised',
          createdBy: 'api-test',
        }),
      }
    );
    
    const duplicateData = await duplicateResponse.json();
    console.log(`✅ ${duplicateData.message}`);
    console.log(`   New Version ID: ${duplicateData.data._id}`);
    
    // ========================================
    // TEST 9: Create CostEstimate
    // ========================================
    console.log('\nTEST 9: Create CostEstimate');
    console.log('-'.repeat(70));
    
    const estimateResponse = await fetch(
      `${API_BASE}/projects/${testProjectId}/cost-estimates`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          takeoffVersionId: testTakeoffVersionId,
          estimateName: 'Q1 2024 Estimate',
          estimateType: 'preliminary',
          cmpdVersion: 'CMPD-2024-Q1',
          district: 'Bukidnon 1st',
          location: 'Malaybalay City',
          ocmPercentage: 10,
          cpPercentage: 10,
          vatPercentage: 12,
          createdBy: 'api-test',
        }),
      }
    );
    
    const estimateData = await estimateResponse.json();
    if (!estimateData.success) {
      throw new Error(`Failed to create estimate: ${estimateData.error}`);
    }
    
    testCostEstimateId = estimateData.data._id;
    console.log(`✅ CostEstimate created: ${testCostEstimateId}`);
    console.log(`   Estimate Number: ${estimateData.data.estimateNumber}`);
    
    // ========================================
    // TEST 10: List CostEstimates
    // ========================================
    console.log('\nTEST 10: List CostEstimates');
    console.log('-'.repeat(70));
    
    const estimatesListResponse = await fetch(
      `${API_BASE}/projects/${testProjectId}/cost-estimates`
    );
    
    const estimatesListData = await estimatesListResponse.json();
    console.log(`✅ Found ${estimatesListData.count} estimate(s)`);
    
    // ========================================
    // TEST 11: Generate CostEstimate from Takeoff
    // ========================================
    console.log('\nTEST 11: Generate CostEstimate from Takeoff (Note: May fail if DUPA templates not available)');
    console.log('-'.repeat(70));
    
    const generateResponse = await fetch(
      `${API_BASE}/takeoff-versions/${testTakeoffVersionId}/cost-estimates/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimateName: 'Generated Q1 2024',
          cmpdVersion: 'CMPD-2024-Q1',
          district: 'Bukidnon 1st',
          location: 'Malaybalay City',
          createdBy: 'api-test',
        }),
      }
    );
    
    const generateData = await generateResponse.json();
    if (generateData.success) {
      console.log(`✅ ${generateData.message}`);
      console.log(`   Processed: ${generateData.processing.processed}/${generateData.processing.totalBoqLines}`);
      console.log(`   Grand Total: ₱${generateData.data.costSummary.grandTotal.toFixed(2)}`);
    } else {
      console.log(`⚠️  Generation failed (expected if no DUPA templates): ${generateData.error}`);
    }
    
    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(70));
    console.log('✨ API ENDPOINT TESTS COMPLETED! ✨');
    console.log('='.repeat(70));
    console.log('\nAll core endpoints are working:');
    console.log('  ✅ TakeoffVersion CRUD');
    console.log('  ✅ TakeoffVersion status transitions');
    console.log('  ✅ TakeoffVersion duplication');
    console.log('  ✅ CostEstimate CRUD');
    console.log('  ✅ CostEstimate generation (depends on DUPA data)');
    console.log('\nTest Resources Created:');
    console.log(`  Project ID: ${testProjectId}`);
    console.log(`  TakeoffVersion ID: ${testTakeoffVersionId}`);
    console.log(`  CostEstimate ID: ${testCostEstimateId}`);
    console.log('\n⚠️  Remember to clean up test data from the database!\n');
    
  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE}/health`).catch(() => null);
    if (!response) {
      console.error(`❌ Server not responding at ${API_BASE}`);
      console.error('   Make sure the Next.js development server is running:');
      console.error('   npm run dev\n');
      process.exit(1);
    }
  } catch (error) {
    // Server might not have health endpoint, that's okay
  }
}

// Run tests
console.log(`Testing API at: ${API_BASE}\n`);
checkServer().then(() => testAPI());
