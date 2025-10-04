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
  svgRef: React.RefObject<SVGSVGElement>;
}

const SociogramGraph: React.FC<Props> = ({
  students,
  selections,
  positions,
  receivedCount,
  svgRef
}) => {
  // สร้างฟังก์ชันสำหรับคำนวณเส้นโค้ง
  const createCurvePath = (
    from: Position,
    to: Position,
    toId: string,
    isMutual: boolean,
    isFirst: boolean
  ) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    // คำนวณจุดควบคุมสำหรับเส้นโค้ง
    const curvature = isMutual ? (isFirst ? 50 : -50) : 0;
    const perpX = -dy / dist * curvature;
    const perpY = dx / dist * curvature;
    const controlX = midX + perpX;
    const controlY = midY + perpY;

    // คำนวณจุดสิ้นสุดที่จะไม่ทับกับโหนด
    const nodeRadius = 20 + receivedCount[toId] * 8;
    const angle = Math.atan2(to.y - controlY, to.x - controlX);
    const endX = to.x - Math.cos(angle) * nodeRadius;
    const endY = to.y - Math.sin(angle) * nodeRadius;

    return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${endX} ${endY}`;
  };

  return (
    <svg ref={svgRef} width="800" height="600" className="border border-gray-300 rounded-lg bg-white">
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
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

        const color = sel.rank === 1 ? '#ef4444' : sel.rank === 2 ? '#3b82f6' : '#9ca3af';

        // สร้าง path สำหรับเส้นโค้ง
        const path = createCurvePath(
          from,
          to,
          sel.to,
          isMutual,
          isFirst
        );

        return (
          <g key={i}>
            {/* เส้นหลัก */}
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={isMutual ? 2.5 : 1.5}
              opacity={0.6}
              markerEnd="url(#arrowhead)"
            />
            
            {/* ถ้าเป็นความสัมพันธ์แบบสองทาง ให้วาดลูกศรย้อนกลับ */}
            {isMutual && (
              <path
                d={createCurvePath(
                  to,
                  from,
                  sel.from,
                  true,
                  false
                )}
                fill="none"
                stroke={mutualSelection ? 
                  (mutualSelection.rank === 1 ? '#ef4444' : 
                   mutualSelection.rank === 2 ? '#3b82f6' : '#9ca3af')
                  : color}
                strokeWidth={2.5}
                opacity={0.6}
                markerEnd="url(#arrowhead)"
              />
            )}
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
            />
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="16"
              fontWeight="bold"
            >
              {student.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default SociogramGraph;