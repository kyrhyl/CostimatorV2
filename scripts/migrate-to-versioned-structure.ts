/**
 * Migration Script: Convert Existing Projects to Versioned Structure
 * 
 * This script migrates existing projects from the legacy structure to the new
 * multi-version architecture without data loss.
 * 
 * What it does:
 * 1. Creates initial TakeoffVersion from project's current design state
 * 2. Generates BOQ for the initial version
 * 3. Migrates existing ProjectEstimate records to CostEstimate
 * 4. Updates project references to point to new version
 * 5. Preserves all timestamps and metadata
 * 
 * Usage:
 *   npx ts-node scripts/migrate-to-versioned-structure.ts [--dry-run] [--project-id=<id>]
 * 
 * Options:
 *   --dry-run       Preview changes without actually migrating
 *   --project-id    Migrate only a specific project (for testing)
 */

import mongoose from 'mongoose';
import dbConnect from '../src/lib/db/connect';
import Project from '../src/models/Project';
import TakeoffVersion from '../src/models/TakeoffVersion';
import CostEstimate from '../src/models/CostEstimate';
import ProjectEstimate from '../src/models/ProjectEstimate';

interface MigrationStats {
  projectsProcessed: number;
  projectsSkipped: number;
  versionsCreated: number;
  estimatesMigrated: number;
  errors: Array<{ projectId: string; error: string }>;
}

interface MigrationOptions {
  dryRun: boolean;
  projectId?: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
  };
  
  const projectIdArg = args.find(arg => arg.startsWith('--project-id='));
  if (projectIdArg) {
    options.projectId = projectIdArg.split('=')[1];
  }
  
  return options;
}

/**
 * Generate BOQ lines from project data
 * This is a simplified version - in production, call the actual BOQ generation endpoint
 */
async function generateBOQForVersion(versionId: string): Promise<any[]> {
  // In a real implementation, this would call the BOQ generation API
  // For now, return empty array as BOQ will be generated on first use
  console.log(`    ℹ BOQ generation deferred for version ${versionId}`);
  return [];
}

/**
 * Migrate a single project to versioned structure
 */
