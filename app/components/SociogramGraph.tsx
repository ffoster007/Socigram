'use client';

import React from 'react';
import cytoscape, { Core, ElementDefinition, NodeSingular } from 'cytoscape';
// @ts-ignore - cytoscape-klay ไม่มี type definitions
import klay from 'cytoscape-klay';

// ลงทะเบียน klay extension ครั้งเดียว (กัน register ซ้ำตอน HMR/Next.js)
if (typeof cytoscape('layout', 'klay') === 'undefined' || !cytoscape('layout', 'klay')) {
  try {
    cytoscape.use(klay);
  } catch {
    // already registered
  }
}

interface Student {
  id: string;
  name: string;
  gender?: 'male' | 'female';
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
  // เปลี่ยนจาก svgRef (SVGSVGElement) เป็น containerRef (HTMLDivElement)
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onUpdatePosition?: (id: string, pos: Position) => void;
  initialBackgroundColor?: string;
  onBackgroundChange?: (color: string) => void;
}

// แปลง rank -> สีเส้น (เหมือนของเดิม)
const rankColor = (rank: number) => {
  if (rank === 1) return '#27F557';
  if (rank === 2) return '#F53C27';
  return '#C900FF';
};

// แปลง receivedCount -> สีโหนด
const nodeColor = (count: number) => {
  if (count === 0) return '#ef4444'; // isolated
  if (count >= 4) return '#fbbf24';  // star
  return '#8b5cf6';
};

// แปลง receivedCount -> ขนาดโหนด (diameter)
const nodeSize = (count: number) => 40 + count * 16; // เดิม radius = 20 + count*8

