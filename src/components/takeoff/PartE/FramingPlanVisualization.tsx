'use client';

import type { FramingResult, FramingParameters } from '@/lib/math/roofing/framing';

interface FramingPlanVisualizationProps {
  framingParams: FramingParameters;
  framingResult: FramingResult;
}

export default function FramingPlanVisualization({ framingParams, framingResult }: FramingPlanVisualizationProps) {
  const { trussSpan_mm, buildingLength_mm, trussSpacing_mm, trussQuantity } = framingParams;
  
  // SVG viewport dimensions
  const padding = 60;
  const scale = 0.04; // Smaller scale for plan view
  const viewportWidth = 1200;
  const viewportHeight = 700;
  
  // Scaled dimensions
  const span_px = trussSpan_mm * scale;
  const length_px = buildingLength_mm * scale;
  const totalWidth_px = span_px;
  const totalLength_px = length_px;
  
  // Center in viewport
  const offsetX = (viewportWidth - totalWidth_px) / 2;
  const offsetY = (viewportHeight - totalLength_px) / 2;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">Roof Framing Plan - Top View</h4>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-1 bg-blue-600"></div>
            <span>Trusses</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-1 bg-green-600"></div>
            <span>Purlins</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-1 bg-orange-600"></div>
            <span>Bracing</span>
          </div>
        </div>
      </div>
      
      <svg
        viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
        className="w-full h-auto border border-gray-100 rounded"
        style={{ backgroundColor: '#fafafa' }}
      >
        {/* Grid background */}
        <defs>
          <pattern id="grid-framing" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width={viewportWidth} height={viewportHeight} fill="url(#grid-framing)" />
        
        {/* Building outline */}
        <rect
          x={offsetX}
          y={offsetY}
          width={totalWidth_px}
          height={totalLength_px}
          fill="#f0f9ff"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        
        {/* Ridge line */}
        <line
          x1={offsetX + totalWidth_px / 2}
          y1={offsetY}
          x2={offsetX + totalWidth_px / 2}
          y2={offsetY + totalLength_px}
          stroke="#dc2626"
          strokeWidth="2"
          strokeDasharray="6,3"
        />
        
        {/* Trusses */}
        {Array.from({ length: trussQuantity }).map((_, i) => {
          const y = offsetY + (i * trussSpacing_mm * scale);
          return (
            <g key={`truss-${i}`}>
              <line
                x1={offsetX}
                y1={y}
                x2={offsetX + totalWidth_px}
                y2={y}
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Truss number */}
              {i % 2 === 0 && (
                <text
                  x={offsetX - 10}
                  y={y + 3}
                  fontSize="10"
                  fill="#1e40af"
                  textAnchor="end"
                >
                  T{i + 1}
                </text>
              )}
            </g>
          );
        })}
        
        {/* Purlins (horizontal lines perpendicular to trusses) */}
        {framingResult.purlins.lines.filter(l => l.side === 'left').map((line, i) => {
          const x = offsetX + (line.position_mm * scale);
          return (
            <line
              key={`purlin-left-${i}`}
              x1={x}
              y1={offsetY}
              x2={x}
              y2={offsetY + totalLength_px}
              stroke="#16a34a"
              strokeWidth="1.5"
              strokeDasharray="4,2"
            />
          );
        })}
        
        {framingResult.purlins.lines.filter(l => l.side === 'right').map((line, i) => {
          const x = offsetX + totalWidth_px - (line.position_mm * scale);
          return (
            <line
              key={`purlin-right-${i}`}
              x1={x}
              y1={offsetY}
              x2={x}
              y2={offsetY + totalLength_px}
              stroke="#16a34a"
              strokeWidth="1.5"
              strokeDasharray="4,2"
            />
          );
        })}
        
        {/* Cross Bracing */}
        {framingResult.bracing.members.map((member, i) => {
          const bayStart = offsetY + ((member.bayNumber - 1) * framingParams.bracing.interval_mm * scale);
          const bayEnd = offsetY + (member.bayNumber * framingParams.bracing.interval_mm * scale);
          const x1 = offsetX + 10;
          const x2 = offsetX + totalWidth_px - 10;
          
          if (member.type === 'diagonal') {
            return (
              <g key={`brace-${i}`}>
                {member.quantity === 2 ? (
                  // X-Brace
                  <>
                    <line
                      x1={x1}
                      y1={bayStart}
                      x2={x2}
                      y2={bayEnd}
                      stroke="#ea580c"
                      strokeWidth="2"
                      strokeDasharray="3,3"
                    />
                    <line
                      x1={x2}
                      y1={bayStart}
                      x2={x1}
                      y2={bayEnd}
                      stroke="#ea580c"
                      strokeWidth="2"
                      strokeDasharray="3,3"
                    />
                  </>
                ) : (
                  // Single Diagonal
                  <line
                    x1={x1}
                    y1={bayStart}
                    x2={x2}
                    y2={bayEnd}
                    stroke="#ea580c"
                    strokeWidth="2"
                    strokeDasharray="3,3"
                  />
                )}
                {/* Turnbuckle indicator */}
                {member.hasTurnbuckle && (
                  <circle
                    cx={(x1 + x2) / 2}
                    cy={(bayStart + bayEnd) / 2}
                    r="4"
                    fill="#f97316"
                    stroke="#ea580c"
                    strokeWidth="1"
                  />
                )}
              </g>
            );
          }
          return null;
        })}
        
        {/* Dimension lines */}
        <g>
          {/* Building length dimension */}
          <line
            x1={offsetX}
            y1={offsetY + totalLength_px + 20}
            x2={offsetX + totalWidth_px}
            y2={offsetY + totalLength_px + 20}
            stroke="#6b7280"
            strokeWidth="1"
            markerStart="url(#arrow-start)"
            markerEnd="url(#arrow-end)"
          />
          <text
            x={offsetX + totalWidth_px / 2}
            y={offsetY + totalLength_px + 35}
            fontSize="12"
            fill="#374151"
            textAnchor="middle"
          >
            {buildingLength_mm}mm
          </text>
          
          {/* Span dimension */}
          <line
            x1={offsetX - 20}
            y1={offsetY}
            x2={offsetX - 20}
            y2={offsetY + totalLength_px}
            stroke="#6b7280"
            strokeWidth="1"
          />
          <text
            x={offsetX - 30}
            y={offsetY + totalLength_px / 2}
            fontSize="12"
            fill="#374151"
            textAnchor="middle"
            transform={`rotate(-90, ${offsetX - 30}, ${offsetY + totalLength_px / 2})`}
          >
            Span: {trussSpan_mm}mm
          </text>
        </g>
        
        {/* Arrow markers */}
        <defs>
          <marker id="arrow-start" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
            <path d="M 8 5 L 2 2 L 2 8 Z" fill="#6b7280" />
          </marker>
          <marker id="arrow-end" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
            <path d="M 2 5 L 8 2 L 8 8 Z" fill="#6b7280" />
          </marker>
        </defs>
      </svg>
      
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-gray-600">Trusses:</span>
          <span className="font-medium ml-1">{trussQuantity} @ {trussSpacing_mm}mm</span>
        </div>
        <div>
          <span className="text-gray-600">Purlins:</span>
          <span className="font-medium ml-1">{framingResult.purlins.lines.length} lines</span>
        </div>
        <div>
          <span className="text-gray-600">Bracing Bays:</span>
          <span className="font-medium ml-1">{framingResult.bracing.bayCount}</span>
        </div>
      </div>
    </div>
  );
}
