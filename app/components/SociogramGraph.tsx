import React from 'react';

interface Student {
  id: string;
  name: string;
}

interface Selection {
  from: string;
  to: string;
  rank: number;
}

interface Position {
  x: number;
  y: number;
}

interface Props {
  students: Student[];
  selections: Selection[];
  positions: { [key: string]: Position };
  receivedCount: { [key: string]: number };
  svgRef: React.RefObject<SVGSVGElement | null>;
  onUpdatePosition?: (id: string, pos: Position) => void;
  // optional initial background color (hex) and callback when changed
  initialBackgroundColor?: string;
  onBackgroundChange?: (color: string) => void;
}

const SociogramGraph: React.FC<Props> = ({
  students,
  selections,
  positions,
  receivedCount,
  svgRef,
  onUpdatePosition
  , initialBackgroundColor, onBackgroundChange
}) => {
  // ref to track currently dragged node id
  const draggingRef = React.useRef<string | null>(null);
  
  // state สำหรับ pan และ zoom
  const [viewBox, setViewBox] = React.useState({ x: 0, y: 0, width: 800, height: 600 });
  const [zoom, setZoom] = React.useState(1);
  const [isPanning, setIsPanning] = React.useState(false);
  // สีพื้นหลังของแคนวาส (สามารถเปลี่ยนได้โดยผู้ใช้)
  const [bgColor, setBgColor] = React.useState<string>(initialBackgroundColor || '#ffffff');
  const panStartRef = React.useRef<{ x: number, y: number } | null>(null);

  // helper: convert client coordinates to SVG coordinates
  const clientToSvgPoint = React.useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const inverse = ctm.inverse();
    const transformed = pt.matrixTransform(inverse);
    return { x: transformed.x, y: transformed.y };
  }, [svgRef]);

  // จัดการ zoom ด้วยปุ่ม
  const handleZoom = React.useCallback((direction: 'in' | 'out') => {
    const svg = svgRef.current;
    if (!svg) return;

    const delta = direction === 'in' ? 0.2 : -0.2;
    const newZoom = Math.min(Math.max(0.1, zoom + delta), 5);
    
    // zoom ไปที่ตรงกลาง canvas
    const rect = svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // แปลงเป็นพิกัด SVG
    const svgX = viewBox.x + (centerX / rect.width) * viewBox.width;
    const svgY = viewBox.y + (centerY / rect.height) * viewBox.height;
    
    // คำนวณ viewBox ใหม่โดยให้จุดกลางอยู่ที่เดิม
    const scale = zoom / newZoom;
    const newWidth = viewBox.width * scale;
    const newHeight = viewBox.height * scale;
    const newX = svgX - (centerX / rect.width) * newWidth;
    const newY = svgY - (centerY / rect.height) * newHeight;
    
    setZoom(newZoom);
    setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
  }, [zoom, viewBox, svgRef]);

  // รีเซ็ต zoom
  const handleResetZoom = React.useCallback(() => {
    setZoom(1);
    setViewBox({ x: 0, y: 0, width: 800, height: 600 });
  }, []);

  // จัดการ panning
  const handlePanStart = React.useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // เช็คว่าไม่ได้คลิกที่โหนด
    if ((e.target as SVGElement).tagName === 'circle') return;
    
    setIsPanning(true);
    const svgPoint = clientToSvgPoint(e.clientX, e.clientY);
    panStartRef.current = svgPoint;
  }, [clientToSvgPoint]);

  const handlePanMove = React.useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanning || !panStartRef.current) return;
    
    const svgPoint = clientToSvgPoint(e.clientX, e.clientY);
    const dx = panStartRef.current.x - svgPoint.x;
    const dy = panStartRef.current.y - svgPoint.y;
    
    setViewBox(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
  }, [isPanning, clientToSvgPoint]);

  const handlePanEnd = React.useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  // สร้างฟังก์ชันสำหรับคำนวณเส้นโค้ง
  const createCurvePath = (
    from: Position,
    to: Position,
    fromId: string,
    toId: string,
    isMutual: boolean,
    isFirst: boolean
  ) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    // ปรับความโค้ง: ถ้าเป็นความสัมพันธ์สองทาง ให้แยกเส้นด้วยค่าบวก/ลบ
    let curvatureMag = Math.max(40, dist * 0.15);
    if (!isMutual) {
      // ให้เส้นทางเดี่ยวโค้งเล็กน้อยเพื่อความสวยงาม
      curvatureMag = Math.min(20, dist * 0.06);
    }
    const sign = isMutual ? (isFirst ? 1 : -1) : 1;
    const curvature = curvatureMag * sign;

    const perpX = -dy / (dist || 1) * curvature;
    const perpY = dx / (dist || 1) * curvature;
    const controlX = midX + perpX;
    const controlY = midY + perpY;

    // รัศมีของโหนด (ขึ้นกับจำนวนครั้งที่ถูกเลือก)
    const nodeRadiusTo = 20 + (receivedCount[toId] || 0) * 10;
    const nodeRadiusFrom = 20 + (receivedCount[fromId] || 0) * 10;

    // offset เพื่อให้ลูกศรไม่จมลงในวงกลมของโหนด
    const arrowOffset = 5;

    // ให้เส้นเริ่ม/สิ้นสุดที่ขอบวงกลมของโหนด โดยเลื่อนออกไปอีกเล็กน้อยเพื่อเผื่อลูกศร
    const startAngle = Math.atan2(from.y - controlY, from.x - controlX);
    const startX = from.x - Math.cos(startAngle) * (nodeRadiusFrom + arrowOffset);
    const startY = from.y - Math.sin(startAngle) * (nodeRadiusFrom + arrowOffset);

    const endAngle = Math.atan2(to.y - controlY, to.x - controlX);
    const endX = to.x - Math.cos(endAngle) * (nodeRadiusTo + arrowOffset);
    const endY = to.y - Math.sin(endAngle) * (nodeRadiusTo + arrowOffset);

    return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
  };

  return (
    <div className="relative">
      {/* ปุ่มควบคุม Zoom */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white rounded-lg shadow-lg p-2">
        <button
          onClick={() => handleZoom('in')}
          className="w-10 h-10 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-bold text-xl"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="w-10 h-10 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-bold text-xl"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={handleResetZoom}
          className="w-10 h-10 flex items-center justify-center bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-xs"
          title="Reset Zoom"
        >
          1:1
        </button>
        <div className="text-center text-xs text-gray-600 mt-1">
          {Math.round(zoom * 100)}%
        </div>
        {/* color picker สำหรับเปลี่ยนสีพื้นหลัง */}
        <div className="flex items-center gap-2 mt-1">
          <label htmlFor="bg-color" className="text-xs text-gray-600">พื้นหลัง</label>
          <input
            id="bg-color"
            type="color"
            value={bgColor}
            title="เปลี่ยนสีพื้นหลัง"
            onChange={(e) => {
              const c = e.target.value;
              setBgColor(c);
              try { onBackgroundChange?.(c); } catch {}
            }}
            className="w-8 h-8 p-0 border-0"
          />
        </div>
      </div>

      <svg 
        ref={svgRef} 
        width="1200" 
        height="600" 
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className="border border-gray-300 rounded-lg"
        style={{ 
          backgroundColor: bgColor,
          cursor: isPanning ? 'grabbing' : 'grab',
          touchAction: 'none'
        }}
        onPointerDown={handlePanStart}
        onPointerMove={handlePanMove}
        onPointerUp={handlePanEnd}
        onPointerLeave={handlePanEnd}
      >
      <defs>
        {/* Enlarged arrowhead for single-direction links */}
        <marker
          id="arrowhead"
          markerWidth="16"
          markerHeight="12"
          refX="16"
          refY="6"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          {/* polygon scaled up to match new marker size */}
          <polygon points="0 0, 16 6, 0 12" fill="#666" />
        </marker>

        {/* blue arrow for mutual (double-headed) relationships - also enlarged */}
        <marker
          id="blueArrow"
          markerWidth="16"
          markerHeight="12"
          refX="16"
          refY="6"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <polygon points="0 0, 16 6, 0 12" fill="#3b82f6" />
        </marker>
      </defs>

      {/* วาดเส้นเชื่อมความสัมพันธ์ */}
      {selections.map((sel, i) => {
        const from = positions[sel.from];
        const to = positions[sel.to];
        if (!from || !to) return null;

        const mutualSelection = selections.find(
          s => s.from === sel.to && s.to === sel.from
        );
        const isMutual = !!mutualSelection;
        const isFirst = isMutual && sel.from < sel.to;
        
        // ถ้าเป็นความสัมพันธ์แบบสองทาง และเป็นเส้นที่สอง ให้ข้ามไป
        if (isMutual && !isFirst) return null;

        const color = sel.rank === 1 ? '#27F557' : sel.rank === 2 ? '#F53C27' : '#C900FF';

        // สร้าง path สำหรับเส้นโค้ง
        const path = createCurvePath(
          from,
          to,
          sel.from,
          sel.to,
          isMutual,
          isFirst
        );

        // ถ้าเป็นความสัมพันธ์แบบสองทาง ให้แสดงเป็นเส้นสีฟ้าพร้อมลูกศรสองหัว
        if (isMutual) {
          return (
            <g key={i}>
              <path
                d={path}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2.5}
                opacity={0.9}
                markerStart="url(#blueArrow)"
                markerEnd="url(#blueArrow)"
              />
            </g>
          );
        }

        return (
          <g key={i}>
            {/* เส้นหลัก */}
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              opacity={0.6}
              markerEnd="url(#arrowhead)"
            />
          </g>
        );
      })}

      {/* วาดโหนดนักเรียน */}
      {students.map(student => {
        const pos = positions[student.id];
        if (!pos) return null;
        
        const isIsolated = receivedCount[student.id] === 0;
        const isStar = receivedCount[student.id] >= 4;
        const size = 20 + receivedCount[student.id] * 8;
        
        return (
          <g key={student.id}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={size}
              fill={isIsolated ? '#ef4444' : isStar ? '#fbbf24' : '#8b5cf6'}
              stroke="#fff"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => {
                e.stopPropagation(); // ป้องกันไม่ให้เรียก pan
                // start dragging
                const target = e.currentTarget as SVGCircleElement;
                draggingRef.current = student.id;
                // capture pointer to this element so we keep receiving events
                try {
                  target.setPointerCapture(e.pointerId);
                } catch {}

                // attach global listeners
                const onPointerMove = (ev: PointerEvent) => {
                  if (draggingRef.current !== student.id) return;
                  const p = clientToSvgPoint(ev.clientX, ev.clientY);
                  if (onUpdatePosition) onUpdatePosition(student.id, { x: p.x, y: p.y });
                };

                const onPointerUp = (ev: PointerEvent) => {
                  if (draggingRef.current !== student.id) return;
                  try {
                    target.releasePointerCapture(ev.pointerId);
                  } catch {}
                  draggingRef.current = null;
                  window.removeEventListener('pointermove', onPointerMove);
                  window.removeEventListener('pointerup', onPointerUp);
                };

                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('pointerup', onPointerUp);
              }}
            />
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="16"
              fontWeight="bold"
              style={{ pointerEvents: 'none' }}
            >
              {student.id}
            </text>
          </g>
        );
      })}
      </svg>
    </div>
  );
};

export default SociogramGraph;