const SociogramGraph: React.FC<Props> = ({
  students,
  selections,
  positions,
  receivedCount,
  containerRef,
  onUpdatePosition,
  initialBackgroundColor,
  onBackgroundChange,
}) => {
  const internalRef = React.useRef<HTMLDivElement | null>(null);
  const containerElRef = containerRef ?? internalRef;
  const cyRef = React.useRef<Core | null>(null);

  const [bgColor, setBgColor] = React.useState<string>(initialBackgroundColor || '#ffffff');
  const [zoomPct, setZoomPct] = React.useState(100);

  // --- สร้าง elements (nodes + edges) จาก props ---
  const buildElements = React.useCallback((): ElementDefinition[] => {
    const elements: ElementDefinition[] = [];

    // nodes
    students.forEach((student) => {
      const pos = positions[student.id];
      elements.push({
        data: {
          id: student.id,
          label: student.id,
          count: receivedCount[student.id] || 0,
          gender: student.gender || 'male',
        },
        position: pos ? { x: pos.x, y: pos.y } : undefined,
      });
    });

    // edges (รวม mutual ให้เหลือเส้นเดียว เหมือนของเดิม)
    selections.forEach((sel, i) => {
      const mutual = selections.find((s) => s.from === sel.to && s.to === sel.from);
      const isMutual = !!mutual;
      const isFirst = isMutual && sel.from < sel.to;

      if (isMutual && !isFirst) return; // ข้ามเส้นที่สองของคู่ mutual

      elements.push({
        data: {
          id: `e${i}-${sel.from}-${sel.to}`,
          source: sel.from,
          target: sel.to,
          rank: sel.rank,
          mutual: isMutual,
        },
      });
    });

    return elements;
  }, [students, selections, positions, receivedCount]);

  // --- สร้าง cytoscape instance ---
  React.useEffect(() => {
    const container = containerElRef.current;
    if (!container) return;

    const hasAllPositions = students.every((s) => positions[s.id]);

    const cy = cytoscape({
      container,
      elements: buildElements(),
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: NodeSingular) => nodeColor(ele.data('count')),
            shape: (ele: NodeSingular) => (ele.data('gender') === 'female' ? 'rectangle' : 'ellipse'),
            width: (ele: NodeSingular) => nodeSize(ele.data('count')),
            height: (ele: NodeSingular) => nodeSize(ele.data('count')),
            label: 'data(label)',
            color: '#ffffff',
            'font-size': 16,
            'font-weight': 'bold',
            'text-valign': 'center',
            'text-halign': 'center',
            'border-width': 3,
            'border-color': '#ffffff',
          },
        },
        {
          selector: 'node:active',
          style: {
            'overlay-opacity': 0.15,
          },
        },
        // edge ปกติ (ทางเดียว) - สีตาม rank
        {
          selector: 'edge[?mutual]',
          style: {
            'curve-style': 'bezier',
            width: 2.5,
            'line-color': '#3b82f6',
            'target-arrow-color': '#3b82f6',
            'source-arrow-color': '#3b82f6',
            'target-arrow-shape': 'triangle',
            'source-arrow-shape': 'triangle',
            opacity: 0.9,
          },
        },
        {
          selector: 'edge[!mutual]',
          style: {
            'curve-style': 'bezier',
            width: 1.5,
            'line-color': (ele) => rankColor(ele.data('rank')),
            'target-arrow-color': (ele) => rankColor(ele.data('rank')),
            'target-arrow-shape': 'triangle',
            opacity: 0.6,
          },
        },
      ],
      layout: hasAllPositions
        ? { name: 'preset' }
        : {
            name: 'klay',
            // @ts-ignore - klay-specific options
            klay: {
              direction: 'DOWN',
              spacing: 60,
              nodeLayering: 'NETWORK_SIMPLEX',
              edgeRouting: 'SPLINES',
            },
          },
      minZoom: 0.1,
      maxZoom: 5,
      wheelSensitivity: 0.2,
    });

    cyRef.current = cy;

    // ถ้าใช้ klay layout (ไม่มี position มาก่อน) ให้เซฟตำแหน่งที่คำนวณได้กลับไป
    if (!hasAllPositions && onUpdatePosition) {
      cy.one('layoutstop', () => {
        cy.nodes().forEach((node) => {
          const p = node.position();
          onUpdatePosition(node.id(), { x: p.x, y: p.y });
        });
      });
    }

    // ลากโหนด -> อัปเดตตำแหน่ง
    cy.on('drag', 'node', (evt) => {
      const node = evt.target;
      const p = node.position();
      onUpdatePosition?.(node.id(), { x: p.x, y: p.y });
    });

    // sync zoom % ไปแสดงที่ UI
    const syncZoom = () => setZoomPct(Math.round(cy.zoom() * 100));
    cy.on('zoom', syncZoom);
    syncZoom();

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // ต้องการ re-init เฉพาะตอน students/selections เปลี่ยนโครงสร้างจริง ๆ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.length, selections.length]);

  // --- อัปเดต style/ข้อมูลโหนดเมื่อ receivedCount/gender เปลี่ยน โดยไม่ rebuild ทั้งกราฟ ---
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    students.forEach((student) => {
      const node = cy.getElementById(student.id);
      if (node && node.length) {
        node.data('count', receivedCount[student.id] || 0);
        node.data('gender', student.gender || 'male');
      }
    });
    cy.style().update();
  }, [students, receivedCount]);

  // --- zoom controls ---
  const handleZoom = (direction: 'in' | 'out') => {
    const cy = cyRef.current;
    if (!cy) return;
    const factor = direction === 'in' ? 1.2 : 1 / 1.2;
    const newZoom = Math.min(Math.max(0.1, cy.zoom() * factor), 5);
    cy.zoom({
      level: newZoom,
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  };

  const handleResetZoom = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom(1);
    cy.center();
  };

  return (
    <div className="relative">
      {/* ปุ่มควบคุม Zoom + สีพื้นหลัง */}
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
        <div className="text-center text-xs text-gray-600 mt-1">{zoomPct}%</div>

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
              try {
                onBackgroundChange?.(c);
              } catch {}
            }}
            className="w-8 h-8 p-0 border-0"
          />
        </div>
      </div>

      <div
        ref={containerElRef}
        style={{
          width: 1200,
          height: 600,
          backgroundColor: bgColor,
        }}
        className="border border-gray-300 rounded-lg"
      />
    </div>
  );
};

export default SociogramGraph;