'use client';

import Link from 'next/link';

export default function MasterDataPage() {
  const masterDataSections = [
    {
      title: 'CMPD (Materials & Prices)',
      description: 'Construction Materials Price Data - Manage base materials and district-specific pricing with bulk import support',
      href: '/master/materials',
      icon: '📦',
      color: 'blue',
      stats: 'Base prices + District CMPD'
    },
    {
      title: 'Equipment',
      description: 'Construction equipment catalog with rental rates and hourly costs',
      href: '/master/equipment',
      icon: '🚜',
      color: 'orange',
      stats: 'Track equipment utilization'
    },
    {
      title: 'Labor Rates',
      description: 'DOLE-compliant labor rates by classification and location',
      href: '/master/labor',
      icon: '👷',
      color: 'green',
      stats: 'Location-based pricing'
    },
    {
      title: 'Pay Items',
      description: 'DPWH Volume III pay items catalog with standard units and classifications',
      href: '/master/pay-items',
      icon: '📋',
      color: 'purple',
      stats: 'Complete DPWH database'
    },
  ];

  const colorClasses = {
    blue: {
      border: 'border-blue-500',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      hover: 'hover:border-blue-600'
    },
    orange: {
      border: 'border-orange-500',
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      hover: 'hover:border-orange-600'
    },
    green: {
      border: 'border-green-500',
      bg: 'bg-green-50',
      text: 'text-green-600',
      hover: 'hover:border-green-600'
    },
    purple: {
      border: 'border-purple-500',
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      hover: 'hover:border-purple-600'
    },
    indigo: {
      border: 'border-indigo-500',
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      hover: 'hover:border-indigo-600'
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Master Data Management</h1>
          <p className="text-gray-600">
            Centralized reference data for CMPD, equipment, labor rates, and DPWH standards
          </p>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2">Quick Actions</h2>
              <p className="text-blue-100">Manage your reference data efficiently</p>
            </div>
            <div className="flex gap-3">
              <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                Import CSV
              </button>
              <button className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-400 transition-colors border-2 border-white">
                Export Data
              </button>
            </div>
          </div>
        </div>

        {/* Master Data Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {masterDataSections.map((section) => {
            const colors = colorClasses[section.color as keyof typeof colorClasses];
            return (
              <Link
                key={section.href}
                href={section.href}
                className="group"
              >
                <div className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border-2 ${colors.border} ${colors.hover} h-full`}>
                  <div className={`w-16 h-16 ${colors.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <span className="text-3xl">{section.icon}</span>
                  </div>
                  <h2 className={`text-xl font-bold mb-2 ${colors.text}`}>
                    {section.title}
                  </h2>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                    {section.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                      {section.stats}
                    </span>
                    <span className={`${colors.text} font-medium group-hover:underline`}>
                      Manage →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Info Panel */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <span className="text-blue-600 mr-2">ℹ️</span>
            About Master Data
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">What is Master Data?</h4>
              <p className="leading-relaxed">
                Master data is the core reference information used across all projects and estimates. 
                It includes CMPD (Construction Materials Price Data) with district-specific pricing, equipment, 
                labor rates, and DPWH pay items that ensure consistency and accuracy in cost calculations.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Best Practices</h4>
              <ul className="space-y-1 leading-relaxed">
                <li>• Update CMPD prices regularly from district offices</li>
                <li>• Import CMPD data with proper version tracking</li>
                <li>• Update labor rates when DOLE releases new standards</li>
                <li>• Maintain historical pricing for trend analysis</li>
                <li>• Regular backup and export of master data</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
