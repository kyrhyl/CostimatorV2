'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

export default function EditDUPATemplatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const laborDesignationOptions = [
    'Foreman',
    'Leadman',
    'Equipment Operator - Heavy',
    'Equipment Operator - High Skilled',
    'Equipment Operator - Light Skilled',
    'Driver',
    'Skilled Labor',
    'Semi-Skilled Labor',
    'Unskilled Labor',
  ];

  // Basic info
  const [payItemNumber, setPayItemNumber] = useState('');
  const [payItemDescription, setPayItemDescription] = useState('');
  const [unitOfMeasurement, setUnitOfMeasurement] = useState('');
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
  const [baseEquipmentOptions, setBaseEquipmentOptions] = useState<Array<{ _id: string; description: string }>>([]);
  const [baseMaterialOptions, setBaseMaterialOptions] = useState<Array<{ materialCode: string; description: string; unit: string }>>([]);
  const [equipmentSearchLoading, setEquipmentSearchLoading] = useState(false);
  const [materialSearchLoading, setMaterialSearchLoading] = useState(false);

  // Minor Tools configuration
  const [includeMinorTools, setIncludeMinorTools] = useState(false);
  const [minorToolsPercentage, setMinorToolsPercentage] = useState(10);

  // Add-on percentages
  const [ocmPercentage, setOcmPercentage] = useState(15);
  const [cpPercentage, setCpPercentage] = useState(10);
  const [vatPercentage, setVatPercentage] = useState(12);

  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const equipmentDropdownOptions = equipmentOptions.map((opt) => ({
    value: opt._id,
    label: opt.description,
  }));
  const materialDropdownOptions = materialOptions.map((opt) => ({
    value: opt.materialCode,
    label: opt.description,
  }));

  const loadData = useCallback(async () => {
    try {
      // Load template data and master data in parallel
      const [templateRes, eqRes, matRes] = await Promise.all([
        fetch(`/api/dupa-templates/${id}`),
        fetch('/api/master/equipment'),
        fetch('/api/master/materials')
      ]);

      const [templateData, eqJson, matJson] = await Promise.all([
        templateRes.json(),
        eqRes.json(),
        matRes.json()
      ]);

      // Load master data
      const equipmentOptionsData = eqJson.success
        ? eqJson.data.map((e: any) => ({ _id: e._id, description: e.description }))
        : [];
      if (eqJson.success) {
        setEquipmentOptions(equipmentOptionsData);
        setBaseEquipmentOptions(equipmentOptionsData);
      }
      if (matJson.success) {
        const materialOptionsData = matJson.data.map((m: any) => ({ 
          materialCode: m.materialCode, 
          description: m.materialDescription, 
          unit: m.unit 
        }));
        setMaterialOptions(materialOptionsData);
        setBaseMaterialOptions(materialOptionsData);
      }

      // Load template data
      if (templateData.success) {
        const template = templateData.data;
        setPayItemNumber(template.payItemNumber || '');
        setPayItemDescription(template.payItemDescription || '');
        setUnitOfMeasurement(template.unitOfMeasurement || '');
        setOutputPerHour(template.outputPerHour || 1);
        setCategory(template.category || '');
        setSpecification(template.specification || '');
        setNotes(template.notes || '');
        setOcmPercentage(template.ocmPercentage || 15);
        setCpPercentage(template.cpPercentage || 10);
        setVatPercentage(template.vatPercentage || 12);
        setIncludeMinorTools(template.includeMinorTools || false);
        setMinorToolsPercentage(template.minorToolsPercentage || 10);
        setIsActive(template.isActive !== undefined ? template.isActive : true);

        // Load templates
        if (template.laborTemplate && template.laborTemplate.length > 0) {
          setLaborTemplate(template.laborTemplate);
        }
        if (template.equipmentTemplate && template.equipmentTemplate.length > 0) {
          const equipmentTemplateWithIds = template.equipmentTemplate.map((entry: EquipmentEntry) => {
            if (entry.equipmentId || !entry.description) return entry;
            const matched = equipmentOptionsData.find((opt: { _id: string; description: string }) => opt.description === entry.description);
            return matched ? { ...entry, equipmentId: matched._id } : entry;
          });
          setEquipmentTemplate(equipmentTemplateWithIds);
        }
        if (template.materialTemplate && template.materialTemplate.length > 0) {
          const materialOptionsData = matJson.success
            ? matJson.data.map((m: any) => ({
              materialCode: m.materialCode,
              description: m.materialDescription,
              unit: m.unit,
            }))
            : [];
          const materialTemplateWithCodes = template.materialTemplate.map((entry: MaterialEntry) => {
            if (entry.materialCode || !entry.description) return entry;
            const matched = materialOptionsData.find((opt: { materialCode: string; description: string; unit: string }) => opt.description === entry.description);
            return matched
              ? { ...entry, materialCode: matched.materialCode, unit: entry.unit || matched.unit }
              : entry;
          });
          setMaterialTemplate(materialTemplateWithCodes);
        }
      } else {
        setError(templateData.error || 'Failed to load template');
      }
    } catch (e) {
      console.error('Failed to load data', e);
      setError('Failed to load template data');
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, loadData]);

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
      const response = await fetch(`/api/dupa-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          ocmPercentage: Number(ocmPercentage),
          cpPercentage: Number(cpPercentage),
          vatPercentage: Number(vatPercentage),
          includeMinorTools,
          minorToolsPercentage: Number(minorToolsPercentage),
          isActive,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/dupa-templates');
      } else {
        setError(data.error || 'Failed to update template');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update template');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error && !payItemNumber) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Template</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/dupa-templates"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Back to Templates
          </Link>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Edit DUPA Template</h1>
          <p className="text-gray-600 mt-2">{payItemNumber} - {payItemDescription}</p>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pay Item Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={payItemNumber}
                  onChange={(e) => setPayItemNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  placeholder="e.g., 801 (1)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit of Measurement <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={unitOfMeasurement}
                  onChange={(e) => setUnitOfMeasurement(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  placeholder="e.g., cu.m, sq.m, l.s."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pay Item Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={payItemDescription}
                  onChange={(e) => setPayItemDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  required
                  placeholder="Enter detailed description of the work item"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Output Per Hour
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={outputPerHour}
                  onChange={(e) => setOutputPerHour(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Earthwork, Concrete"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specification
                </label>
                <textarea
                  value={specification}
                  onChange={(e) => setSpecification(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Technical specifications or standards"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Additional notes or remarks"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Template is Active
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
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                + Add Labor Entry
              </button>
            </div>

            {laborTemplate.length === 0 ? (
              <p className="text-gray-500 italic">No labor entries. Click &quot;Add Labor Entry&quot; to add one.</p>
            ) : (
              <div className="space-y-4">
                {laborTemplate.map((entry, index) => (
                  <div key={index} className="flex gap-4 items-end bg-gray-50 p-4 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Designation <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={entry.designation}
                        onChange={(e) => updateLaborEntry(index, 'designation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select designation</option>
                        {entry.designation && !laborDesignationOptions.includes(entry.designation) && (
                          <option value={entry.designation}>Current: {entry.designation}</option>
                        )}
                        {laborDesignationOptions.map((designation) => (
                          <option key={designation} value={designation}>
                            {designation}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        No. of Persons
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={entry.noOfPersons}
                        onChange={(e) => updateLaborEntry(index, 'noOfPersons', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        No. of Hours
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={entry.noOfHours}
                        onChange={(e) => updateLaborEntry(index, 'noOfHours', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLaborEntry(index)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
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
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                + Add Equipment Entry
              </button>
            </div>

            {equipmentTemplate.length === 0 ? (
              <p className="text-gray-500 italic">No equipment entries. Click &quot;Add Equipment Entry&quot; to add one.</p>
            ) : (
              <div className="space-y-4">
                {equipmentTemplate.map((entry, index) => (
                  <div key={index} className="flex gap-4 items-end bg-gray-50 p-4 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <Combobox
                        value={entry.equipmentId || ''}
                        selectedLabel={entry.description}
                        options={equipmentDropdownOptions}
                        placeholder="Search equipment"
                        clearable
                        loading={equipmentSearchLoading}
                        onSearch={handleEquipmentSearch}
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
                        disabled={loading}
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        No. of Units
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={entry.noOfUnits}
                        onChange={(e) => updateEquipmentEntry(index, 'noOfUnits', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        No. of Hours
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={entry.noOfHours}
                        onChange={(e) => updateEquipmentEntry(index, 'noOfHours', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEquipmentEntry(index)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
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
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                + Add Material Entry
              </button>
            </div>

            {materialTemplate.length === 0 ? (
              <p className="text-gray-500 italic">No material entries. Click &quot;Add Material Entry&quot; to add one.</p>
            ) : (
              <div className="space-y-4">
                {materialTemplate.map((entry, index) => (
                  <div key={index} className="flex gap-4 items-end bg-gray-50 p-4 rounded-lg">
                    <div className="w-40">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Material Code
                      </label>
                      <input
                        type="text"
                        value={entry.materialCode}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <Combobox
                        value={entry.materialCode || ''}
                        selectedLabel={entry.description}
                        options={materialDropdownOptions}
                        placeholder="Search material"
                        clearable
                        loading={materialSearchLoading}
                        onSearch={handleMaterialSearch}
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
                        disabled={loading}
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={entry.unit}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={entry.quantity}
                        onChange={(e) => updateMaterialEntry(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMaterialEntry(index)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add-ons Configuration */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add-ons Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OCM Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={ocmPercentage}
                  onChange={(e) => setOcmPercentage(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contractor&apos;s Profit (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cpPercentage}
                  onChange={(e) => setCpPercentage(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  VAT Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={vatPercentage}
                  onChange={(e) => setVatPercentage(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div className="mt-6 flex items-start gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeMinorTools}
                  onChange={(e) => setIncludeMinorTools(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Include Minor Tools
                </label>
              </div>
              {includeMinorTools && (
                <div className="flex-1 max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minor Tools Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={minorToolsPercentage}
                    onChange={(e) => setMinorToolsPercentage(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Link
              href="/dupa-templates"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
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
