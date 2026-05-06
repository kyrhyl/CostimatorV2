import fs from 'node:fs';
import path from 'node:path';

const lockPath = path.join(process.cwd(), '.next', 'dev', 'lock');

try {
  if (fs.existsSync(lockPath)) {
    fs.rmSync(lockPath, { force: true });
    console.log(`Removed stale lock: ${lockPath}`);
  }
} catch (error) {
  console.warn(`Could not remove lock file at ${lockPath}:`, error);
}
