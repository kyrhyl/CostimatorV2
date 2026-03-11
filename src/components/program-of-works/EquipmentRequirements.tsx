'use client';

import { useState } from 'react';

export interface Equipment {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  icon?: string;
}

interface EquipmentRequirementsProps {
  equipment: Equipment[];
  onAdd?: () => void;
  onEdit?: (equipmentId: string) => void;
  onRemove?: (equipmentId: string) => void;
  editable?: boolean;
}

export default function EquipmentRequirements({ 
  equipment,
  onAdd,
  onEdit,
  onRemove,
  editable = true 
}: EquipmentRequirementsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const getEquipmentIcon = (name: string, customIcon?: string) => {
    if (customIcon) return customIcon;
    
    // Map common equipment types to icons
    const lowerName = name.toLowerCase();
    if (lowerName.includes('truck') || lowerName.includes('dump')) return '🚛';
    if (lowerName.includes('excavator')) return '🏗️';
    if (lowerName.includes('crane')) return '🏗️';
    if (lowerName.includes('mixer')) return '🚧';
    if (lowerName.includes('roller') || lowerName.includes('compactor')) return '🚜';
    if (lowerName.includes('generator')) return '⚡';
    if (lowerName.includes('grader')) return '🚜';
    if (lowerName.includes('bulldozer') || lowerName.includes('dozer')) return '🚜';
    if (lowerName.includes('loader')) return '🏗️';
    if (lowerName.includes('backhoe')) return '🏗️';
    
    return '🔧'; // Default tool icon
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Minimum Equipment Requirement</h3>
          <p className="text-sm text-gray-600 mt-1">Required equipment for project execution</p>
        </div>
        {editable && onAdd && (
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-dpwh-blue-600 hover:bg-dpwh-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Equipment</span>
          </button>
        )}
      </div>

      {equipment.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-4xl mb-2">🔧</div>
          <p className="text-sm text-gray-600 mb-3">No equipment requirements added yet</p>
          {editable && onAdd && (
            <button
              onClick={onAdd}
              className="text-dpwh-blue-600 hover:text-dpwh-blue-700 text-sm font-medium"
            >
              + Add Equipment
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((item) => (
            <div
              key={item.id}
              className="relative border border-gray-200 rounded-lg p-4 hover:border-dpwh-blue-300 hover:shadow-md transition-all"
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Equipment Icon */}
              <div className="flex items-start space-x-3">
                <div className="text-3xl">{getEquipmentIcon(item.name, item.icon)}</div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h4>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-2xl font-bold text-dpwh-blue-700">{item.quantity}</span>
                    <span className="text-sm text-gray-600 uppercase">{item.unit}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons (show on hover) */}
              {editable && hoveredId === item.id && (
                <div className="absolute top-2 right-2 flex space-x-1">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item.id)}
                      className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      title="Edit equipment"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  {onRemove && (
                    <button
                      onClick={() => onRemove(item.id)}
                      className="p-1.5 bg-white border border-gray-300 rounded hover:bg-red-50 hover:border-red-300 transition-colors"
                      title="Remove equipment"
                    >
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