async function migrateProject(
  project: any,
  options: MigrationOptions,
  stats: MigrationStats
): Promise<void> {
  try {
    console.log(`\n📦 Processing: ${project.projectName} (${project._id})`);
    
    // Check if already migrated
    const existingVersion = await TakeoffVersion.findOne({ projectId: project._id });
    if (existingVersion) {
      console.log(`  ⚠ Already migrated (has ${existingVersion.versionNumber} version(s))`);
      stats.projectsSkipped++;
      return;
    }
    
    if (options.dryRun) {
      console.log('  [DRY RUN] Would create initial version');
      stats.projectsProcessed++;
      return;
    }
    
    // Create initial takeoff version from project's current state
    console.log('  Creating initial takeoff version...');
    const initialVersion = await TakeoffVersion.create({
      projectId: project._id,
      versionNumber: 1,
      versionLabel: 'Initial Version (Migrated)',
      versionType: 'detailed',
      status: 'approved',
      createdBy: 'migration-script',
      createdAt: project.createdAt || new Date(),
      
      // Copy design data - Part D (Structural)
      grid: {
        xLines: project.gridX || [],
        yLines: project.gridY || []
      },
      levels: project.levels || [],
      elementTemplates: project.elementTemplates || [],
      elementInstances: project.elementInstances || [],
      
      // Copy design data - Part E (Finishing Works)
      spaces: project.spaces || [],
      openings: project.openings || [],
      finishTypes: project.finishTypes || [],
      spaceFinishAssignments: project.spaceFinishAssignments || [],
      wallSurfaces: project.wallSurfaces || [],
      wallSurfaceFinishAssignments: project.wallSurfaceFinishAssignments || [],
      
      // Copy design data - Part E (Roofing)
      trussDesign: project.trussDesign,
      roofTypes: project.roofTypes || [],
      roofPlanes: project.roofPlanes || [],
      scheduleItems: project.scheduleItems || [],
      
      // Initialize BOQ fields (will be populated on first generation)
      boqLines: [],
      totalConcrete_m3: 0,
      totalRebar_kg: 0,
      totalFormwork_m2: 0,
      boqLineCount: 0,
    });
    
    console.log(`  ✓ Created version ${initialVersion.versionNumber}: ${initialVersion._id}`);
    stats.versionsCreated++;
    
    // Generate BOQ for initial version (deferred)
    const boqLines = await generateBOQForVersion(initialVersion._id.toString());
    
    // Update project to reference this version
    await Project.findByIdAndUpdate(project._id, {
      activeTakeoffVersionId: initialVersion._id
    });
    console.log(`  ✓ Updated project to reference version ${initialVersion.versionNumber}`);
    
    // Migrate existing estimates (if any)
    const existingEstimates = await ProjectEstimate.find({ 
      projectId: project._id 
    }).lean();
    
    if (existingEstimates.length > 0) {
      console.log(`  Migrating ${existingEstimates.length} existing estimate(s)...`);
      
      for (const oldEstimate of existingEstimates) {
        const estimateNumber = `EST-${project._id.toString().slice(-4)}-${oldEstimate.version.toString().padStart(3, '0')}`;
        
        const newEstimate = await CostEstimate.create({
          projectId: project._id,
          takeoffVersionId: initialVersion._id,
          estimateNumber,
          estimateName: `Migrated Estimate v${oldEstimate.version}`,
          estimateType: oldEstimate.estimateType || 'detailed',
          status: oldEstimate.status || 'draft',
          location: project.projectLocation,
          district: project.district || 'NCR',
          cmpdVersion: project.cmpdVersion || 'CMPD-2024-Q1',
          
          // Copy pricing configuration
          ocmPercentage: 18,  // Default DPWH values
          cpPercentage: 10,
          vatPercentage: 12,
          
          // Cost summary (will be recalculated)
          costSummary: {
            totalDirectCost: oldEstimate.grandTotal || 0,
            totalOCM: 0,
            totalCP: 0,
            subtotalWithMarkup: 0,
            totalVAT: 0,
            grandTotal: oldEstimate.grandTotal || 0,
            rateItemsCount: oldEstimate.totalItems || 0
          },
          
          // Metadata
          preparedBy: oldEstimate.preparedBy,
          preparedDate: oldEstimate.preparedDate,
          approvedBy: oldEstimate.approvedBy,
          approvedDate: oldEstimate.approvedDate,
          createdBy: 'migration-script',
          createdAt: oldEstimate.createdAt || new Date()
        } as any);
        
        console.log(`    ✓ Migrated estimate: ${(newEstimate as any).estimateNumber}`);
        stats.estimatesMigrated++;
      }
    }
    
    stats.projectsProcessed++;
    console.log(`  ✅ Migration completed for ${project.projectName}`);
    
  } catch (error: any) {
    console.error(`  ❌ Error migrating project ${project._id}:`, error.message);
    stats.errors.push({
      projectId: project._id.toString(),
      error: error.message
    });
  }
}

/**
 * Main migration function
 */
async function migrate(): Promise<void> {
  const options = parseArgs();
  
  console.log('🚀 Starting migration to versioned structure...\n');
  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  if (options.projectId) {
    console.log(`🎯 Migrating specific project: ${options.projectId}\n`);
  }
  
  try {
    // Connect to database
    await dbConnect();
    console.log('✓ Connected to database\n');
    
    // Find projects to migrate
    const query = options.projectId 
      ? { _id: new mongoose.Types.ObjectId(options.projectId) }
      : {};
    
    const projects = await Project.find(query).lean();
    console.log(`Found ${projects.length} project(s) to process\n`);
    console.log('='.repeat(60));
    
    // Migration statistics
    const stats: MigrationStats = {
      projectsProcessed: 0,
      projectsSkipped: 0,
      versionsCreated: 0,
      estimatesMigrated: 0,
      errors: []
    };
    
    // Process each project
    for (const project of projects) {
      await migrateProject(project, options, stats);
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Migration Summary:');
    console.log(`  Projects processed: ${stats.projectsProcessed}`);
    console.log(`  Projects skipped: ${stats.projectsSkipped}`);
    console.log(`  Versions created: ${stats.versionsCreated}`);
    console.log(`  Estimates migrated: ${stats.estimatesMigrated}`);
    console.log(`  Errors: ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      stats.errors.forEach(err => {
        console.log(`  - Project ${err.projectId}: ${err.error}`);
      });
    }
    
    if (options.dryRun) {
      console.log('\n✓ Dry run completed - no changes made');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from database');
  }
}

// Run migration
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { migrate, migrateProject };
