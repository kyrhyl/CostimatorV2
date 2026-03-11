'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface LaborItem {
  designation: string;
  noOfPersons: number;
  noOfHours: number;
  hourlyRate: number;
  amount: number;
}

interface EquipmentItem {
  description: string;
  noOfUnits: number;
  noOfHours: number;
  hourlyRate: number;
  amount: number;
}

interface MaterialItem {
  materialCode: string;
  description: string;
  unit: string;
  quantity: number;
  basePrice: number;
  haulingCost: number;
  unitCost: number;
  amount: number;
}

interface EstimateLine {
  payItemNumber: string;
  payItemDescription: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  directCost: number;
  ocmCost: number;
  cpCost: number;
  vatCost: number;
  laborCost: number;
  equipmentCost: number;
  materialCost: number;
  minorToolsCost: number;
  laborItems: LaborItem[];
  equipmentItems: EquipmentItem[];
  materialItems: MaterialItem[];
}

interface CostEstimate {
  _id: string;
  name: string;
  location: string;
  district: string;
  ocmPercentage: number;
  cpPercentage: number;
  vatPercentage: number;
  estimateLines: EstimateLine[];
  costSummary: {
    totalDirectCost: number;
    totalOCM: number;
    totalCP: number;
    subtotalWithMarkup: number;
    totalVAT: number;
    grandTotal: number;
    rateItemsCount: number;
  };
  project: {
    name: string;
    _id: string;
  };
  createdAt: string;
}

