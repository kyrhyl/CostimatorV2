import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

// Setup global test utilities
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
}

// Mock environment variables for tests
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db'

// Mock database connection
vi.mock('@/lib/db/connect', () => ({
  default: vi.fn().mockResolvedValue({}),
}))

// Create a base mock for Mongoose models
const mockModelConstructor = () => {
  const mockData = new Map();
  let idCounter = 1;

  const generateId = () => `mock-id-${idCounter++}`;

  return {
    // Constructor mock
    mockImplementation: vi.fn(function(this: any, data: any) {
      this._id = data._id || generateId();
      this._data = { ...data, _id: this._id };
      Object.assign(this, data);
      
      this.save = vi.fn(async () => {
        mockData.set(this._id, this._data);
        return this;
      });
      
      return this;
    }),
    
    // Static methods
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    create: vi.fn(),
    insertMany: vi.fn(),
    deleteMany: vi.fn(),
    countDocuments: vi.fn(),
    
    // Helper to access mock data
    _mockData: mockData,
    _reset: () => {
      mockData.clear();
      idCounter = 1;
    },
  };
};

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
})
