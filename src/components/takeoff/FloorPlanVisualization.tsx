'use client';

import { useMemo } from 'react';
import type { GridLine, Level, ElementInstance, ElementTemplate } from '@/types';

interface FloorPlanVisualizationProps {
  gridX: GridLine[];
  gridY: GridLine[];
  instances: ElementInstance[];
  templates: ElementTemplate[];
  selectedLevel?: string;
  levels: Level[];
}

export default function FloorPlanVisualization({
  gridX,
  gridY,
  instances,
  templates,
  selectedLevel,
  levels,
}: FloorPlanVisualizationProps) {
  // Calculate SVG dimensions and scaling
  const { minX, maxX, minY, maxY, scaleX, scaleY, width, height } = useMemo(() => {
    if (gridX.length === 0 || gridY.length === 0) {
      return { minX: 0, maxX: 10, minY: 0, maxY: 10, scaleX: 50, scaleY: 50, width: 500, height: 500 };
    }

    const offsetsX = gridX.map(g => g.offset).sort((a, b) => a - b);
    const offsetsY = gridY.map(g => g.offset).sort((a, b) => a - b);
    
    const minX = offsetsX[0];
    const maxX = offsetsX[offsetsX.length - 1];
    const minY = offsetsY[0];
    const maxY = offsetsY[offsetsY.length - 1];
    
    const rangeX = maxX - minX || 10;
    const rangeY = maxY - minY || 10;
    
    // Target SVG size
    const targetWidth = 600;
    const targetHeight = 600;
    
    // Scale to fit
    const scaleX = targetWidth / rangeX;
    const scaleY = targetHeight / rangeY;
    
    return {
      minX,
      maxX,
      minY,
      maxY,
      scaleX,
      scaleY,
      width: targetWidth + 100, // Add padding for labels
      height: targetHeight + 100,
    };
  }, [gridX, gridY]);

  // Convert real coordinates to SVG coordinates
  const toSvgX = (offset: number) => (offset - minX) * scaleX + 50;
  const toSvgY = (offset: number) => (offset - minY) * scaleY + 50;

  // Get template by ID
  const getTemplate = (templateId: string) => templates.find(t => t.id === templateId);

  // Filter instances by selected level
  const visibleInstances = useMemo(() => {
    if (!selectedLevel) return instances;
    
    const selectedLevelData = levels.find(l => l.label === selectedLevel);
    if (!selectedLevelData) return instances.filter(i => i.placement.levelId === selectedLevel);
    
    return instances.filter(i => {
      const template = templates.find(t => t.id === i.templateId);
      if (!template) return false;
      
      // For columns, check if current level is within the column's span
      if (template.type === 'column') {
        const startLevel = levels.find(l => l.label === i.placement.levelId);
        if (!startLevel) return false;
        
        // Determine end level (explicit or next level)
        let endLevel: Level | undefined;
        if (i.placement.endLevelId) {
          endLevel = levels.find(l => l.label === i.placement.endLevelId);
        } else {
          // Find next level above start level
          const sortedLevels = [...levels].sort((a, b) => a.elevation - b.elevation);
          const startIndex = sortedLevels.findIndex(l => l.label === startLevel.label);
          endLevel = startIndex >= 0 && startIndex < sortedLevels.length - 1 
            ? sortedLevels[startIndex + 1] 
            : undefined;
        }
        
        if (!endLevel) return false;
        
        // Column is visible if selected level is between start and end (inclusive on both ends)
        // A column from FDN to L2 should show on FDN, GL, L1, and L2
        const isVisible = selectedLevelData.elevation >= startLevel.elevation && 
                         selectedLevelData.elevation <= endLevel.elevation;
        
        return isVisible;
      }
      
      // For other elements, show only on their placement level
      return i.placement.levelId === selectedLevel;
    });
  }, [instances, selectedLevel, levels, templates]);

  // Get grid line offset by label
  const getGridOffset = (label: string, axis: 'X' | 'Y'): number | null => {
    const grid = axis === 'X' ? gridX : gridY;
    const gridLine = grid.find(g => g.label === label);
    return gridLine ? gridLine.offset : null;
  };

  // Parse grid reference to get coordinates
  const parseGridRef = (gridRef: string[], template: ElementTemplate): 
    | { type: 'beam'; x1: number; x2: number; y1: number; y2: number; axis: 'X' | 'Y' }
    | { type: 'slab'; x1: number; x2: number; y1: number; y2: number }
    | { type: 'foundation-mat'; x1: number; x2: number; y1: number; y2: number }
    | { type: 'foundation-footing'; x: number; y: number }
    | { type: 'column'; x: number; y: number }
    | null => {
    if (!gridRef || gridRef.length === 0) return null;

    const type = template.type;

    if (type === 'beam') {
      // Beam: [span, perpendicular-line]
      // e.g., ["A-B", "1"] or ["1", "1-2"]
      if (gridRef.length < 2) return null;

      const [ref1, ref2] = gridRef;
      
      // Check which is the span
      if (ref1.includes('-')) {
        // Span is on X-axis, perpendicular on Y
        const [start, end] = ref1.split('-');
        const x1 = getGridOffset(start, 'X');
        const x2 = getGridOffset(end, 'X');
        const y = getGridOffset(ref2, 'Y');
        if (x1 !== null && x2 !== null && y !== null) {
          return { type: 'beam', x1, x2, y1: y, y2: y, axis: 'X' };
        }
      } else if (ref2.includes('-')) {
        // Span is on Y-axis, perpendicular on X
        const [start, end] = ref2.split('-');
        const y1 = getGridOffset(start, 'Y');
        const y2 = getGridOffset(end, 'Y');
        const x = getGridOffset(ref1, 'X');
        if (y1 !== null && y2 !== null && x !== null) {
          return { type: 'beam', x1: x, x2: x, y1, y2, axis: 'Y' };
        }
      }
    } else if (type === 'slab') {
      // Slab: [x-span, y-span]
      // e.g., ["A-B", "1-2"]
      if (gridRef.length < 2) return null;
      
      const [xRef, yRef] = gridRef;
      const [xStart, xEnd] = xRef.split('-');
      const [yStart, yEnd] = yRef.split('-');
      
      const x1 = getGridOffset(xStart, 'X');
      const x2 = getGridOffset(xEnd, 'X');
      const y1 = getGridOffset(yStart, 'Y');
      const y2 = getGridOffset(yEnd, 'Y');
      
      if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
        return { type: 'slab', x1, x2, y1, y2 };
      }
    } else if (type === 'foundation') {
      // Foundation: can be mat (panel) or footing (point)
      const isMat = template.properties.thickness !== undefined;
      
      if (isMat) {
        // Mat foundation - panel placement
        if (gridRef.length >= 2) {
          const [xRef, yRef] = gridRef;
          
          if (xRef.includes('-') && yRef.includes('-')) {
            const [xStart, xEnd] = xRef.split('-');
            const [yStart, yEnd] = yRef.split('-');
            
            const x1 = getGridOffset(xStart, 'X');
            const x2 = getGridOffset(xEnd, 'X');
            const y1 = getGridOffset(yStart, 'Y');
            const y2 = getGridOffset(yEnd, 'Y');
            
            if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
              return { type: 'foundation-mat', x1, x2, y1, y2 };
            }
          }
        }
      } else {
        // Isolated footing - point placement
        if (gridRef.length >= 2) {
          const x = getGridOffset(gridRef[0], 'X');
          const y = getGridOffset(gridRef[1], 'Y');
          if (x !== null && y !== null) {
            return { type: 'foundation-footing', x, y };
          }
        }
      }
    } else if (type === 'column') {
      // Column: [x-label, y-label] or empty
      if (gridRef.length >= 2) {
        const x = getGridOffset(gridRef[0], 'X');
        const y = getGridOffset(gridRef[1], 'Y');
        if (x !== null && y !== null) {
          return { type: 'column', x, y };
        }
      }
    }

    return null;
  };

  if (gridX.length === 0 || gridY.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
        <p>No grid defined. Please set up the grid system first.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-gray-700">Floor Plan View</h4>
        {selectedLevel && (
          <div className="text-sm text-gray-600">
            Level: {levels.find(l => l.label === selectedLevel)?.label || selectedLevel}
            {' '}({levels.find(l => l.label === selectedLevel)?.elevation || 0}m)
          </div>
        )}
      </div>

      <div className="overflow-auto">
        <svg width={width} height={height} className="border border-gray-300 bg-white">
          {/* Grid lines - Y axis (horizontal lines) */}
          {gridY.map((gridLine, idx) => {
            const y = toSvgY(gridLine.offset);
            // Calculate spacing to next grid line
            const nextGridLine = gridY[idx + 1];
            const spacing = nextGridLine ? (nextGridLine.offset - gridLine.offset).toFixed(2) : null;
            
            return (
              <g key={`gridY-${gridLine.label}`}>
                <line
                  x1={toSvgX(minX)}
                  y1={y}
                  x2={toSvgX(maxX)}
                  y2={y}
                  stroke="#d1d5db"
                  strokeWidth="1"
                  strokeDasharray="5,5"
                />
                <text
                  x={toSvgX(minX) - 25}
                  y={y + 4}
                  fontSize="12"
                  fill="#6b7280"
                  textAnchor="middle"
                >
                  {gridLine.label}
                </text>
                {/* Show spacing dimension */}
                {spacing && (
                  <text
                    x={toSvgX(maxX) + 20}
                    y={(y + toSvgY(nextGridLine.offset)) / 2 + 4}
                    fontSize="10"
                    fill="#9ca3af"
                    textAnchor="start"
                  >
                    {spacing}m
                  </text>
                )}
              </g>
            );
          })}

          {/* Grid lines - X axis (vertical lines) */}
          {gridX.map((gridLine, idx) => {
            const x = toSvgX(gridLine.offset);
            // Calculate spacing to next grid line
            const nextGridLine = gridX[idx + 1];
            const spacing = nextGridLine ? (nextGridLine.offset - gridLine.offset).toFixed(2) : null;
            
            return (
              <g key={`gridX-${gridLine.label}`}>
                <line
                  x1={x}
                  y1={toSvgY(minY)}
                  x2={x}
                  y2={toSvgY(maxY)}
                  stroke="#d1d5db"
                  strokeWidth="1"
                  strokeDasharray="5,5"
                />
                <text
                  x={x}
                  y={toSvgY(minY) - 10}
                  fontSize="12"
                  fill="#6b7280"
                  textAnchor="middle"
                >
                  {gridLine.label}
                </text>
                {/* Show spacing dimension */}
                {spacing && (
                  <text
                    x={(x + toSvgX(nextGridLine.offset)) / 2}
                    y={toSvgY(minY) - 25}
                    fontSize="10"
                    fill="#9ca3af"
                    textAnchor="middle"
                  >
                    {spacing}m
                  </text>
                )}
              </g>
            );
          })}

          {/* Element instances */}
          {visibleInstances.map((instance) => {
            const template = getTemplate(instance.templateId);
            if (!template || !instance.placement.gridRef) return null;

            const coords = parseGridRef(instance.placement.gridRef, template);
            if (!coords) return null;

            if (coords.type === 'beam') {
              // Draw beam as a thick line
              const x1 = toSvgX(coords.x1);
              const y1 = toSvgY(coords.y1);
              const x2 = toSvgX(coords.x2);
              const y2 = toSvgY(coords.y2);
              
              // Calculate beam length in meters
              const length = Math.sqrt(
                Math.pow(coords.x2 - coords.x1, 2) + 
                Math.pow(coords.y2 - coords.y1, 2)
              ).toFixed(2);
              
              // Calculate label position (midpoint)
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
              
              return (
                <g key={instance.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#3b82f6"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  {/* Element label */}
                  <text
                    x={midX}
                    y={midY - 8}
                    fontSize="10"
                    fill="#1e40af"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {template.name}
                  </text>
                  {/* Dimension */}
                  <text
                    x={midX}
                    y={midY + 12}
                    fontSize="9"
                    fill="#3b82f6"
                    textAnchor="middle"
                  >
                    L={length}m
                  </text>
                </g>
              );
            } else if (coords.type === 'slab') {
              // Draw slab as a filled rectangle
              const x1 = toSvgX(Math.min(coords.x1, coords.x2));
              const y1 = toSvgY(Math.min(coords.y1, coords.y2));
              const width = Math.abs(toSvgX(coords.x2) - toSvgX(coords.x1));
              const height = Math.abs(toSvgY(coords.y2) - toSvgY(coords.y1));
              
              // Calculate slab dimensions in meters
              const slabWidth = Math.abs(coords.x2 - coords.x1).toFixed(2);
              const slabHeight = Math.abs(coords.y2 - coords.y1).toFixed(2);
              
              // Calculate label position (center)
              const centerX = x1 + width / 2;
              const centerY = y1 + height / 2;
              
              return (
                <g key={instance.id}>
                  <rect
                    x={x1}
                    y={y1}
                    width={width}
                    height={height}
                    fill="#10b981"
                    fillOpacity="0.3"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                  {/* Element label */}
                  <text
                    x={centerX}
                    y={centerY - 6}
                    fontSize="10"
                    fill="#065f46"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {template.name}
                  </text>
                  {/* Dimensions */}
                  <text
                    x={centerX}
                    y={centerY + 8}
                    fontSize="9"
                    fill="#10b981"
                    textAnchor="middle"
                  >
                    {slabWidth}m × {slabHeight}m
                  </text>
                </g>
              );
            } else if (coords.type === 'foundation-mat') {
              // Draw mat foundation as a filled rectangle (similar to slab but different color)
              const x1 = toSvgX(Math.min(coords.x1, coords.x2));
              const y1 = toSvgY(Math.min(coords.y1, coords.y2));
              const width = Math.abs(toSvgX(coords.x2) - toSvgX(coords.x1));
              const height = Math.abs(toSvgY(coords.y2) - toSvgY(coords.y1));
              
              // Calculate foundation dimensions in meters
              const foundationWidth = Math.abs(coords.x2 - coords.x1).toFixed(2);
              const foundationHeight = Math.abs(coords.y2 - coords.y1).toFixed(2);
              
              // Calculate label position (center)
              const centerX = x1 + width / 2;
              const centerY = y1 + height / 2;
              
              return (
                <g key={instance.id}>
                  <rect
                    x={x1}
                    y={y1}
                    width={width}
                    height={height}
                    fill="#f97316"
                    fillOpacity="0.4"
                    stroke="#ea580c"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />
                  {/* Element label */}
                  <text
                    x={centerX}
                    y={centerY - 6}
                    fontSize="10"
                    fill="#7c2d12"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {template.name}
                  </text>
                  {/* Dimensions */}
                  <text
                    x={centerX}
                    y={centerY + 8}
                    fontSize="9"
                    fill="#ea580c"
                    textAnchor="middle"
                  >
                    {foundationWidth}m × {foundationHeight}m
                  </text>
                </g>
              );
            } else if (coords.type === 'foundation-footing') {
              // Draw isolated footing as a square marker
              const x = toSvgX(coords.x);
              const y = toSvgY(coords.y);
              const size = 16;
              
              const length = template.properties.length?.toFixed(2) || '?';
              const width = template.properties.width?.toFixed(2) || '?';
              const depth = template.properties.depth?.toFixed(2) || '?';
              
              return (
                <g key={instance.id}>
                  <rect
                    x={x - size / 2}
                    y={y - size / 2}
                    width={size}
                    height={size}
                    fill="#f97316"
                    stroke="#ea580c"
                    strokeWidth="3"
                    strokeDasharray="2,2"
                  />
                  {/* Element label */}
                  <text
                    x={x}
                    y={y - 20}
                    fontSize="9"
                    fill="#7c2d12"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {template.name}
                  </text>
                  {/* Dimension */}
                  <text
                    x={x}
                    y={y + 26}
                    fontSize="8"
                    fill="#ea580c"
                    textAnchor="middle"
                  >
                    {length}×{width}×{depth}m
                  </text>
                </g>
              );
            } else if (coords.type === 'column') {
              // Draw column as a circle or square
              const x = toSvgX(coords.x);
              const y = toSvgY(coords.y);
              const size = 12;
              
              // Get column level span info
              const startLevel = levels.find(l => l.label === instance.placement.levelId);
              let endLevel: Level | undefined;
              if (instance.placement.endLevelId) {
                endLevel = levels.find(l => l.label === instance.placement.endLevelId);
              } else {
                // Find next level above start level
                const sortedLevels = [...levels].sort((a, b) => a.elevation - b.elevation);
                const startIndex = startLevel ? sortedLevels.findIndex(l => l.label === startLevel.label) : -1;
                endLevel = startIndex >= 0 && startIndex < sortedLevels.length - 1 
                  ? sortedLevels[startIndex + 1] 
                  : undefined;
              }
              const levelSpan = startLevel && endLevel ? `${startLevel.label} to ${endLevel.label}` : '';
              
              if (template.properties.diameter !== undefined) {
                // Circular column
                const diameter = template.properties.diameter.toFixed(2);
                return (
                  <g key={instance.id}>
                    <circle
                      cx={x}
                      cy={y}
                      r={size / 2}
                      fill="#8b5cf6"
                      stroke="#6d28d9"
                      strokeWidth="2"
                    />
                    {/* Element label */}
                    <text
                      x={x}
                      y={y - 16}
                      fontSize="9"
                      fill="#5b21b6"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {template.name}
                    </text>
                    {/* Dimension */}
                    <text
                      x={x}
                      y={y + 22}
                      fontSize="8"
                      fill="#8b5cf6"
                      textAnchor="middle"
                    >
                      Ø{diameter}m
                    </text>
                    {/* Level span */}
                    {levelSpan && (
                      <text
                        x={x}
                        y={y + 32}
                        fontSize="7"
                        fill="#6b7280"
                        textAnchor="middle"
                      >
                        {levelSpan}
                      </text>
                    )}
                  </g>
                );
              } else {
                // Rectangular column
                const colWidth = template.properties.width?.toFixed(2) || '?';
                const colHeight = template.properties.height?.toFixed(2) || '?';
                return (
                  <g key={instance.id}>
                    <rect
                      x={x - size / 2}
                      y={y - size / 2}
                      width={size}
                      height={size}
                      fill="#8b5cf6"
                      stroke="#6d28d9"
                      strokeWidth="2"
                    />
                    {/* Element label */}
                    <text
                      x={x}
                      y={y - 16}
                      fontSize="9"
                      fill="#5b21b6"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {template.name}
                    </text>
                    {/* Dimension */}
                    <text
                      x={x}
                      y={y + 22}
                      fontSize="8"
                      fill="#8b5cf6"
                      textAnchor="middle"
                    >
                      {colWidth}×{colHeight}m
                    </text>
                    {/* Level span */}
                    {levelSpan && (
                      <text
                        x={x}
                        y={y + 32}
                        fontSize="7"
                        fill="#6b7280"
                        textAnchor="middle"
                      >
                        {levelSpan}
                      </text>
                    )}
                  </g>
                );
              }
            }

            return null;
          })}

          {/* Grid intersection points */}
          {gridX.map((gx) =>
            gridY.map((gy) => (
              <circle
                key={`int-${gx.label}-${gy.label}`}
                cx={toSvgX(gx.offset)}
                cy={toSvgY(gy.offset)}
                r="2"
                fill="#9ca3af"
              />
            ))
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-6 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-blue-600 rounded"></div>
          <span>Beams</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-500 opacity-30 border-2 border-green-500"></div>
          <span>Slabs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-600 border-2 border-purple-700"></div>
          <span>Columns</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-500 opacity-40 border-2 border-orange-600" style={{ borderStyle: 'dashed' }}></div>
          <span>Mat Foundations</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 border-2 border-orange-600" style={{ borderStyle: 'dashed' }}></div>
          <span>Footings</span>
        </div>
      </div>
    </div>
  );
}
