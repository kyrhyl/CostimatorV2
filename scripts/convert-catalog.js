const fs = require('fs');
const path = require('path');

// Simple CSV parser that handles quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current); // Add the last field
  
  return result;
}

// Read the CSV file
const csvPath = path.join(__dirname, '../data/dpwh_pay_items_volumeIII_master.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvContent.split('\n');
const items = [];

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  
  const values = parseCSVLine(lines[i]);
  
  const itemNumber = values[0]?.trim();
  let description = values[4]?.trim();
  const unit = values[5]?.trim();
  
  if (!itemNumber || !description || !unit) continue;
  
  // Check if description starts with a single letter suffix (a, b, c, etc.)
  const suffixMatch = description.match(/^([a-z]\d*)\s+(.+)$/i);
  let finalItemNumber = itemNumber;
  
  if (suffixMatch) {
    // Extract suffix from description and add to item number
    const suffix = suffixMatch[1];
    description = suffixMatch[2]; // Remove suffix from description
    finalItemNumber = `${itemNumber} ${suffix}`;
  }
  
  // Determine category and trade based on item numbers
  const itemBase = finalItemNumber.split(' ')[0]; // Get base number
  let trade = 'Other';
  let category = 'General Works';
  
  // Categorize based on item number series
  if (itemBase === '800') {
    trade = 'Earthwork';
    category = 'Clearing and Grubbing';
  } else if (itemBase === '801') {
    trade = 'Earthwork';
    category = 'Removal of Structures';
  } else if (itemBase === '802') {
    trade = 'Earthwork';
    category = 'Excavation';
  } else if (itemBase === '803') {
    trade = 'Earthwork';
    category = 'Structure Excavation';
  } else if (itemBase === '804') {
    trade = 'Earthwork';
    category = 'Embankment';
  } else if (itemBase === '805') {
    trade = 'Earthwork';
    category = 'Dredging';
  } else if (itemBase === '806') {
    trade = 'Earthwork';
    category = 'Reclamation';
  } else if (itemBase === '807') {
    trade = 'Earthwork';
    category = 'Site Development';
  } else if (itemBase === '808') {
    trade = 'Earthwork';
    category = 'Rammed Aggregate Column';
  } else if (itemBase === '900' || itemBase === '901') {
    trade = 'Concrete';
    category = 'Concrete Works';
  } else if (itemBase === '902') {
    trade = 'Rebar';
    category = 'Reinforcing Steel';
  } else if (itemBase === '903') {
    trade = 'Formwork';
    category = 'Formwork and Falseworks';
  } else if (itemBase === '904') {
    trade = 'Concrete';
    category = 'Precast Concrete';
  } else if (itemBase === '1000') {
    trade = 'Plumbing';
    category = 'Termite Control';
  } else if (itemBase === '1001') {
    trade = 'Plumbing';
    category = 'Drainage and Sewer';
  } else if (itemBase === '1002') {
    trade = 'Plumbing';
    category = 'Water Supply and Plumbing Fixtures';
  } else if (itemBase === '1003') {
    trade = 'Carpentry';
    category = 'Carpentry and Joinery';
  } else if (itemBase === '1004') {
    trade = 'Hardware';
    category = 'Hardware';
  } else if (itemBase === '1005') {
    trade = 'Doors & Windows';
    category = 'Steel Windows';
  } else if (itemBase === '1006') {
    trade = 'Doors & Windows';
    category = 'Steel Doors';
  } else if (itemBase === '1007') {
    trade = 'Doors & Windows';
    category = 'Aluminum Glass Doors';
  } else if (itemBase === '1008') {
    trade = 'Doors & Windows';
    category = 'Aluminum Glass Windows';
  } else if (itemBase === '1009') {
    trade = 'Doors & Windows';
    category = 'Jalousie Windows';
  } else if (itemBase === '1010') {
    trade = 'Doors & Windows';
    category = 'Wooden Doors and Windows';
  } else if (itemBase === '1011') {
    trade = 'Doors & Windows';
    category = 'Roll-Up Doors';
  } else if (itemBase === '1012') {
    trade = 'Glass & Glazing';
    category = 'Glass and Glazing';
  } else if (itemBase === '1013') {
    trade = 'Roofing';
    category = 'Metal Roofing';
  } else if (itemBase === '1014') {
    trade = 'Roofing';
    category = 'Pre-painted Metal Sheets';
  } else if (itemBase === '1015') {
    trade = 'Roofing';
    category = 'Clay Roof Tile';
  } else if (itemBase === '1016') {
    trade = 'Waterproofing';
    category = 'Waterproofing';
  } else if (itemBase === '1017') {
    trade = 'Plumbing';
    category = 'Roof Drainage';
  } else if (itemBase === '1018') {
    trade = 'Finishes';
    category = 'Tiles';
  } else if (itemBase === '1019') {
    trade = 'Finishes';
    category = 'Wood Tiles';
  } else if (itemBase === '1020') {
    trade = 'Finishes';
    category = 'Vinyl Flooring';
  } else if (itemBase === '1021') {
    trade = 'Finishes';
    category = 'Cement Floor Finish';
  } else if (itemBase === '1022') {
    trade = 'Finishes';
    category = 'Stucco Finish';
  } else if (itemBase === '1023') {
    trade = 'Finishes';
    category = 'Granolithic Marble';
  } else if (itemBase === '1024') {
    trade = 'Finishes';
    category = 'Pea Gravel Washout';
  } else if (itemBase === '1025') {
    trade = 'Finishes';
    category = 'Hammered Finish';
  } else if (itemBase === '1026') {
    trade = 'Finishes';
    category = 'Pebble Washout';
  } else if (itemBase === '1027') {
    trade = 'Finishes';
    category = 'Cement Plaster';
  } else if (itemBase === '1028') {
    trade = 'Finishes';
    category = 'Synthetic Adobe';
  } else if (itemBase === '1029') {
    trade = 'Finishes';
    category = 'Granite Washout';
  } else if (itemBase === '1030' || itemBase === '1031') {
    trade = 'Finishes';
    category = 'Acoustical Treatment';
  } else if (itemBase === '1032') {
    trade = 'Painting';
    category = 'Painting and Coating';
  } else if (itemBase === '1046') {
    trade = 'Masonry';
    category = 'Masonry Works';
  } else if (itemBase === '1047') {
    trade = 'Structural Steel';
    category = 'Metal Structures';
  } else if (itemBase === '1048') {
    trade = 'Structural';
    category = 'Fiber Reinforcement and Repair';
  } else if (itemBase === '1049') {
    trade = 'Foundation';
    category = 'Jet Grouting';
  } else if (itemBase === '1051') {
    trade = 'Railing';
    category = 'Railings';
  } else if (itemBase === '1052') {
    trade = 'Foundation';
    category = 'Piling Works';
  } else if (itemBase === '1053') {
    trade = 'Finishes';
    category = 'Carpet Flooring';
  } else if (itemBase === '1054') {
    trade = 'Cladding';
    category = 'GFRC Cladding';
  } else if (itemBase.startsWith('A.')) {
    trade = 'General Requirements';
    category = 'Engineer Requirements';
  } else if (itemBase === '1200') {
    trade = 'MEPF';
    category = 'Ventilation';
  } else if (itemBase === '1500' || itemBase === '1501' || itemBase === '1503') {
    trade = 'Marine Works';
    category = 'Marine Construction';
  }
  
  // Include all items
  items.push({
    itemNumber: finalItemNumber,
    description,
    unit,
    category,
    trade,
  });
}

// Create output JSON
const output = {
  version: 'DPWH Volume III - 2023 Edition',
  source: 'dpwh_pay_items_volumeIII_master.csv',
  generatedAt: new Date().toISOString(),
  totalItems: items.length,
  items: items,
};

// Write to JSON file
const outputPath = path.join(__dirname, '../data/dpwh-catalog.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`✅ Converted ${items.length} items to dpwh-catalog.json`);
console.log(`   Concrete: ${items.filter(i => i.trade === 'Concrete').length}`);
console.log(`   Rebar: ${items.filter(i => i.trade === 'Rebar').length}`);
console.log(`   Formwork: ${items.filter(i => i.trade === 'Formwork').length}`);
