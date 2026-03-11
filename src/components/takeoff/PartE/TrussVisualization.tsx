'use client';

import { type TrussResult } from '@/lib/math/roofing/truss';

interface TrussVisualizationProps {
  trussResult: TrussResult;
  buildingLength_mm: number;
  view: 'truss' | 'plan';
}

export default function TrussVisualization({ trussResult, buildingLength_mm, view }: TrussVisualizationProps) {
  if (view === 'truss') {
    return <TrussDiagram trussResult={trussResult} />;
  } else {
    return <FramingPlan trussResult={trussResult} buildingLength_mm={buildingLength_mm} />;
  }
}

function TrussDiagram({ trussResult }: { trussResult: TrussResult }) {
  const { geometry, members } = trussResult;
  
  // SVG viewport dimensions
  const padding = 60;
  const scale = 0.15; // 1mm = 0.15px (increased for better visibility)
  const viewportWidth = 1200;
  const viewportHeight = 700;
  
  // Calculate scaled dimensions
  const span_px = geometry.span_mm * scale;
  const rise_px = geometry.rise_mm * scale;
  const overhang_px = geometry.overhang_mm * scale;
  const totalWidth_px = span_px + 2 * overhang_px;
  
  // Center the truss in viewport
  const offsetX = (viewportWidth - totalWidth_px) / 2;
  const offsetY = viewportHeight - padding - 50; // Bottom baseline
  
  // Helper to convert truss coordinates to SVG coordinates
  const toSVG = (x_mm: number, y_mm: number) => {
    const x = offsetX + (x_mm + geometry.overhang_mm) * scale;
    const y = offsetY - y_mm * scale;
    return { x, y };
  };
  
  // Calculate key points for the truss
  const apex = toSVG(geometry.span_mm / 2, geometry.rise_mm);
  const leftBase = toSVG(0, 0);
  const rightBase = toSVG(geometry.span_mm, 0);
  
  // Calculate overhang endpoints by extending top chord along its slope
  const slopeAngle = Math.atan(geometry.rise_mm / (geometry.span_mm / 2));
  const overhangVerticalDrop = geometry.overhang_mm * Math.tan(slopeAngle);
  
  const leftOverhang = toSVG(-geometry.overhang_mm, -overhangVerticalDrop);
  const rightOverhang = toSVG(geometry.span_mm + geometry.overhang_mm, -overhangVerticalDrop);
  
  // Simplified truss drawing based on type
  const drawTrussMembers = () => {
    const paths: React.ReactElement[] = [];
    
    // Top chords (left and right)
    paths.push(
      <line key="top-left" x1={leftOverhang.x} y1={leftOverhang.y} x2={apex.x} y2={apex.y} 
        stroke="#2563eb" strokeWidth="3" strokeLinecap="round">
        <title>Top Chord - Left</title>
      </line>
    );
    paths.push(
      <line key="top-right" x1={apex.x} y1={apex.y} x2={rightOverhang.x} y2={rightOverhang.y} 
        stroke="#2563eb" strokeWidth="3" strokeLinecap="round">
        <title>Top Chord - Right</title>
      </line>
    );
    
    // Bottom chord
    paths.push(
      <line key="bottom" x1={leftBase.x} y1={leftBase.y} x2={rightBase.x} y2={rightBase.y} 
        stroke="#dc2626" strokeWidth="3" strokeLinecap="round">
        <title>Bottom Chord</title>
      </line>
    );
    
    // Web members based on truss type
    if (trussResult.type === 'howe') {
      // Howe: Vertical compression, diagonal tension
      // Get actual vertical web count from members
      const verticalMember = members.find(m => m.subtype === 'vertical');
      const verticalCount = verticalMember?.quantity || 3;
      const panels = verticalCount + 1; // panels = verticals + 1
      
      for (let i = 1; i <= verticalCount; i++) {
        const x = (geometry.span_mm / panels) * i;
        const yTop = (geometry.rise_mm / (geometry.span_mm / 2)) * Math.abs(x - geometry.span_mm / 2);
        const yTop_mm = geometry.rise_mm - yTop;
        const topPoint = toSVG(x, yTop_mm);
        const bottomPoint = toSVG(x, 0);
        
        // Vertical
        paths.push(
          <line key={`vert-${i}`} x1={bottomPoint.x} y1={bottomPoint.y} x2={topPoint.x} y2={topPoint.y} 
            stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
            <title>Vertical Web</title>
          </line>
        );
      }
      
      // Diagonals - in Howe truss, diagonals alternate direction in each panel
      for (let i = 0; i < panels; i++) {
        const halfSpan = geometry.span_mm / 2;
        
        // Determine diagonal direction based on panel position
        // Even panels: bottom-left to top-right
        // Odd panels: bottom-right to top-left
        let x_bottom1: number, x_top2: number;
        
        if (i % 2 === 0) {
          // Upward slanting to the right: from bottom[i] to top[i+1]
          x_bottom1 = (geometry.span_mm / panels) * i;
          x_top2 = (geometry.span_mm / panels) * (i + 1);
        } else {
          // Upward slanting to the left: from bottom[i+1] to top[i]
          x_bottom1 = (geometry.span_mm / panels) * (i + 1);
          x_top2 = (geometry.span_mm / panels) * i;
        }
        
        // Calculate heights at top chord positions
        const calcTopHeight = (x: number) => {
          if (x <= halfSpan) {
            return (geometry.rise_mm / halfSpan) * x;
          } else {
            return geometry.rise_mm - (geometry.rise_mm / halfSpan) * (x - halfSpan);
          }
        };
        
        const bottomPoint = toSVG(x_bottom1, 0);
        const topPoint = toSVG(x_top2, calcTopHeight(x_top2));
        
        paths.push(
          <line key={`diag-${i}`} x1={bottomPoint.x} y1={bottomPoint.y} x2={topPoint.x} y2={topPoint.y} 
            stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
            <title>Diagonal Web</title>
          </line>
        );
      }
      
      // Add diagonal webs for overhang sections (if overhang exists)
      if (geometry.overhang_mm > 0) {
        const slopeAngle = Math.atan(geometry.rise_mm / (geometry.span_mm / 2));
        const overhangVerticalDrop = geometry.overhang_mm * Math.tan(slopeAngle);
        
        // Left overhang diagonal: from left overhang tip to left base
        const leftOverhangTip = toSVG(-geometry.overhang_mm, -overhangVerticalDrop);
        const leftBasePoint = toSVG(0, 0);
        
        paths.push(
          <line key="diag-overhang-left" x1={leftOverhangTip.x} y1={leftOverhangTip.y} x2={leftBasePoint.x} y2={leftBasePoint.y} 
            stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
            <title>Diagonal Web (Overhang)</title>
          </line>
        );
        
        // Right overhang diagonal: from right base to right overhang tip
        const rightBasePoint = toSVG(geometry.span_mm, 0);
        const rightOverhangTip = toSVG(geometry.span_mm + geometry.overhang_mm, -overhangVerticalDrop);
        
        paths.push(
          <line key="diag-overhang-right" x1={rightBasePoint.x} y1={rightBasePoint.y} x2={rightOverhangTip.x} y2={rightOverhangTip.y} 
            stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
            <title>Diagonal Web (Overhang)</title>
          </line>
        );
      }
    } else if (trussResult.type === 'fink') {
      // Fink: W-pattern
      const quarterSpan = geometry.span_mm / 4;
      const q1 = toSVG(quarterSpan, geometry.rise_mm / 2);
      const q3 = toSVG(3 * quarterSpan, geometry.rise_mm / 2);
      const center = toSVG(geometry.span_mm / 2, 0);
      
      // King post
      paths.push(
        <line key="king-post" x1={apex.x} y1={apex.y} x2={center.x} y2={center.y} 
          stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
          <title>King Post</title>
        </line>
      );
      
      // W-pattern diagonals
      paths.push(
        <line key="w1" x1={leftBase.x} y1={leftBase.y} x2={q1.x} y2={q1.y} 
          stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round">
          <title>Diagonal</title>
        </line>
      );
      paths.push(
        <line key="w2" x1={q1.x} y1={q1.y} x2={center.x} y2={center.y} 
          stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round">
          <title>Diagonal</title>
        </line>
      );
      paths.push(
        <line key="w3" x1={center.x} y1={center.y} x2={q3.x} y2={q3.y} 
          stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round">
          <title>Diagonal</title>
        </line>
      );
      paths.push(
        <line key="w4" x1={q3.x} y1={q3.y} x2={rightBase.x} y2={rightBase.y} 
          stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round">
          <title>Diagonal</title>
        </line>
      );
    } else if (trussResult.type === 'kingpost') {
      // King Post: Simple
      const center = toSVG(geometry.span_mm / 2, 0);
      
      // King post
      paths.push(
        <line key="king-post" x1={apex.x} y1={apex.y} x2={center.x} y2={center.y} 
          stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
          <title>King Post</title>
        </line>
      );
      
      // Struts
      paths.push(
        <line key="strut-left" x1={leftBase.x} y1={leftBase.y} x2={apex.x} y2={apex.y} 
          stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" opacity="0">
          <title>Integrated in top chord</title>
        </line>
      );
    }
    
    // Draw connector plate locations
    const plateLocations = [
      { x: 0, y: 0, name: 'Heel - Left' },
      { x: geometry.span_mm, y: 0, name: 'Heel - Right' },
      { x: geometry.span_mm / 2, y: geometry.rise_mm, name: 'Peak' },
    ];
    
    plateLocations.forEach((loc, idx) => {
      const pos = toSVG(loc.x, loc.y);
      paths.push(
        <rect key={`plate-${idx}`}
          x={pos.x - 6} y={pos.y - 6}
          width="12" height="12"
          fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"
          opacity="0.7">
          <title>{loc.name} Connector Plate</title>
        </rect>
      );
    });
    
    return paths;
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">Truss Structural Diagram</h4>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5" style={{ backgroundColor: '#2563eb' }}></div>
            <span>Top Chord</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5" style={{ backgroundColor: '#dc2626' }}></div>
            <span>Bottom Chord</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5" style={{ backgroundColor: '#16a34a' }}></div>
            <span>Vertical</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5" style={{ backgroundColor: '#ea580c' }}></div>
            <span>Diagonal</span>
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
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width={viewportWidth} height={viewportHeight} fill="url(#grid)" />
        
        {/* Ground line */}
        <line
          x1={offsetX - 20}
          y1={offsetY}
          x2={offsetX + totalWidth_px + 20}
          y2={offsetY}
          stroke="#94a3b8"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
        
        {/* Truss members */}
        {drawTrussMembers()}
        
        {/* Dimension lines */}
        {/* Span dimension */}
        <g>
          <line
            x1={offsetX + overhang_px}
            y1={offsetY + 30}
            x2={offsetX + overhang_px + span_px}
            y2={offsetY + 30}
            stroke="#64748b"
            strokeWidth="1"
            markerEnd="url(#arrowhead)"
            markerStart="url(#arrowhead-start)"
          />
          <text
            x={offsetX + overhang_px + span_px / 2}
            y={offsetY + 45}
            textAnchor="middle"
            fontSize="12"
            fill="#475569"
            fontWeight="500"
          >
            Span: {(geometry.span_mm / 1000).toFixed(2)}m
          </text>
        </g>
        
        {/* Rise dimension */}
        <g>
          <line
            x1={offsetX + overhang_px + span_px + 20}
            y1={offsetY}
            x2={offsetX + overhang_px + span_px + 20}
            y2={offsetY - rise_px}
            stroke="#64748b"
            strokeWidth="1"
            markerEnd="url(#arrowhead-up)"
            markerStart="url(#arrowhead-down)"
          />
          <text
            x={offsetX + overhang_px + span_px + 35}
            y={offsetY - rise_px / 2}
            textAnchor="start"
            fontSize="12"
            fill="#475569"
            fontWeight="500"
          >
            Rise: {(geometry.rise_mm / 1000).toFixed(2)}m
          </text>
        </g>
        
        {/* Pitch angle indicator */}
        <g>
          <text
            x={offsetX + overhang_px + 50}
            y={offsetY - rise_px - 10}
            textAnchor="start"
            fontSize="14"
            fill="#2563eb"
            fontWeight="600"
          >
            {geometry.pitch_deg}°
          </text>
        </g>
        
        {/* Arrow markers */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#64748b" />
          </marker>
          <marker id="arrowhead-start" markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto">
            <polygon points="10 0, 0 3, 10 6" fill="#64748b" />
          </marker>
          <marker id="arrowhead-up" markerWidth="10" markerHeight="10" refX="3" refY="1" orient="auto">
            <polygon points="0 10, 3 0, 6 10" fill="#64748b" />
          </marker>
          <marker id="arrowhead-down" markerWidth="10" markerHeight="10" refX="3" refY="9" orient="auto">
            <polygon points="0 0, 3 10, 6 0" fill="#64748b" />
          </marker>
        </defs>
      </svg>
      
      <div className="mt-3 text-xs text-gray-600">
        <p>⚠️ Showing single truss elevation. Yellow squares indicate connector plate locations.</p>
      </div>
    </div>
  );
}

function FramingPlan({ trussResult, buildingLength_mm }: { trussResult: TrussResult; buildingLength_mm: number }) {
  const { geometry } = trussResult;
  const { span_mm, overhang_mm } = geometry;
  const spacing_mm = trussResult.type === 'howe' ? 600 : 600; // Default spacing
  
  // Calculate number of trusses
  const trussCount = Math.ceil(buildingLength_mm / spacing_mm) + 1;
  
  // SVG viewport dimensions
  const padding = 60;
  const scale = 0.04; // Smaller scale for plan view
  const viewportWidth = 800;
  const viewportHeight = 600;
  
  // Scaled dimensions
  const span_px = span_mm * scale;
  const length_px = buildingLength_mm * scale;
  const overhang_px = overhang_mm * scale;
  const totalWidth_px = span_px + 2 * overhang_px;
  const totalLength_px = length_px;
  
  // Center in viewport
  const offsetX = (viewportWidth - totalWidth_px) / 2;
  const offsetY = (viewportHeight - totalLength_px) / 2;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">Roof Framing Plan</h4>
        <div className="text-xs text-gray-600">
          {trussCount} trusses @ {spacing_mm}mm spacing
        </div>
      </div>
      
      <svg
        viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
        className="w-full h-auto border border-gray-100 rounded"
        style={{ backgroundColor: '#fafafa' }}
      >
        {/* Grid background */}
        <defs>
          <pattern id="grid-plan" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width={viewportWidth} height={viewportHeight} fill="url(#grid-plan)" />
        
        {/* Building outline with overhang */}
        <rect
          x={offsetX}
          y={offsetY}
          width={totalWidth_px}
          height={totalLength_px}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeDasharray="8,4"
        />
        
        {/* Main building outline (without overhang) */}
        <rect
          x={offsetX + overhang_px}
          y={offsetY}
          width={span_px}
          height={totalLength_px}
          fill="#f0f9ff"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        
        {/* Ridge line (center) */}
        <line
          x1={offsetX + totalWidth_px / 2}
          y1={offsetY}
          x2={offsetX + totalWidth_px / 2}
          y2={offsetY + totalLength_px}
          stroke="#dc2626"
          strokeWidth="2"
          strokeDasharray="6,3"
        />
        <text
          x={offsetX + totalWidth_px / 2 + 5}
          y={offsetY + 20}
          fontSize="11"
          fill="#dc2626"
          fontWeight="500"
        >
          Ridge
        </text>
        
        {/* Trusses */}
        {Array.from({ length: trussCount }, (_, i) => {
          const position = i * spacing_mm * scale;
          const y = offsetY + position;
          
          // Don't draw beyond building length
          if (y > offsetY + totalLength_px) return null;
          
          return (
            <g key={`truss-${i}`}>
              {/* Truss line */}
              <line
                x1={offsetX + overhang_px}
                y1={y}
                x2={offsetX + overhang_px + span_px}
                y2={y}
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Truss number */}
              {i % 2 === 0 && (
                <text
                  x={offsetX + overhang_px - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="9"
                  fill="#64748b"
                >
                  T{i + 1}
                </text>
              )}
            </g>
          );
        })}
        
        {/* Dimension annotations */}
        {/* Building width */}
        <g>
          <line
            x1={offsetX + overhang_px}
            y1={offsetY - 20}
            x2={offsetX + overhang_px + span_px}
            y2={offsetY - 20}
            stroke="#64748b"
            strokeWidth="1"
            markerEnd="url(#arrow-plan)"
            markerStart="url(#arrow-plan-start)"
          />
          <text
            x={offsetX + overhang_px + span_px / 2}
            y={offsetY - 25}
            textAnchor="middle"
            fontSize="12"
            fill="#475569"
            fontWeight="500"
          >
            {(span_mm / 1000).toFixed(2)}m
          </text>
        </g>
        
        {/* Building length */}
        <g>
          <line
            x1={offsetX + totalWidth_px + 20}
            y1={offsetY}
            x2={offsetX + totalWidth_px + 20}
            y2={offsetY + totalLength_px}
            stroke="#64748b"
            strokeWidth="1"
            markerEnd="url(#arrow-plan)"
            markerStart="url(#arrow-plan-start)"
          />
          <text
            x={offsetX + totalWidth_px + 25}
            y={offsetY + totalLength_px / 2}
            textAnchor="start"
            fontSize="12"
            fill="#475569"
            fontWeight="500"
            transform={`rotate(90 ${offsetX + totalWidth_px + 25} ${offsetY + totalLength_px / 2})`}
          >
            {(buildingLength_mm / 1000).toFixed(2)}m
          </text>
        </g>
        
        {/* Overhang annotation */}
        <g>
          <line
            x1={offsetX}
            y1={offsetY + totalLength_px + 20}
            x2={offsetX + overhang_px}
            y2={offsetY + totalLength_px + 20}
            stroke="#94a3b8"
            strokeWidth="1"
          />
          <text
            x={offsetX + overhang_px / 2}
            y={offsetY + totalLength_px + 30}
            textAnchor="middle"
            fontSize="10"
            fill="#64748b"
          >
            OH: {overhang_mm}mm
          </text>
        </g>
        
        {/* Arrow markers */}
        <defs>
          <marker id="arrow-plan" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#64748b" />
          </marker>
          <marker id="arrow-plan-start" markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto">
            <polygon points="10 0, 0 3, 10 6" fill="#64748b" />
          </marker>
        </defs>
      </svg>
      
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-600"></div>
          <span className="text-gray-600">Truss positions</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-red-600" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #dc2626 0, #dc2626 4px, transparent 4px, transparent 7px)' }}></div>
          <span className="text-gray-600">Ridge centerline</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 bg-blue-50"></div>
          <span className="text-gray-600">Main building area</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-400 border-dashed bg-transparent"></div>
          <span className="text-gray-600">Including overhang</span>
        </div>
      </div>
    </div>
  );
}
