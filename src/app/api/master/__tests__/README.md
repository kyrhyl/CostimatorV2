# Master Data API Integration Tests

This directory contains comprehensive integration tests for all master data management APIs.

## Test Coverage

### Labor Rates API (`labor.test.ts`)
- ✅ Create single labor rate
- ✅ Create bulk labor rates
- ✅ List all labor rates
- ✅ Filter by location and district
- ✅ Sort results
- ✅ Get single labor rate by ID
- ✅ Update labor rate
- ✅ Delete labor rate
- ✅ Validation errors (negative rates, missing fields)
- ✅ Duplicate detection (409 conflicts)
- ✅ Invalid/non-existent IDs (400/404 errors)

**Total: 18 test cases**

### Equipment API (`equipment.test.ts`)
- ✅ Create single equipment
- ✅ Create bulk equipment
- ✅ List all equipment
- ✅ Search by description
- ✅ Filter by rate range
- ✅ Sort by number and rate
- ✅ Get single equipment by ID
- ✅ Update equipment
- ✅ Delete single equipment
- ✅ Delete all equipment (with confirmation)
- ✅ Validation errors
- ✅ Duplicate detection
- ✅ Invalid/non-existent IDs

**Total: 20 test cases**

### Equipment CSV Import (`equipment-csv.test.ts`)
- ✅ Import valid CSV data
- ✅ Handle header variations (No/#/Number, HP/Horsepower)
- ✅ Parse quoted fields with commas
- ✅ Handle numeric strings with formatting
- ✅ Skip duplicates option
- ✅ Clear existing option
- ✅ Reject CSV without headers
- ✅ Reject missing required columns
- ✅ Reject malformed CSV
- ✅ Reject invalid data types
- ✅ Provide detailed error messages
- ✅ Handle empty CSV
- ✅ Handle CSV with only headers

**Total: 13 test cases**

### Materials API (`materials.test.ts`)
- ✅ Create single material
- ✅ Create bulk materials
- ✅ Uppercase material codes automatically
- ✅ Default isActive to true
- ✅ List all materials
- ✅ Search by description/code
- ✅ Filter by category
- ✅ Filter by active status
- ✅ Combine multiple filters
- ✅ Sort results
- ✅ Get single material by ID
- ✅ Update material
- ✅ Toggle active status
- ✅ Delete material
- ✅ Validation errors
- ✅ Duplicate detection

**Total: 22 test cases**

### Material Prices API (`material-prices.test.ts`)
- ✅ Create single price record
- ✅ Create bulk price records
- ✅ Allow duplicate material codes (for price history)
- ✅ Uppercase material codes
- ✅ List all price records
- ✅ Filter by material code
- ✅ Filter by location
- ✅ Filter by date range (from, to, both)
- ✅ Sort by date and price
- ✅ Combine multiple filters
- ✅ Get price history for material
- ✅ Get single price record by ID
- ✅ Update price record
- ✅ Update effective date
- ✅ Delete price record
- ✅ Validation errors (negative prices, invalid dates)

**Total: 24 test cases**

## Total Coverage: 97 Test Cases

## Running the Tests

### Prerequisites
1. Start the development server:
   ```powershell
   npm run dev
   ```

2. Ensure MongoDB is running and accessible

### Run All Integration Tests
```powershell
npm run test:integration
```

### Run Specific Test File
```powershell
npx vitest run src/app/api/master/__tests__/labor.test.ts
```

### Run in Watch Mode
```powershell
npx vitest watch src/app/api/master/__tests__/
```

## Test Structure

Each test file follows this pattern:

```typescript
describe('API Name', () => {
  describe('POST endpoint', () => {
    it('should handle successful case', async () => {
      // Arrange
      const testData = {...};
      
      // Act
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });
      
      // Assert
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });
  });
});
```

## Test Data Management

- **Setup**: Each test suite creates its own test data with unique identifiers
- **Cleanup**: `afterAll` hooks clean up test data after suite completion
- **Isolation**: Tests use unique prefixes (TEST-, BULK-, CSV-) to avoid conflicts

## Error Cases Covered

1. **400 Bad Request**
   - Missing required fields
   - Invalid data types
   - Negative values where not allowed
   - Malformed CSV data
   - Invalid ID format

2. **404 Not Found**
   - Non-existent resource IDs
   - Deleted resources

3. **409 Conflict**
   - Duplicate locations (labor)
   - Duplicate equipment numbers
   - Duplicate material codes

## CI/CD Integration

These tests are designed to run in:
- Local development environments
- GitHub Actions CI pipeline
- Pre-commit hooks (optional)
- Pre-deployment validation

## Notes

- Tests use the actual API endpoints (not mocked)
- Database state is managed within each test suite
- Tests can run in parallel (isolated by unique identifiers)
- CSV import tests verify smart header mapping
- Price history tests verify duplicate material codes are allowed
