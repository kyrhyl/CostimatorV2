/**
 * Database Mocks for Testing
 * Provides in-memory mock for MongoDB operations
 */

import { vi } from 'vitest';

// Mock data storage
const mockDb = new Map<string, any[]>();

// Generate ObjectId-like strings
export function generateMockId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Mock Mongoose Model
export function createMockModel(collectionName: string) {
  // Initialize collection if it doesn't exist
  if (!mockDb.has(collectionName)) {
    mockDb.set(collectionName, []);
  }

  const collection = mockDb.get(collectionName)!;

  return {
    // Find operations
    find: vi.fn((query: any = {}) => {
      let results = [...collection];
      
      // Apply filters
      Object.keys(query).forEach(key => {
        if (key === '$or') {
          // Handle $or operator
          results = results.filter(doc => 
            query.$or.some((condition: any) => 
              Object.keys(condition).every(k => {
                if (condition[k].$regex) {
                  const regex = new RegExp(condition[k].$regex, condition[k].$options);
                  return regex.test(doc[k]);
                }
                return doc[k] === condition[k];
              })
            )
          );
        } else if (typeof query[key] === 'object' && !Array.isArray(query[key])) {
          // Handle operators like $gte, $lte, $regex
          const operators = query[key];
          results = results.filter(doc => {
            if (operators.$regex) {
              const regex = new RegExp(operators.$regex, operators.$options);
              return regex.test(doc[key]);
            }
            if (operators.$gte !== undefined && doc[key] < operators.$gte) return false;
            if (operators.$lte !== undefined && doc[key] > operators.$lte) return false;
            return true;
          });
        } else {
          results = results.filter(doc => doc[key] === query[key]);
        }
      });

      return {
        sort: vi.fn(() => ({
          limit: vi.fn(() => ({
            exec: vi.fn(() => Promise.resolve(results))
          })),
          exec: vi.fn(() => Promise.resolve(results))
        })),
        limit: vi.fn(() => ({
          exec: vi.fn(() => Promise.resolve(results))
        })),
        exec: vi.fn(() => Promise.resolve(results))
      };
    }),

    // Find one
    findOne: vi.fn((query: any) => ({
      exec: vi.fn(() => {
        const doc = collection.find(item => 
          Object.keys(query).every(key => item[key] === query[key])
        );
        return Promise.resolve(doc || null);
      })
    })),

    // Find by ID
    findById: vi.fn((id: string) => ({
      exec: vi.fn(() => {
        const doc = collection.find(item => item._id === id);
        return Promise.resolve(doc || null);
      })
    })),

    // Create
    create: vi.fn((data: any) => {
      const newDoc = {
        ...data,
        _id: data._id || generateMockId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      collection.push(newDoc);
      return Promise.resolve(newDoc);
    }),

    // Insert many
    insertMany: vi.fn((docs: any[]) => {
      const newDocs = docs.map(doc => ({
        ...doc,
        _id: doc._id || generateMockId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      collection.push(...newDocs);
      return Promise.resolve(newDocs);
    }),

    // Find by ID and update
    findByIdAndUpdate: vi.fn((id: string, update: any, options: any = {}) => {
      const index = collection.findIndex(item => item._id === id);
      if (index === -1) {
        return Promise.resolve(null);
      }
      
      const updated = {
        ...collection[index],
        ...update,
        updatedAt: new Date()
      };
      collection[index] = updated;
      
      return Promise.resolve(options.new ? updated : collection[index]);
    }),

    // Find by ID and delete
    findByIdAndDelete: vi.fn((id: string) => {
      const index = collection.findIndex(item => item._id === id);
      if (index === -1) {
        return Promise.resolve(null);
      }
      
      const deleted = collection.splice(index, 1)[0];
      return Promise.resolve(deleted);
    }),

    // Delete many
    deleteMany: vi.fn((query: any = {}) => {
      const toDelete = collection.filter(doc =>
        Object.keys(query).every(key => doc[key] === query[key])
      );
      
      toDelete.forEach(doc => {
        const index = collection.indexOf(doc);
        if (index > -1) collection.splice(index, 1);
      });
      
      return Promise.resolve({ deletedCount: toDelete.length });
    }),

    // Count documents
    countDocuments: vi.fn((query: any = {}) => {
      const count = collection.filter(doc =>
        Object.keys(query).every(key => doc[key] === query[key])
      ).length;
      return Promise.resolve(count);
    })
  };
}

// Clear all mock data
export function clearMockDb() {
  mockDb.clear();
}

// Get collection data for inspection
export function getMockCollection(collectionName: string) {
  return mockDb.get(collectionName) || [];
}

// Mock dbConnect
export const mockDbConnect = vi.fn(() => Promise.resolve());
