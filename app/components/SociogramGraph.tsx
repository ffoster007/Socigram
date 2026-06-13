'use client';

import React from 'react';
import cytoscape, { Core, ElementDefinition, NodeSingular } from 'cytoscape';
// @ts-ignore - cytoscape-klay ไม่มี type definitions
import klay from 'cytoscape-klay';

try {
  cytoscape.use(klay);
} catch {
  // already registered (HMR)
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

export interface SociogramGraphHandle {
  /** ดาวน์โหลดกราฟปัจจุบันเป็น JPG */
  exportImage: (filename?: string) => void;
  /** สั่งย้ายตำแหน่ง node ทั้งหมดตาม positions ที่ส่งเข้ามา (ใช้ตอนรีเซ็ตตำแหน่ง) */
  applyPositions: (positions: { [key: string]: Position }) => void;
}

interface Props {
  students: Student[];
  selections: Selection[];
  positions: { [key: string]: Position };
  receivedCount: { [key: string]: number };
  onUpdatePosition?: (id: string, pos: Position) => void;
  initialBackgroundColor?: string;
  onBackgroundChange?: (color: string) => void;
}

const rankColor = (rank: number) => {
  if (rank === 1) return '#27F557';
  if (rank === 2) return '#F53C27';
  return '#C900FF';
};

const nodeColor = (count: number) => {
  if (count === 0) return '#ef4444';
  if (count >= 4) return '#fbbf24';
  return '#8b5cf6';
};

const nodeSize = (count: number) => 40 + count * 16;

const SociogramGraph = React.forwardRef<SociogramGraphHandle, Props>(({
  students,
  selections,
  positions,
  receivedCount,
  onUpdatePosition,
  initialBackgroundColor,
  onBackgroundChange,
}, ref) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const cyRef = React.useRef<Core | null>(null);

  const [bgColor, setBgColor] = React.useState<string>(initialBackgroundColor || '#ffffff');
  const [zoomPct, setZoomPct] = React.useState(100);

  const buildElements = React.useCallback((): ElementDefinition[] => {
    const elements: ElementDefinition[] = [];

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

    selections.forEach((sel, i) => {
      const mutual = selections.find((s) => s.from === sel.to && s.to === sel.from);
      const isMutual = !!mutual;
      const isFirst = isMutual && sel.from < sel.to;

      if (isMutual && !isFirst) return;

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

  // --- สร้าง cytoscape instance (ครั้งเดียวตอน mount / เมื่อจำนวน node-edge เปลี่ยน) ---
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const hasAllPositions = students.length > 0 && students.every((s) => positions[s.id]);

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
          style: { 'overlay-opacity': 0.15 },
        },
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

    if (!hasAllPositions && onUpdatePosition) {
      cy.one('layoutstop', () => {
        cy.nodes().forEach((node) => {
          const p = node.position();
          onUpdatePosition(node.id(), { x: p.x, y: p.y });
        });
      });
    }

    cy.on('drag', 'node', (evt) => {
      const node = evt.target;
      const p = node.position();
      onUpdatePosition?.(node.id(), { x: p.x, y: p.y });
    });

    const syncZoom = () => setZoomPct(Math.round(cy.zoom() * 100));
    cy.on('zoom', syncZoom);
    syncZoom();

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.length, selections.length]);

  // --- อัปเดต data (count/gender) เมื่อเปลี่ยน โดยไม่ rebuild กราฟ ---
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

  // --- sync bgColor กับ cytoscape canvas (สำหรับ export) ---
  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.backgroundColor = bgColor;
    }
  }, [bgColor]);

  // --- expose imperative API ให้ parent ---
  React.useImperativeHandle(ref, () => ({
    exportImage: (filename = 'sociogram.jpg') => {
      const cy = cyRef.current;
      if (!cy) return;
      try {
        const dataUri = cy.jpg({
          output: 'base64uri',
          bg: bgColor,
          full: true,
          scale: 2,
          quality: 0.95,
        });
        const a = document.createElement('a');
        a.href = dataUri;
        a.download = filename;
        a.click();
      } catch (err) {
        console.error('Export failed', err);
        alert('ไม่สามารถดาวน์โหลดได้ (ดูคอนโซล)');
      }
    },
    applyPositions: (newPositions) => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.batch(() => {
        Object.entries(newPositions).forEach(([id, pos]) => {
          const node = cy.getElementById(id);
          if (node && node.length) {
            node.position({ x: pos.x, y: pos.y });
          }
        });
      });
      cy.fit(undefined, 40);
    },
  }), [bgColor]);

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
        ref={containerRef}
        style={{
          width: 1200,
          height: 600,
          backgroundColor: bgColor,
        }}
        className="border border-gray-300 rounded-lg"
      />
    </div>
  );
});

SociogramGraph.displayName = 'SociogramGraph';

export default SociogramGraph;