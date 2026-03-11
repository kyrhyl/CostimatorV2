/**
 * Index Verification Script
 * Verifies that all database indexes for the multi-version architecture are properly created
 */

import dbConnect from '@/lib/db/connect';
import TakeoffVersion from '@/models/TakeoffVersion';
import CostEstimate from '@/models/CostEstimate';
import EstimateRateItem from '@/models/EstimateRateItem';
import Project from '@/models/Project';

async function verifyIndexes() {
  console.log('🔍 Verifying database indexes for multi-version architecture...\n');
  
  try {
    await dbConnect();
    
    const collections = [
      { name: 'Project', model: Project },
      { name: 'TakeoffVersion', model: TakeoffVersion },
      { name: 'CostEstimate', model: CostEstimate },
      { name: 'EstimateRateItem', model: EstimateRateItem },
    ];
    
    for (const { name, model } of collections) {
      console.log(`📋 ${name} Collection Indexes:`);
      console.log('─'.repeat(60));
      
      try {
        const indexes = await model.collection.getIndexes();
        
        if (Object.keys(indexes).length === 0) {
          console.log('  ⚠️  No indexes found! Creating indexes...');
          await model.syncIndexes();
          const newIndexes = await model.collection.getIndexes();
          console.log(`  ✅ Created ${Object.keys(newIndexes).length} indexes`);
          
          Object.entries(newIndexes).forEach(([indexName, indexSpec]: [string, any]) => {
            const keys = Object.keys(indexSpec.key).map(k => 
              `${k}: ${indexSpec.key[k]}`
            ).join(', ');
            const unique = indexSpec.unique ? ' [UNIQUE]' : '';
            console.log(`    • ${indexName}: { ${keys} }${unique}`);
          });
        } else {
          console.log(`  ✅ Found ${Object.keys(indexes).length} indexes:`);
          
          Object.entries(indexes).forEach(([indexName, indexSpec]: [string, any]) => {
            const keys = Object.keys(indexSpec.key).map(k => 
              `${k}: ${indexSpec.key[k]}`
            ).join(', ');
            const unique = indexSpec.unique ? ' [UNIQUE]' : '';
            console.log(`    • ${indexName}: { ${keys} }${unique}`);
          });
        }
      } catch (error: any) {
        console.log(`  ❌ Error: ${error.message}`);
      }
      
      console.log('');
    }
    
    console.log('✨ Index verification complete!\n');
    
  } catch (error) {
    console.error('❌ Failed to verify indexes:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the verification
verifyIndexes();
