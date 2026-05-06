import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const appRoot = path.join(srcRoot, 'app');

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const EXCLUDED_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);

function walk(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        walk(fullPath, fileList);
      }
      continue;
    }
    const ext = path.extname(entry.name);
    if (SOURCE_EXTENSIONS.has(ext)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function countLines(text) {
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

function relative(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lineCount = countLines(content);
  const useClient = /['\"]use client['\"];?/.test(content);
  const useEffectCount = (content.match(/\buseEffect\s*\(/g) || []).length;
  const fetchCount = (content.match(/\bfetch\s*\(/g) || []).length;
  const routerPushCount = (content.match(/router\.(push|replace)\s*\(/g) || []).length;

  return {
    filePath,
    lineCount,
    useClient,
    useEffectCount,
    fetchCount,
    routerPushCount,
    clientComplexityScore: useClient ? useEffectCount + fetchCount + routerPushCount : 0,
  };
}

function printSection(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

function printTop(rows, formatter) {
  rows.forEach((row, index) => {
    console.log(`${String(index + 1).padStart(2, ' ')}. ${formatter(row)}`);
  });
}

function main() {
  if (!fs.existsSync(srcRoot)) {
    console.error('Could not find src directory.');
    process.exit(1);
  }

  const sourceFiles = walk(srcRoot);
  const scanned = sourceFiles.map(scanFile);

  const largestFiles = [...scanned]
    .sort((a, b) => b.lineCount - a.lineCount)
    .slice(0, 15);

  const clientPages = scanned.filter(
    (file) => file.filePath.startsWith(appRoot) && file.filePath.endsWith('.tsx') && file.useClient
  );

  const fetchHeavyClientPages = [...clientPages]
    .filter((file) => file.fetchCount > 0 || file.useEffectCount > 0 || file.routerPushCount > 0)
    .sort((a, b) => b.clientComplexityScore - a.clientComplexityScore)
    .slice(0, 15);

  const totals = scanned.reduce(
    (acc, file) => {
      acc.files += 1;
      acc.lines += file.lineCount;
      acc.fetch += file.fetchCount;
      acc.effects += file.useEffectCount;
      acc.clientPages += file.useClient ? 1 : 0;
      return acc;
    },
    { files: 0, lines: 0, fetch: 0, effects: 0, clientPages: 0 }
  );

  console.log('Costimator Performance Audit');
  console.log('===========================');
  console.log(`Scanned files: ${totals.files}`);
  console.log(`Total lines: ${totals.lines.toLocaleString()}`);
  console.log(`Total fetch() calls: ${totals.fetch}`);
  console.log(`Total useEffect() calls: ${totals.effects}`);
  console.log(`Files with use client: ${totals.clientPages}`);

  printSection('Largest TypeScript Files');
  printTop(largestFiles, (row) => `${relative(row.filePath)} (${row.lineCount.toLocaleString()} lines)`);

  printSection('Most Complex Client Pages (fetch/effect/navigation)');
  if (fetchHeavyClientPages.length === 0) {
    console.log('No client pages with fetch/useEffect/router navigation usage found.');
  } else {
    printTop(
      fetchHeavyClientPages,
      (row) =>
        `${relative(row.filePath)} (score=${row.clientComplexityScore}, fetch=${row.fetchCount}, useEffect=${row.useEffectCount}, nav=${row.routerPushCount})`
    );
  }
}

main();
