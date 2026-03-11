'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface BOQLineInput {
  itemNo: string;
  description: string;
  unit: string;
  quantity: number;
  payItemNumber: string;
  part?: string;
  partDescription?: string;
  division?: string;
}

interface RateItem {
  _id: string;
  payItemNumber: string;
  payItemDescription: string;
  unitOfMeasurement: string;
}

export default function EditEstimatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  // Project info
  const [projectName, setProjectName] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [implementingOffice, setImplementingOffice] = useState('DPWH');

  // BOQ Lines
  const [boqLines, setBOQLines] = useState<BOQLineInput[]>([]);

  // Settings
  const [useEvaluated, setUseEvaluated] = useState(false);

  // Rate Items for dropdown
  const [rateItems, setRateItems] = useState<RateItem[]>([]);

  const fetchEstimate = useCallback(async () => {
    try {
      const response = await fetch(`/api/estimates/${id}`);
      const data = await response.json();

      if (data.success) {
        const estimate = data.data;
        setProjectName(estimate.projectName || '');
        setProjectLocation(estimate.projectLocation || '');
        setImplementingOffice(estimate.implementingOffice || 'DPWH');
        
        // Convert existing BOQ lines to editable format
        const lines: BOQLineInput[] = estimate.boqLines.map((line: any) => ({
          itemNo: line.itemNo || '',
          description: line.description || '',
          unit: line.unit || '',
          quantity: line.quantity || 0,
          payItemNumber: line.payItemNumber || '',
          part: line.part || '',
          partDescription: line.partDescription || '',
          division: line.division || ''
        }));

        setBOQLines(lines.length > 0 ? lines : [
          { itemNo: '', description: '', unit: '', quantity: 0, payItemNumber: '', part: '', partDescription: '', division: '' }
        ]);
      } else {
        setError(data.error || 'Failed to load estimate');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setFetching(false);
    }
  }, [id]);

  const fetchRateItems = useCallback(async () => {
    try {
      const response = await fetch('/api/rates');
      const data = await response.json();
      if (data.success) {
        setRateItems(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch rate items:', err);
    }
  }, []);

  useEffect(() => {
    fetchRateItems();
    if (id) {
      fetchEstimate();
    }
  }, [id, fetchEstimate, fetchRateItems]);

  const addBOQLine = () => {
    const lastLine = boqLines[boqLines.length - 1];
    setBOQLines([...boqLines, { 
      itemNo: '', 
      description: '', 
      unit: '', 
      quantity: 0, 
      payItemNumber: '',
      part: lastLine?.part || '',
      partDescription: lastLine?.partDescription || '',
      division: lastLine?.division || ''
    }]);
  };

  const removeBOQLine = (index: number) => {
    if (boqLines.length > 1) {
      setBOQLines(boqLines.filter((_, i) => i !== index));
    }
  };

  const updateBOQLine = (index: number, field: keyof BOQLineInput, value: any) => {
    const updated = [...boqLines];
    updated[index] = { ...updated[index], [field]: value };
    setBOQLines(updated);
  };

  const handleRateItemSelect = (index: number, payItemNumber: string) => {
    const selectedRate = rateItems.find(r => r.payItemNumber === payItemNumber);
    if (selectedRate) {
      const updated = [...boqLines];
      updated[index] = {
        ...updated[index],
        itemNo: selectedRate.payItemNumber,
        payItemNumber: selectedRate.payItemNumber,
        description: selectedRate.payItemDescription,
        unit: selectedRate.unitOfMeasurement
      };
      setBOQLines(updated);
    } else {
      const updated = [...boqLines];
      updated[index] = {
        ...updated[index],
        itemNo: payItemNumber,
        payItemNumber: payItemNumber
      };
      setBOQLines(updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Filter out empty lines
      const validLines = boqLines.filter(line => 
        ((line.itemNo && line.itemNo.trim() !== '') || (line.payItemNumber && line.payItemNumber.trim() !== '')) &&
        line.description && line.description.trim() !== '' &&
        line.unit && line.unit.trim() !== '' &&
        line.quantity !== undefined && line.quantity !== null && !isNaN(line.quantity) && line.quantity > 0
      ).map(line => ({
        ...line,
        itemNo: line.itemNo || line.payItemNumber
      }));

      if (validLines.length === 0) {
        throw new Error('Please add at least one complete BOQ item with Item No, Description, Unit, and Quantity.');
      }

      const requestBody = {
        projectName: projectName || 'Untitled Project',
        projectLocation: projectLocation || 'N/A',
        implementingOffice: implementingOffice || 'DPWH',
        boqLines: validLines,
        useEvaluated
      };

      const response = await fetch(`/api/estimates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/estimate/${id}`);
      } else {
        setError(result.error || 'Failed to update estimate');
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'An error occurred while updating the estimate');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading estimate...</p>
        </div>
      </div>
    );
  }

  if (error && !projectName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Estimate</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/estimate"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Back to Estimates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link href="/estimate" className="hover:text-blue-600">Estimates</Link>
            <span>/</span>
            <Link href={`/estimate/${id}`} className="hover:text-blue-600">{projectName || 'Estimate'}</Link>
            <span>/</span>
            <span className="text-gray-900">Edit</span>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Estimate</h1>
              <p className="text-gray-600">Update project information and BOQ lines</p>
            </div>
            <Link
              href={`/estimate/${id}`}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Project Information */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Project Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectLocation}
                  onChange={(e) => setProjectLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Implementing Office
                </label>
                <input
                  type="text"
                  value={implementingOffice}
                  onChange={(e) => setImplementingOffice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Use Evaluated Prices
                </label>
                <div className="flex items-center h-10">
                  <input
                    type="checkbox"
                    checked={useEvaluated}
                    onChange={(e) => setUseEvaluated(e.target.checked)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Use &quot;As Evaluated&quot; pricing instead of &quot;As Submitted&quot;
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BOQ Lines */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Bill of Quantities</h2>
              <button
                type="button"
                onClick={addBOQLine}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Line
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 w-8">#</th>
                    <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700">Item No</th>
                    <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700">Description</th>
                    <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700">Pay Item</th>
                    <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700">Unit</th>
                    <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700">Quantity</th>
                    <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {boqLines.map((line, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-2 py-2 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={line.itemNo}
                          onChange={(e) => updateBOQLine(index, 'itemNo', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="1.01"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => updateBOQLine(index, 'description', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="Work description"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={line.payItemNumber}
                          onChange={(e) => handleRateItemSelect(index, e.target.value)}
                          list={`rate-items-${index}`}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="Pay item #"
                        />
                        <datalist id={`rate-items-${index}`}>
                          {rateItems.map((item) => (
                            <option key={item._id} value={item.payItemNumber}>
                              {item.payItemDescription}
                            </option>
                          ))}
                        </datalist>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={line.unit}
                          onChange={(e) => updateBOQLine(index, 'unit', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="cu.m"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => updateBOQLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeBOQLine(index)}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={boqLines.length === 1}
                          title="Remove line"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p>Total Lines: {boqLines.length}</p>
              <p className="mt-1">
                Valid Lines: {boqLines.filter(line => 
                  line.itemNo && line.description && line.unit && line.quantity > 0
                ).length}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Link
              href={`/estimate/${id}`}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Updating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
