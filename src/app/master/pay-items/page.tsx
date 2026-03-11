'use client';

import Link from 'next/link';

export default function PayItemsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pay Items Management</h1>
        <p className="text-gray-600">DPWH Volume III pay items are managed through the catalog</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <svg className="w-20 h-20 mx-auto text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold mb-4">DPWH Pay Items</h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Browse DPWH Volume III pay items organized by Division and Parts. Search and reference 
          official pay item codes, descriptions, and units of measurement for BOQ and costing.
        </p>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          View Pay Items
        </Link>
      </div>
    </div>
  );
}
