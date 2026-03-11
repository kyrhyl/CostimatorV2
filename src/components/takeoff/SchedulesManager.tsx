'use client';

import React, { useState } from 'react';
import DoorsWindowsSchedule from './DoorsWindowsSchedule';
import GenericScheduleItems from './GenericScheduleItems';

interface SchedulesManagerProps {
  projectId: string;
}

type ScheduleCategory = 'doors' | 'windows' | 'other';

export default function SchedulesManager({ projectId }: SchedulesManagerProps) {
  const [activeCategory, setActiveCategory] = useState<ScheduleCategory>('doors');

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-6" aria-label="Schedule Categories">
            <button
              onClick={() => setActiveCategory('doors')}
              className={`py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeCategory === 'doors'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🚪 Doors
            </button>
            <button
              onClick={() => setActiveCategory('windows')}
              className={`py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeCategory === 'windows'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🪟 Windows
            </button>
            <button
              onClick={() => setActiveCategory('other')}
              className={`py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeCategory === 'other'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📦 Other Items
            </button>
          </nav>
        </div>
      </div>

      {/* Category Content */}
      {activeCategory === 'doors' && (
        <DoorsWindowsSchedule projectId={projectId} category="doors" />
      )}

      {activeCategory === 'windows' && (
        <DoorsWindowsSchedule projectId={projectId} category="windows" />
      )}

      {activeCategory === 'other' && (
        <GenericScheduleItems projectId={projectId} />
      )}
    </div>
  );
}
