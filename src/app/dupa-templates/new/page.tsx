'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Combobox from '@/components/Combobox';

interface LaborEntry {
  designation: string;
  noOfPersons: number;
  noOfHours: number;
}

interface EquipmentEntry {
  equipmentId: string;
  description: string;
  noOfUnits: number;
  noOfHours: number;
}

interface MaterialEntry {
  materialCode: string;
  description: string;
  unit: string;
  quantity: number;
}

export default function NewDUPATemplatePage() {
  const router = useRouter();

  // Basic info
  const [payItemNumber, setPayItemNumber] = useState('');
  const [payItemDescription, setPayItemDescription] = useState('');
  const [unitOfMeasurement, setUnitOfMeasurement] = useState('');
  const [selectedPayItemId, setSelectedPayItemId] = useState<string>('');
  const [outputPerHour, setOutputPerHour] = useState(1);
  const [category, setCategory] = useState('');
  const [specification, setSpecification] = useState('');
  const [notes, setNotes] = useState('');

  // Templates
  const [laborTemplate, setLaborTemplate] = useState<LaborEntry[]>([
    { designation: '', noOfPersons: 1, noOfHours: 8 },
  ]);
  const [equipmentTemplate, setEquipmentTemplate] = useState<EquipmentEntry[]>([]);
  const [materialTemplate, setMaterialTemplate] = useState<MaterialEntry[]>([]);

  // Master data for dropdowns
  const [equipmentOptions, setEquipmentOptions] = useState<Array<{ _id: string; description: string }>>([]);
  const [materialOptions, setMaterialOptions] = useState<Array<{ materialCode: string; description: string; unit: string }>>([]);
  const [payItemOptions, setPayItemOptions] = useState<Array<{ _id: string; payItemNumber: string; description: string; unit: string; part: string }>>([]);
  const [availableParts, setAvailableParts] = useState<string[]>([]);
  const [selectedPart, setSelectedPart] = useState<string>('');
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [baseEquipmentOptions, setBaseEquipmentOptions] = useState<Array<{ _id: string; description: string }>>([]);
  const [baseMaterialOptions, setBaseMaterialOptions] = useState<Array<{ materialCode: string; description: string; unit: string }>>([]);
  const [equipmentSearchLoading, setEquipmentSearchLoading] = useState(false);
  const [materialSearchLoading, setMaterialSearchLoading] = useState(false);

  const equipmentDropdownOptions = equipmentOptions.map((opt) => ({
    value: opt._id,
    label: opt.description,
  }));
  const materialDropdownOptions = materialOptions.map((opt) => ({
    value: opt.materialCode,
    label: opt.description,
  }));
  const equipmentPlaceholder = loadingOptions ? 'Loading equipment...' : 'Search equipment';
  const materialPlaceholder = loadingOptions ? 'Loading materials...' : 'Search material';

  // Filtered pay items based on selected part
  const filteredPayItems = selectedPart 
    ? payItemOptions.filter(p => p.part === selectedPart)
    : payItemOptions;

  // Minor Tools configuration
  const [includeMinorTools, setIncludeMinorTools] = useState(false);
  const [minorToolsPercentage, setMinorToolsPercentage] = useState(10);

  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [eqRes, matRes, payRes] = await Promise.all([
          fetch('/api/master/equipment'),
          fetch('/api/master/materials'),
          fetch('/api/master/pay-items?limit=2000')
        ]);
        const [eqJson, matJson, payJson] = await Promise.all([eqRes.json(), matRes.json(), payRes.json()]);
        if (eqJson.success) {
          const options = eqJson.data.map((e: any) => ({ _id: e._id, description: e.description }));
          setEquipmentOptions(options);
          setBaseEquipmentOptions(options);
        }
        if (matJson.success) {
          const options = matJson.data.map((m: any) => ({ 
            materialCode: m.materialCode, 
            description: m.materialDescription, 
            unit: m.unit 
          }));
          setMaterialOptions(options);
          setBaseMaterialOptions(options);
        }
        if (payJson.success) {
          const payItems = payJson.data.map((p: any) => ({ 
            _id: p._id, 
            payItemNumber: p.payItemNumber, 
            description: p.description, 
            unit: p.unit,
            part: p.part 
          }));
          setPayItemOptions(payItems);
          
          // Extract unique parts
          const partsSet = new Set(payItems.map((p: { part: string }) => p.part));
          const uniqueParts = Array.from(partsSet).sort() as string[];
          console.log('Available parts:', uniqueParts);
          console.log('Pay items sample:', payItems.slice(0, 3));
          setAvailableParts(uniqueParts);
        }
      } catch (e) {
        console.error('Failed to load master data', e);
      } finally {
        setLoadingOptions(false);
      }
    };
    loadMasterData();
  }, []);

  // Labor handlers
  const addLaborEntry = () => {
    setLaborTemplate([...laborTemplate, { designation: '', noOfPersons: 1, noOfHours: 8 }]);
  };

  const removeLaborEntry = (index: number) => {
    setLaborTemplate(laborTemplate.filter((_, i) => i !== index));
  };

  const updateLaborEntry = (index: number, field: keyof LaborEntry, value: string | number) => {
    const updated = [...laborTemplate];
    updated[index] = { ...updated[index], [field]: value };
    setLaborTemplate(updated);
  };

  // Equipment handlers
  const addEquipmentEntry = () => {
    setEquipmentTemplate([
      ...equipmentTemplate,
      { equipmentId: '', description: '', noOfUnits: 1, noOfHours: 8 },
    ]);
  };

  const removeEquipmentEntry = (index: number) => {
    setEquipmentTemplate(equipmentTemplate.filter((_, i) => i !== index));
  };

  const updateEquipmentEntry = (
    index: number,
    field: keyof EquipmentEntry,
    value: string | number
  ) => {
    const updated = [...equipmentTemplate];
    updated[index] = { ...updated[index], [field]: value };
    setEquipmentTemplate(updated);
  };

  // Material handlers
  const addMaterialEntry = () => {
    const firstMaterial = materialOptions.length > 0 ? materialOptions[0] : null;
    setMaterialTemplate([
      ...materialTemplate,
      { 
        materialCode: firstMaterial?.materialCode || '', 
        description: firstMaterial?.description || 'N/A', 
        unit: firstMaterial?.unit || '', 
        quantity: 1 
      },
    ]);
  };

  const removeMaterialEntry = (index: number) => {
    setMaterialTemplate(materialTemplate.filter((_, i) => i !== index));
  };

  const updateMaterialEntry = (
    index: number,
    field: keyof MaterialEntry,
    value: string | number
  ) => {
    const updated = [...materialTemplate];
    updated[index] = { ...updated[index], [field]: value };
    setMaterialTemplate(updated);
  };

  // Pay item selection handler
  const handlePayItemSelect = (selectedPayItemId: string) => {
    setSelectedPayItemId(selectedPayItemId);
    if (!selectedPayItemId) {
      // Clear fields if no pay item selected
      setPayItemNumber('');
      setPayItemDescription('');
      setUnitOfMeasurement('');
      return;
    }

    const selectedPayItem = payItemOptions.find(p => p._id === selectedPayItemId);
    if (selectedPayItem) {
      setPayItemNumber(selectedPayItem.payItemNumber);
      setPayItemDescription(selectedPayItem.description);
      setUnitOfMeasurement(selectedPayItem.unit);
    }
  };

  // Part selection handler
  const handlePartSelect = (part: string) => {
    setSelectedPart(part);
    // Reset pay item selection when part changes
    setSelectedPayItemId('');
    setPayItemNumber('');
    setPayItemDescription('');
    setUnitOfMeasurement('');
  };

  const handleEquipmentSearch = async (query: string) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setEquipmentOptions(baseEquipmentOptions);
      setEquipmentSearchLoading(false);
      return;
    }

    setEquipmentSearchLoading(true);
    try {
      const response = await fetch(`/api/master/equipment?search=${encodeURIComponent(trimmedQuery)}`);
      const data = await response.json();
      if (data.success) {
        setEquipmentOptions(data.data.map((e: any) => ({ _id: e._id, description: e.description })));
      }
    } catch (error) {
      console.error('Failed to search equipment', error);
    } finally {
      setEquipmentSearchLoading(false);
    }
  };

  const handleMaterialSearch = async (query: string) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setMaterialOptions(baseMaterialOptions);
      setMaterialSearchLoading(false);
      return;
    }

    setMaterialSearchLoading(true);
    try {
      const response = await fetch(`/api/master/materials?search=${encodeURIComponent(trimmedQuery)}`);
      const data = await response.json();
      if (data.success) {
        setMaterialOptions(data.data.map((m: any) => ({
          materialCode: m.materialCode,
          description: m.materialDescription,
          unit: m.unit,
        })));
      }
    } catch (error) {
      console.error('Failed to search materials', error);
    } finally {
      setMaterialSearchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Basic validation
    if (!payItemNumber.trim()) {
      setError('Pay item number is required');
      setIsSubmitting(false);
      return;
    }
    if (!payItemDescription.trim()) {
      setError('Pay item description is required');
      setIsSubmitting(false);
      return;
    }
    if (!unitOfMeasurement.trim()) {
      setError('Unit of measurement is required');
      setIsSubmitting(false);
      return;
    }

    // Filter out empty entries
    const validLaborTemplate = laborTemplate.filter(
      (l) => l.designation.trim() && l.noOfPersons > 0 && l.noOfHours > 0
    );
    const validEquipmentTemplate = equipmentTemplate.filter(
      (e) => e.description.trim() && e.noOfUnits > 0 && e.noOfHours > 0
    );
    const validMaterialTemplate = materialTemplate.filter(
      (m) => m.description.trim() && m.quantity > 0 && m.unit.trim()
    );

    try {
      const response = await fetch('/api/dupa-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payItemId: selectedPayItemId || undefined,
          payItemNumber: payItemNumber.trim(),
          payItemDescription: payItemDescription.trim(),
          unitOfMeasurement: unitOfMeasurement.trim(),
          outputPerHour: Number(outputPerHour),
          category: category.trim(),
          specification: specification.trim(),
          notes: notes.trim(),
          laborTemplate: validLaborTemplate,
          equipmentTemplate: validEquipmentTemplate,
          materialTemplate: validMaterialTemplate,
          includeMinorTools,
          minorToolsPercentage: Number(minorToolsPercentage),
          isActive,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/dupa-templates/${data.data._id}`);
      } else {
        setError(data.error || 'Failed to create template');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link
            href="/dupa-templates"
            className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
          >
            ← Back to Templates
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create DUPA Template</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Part (Optional)
                </label>
                <select
                  value={selectedPart}
                  onChange={(e) => handlePartSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                  disabled={loadingOptions}
                >
                  <option value="">
                    {loadingOptions ? 'Loading parts...' : 'All Parts (No Filter)'}
                  </option>
                  {availableParts.map((part) => (
                    <option key={part} value={part}>
                      {part}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Pay Item (Optional)
                </label>
                <select
                  value={selectedPayItemId}
                  onChange={(e) => handlePayItemSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loadingOptions}
                >
                  <option value="">
                    {loadingOptions 
                      ? 'Loading pay items...' 
                      : selectedPart 
                        ? `Select from ${filteredPayItems.length} items in ${selectedPart}` 
                        : `Select from ${payItemOptions.length} pay items or enter manually below`
                    }
                  </option>
                  {filteredPayItems.map((payItem) => (
                    <option key={payItem._id} value={payItem._id}>
                      {payItem.payItemNumber} - {payItem.description.substring(0, 80)}...
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedPart 
                    ? `Showing ${filteredPayItems.length} items from ${selectedPart}. ` 
                    : ''
                  }
                  Selecting a pay item will auto-fill the fields below. Leave blank to enter manually.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pay Item Number *
                </label>
                <input
                  type="text"
                  value={payItemNumber}
                  onChange={(e) => setPayItemNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 101(1)a"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit of Measurement *
                </label>
                <input
                  type="text"
                  value={unitOfMeasurement}
                  onChange={(e) => setUnitOfMeasurement(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., cu.m., sq.m., l.m."
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pay Item Description *
                </label>
                <input
                  type="text"
                  value={payItemDescription}
                  onChange={(e) => setPayItemDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter detailed description"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Output per Hour
                </label>
                <input
                  type="number"
                  value={outputPerHour}
                  onChange={(e) => setOutputPerHour(Number(e.target.value))}
                  min="0.01"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  <option value="Earthwork">Earthwork</option>
                  <option value="Concrete">Concrete</option>
                  <option value="Masonry">Masonry</option>
                  <option value="Reinforcement">Reinforcement</option>
                  <option value="Formwork">Formwork</option>
                  <option value="Structural Steel">Structural Steel</option>
                  <option value="Roofing">Roofing</option>
                  <option value="Painting">Painting</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specification
                </label>
                <textarea
                  value={specification}
                  onChange={(e) => setSpecification(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Technical specifications..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes..."
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Labor Template */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Labor Template</h2>
              <button
                type="button"
                onClick={addLaborEntry}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + Add Labor
              </button>
            </div>

            {laborTemplate.length === 0 ? (
              <p className="text-gray-500">No labor entries. Click &quot;Add Labor&quot; to begin.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Designation
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        No. of Persons
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        No. of Hours
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {laborTemplate.map((labor, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2">
                          <select
                            value={labor.designation}
                            onChange={(e) =>
                              updateLaborEntry(index, 'designation', e.target.value)
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          >
                            <option value="">Select designation</option>
                            <option value="Foreman">Foreman</option>
                            <option value="Leadman">Leadman</option>
                            <option value="Equipment Operator - Heavy">Equipment Operator - Heavy</option>
                            <option value="Equipment Operator - High Skilled">Equipment Operator - High Skilled</option>
                            <option value="Equipment Operator - Light Skilled">Equipment Operator - Light Skilled</option>
                            <option value="Driver">Driver</option>
                            <option value="Skilled Labor">Skilled Labor</option>
                            <option value="Semi-Skilled Labor">Semi-Skilled Labor</option>
                            <option value="Unskilled Labor">Unskilled Labor</option>
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={labor.noOfPersons}
                            onChange={(e) =>
                              updateLaborEntry(index, 'noOfPersons', Number(e.target.value))
                            }
                            min="0.01"
                            step="0.01"
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={labor.noOfHours}
                            onChange={(e) =>
                              updateLaborEntry(index, 'noOfHours', Number(e.target.value))
                            }
                            min="0.01"
                            step="0.01"
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => removeLaborEntry(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Equipment Template */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Equipment Template</h2>
              <button
                type="button"
                onClick={addEquipmentEntry}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + Add Equipment
              </button>
            </div>

            {equipmentTemplate.length === 0 ? (
              <p className="text-gray-500">No equipment entries. Click "Add Equipment" to begin.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Equipment
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Units
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Hours
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {equipmentTemplate.map((equip, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2">
                          <Combobox
                            value={equip.equipmentId || ''}
                            selectedLabel={equip.description}
                            options={equipmentDropdownOptions}
                            placeholder={equipmentPlaceholder}
                            disabled={loadingOptions}
                            loading={equipmentSearchLoading}
                            clearable
                            onSearch={handleEquipmentSearch}
                            className="text-sm"
                            onChange={(selectedValue) => {
                              const selected = equipmentOptions.find((opt) => opt._id === selectedValue);
                              const updated = [...equipmentTemplate];
                              updated[index] = {
                                ...updated[index],
                                equipmentId: selectedValue,
                                description: selectedValue
                                  ? selected?.description || updated[index].description
                                  : '',
                              };
                              setEquipmentTemplate(updated);
                            }}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={equip.noOfUnits}
                            onChange={(e) =>
                              updateEquipmentEntry(index, 'noOfUnits', Number(e.target.value))
                            }
                            min="0.1"
                            step="0.1"
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={equip.noOfHours}
                            onChange={(e) =>
                              updateEquipmentEntry(index, 'noOfHours', Number(e.target.value))
                            }
                            min="0.1"
                            step="0.1"
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => removeEquipmentEntry(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Material Template */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Material Template</h2>
              <button
                type="button"
                onClick={addMaterialEntry}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + Add Material
              </button>
            </div>

            {materialTemplate.length === 0 ? (
              <p className="text-gray-500">No material entries. Click &quot;Add Material&quot; to begin.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase" colSpan={2}>
                        Material
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Unit
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {materialTemplate.map((material, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2" colSpan={2}>
                          <Combobox
                            value={material.materialCode || ''}
                            selectedLabel={material.description}
                            options={materialDropdownOptions}
                            placeholder={materialPlaceholder}
                            disabled={loadingOptions}
                            loading={materialSearchLoading}
                            clearable
                            onSearch={handleMaterialSearch}
                            className="text-sm"
                            onChange={(selectedValue) => {
                              const selected = materialOptions.find((opt) => opt.materialCode === selectedValue);
                              const updated = [...materialTemplate];
                              updated[index] = {
                                ...updated[index],
                                materialCode: selectedValue,
                                description: selectedValue
                                  ? selected?.description || updated[index].description
                                  : '',
                                unit: selectedValue ? selected?.unit || updated[index].unit : '',
                              };
                              setMaterialTemplate(updated);
                            }}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={material.unit}
                            readOnly
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-50 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={material.quantity}
                            onChange={(e) =>
                              updateMaterialEntry(index, 'quantity', Number(e.target.value))
                            }
                            min="0.001"
                            step="0.001"
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => removeMaterialEntry(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Minor Tools Configuration */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Minor Tools Configuration</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeMinorTools"
                  checked={includeMinorTools}
                  onChange={(e) => setIncludeMinorTools(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="includeMinorTools" className="ml-2 text-sm font-medium text-gray-700">
                  Include Minor Tools (calculated as percentage of Labor Cost)
                </label>
              </div>
              
              {includeMinorTools && (
                <div className="ml-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minor Tools Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={minorToolsPercentage}
                    onChange={(e) => setMinorToolsPercentage(Number(e.target.value))}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Standard DPWH rate is 10% of labor cost
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/dupa-templates"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
