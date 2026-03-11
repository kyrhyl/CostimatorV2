// @ts-nocheck
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

import mongoose from 'mongoose';

async function testConnection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB Atlas successfully!');
    await mongoose.disconnect();
  } catch (error: unknown) {
    console.error('Connection failed:', error instanceof Error ? error.message : String(error));
  }
}

testConnection();