export default function CostEstimatePage() {
  const params = useParams();
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'dupa'>('summary');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);

  const loadEstimate = useCallback(async () => {
    try {
      if (typeof params.id !== 'string' || params.id.length === 0) {
        console.error('[Page] Invalid estimate ID param:', params.id);
        setLoading(false);
        return;
      }

      console.log('[Page] Loading estimate ID:', params.id);
      const res = await fetch(`/api/cost-estimates/${params.id}`);
      console.log('[Page] Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Page] Error response:', errorText);
        throw new Error(`Failed to load estimate: ${res.status} ${errorText}`);
      }
      
      const data = await res.json();
      console.log('[Page] Response data:', data);
      setEstimate(data.data);  // API returns { success, data }
    } catch (err) {
      console.error('Failed to load estimate:', err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadEstimate();
  }, [loadEstimate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div>Loading estimate...</div>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div>Estimate not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-6">
        <div className="flex justify-between items-start">
          <div>
            {estimate.project && (
              <Link
                href={`/projects/${estimate.project._id}`}
                className="text-sm text-blue-600 hover:underline mb-2 block"
              >
                ← Back to {estimate.project.name}
              </Link>
            )}
            <h1 className="text-3xl font-bold">{estimate.name}</h1>
            <p className="text-gray-600 mt-1">
              {estimate.location} - {estimate.district}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Grand Total</div>
            <div className="text-4xl font-bold text-blue-600">
              ₱{estimate.costSummary.grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-4 mt-6">
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-xs text-gray-500">Direct Cost</div>
            <div className="text-lg font-semibold">
              ₱{estimate.costSummary.totalDirectCost.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-xs text-gray-500">OCM ({estimate.ocmPercentage}%)</div>
            <div className="text-lg font-semibold">
              ₱{estimate.costSummary.totalOCM.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-xs text-gray-500">CP ({estimate.cpPercentage}%)</div>
            <div className="text-lg font-semibold">
              ₱{estimate.costSummary.totalCP.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-xs text-gray-500">Subtotal</div>
            <div className="text-lg font-semibold">
              ₱{estimate.costSummary.subtotalWithMarkup.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-xs text-gray-500">VAT ({estimate.vatPercentage}%)</div>
            <div className="text-lg font-semibold">
              ₱{estimate.costSummary.totalVAT.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mt-6 border-b">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'summary'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('dupa')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'dupa'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            DUPA Details
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-8">
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Item No.</th>
                    <th className="px-4 py-3 text-left font-semibold">Description</th>
                    <th className="px-4 py-3 text-center font-semibold">Unit</th>
                    <th className="px-4 py-3 text-right font-semibold">Quantity</th>
                    <th className="px-4 py-3 text-right font-semibold">Unit Price</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.estimateLines.map((line, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{line.payItemNumber}</td>
                      <td className="px-4 py-3">{line.payItemDescription}</td>
                      <td className="px-4 py-3 text-center">{line.unit}</td>
                      <td className="px-4 py-3 text-right">{(line.quantity ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        ₱{(line.unitPrice ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold font-mono">
                        ₱{(line.totalAmount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-bold">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right">GRAND TOTAL</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right font-mono text-lg text-blue-600">
                      ₱{estimate.costSummary.grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* DUPA Details Tab */}
        {activeTab === 'dupa' && (
          <div className="space-y-6">
            {/* Item Selector */}
            <div className="bg-white rounded-lg shadow p-6">
              <label className="block text-sm font-semibold mb-2">Select Item to View DUPA:</label>
              <select
                value={selectedItemIndex}
                onChange={(e) => setSelectedItemIndex(parseInt(e.target.value))}
                className="w-full p-3 border rounded-lg text-sm"
              >
                {estimate.estimateLines.map((line, idx) => (
                  <option key={idx} value={idx}>
                    {line.payItemNumber} - {line.payItemDescription}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Item Details */}
            {estimate.estimateLines[selectedItemIndex] && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="border-b pb-4 mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold">{estimate.estimateLines[selectedItemIndex].payItemNumber}</h2>
                      <p className="text-gray-600 mt-1">{estimate.estimateLines[selectedItemIndex].payItemDescription}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Unit Price</div>
                      <div className="text-3xl font-bold text-blue-600">
                        ₱{(estimate.estimateLines[selectedItemIndex].unitPrice ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        per {estimate.estimateLines[selectedItemIndex].unit}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost Breakdown Summary */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Cost Breakdown</h3>
                  <div className="grid grid-cols-6 gap-4">
                    <div className="bg-blue-50 p-4 rounded border border-blue-200">
                      <div className="text-xs text-gray-600">Labor</div>
                      <div className="text-xl font-semibold">
                        ₱{(estimate.estimateLines[selectedItemIndex].laborCost ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded border border-green-200">
                      <div className="text-xs text-gray-600">Equipment</div>
                      <div className="text-xl font-semibold">
                        ₱{(estimate.estimateLines[selectedItemIndex].equipmentCost ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded border border-purple-200">
                      <div className="text-xs text-gray-600">Materials</div>
                      <div className="text-xl font-semibold">
                        ₱{(estimate.estimateLines[selectedItemIndex].materialCost ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                      <div className="text-xs text-gray-600">Minor Tools</div>
                      <div className="text-xl font-semibold">
                        ₱{(estimate.estimateLines[selectedItemIndex].minorToolsCost ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-gray-100 p-4 rounded border border-gray-300">
                      <div className="text-xs text-gray-600">Direct Cost</div>
                      <div className="text-xl font-semibold">
                        ₱{(estimate.estimateLines[selectedItemIndex].directCost ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-blue-100 p-4 rounded border border-blue-300">
                      <div className="text-xs text-blue-700 font-semibold">Unit Price</div>
                      <div className="text-xl font-bold text-blue-700">
                        ₱{(estimate.estimateLines[selectedItemIndex].unitPrice ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Labor Details */}
                {estimate.estimateLines[selectedItemIndex].laborItems && 
                 estimate.estimateLines[selectedItemIndex].laborItems.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Labor Breakdown</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border rounded-lg">
                        <thead className="bg-blue-100 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left">Designation</th>
                            <th className="px-4 py-3 text-center">Persons</th>
                            <th className="px-4 py-3 text-center">Hours</th>
                            <th className="px-4 py-3 text-right">Hourly Rate</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {estimate.estimateLines[selectedItemIndex].laborItems.map((labor, i) => (
                            <tr key={i} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3">{labor.designation}</td>
                              <td className="px-4 py-3 text-center">{labor.noOfPersons}</td>
                              <td className="px-4 py-3 text-center">{labor.noOfHours}</td>
                              <td className="px-4 py-3 text-right">
                                ₱{labor.hourlyRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                ₱{labor.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-blue-50 font-semibold">
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-right">Total Labor Cost</td>
                            <td className="px-4 py-3 text-right">
                              ₱{(estimate.estimateLines[selectedItemIndex].laborCost ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Equipment Details */}
                {estimate.estimateLines[selectedItemIndex].equipmentItems && 
                 estimate.estimateLines[selectedItemIndex].equipmentItems.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Equipment Breakdown</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border rounded-lg">
                        <thead className="bg-green-100 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left">Description</th>
                            <th className="px-4 py-3 text-center">Units</th>
                            <th className="px-4 py-3 text-center">Hours</th>
                            <th className="px-4 py-3 text-right">Hourly Rate</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {estimate.estimateLines[selectedItemIndex].equipmentItems.map((equip, i) => (
                            <tr key={i} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3">{equip.description}</td>
                              <td className="px-4 py-3 text-center">{equip.noOfUnits}</td>
                              <td className="px-4 py-3 text-center">{equip.noOfHours}</td>
                              <td className="px-4 py-3 text-right">
                                ₱{equip.hourlyRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                ₱{equip.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-green-50 font-semibold">
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-right">Total Equipment Cost</td>
                            <td className="px-4 py-3 text-right">
                              ₱{(estimate.estimateLines[selectedItemIndex].equipmentCost ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Material Details */}
                {estimate.estimateLines[selectedItemIndex].materialItems && 
                 estimate.estimateLines[selectedItemIndex].materialItems.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Materials Breakdown</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border rounded-lg">
                        <thead className="bg-purple-100 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left">Code</th>
                            <th className="px-4 py-3 text-left">Description</th>
                            <th className="px-4 py-3 text-center">Unit</th>
                            <th className="px-4 py-3 text-right">Quantity</th>
                            <th className="px-4 py-3 text-right">Base Price</th>
                            <th className="px-4 py-3 text-right">Hauling</th>
                            <th className="px-4 py-3 text-right">Unit Cost</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {estimate.estimateLines[selectedItemIndex].materialItems.map((mat, i) => (
                            <tr key={i} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono">{mat.materialCode || '-'}</td>
                              <td className="px-4 py-3">{mat.description}</td>
                              <td className="px-4 py-3 text-center">{mat.unit}</td>
                              <td className="px-4 py-3 text-right">
                                {mat.quantity.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-right">
                                ₱{mat.basePrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-right">
                                ₱{mat.haulingCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-right">
                                ₱{mat.unitCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                ₱{mat.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-purple-50 font-semibold">
                          <tr>
                            <td colSpan={7} className="px-4 py-3 text-right">Total Material Cost</td>
                            <td className="px-4 py-3 text-right">
                              ₱{(estimate.estimateLines[selectedItemIndex].materialCost ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
