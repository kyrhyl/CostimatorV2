import fs from 'fs';
import path from 'path';

function getArg(flag, fallback = '') {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        i++;
      }
      row.push(field);
      field = '';
      if (row.length > 1 || row[0].trim() !== '') {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0].trim() !== '') {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeHeader(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function escapeCsv(value) {
  const stringValue = String(value ?? '');
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function parsePrice(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed.toUpperCase() === '#REF!') return null;
  const normalized = trimmed.replace(/,/g, '').replace(/\s+/g, '');
  const num = Number.parseFloat(normalized);
  if (Number.isNaN(num)) return null;
  return num;
}

function findColumnIndex(headers, candidates) {
  for (const candidate of candidates) {
    const index = headers.findIndex((h) => h.includes(candidate));
    if (index !== -1) return index;
  }
  return -1;
}

function main() {
  const inputPath = getArg('--input');
  const outputPath = getArg('--output');
  const reportPath = getArg('--report');

  if (!inputPath || !outputPath || !reportPath) {
    console.error('Usage: node scripts/normalize-cmpd-materials.mjs --input <csv> --output <csv> --report <json>');
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf-8');
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    console.error('CSV is empty');
    process.exit(1);
  }

  const headerRow = rows[0] || [];
  const headers = headerRow.map(normalizeHeader);

  let codeIndex = findColumnIndex(headers, ['material code', 'materialcode', 'code']);
  let descIndex = findColumnIndex(headers, ['material description', 'description']);
  let unitIndex = findColumnIndex(headers, ['unit']);
  let priceIndex = findColumnIndex(headers, ['unit cost', 'unitcost', 'price', "please don't delete", 'please dont delete']);

  if (codeIndex === -1 || descIndex === -1 || unitIndex === -1 || priceIndex === -1) {
    if (headerRow.length >= 10) {
      codeIndex = 0;
      descIndex = 1;
      unitIndex = 8;
      priceIndex = 9;
    }
  }

  const report = {
    inputPath,
    totalRows: rows.length - 1,
    validRows: 0,
    skippedEmpty: 0,
    skippedMissingCode: 0,
    skippedMissingDescription: 0,
    skippedMissingUnit: 0,
    skippedCategoryRows: 0,
    skippedInvalidPrice: 0,
    skippedDuplicates: 0,
    invalidSamples: [],
  };

  const outputRows = [];
  const seenCodes = new Set();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((cell) => String(cell || '').trim() === '')) {
      report.skippedEmpty++;
      continue;
    }

    const codeRaw = row[codeIndex] || '';
    const descRaw = row[descIndex] || '';
    const unitRaw = row[unitIndex] || '';
    const priceRaw = row[priceIndex] || '';

    const materialCode = String(codeRaw).trim().toUpperCase();
    const description = String(descRaw).trim();
    const unit = String(unitRaw).trim().toUpperCase();

    if (!materialCode) {
      report.skippedMissingCode++;
      if (report.invalidSamples.length < 20) {
        report.invalidSamples.push({ row: i + 1, reason: 'missing_code', value: row });
      }
      continue;
    }

    if (!description) {
      report.skippedMissingDescription++;
      if (report.invalidSamples.length < 20) {
        report.invalidSamples.push({ row: i + 1, reason: 'missing_description', value: row });
      }
      continue;
    }

    if (!unit || unit === 'NONE') {
      report.skippedCategoryRows++;
      continue;
    }

    const unitCost = parsePrice(priceRaw);
    if (unitCost === null) {
      report.skippedInvalidPrice++;
      if (report.invalidSamples.length < 20) {
        report.invalidSamples.push({ row: i + 1, reason: 'invalid_price', value: row });
      }
      continue;
    }

    if (seenCodes.has(materialCode)) {
      report.skippedDuplicates++;
      continue;
    }

    seenCodes.add(materialCode);
    outputRows.push({ materialCode, description, unit, unitCost });
  }

  report.validRows = outputRows.length;

  const outputLines = [
    ['materialCode', 'description', 'unit', 'unitCost'].map(escapeCsv).join(','),
    ...outputRows.map((row) => [
      escapeCsv(row.materialCode),
      escapeCsv(row.description),
      escapeCsv(row.unit),
      escapeCsv(row.unitCost),
    ].join(','))
  ];

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf-8');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('✅ Normalization complete');
  console.log(`Input: ${inputPath}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Report: ${reportPath}`);
  console.log(`Valid rows: ${report.validRows}`);
  console.log(`Skipped invalid price: ${report.skippedInvalidPrice}`);
  console.log(`Skipped missing code: ${report.skippedMissingCode}`);
  console.log(`Skipped category rows: ${report.skippedCategoryRows}`);
}

main();
