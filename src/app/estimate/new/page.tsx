'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

interface DUPATemplate {
  _id: string;
  payItemNumber: string;
  payItemDescription: string;
  unitOfMeasurement: string;
  category?: string;
  status: 'Active' | 'Inactive';
}

export default function NewEstimatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputMode, setInputMode] = useState<'manual' | 'json' | 'template'>('manual');

  // Project info
  const [contractId, setContractId] = useState('');
  const [contractName, setContractName] = useState('');
  const [contractLocation, setContractLocation] = useState('');
  const [partNo, setPartNo] = useState('');
  const [partDescription, setPartDescription] = useState('');

  // Manual BOQ Lines
  const [boqLines, setBOQLines] = useState<BOQLineInput[]>([
    { itemNo: '', description: '', unit: '', quantity: 0, payItemNumber: '', part: '', partDescription: '', division: '' }
  ]);

  // JSON Input
  const [boqJson, setBoqJson] = useState('');
  const [useEvaluated, setUseEvaluated] = useState(false);

  // Rate Items for dropdown
  const [rateItems, setRateItems] = useState<RateItem[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);

  // DUPA Templates
  const [dupaTemplates, setDupaTemplates] = useState<DUPATemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [instantiating, setInstantiating] = useState(false);

  useEffect(() => {
    fetchRateItems();
    fetchDUPATemplates();
  }, []);

  const fetchRateItems = async () => {
    try {
      const response = await fetch('/api/rates');
      const data = await response.json();
      if (data.success) {
        setRateItems(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch rate items:', err);
    } finally {
      setLoadingRates(false);
    }
  };

  const fetchDUPATemplates = async () => {
    try {
      const response = await fetch('/api/dupa-templates?status=Active');
      const data = await response.json();
      if (data.success) {
        setDupaTemplates(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch DUPA templates:', err);
    }
  };

  const handleInstantiateTemplate = async () => {
    if (!selectedTemplateId) {
      setError('Please select a DUPA template');
      return;
    }

    if (!contractLocation.trim()) {
      setError('Please enter a location first (required for rate lookup)');
      return;
    }

    setInstantiating(true);
    setError('');

    try {
      const response = await fetch(`/api/dupa-templates/${selectedTemplateId}/instantiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: contractLocation })
      });

      const data = await response.json();

      if (data.success) {
        const rateItem = data.data;
        // Add instantiated rate item to BOQ
        const newLine: BOQLineInput = {
          itemNo: rateItem.payItemNumber,
          description: rateItem.payItemDescription,
          unit: rateItem.unitOfMeasurement,
          quantity: 1.0,
          payItemNumber: rateItem.payItemNumber,
          part: '',
          partDescription: '',
          division: ''
        };

        // If we have empty lines, replace the first one, otherwise add new
        if (boqLines.length === 1 && !boqLines[0].payItemNumber) {
          setBOQLines([newLine]);
        } else {
          setBOQLines([...boqLines, newLine]);
        }

        setSelectedTemplateId('');
        setError('');
      } else {
        setError(data.error || 'Failed to instantiate template');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to instantiate template');
    } finally {
      setInstantiating(false);
    }
  };

  // Sample BOQ data for reference
  const sampleBOQ = `{
  "projectName": "Construction/Completion of Multi-Purpose Building, Purok 1, Barangay Violeta, City of Malaybalay, Bukidnon",
  "projectLocation": "Brgy. Violeta, Malaybalay City, Bukidnon",
  "implementingOffice": "DPWH Bukidnon 1st District Engineering Office",
  "boqLines": [
    {
      "itemNo": "1.01",
      "description": "Removal of Structures and Obstruction",
      "unit": "l.s.",
      "quantity": 1.0,
      "payItemNumber": "801 (1)"
    },
    {
      "itemNo": "1.02",
      "description": "General Excavation",
      "unit": "cu.m",
      "quantity": 150.5,
      "payItemNumber": "802 (1)"
    }
  ]
}`;

  const addBOQLine = () => {
    // Get part/division from last line for convenience
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
      let requestBody;

      if (inputMode === 'manual') {
        // Filter out empty lines - must have itemNo/payItemNumber, description, unit, and quantity
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

        // Use manual entry
        requestBody = {
          projectName: contractName || 'Untitled Project',
          projectLocation: contractLocation || 'N/A',
          implementingOffice: 'DPWH',
          contractId,
          partNo,
          partDescription,
          boqLines: validLines,
          useEvaluated
        };
      } else {
        // Parse JSON
        let data;
        try {
          data = JSON.parse(boqJson);
        } catch (parseError) {
          throw new Error('Invalid JSON format. Please check your input.');
        }

        requestBody = {
          projectName: data.projectName,
          projectLocation: data.projectLocation,
          implementingOffice: data.implementingOffice,
          boqLines: data.boqLines,
          useEvaluated
        };
      }

      const response = await fetch('/api/estimates/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/estimate/${result.data._id}`);
      } else {
        setError(result.error || 'Failed to create estimate');
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'An error occurred while creating the estimate');
    } finally {
      setLoading(false);
    }
  };

  const loadSample = () => {
    setBoqJson(sampleBOQ);
  };

  return (
    <div className="py-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create New Estimate</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4">
          {error}
        </div>
      )}

      {/* Input Mode Toggle */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setInputMode('manual')}
            className={inputMode === 'manual' ? 'primary' : 'secondary'}
          >
            📋 Manual Entry (BOQ Form)
          </button>
          <button
            type="button"
            onClick={() => setInputMode('template')}
            className={inputMode === 'template' ? 'primary' : 'secondary'}
          >
            🎯 Use DUPA Template
          </button>
          <button
            type="button"
            onClick={() => setInputMode('json')}
            className={inputMode === 'json' ? 'primary' : 'secondary'}
          >
            📄 JSON Import
          </button>
        </div>
      </div>

      {/* DUPA Template Selector */}
      {inputMode === 'template' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">📦 Instantiate from DUPA Template</h2>
          <p className="text-sm text-gray-600 mb-4">
            Select a DUPA template to automatically populate BOQ items with location-specific rates.
            Make sure to enter the project location first.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Project Location *</label>
              <input
                type="text"
                value={contractLocation}
                onChange={(e) => setContractLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="e.g., Malaybalay City, Bukidnon"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Location is required to fetch appropriate material prices and labor rates
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2">Select DUPA Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="">-- Select a template --</option>
                {dupaTemplates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.payItemNumber} - {template.payItemDescription}
                    {template.category && ` (${template.category})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstantiateTemplate}
            disabled={!selectedTemplateId || instantiating || !contractLocation}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {instantiating ? '⏳ Instantiating...' : '✨ Instantiate Template'}
          </button>

          {dupaTemplates.length === 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              ⚠️ No active DUPA templates found. Create templates first in the DUPA Templates section.
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {inputMode === 'manual' ? (
          <>
            {/* DPWH BOQ Header */}
            <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-blue-900">
              <div className="text-center mb-6">
                <div className="text-sm text-gray-600">Republic of the Philippines</div>
                <div className="font-bold text-lg">Department of Public Works and Highways</div>
              </div>
              
              <div className="grid grid-cols-1 gap-3 text-sm mb-4">
                <div className="grid grid-cols-4 gap-2">
                  <label className="font-semibold">Contract ID:</label>
                  <input 
                    type="text" 
                    className="col-span-3 border-b border-gray-400 bg-transparent px-2" 
                    placeholder="e.g., 26KA"
                    value={contractId}
                    onChange={(e) => setContractId(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <label className="font-semibold">Contract Name:</label>
                  <input 
                    type="text" 
                    className="col-span-3 border-b border-gray-400 bg-transparent px-2" 
                    placeholder="Construction (Completion) of Multi-Purpose Building..."
                    value={contractName}
                    onChange={(e) => setContractName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <label className="font-semibold">Contract Location:</label>
                  <input 
                    type="text" 
                    className="col-span-3 border-b border-gray-400 bg-transparent px-2" 
                    placeholder="Brgy. Violeta, Malaybalay City, Bukidnon"
                    value={contractLocation}
                    onChange={(e) => setContractLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="text-center mt-6 mb-4">
                <div className="font-bold text-xl">BILL OF QUANTITIES</div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t-2 border-gray-300 pt-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Part No:</label>
                  <input
                    type="text"
                    value={partNo}
                    onChange={(e) => setPartNo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="e.g., PART B, ITEM 1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Part Description:</label>
                  <input
                    type="text"
                    value={partDescription}
                    onChange={(e) => setPartDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="e.g., EARTHWORK, BUILDINGS"
                  />
                </div>
              </div>
            </div>

            {/* BOQ Table */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Bill of Quantities Items</h2>
                <button type="button" onClick={addBOQLine} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm">
                  + Add Line
                </button>
              </div>

              <div className="text-xs text-gray-500 mb-3 italic">
                Columns (1), (2), (3), and (4) are to be filled up by the Procuring Entity.
                Columns (5) and (6) are to be filled up by the Bidder
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-gray-400 px-2 py-2 text-xs w-24">Part</th>
                      <th className="border border-gray-400 px-2 py-2 text-xs w-32">Part Description</th>
                      <th className="border border-gray-400 px-2 py-2 text-xs w-20">Division</th>
                      <th className="border border-gray-400 px-2 py-2 text-xs w-16">Pay Item No.<br/>(1)</th>
                      <th className="border border-gray-400 px-2 py-2 text-xs w-1/4">Description<br/>(2)</th>
                      <th className="border border-gray-400 px-2 py-2 text-xs w-16">Unit<br/>(3)</th>
                      <th className="border border-gray-400 px-2 py-2 text-xs w-20">Quantity<br/>(4)</th>
                      <th className="border border-gray-400 px-2 py-2 text-xs w-24">Unit Price<br/>(Pesos)<br/>(5)</th>
                      <th className="border border-gray-400 px-2 py-2 text-xs w-24">Amount<br/>(Pesos)<br/>(6)</th>
                      <th className="border border-gray-400 px-2 py-2 text-xs w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {boqLines.map((line, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-1">
                          <input
                            type="text"
                            value={line.part || ''}
                            onChange={(e) => updateBOQLine(index, 'part', e.target.value)}
                            className="w-full px-1 py-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="PART B"
                          />
                        </td>
                        <td className="border border-gray-300 p-1">
                          <input
                            type="text"
                            value={line.partDescription || ''}
                            onChange={(e) => updateBOQLine(index, 'partDescription', e.target.value)}
                            className="w-full px-1 py-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="EARTHWORK"
                          />
                        </td>
                        <td className="border border-gray-300 p-1">
                          <input
                            type="text"
                            value={line.division || ''}
                            onChange={(e) => updateBOQLine(index, 'division', e.target.value)}
                            className="w-full px-1 py-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="DIV I"
                          />
                        </td>
                        <td className="border border-gray-300 p-1 bg-yellow-50">
                          <select
                            value={line.payItemNumber}
                            onChange={(e) => handleRateItemSelect(index, e.target.value)}
                            className="w-full px-1 py-1 text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            title="Select Rate Item to auto-fill description and unit"
                          >
                            <option value="">-- Select --</option>
                            {rateItems.map((rate) => (
                              <option key={rate._id} value={rate.payItemNumber}>
                                {rate.payItemNumber}
                              </option>
                            ))}
                          </select>
                          {loadingRates && (
                            <div className="text-xs text-gray-500 text-center">Loading...</div>
                          )}
                        </td>
                        <td className="border border-gray-300 p-1">
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => updateBOQLine(index, 'description', e.target.value)}
                            className="w-full px-1 py-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Description"
                          />
                        </td>
                        <td className="border border-gray-300 p-1">
                          <input
                            type="text"
                            value={line.unit}
                            onChange={(e) => updateBOQLine(index, 'unit', e.target.value)}
                            className="w-full px-1 py-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="l.s."
                          />
                        </td>
                        <td className="border border-gray-300 p-1">
                          <input
                            type="number"
                            step="0.01"
                            value={line.quantity || ''}
                            onChange={(e) => updateBOQLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-1 py-1 text-xs text-right border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="border border-gray-300 p-1 bg-gray-50 text-center text-xs text-gray-500">
                          From Rate
                        </td>
                        <td className="border border-gray-300 p-1 bg-gray-50 text-center text-xs text-gray-500">
                          Auto-calc
                        </td>
                        <td className="border border-gray-300 p-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeBOQLine(index)}
                            className="text-red-600 hover:text-red-800 text-xs px-1"
                            disabled={boqLines.length === 1}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded">
                <strong>💡 Tips:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Select a rate item from the dropdown in the "Pay Item No." column to auto-fill Description and Unit</li>
                  <li>All fields (Part, Pay Item No., Description, Unit, Quantity) must be filled for each row</li>
                  <li>Part and Division fields help organize items in reports (e.g., "PART B", "DIVISION I")</li>
                  <li>Empty or incomplete rows will be automatically removed when you submit</li>
                </ul>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* JSON Import Mode */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <h4 className="font-semibold mb-2">📝 JSON Import Instructions:</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                <li>Paste your BOQ data in JSON format in the text area below</li>
                <li>Each BOQ line can include a <code>payItemNumber</code> to link to a rate item</li>
                <li>Lines without a linked rate item will be included but not priced</li>
                <li>Click "Load Sample" to see the expected JSON format</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">BOQ Data (JSON Format)</h2>
                <button
                  type="button"
                  onClick={loadSample}
                  className="secondary text-sm"
                >
                  Load Sample
                </button>
              </div>
              <textarea
                value={boqJson}
                onChange={(e) => setBoqJson(e.target.value)}
                rows={20}
                className="font-mono text-sm w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Paste your BOQ JSON data here..."
                required={inputMode === 'json'}
              />
            </div>

            {/* JSON Schema Reference */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold mb-3">JSON Schema Reference</h3>
              <pre className="text-xs bg-white p-4 rounded border overflow-x-auto">
{`{
  "projectName": "string",
  "projectLocation": "string",
  "implementingOffice": "string",
  "boqLines": [
    {
      "itemNo": "string (e.g., '1.01')",
      "description": "string",
      "unit": "string (e.g., 'l.s.', 'cu.m')",
      "quantity": number,
      "payItemNumber": "string (optional - links to rate item)"
    }
  ]
}`}
              </pre>
            </div>
          </>
        )}

        {/* Options */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Pricing Options</h2>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="useEvaluated"
              checked={useEvaluated}
              onChange={(e) => setUseEvaluated(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="useEvaluated" className="text-sm">
              Use Evaluated costs instead of Submitted costs
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            By default, the system uses "As Submitted" costs. Check this box to use "As Evaluated" costs instead.
          </p>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="primary"
          >
            {loading ? 'Processing...' : 'Create Estimate'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
