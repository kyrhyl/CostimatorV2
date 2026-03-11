'use client';

import React, { useState, useMemo } from 'react';
import type { BOQLine } from '@/types';
import { classifyItemsABC, getABCStatistics, getABCBadgeColor, type ABCClass } from '@/lib/costing/utils/abc-analysis';
import { generateMonthlyTimePhasing, generateQuarterlyTimePhasing, calculateCompletionDate } from '@/lib/costing/utils/time-phasing';

interface ProgramOfWorksProps {
  boqLines: BOQLine[];
  projectId: string;
}

export default function ProgramOfWorks({ boqLines, projectId }: ProgramOfWorksProps) {
  const [contractDuration, setContractDuration] = useState(180); // days
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly'>('monthly');
  const [selectedClass, setSelectedClass] = useState<ABCClass | 'all'>('all');

  // Filter only costed items
  const costedItems = boqLines.filter(line => line.costingEnabled && line.totalAmount);

  // ABC Classification
  const abcClassified = useMemo(() => {
    return classifyItemsABC(costedItems.map(line => ({
      id: line.id,
      description: line.description,
      totalAmount: line.totalAmount || 0,
      payItemNumber: line.dpwhItemNumberRaw,
      quantity: line.quantity,
      unit: line.unit
    })));
  }, [costedItems]);

  const abcStats = useMemo(() => getABCStatistics(abcClassified), [abcClassified]);

  // Time Phasing
  const timePhasing = useMemo(() => {
    const config = {
      startDate: new Date(startDate),
      contractDurationDays: contractDuration,
      workingDaysPerWeek: 6,
      rainyDaysPerMonth: 3
    };

    return viewMode === 'monthly'
      ? generateMonthlyTimePhasing(abcStats.totalCost, config)
      : generateQuarterlyTimePhasing(abcStats.totalCost, config);
  }, [startDate, contractDuration, viewMode, abcStats.totalCost]);

  const completionDate = useMemo(() => {
    return calculateCompletionDate({
      startDate: new Date(startDate),
      contractDurationDays: contractDuration,
      workingDaysPerWeek: 6
    });
  }, [startDate, contractDuration]);

  // Filter items by ABC class
  const filteredItems = selectedClass === 'all' 
    ? abcClassified 
    : abcClassified.filter(item => item.abcClass === selectedClass);

  if (costedItems.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 text-yellow-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Cost Data Available</h3>
        <p className="text-yellow-700">
          Please apply costs to BOQ items first to generate the Program of Works.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Program of Works</h2>
        <p className="text-gray-600">
          ABC Analysis and Time-Phased Schedule for Project Budget Allocation
        </p>
      </div>

      {/* Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">⚙️ Project Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contract Duration (Days)
            </label>
            <input
              type="number"
              value={contractDuration}
              onChange={(e) => setContractDuration(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="1"
              max="730"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Completion Date
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900 font-medium">
              {completionDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ABC Analysis Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">📊 ABC Analysis Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Class A */}
          <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-red-900">Class A</span>
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold border border-red-300">
                High Value
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-red-700">Items:</span>
                <span className="font-semibold text-red-900">{abcStats.classA.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-700">Amount:</span>
                <span className="font-semibold text-red-900">
                  ₱{abcStats.classA.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-700">% of Total:</span>
                <span className="font-bold text-red-900 text-lg">
                  {abcStats.classA.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="text-xs text-red-600 mt-3 italic">
              Requires close monitoring and control
            </p>
          </div>

          {/* Class B */}
          <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-yellow-900">Class B</span>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold border border-yellow-300">
                Medium Value
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-yellow-700">Items:</span>
                <span className="font-semibold text-yellow-900">{abcStats.classB.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-700">Amount:</span>
                <span className="font-semibold text-yellow-900">
                  ₱{abcStats.classB.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-700">% of Total:</span>
                <span className="font-bold text-yellow-900 text-lg">
                  {abcStats.classB.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="text-xs text-yellow-600 mt-3 italic">
              Regular monitoring required
            </p>
          </div>

          {/* Class C */}
          <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-green-900">Class C</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold border border-green-300">
                Low Value
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Items:</span>
                <span className="font-semibold text-green-900">{abcStats.classC.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Amount:</span>
                <span className="font-semibold text-green-900">
                  ₱{abcStats.classC.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">% of Total:</span>
                <span className="font-bold text-green-900 text-lg">
                  {abcStats.classC.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="text-xs text-green-600 mt-3 italic">
              Periodic review sufficient
            </p>
          </div>
        </div>
      </div>

      {/* Time-Phased Schedule */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">📅 Time-Phased Budget Allocation</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded-md font-medium ${
                viewMode === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode('quarterly')}
              className={`px-4 py-2 rounded-md font-medium ${
                viewMode === 'quarterly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Quarterly
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Working Days</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cumulative</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Progress %</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {timePhasing.map((phase, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{phase.period}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600">{phase.workingDays}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-blue-900">
                    ₱{phase.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-green-900">
                    ₱{phase.cumulativeAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                    {phase.cumulativePercentage.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${phase.cumulativePercentage}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100">
              <tr>
                <td className="px-4 py-3 text-sm font-bold text-gray-900" colSpan={2}>TOTAL</td>
                <td className="px-4 py-3 text-sm text-right font-bold text-blue-900">
                  ₱{abcStats.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-sm text-right font-bold text-green-900">
                  ₱{abcStats.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">100.0%</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ABC Classified Items List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">📝 ABC Classified Items</h3>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value as ABCClass | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Classes ({abcClassified.length})</option>
            <option value="A">Class A ({abcStats.classA.count})</option>
            <option value="B">Class B ({abcStats.classB.count})</option>
            <option value="C">Class C ({abcStats.classC.count})</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pay Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cumulative %</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Class</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{item.rank}</td>
                  <td className="px-4 py-3 text-sm font-mono text-blue-600">{item.payItemNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                    ₱{item.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                    {item.cumulativePercentage.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getABCBadgeColor(item.abcClass)}`}>
                      {item.abcClass}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
