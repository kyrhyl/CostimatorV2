'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface LaborTemplate {
  designation: string;
  noOfPersons: number;
  noOfHours: number;
}

interface EquipmentTemplate {
  equipmentId?: string;
  description: string;
  noOfUnits: number;
  noOfHours: number;
}

interface MaterialTemplate {
  materialCode?: string;
  description: string;
  unit: string;
  quantity: number;
}

interface DUPATemplate {
  _id: string;
  payItemNumber: string;
  payItemDescription: string;
  unitOfMeasurement: string;
  outputPerHour: number;
  part?: string;
  category?: string;
  specification?: string;
  notes?: string;
  laborTemplate: LaborTemplate[];
  equipmentTemplate: EquipmentTemplate[];
  materialTemplate: MaterialTemplate[];
  ocmPercentage: number;
  cpPercentage: number;
  vatPercentage: number;
  includeMinorTools: boolean;
  minorToolsPercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ViewDUPATemplatePage() {
  const params = useParams();
  const [template, setTemplate] = useState<DUPATemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTemplate();
  }, [params.id]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dupa-templates/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setTemplate(data.data);
      } else {
        setError(data.error || 'Failed to fetch template');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch template');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-gray-500">Loading template...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error || 'Template not found'}
          </div>
          <Link
            href="/dupa-templates"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dupa-templates"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Templates
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {template.payItemNumber}
              </h1>
              <p className="text-xl text-gray-600 mt-1">
                {template.payItemDescription}
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/dupa-templates/${template._id}/edit`}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Edit Template
              </Link>
            </div>
          </div>
        </div>

        {/* Template Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Template Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Unit of Measurement
              </label>
              <p className="mt-1 text-gray-900">{template.unitOfMeasurement}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Output Per Hour
              </label>
              <p className="mt-1 text-gray-900">{template.outputPerHour}</p>
            </div>
            {template.part && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Part
                </label>
                <p className="mt-1 text-gray-900">{template.part}</p>
              </div>
            )}
            {template.category && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <p className="mt-1 text-gray-900">{template.category}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <p className="mt-1">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    template.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {template.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
          </div>

          {template.specification && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Specification
              </label>
              <p className="mt-1 text-gray-900">{template.specification}</p>
            </div>
          )}

          {template.notes && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <p className="mt-1 text-gray-900">{template.notes}</p>
            </div>
          )}
        </div>

        {/* Labor Template */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Labor Template ({template.laborTemplate.length})
          </h2>
          {template.laborTemplate.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No labor entries defined
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Designation
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      No. of Persons
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      No. of Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {template.laborTemplate.map((labor, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-gray-900">
                        {labor.designation}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {labor.noOfPersons}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {labor.noOfHours}
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Equipment Template ({template.equipmentTemplate.length})
          </h2>
          {template.equipmentTemplate.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No equipment entries defined
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      No. of Units
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      No. of Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {template.equipmentTemplate.map((equipment, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-gray-900">
                        {equipment.description}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {equipment.noOfUnits}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {equipment.noOfHours}
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Material Template ({template.materialTemplate.length})
          </h2>
          {template.materialTemplate.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No material entries defined
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Unit
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {template.materialTemplate.map((material, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-gray-900">
                        {material.description}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {material.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {material.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add-on Percentages */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Add-on Percentages
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                OCM (%)
              </label>
              <p className="mt-1 text-gray-900">{template.ocmPercentage}%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                CP (%)
              </label>
              <p className="mt-1 text-gray-900">{template.cpPercentage}%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                VAT (%)
              </label>
              <p className="mt-1 text-gray-900">{template.vatPercentage}%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Minor Tools
              </label>
              <p className="mt-1 text-gray-900">
                {template.includeMinorTools
                  ? `${template.minorToolsPercentage}%`
                  : 'Not included'}
              </p>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-6 text-sm text-gray-500 text-center">
          <p>
            Created: {new Date(template.createdAt).toLocaleString()} | Updated:{' '}
            {new Date(template.updatedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
