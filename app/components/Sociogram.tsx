"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Network, Edit2, Plus, Trash2 } from 'lucide-react';
import SociogramGraph from './SociogramGraph';

interface Student {
  id: string;
  name: string;
}

interface Selection {
  from: string;
  to: string;
  rank: number;
}

const SociogramApp = () => {
  const [students, setStudents] = useState<Student[]>([
    { id: 'A', name: 'นักเรียน A' },
    { id: 'B', name: 'นักเรียน B' },
    { id: 'C', name: 'นักเรียน C' },
    { id: 'D', name: 'นักเรียน D' },
    { id: 'E', name: 'นักเรียน E' },
    { id: 'F', name: 'นักเรียน F' },
    { id: 'G', name: 'นักเรียน G' },
    { id: 'H', name: 'นักเรียน H' },
    { id: 'I', name: 'นักเรียน I' },
    { id: 'J', name: 'นักเรียน J' },
  ]);

  const [selections, setSelections] = useState<Selection[]>([
    { from: 'A', to: 'B', rank: 1 },
    { from: 'A', to: 'D', rank: 3 },
    { from: 'A', to: 'J', rank: 2 },
    { from: 'B', to: 'C', rank: 2 },
    { from: 'B', to: 'F', rank: 3 },
    { from: 'B', to: 'G', rank: 1 },
    { from: 'C', to: 'A', rank: 3 },
    { from: 'C', to: 'G', rank: 1 },
    { from: 'C', to: 'I', rank: 2 },
    { from: 'D', to: 'C', rank: 2 },
    { from: 'D', to: 'F', rank: 1 },
    { from: 'D', to: 'J', rank: 3 },
    { from: 'E', to: 'A', rank: 1 },
    { from: 'E', to: 'I', rank: 3 },
    { from: 'E', to: 'J', rank: 2 },
    { from: 'F', to: 'B', rank: 1 },
    { from: 'F', to: 'D', rank: 3 },
    { from: 'F', to: 'G', rank: 2 },
    { from: 'G', to: 'B', rank: 2 },
    { from: 'G', to: 'C', rank: 1 },
    { from: 'G', to: 'F', rank: 3 },
    { from: 'H', to: 'B', rank: 3 },
    { from: 'H', to: 'C', rank: 2 },
    { from: 'H', to: 'I', rank: 1 },
    { from: 'I', to: 'A', rank: 1 },
    { from: 'I', to: 'C', rank: 2 },
    { from: 'I', to: 'E', rank: 3 },
    { from: 'J', to: 'A', rank: 1 },
    { from: 'J', to: 'E', rank: 2 },
    { from: 'J', to: 'G', rank: 3 },
  ]);

  const [editingCell, setEditingCell] = useState<{from: string, to: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [positions, setPositions] = useState<{[key: string]: {x: number, y: number}}>({});
  const svgRef = useRef<SVGSVGElement>(null);

  const exportAs = useCallback(async (type: 'jpg' | 'pdf') => {
    const svg = svgRef.current;
    if (!svg) return;

    try {
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svg);

      // add name spaces.
      if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!source.match(/^<svg[^>]+xmlns:xlink="http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
      }

      const svg64 = btoa(unescape(encodeURIComponent(source)));
      const image64 = 'data:image/svg+xml;base64,' + svg64;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      const imgLoad = new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = (e) => rej(e);
      });
      img.src = image64;
      await imgLoad;

      const width = svg.clientWidth || 800;
      const height = svg.clientHeight || 600;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // white background for nicer export
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (type === 'jpg') {
        const data = canvas.toDataURL('image/jpeg', 0.95);
        const a = document.createElement('a');
        a.href = data;
        a.download = 'sociogram.jpg';
        a.click();
      } else {
        // dynamic import to avoid SSR problems
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({
          orientation: width > height ? 'landscape' : 'portrait',
          unit: 'pt',
          format: [width, height]
        });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        pdf.save('sociogram.pdf');
      }
    } catch (err) {
      console.error('Export failed', err);
      alert('ไม่สามารถดาวน์โหลดได้ (ดูคอนโซล)');
    }
  }, []);

  const analysis = useMemo(() => {
    const receivedCount: {[key: string]: number} = {};
    students.forEach(s => {
      receivedCount[s.id] = 0;
    });
    selections.forEach(sel => {
      receivedCount[sel.to]++;
    });
    return { receivedCount };
  }, [selections, students]);

  // localStorage key for persistence
  const STORAGE_KEY = 'sociogram_v1';

  // Load saved state from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (Array.isArray(parsed.students)) setStudents(parsed.students as Student[]);
          if (Array.isArray(parsed.selections)) setSelections(parsed.selections as Selection[]);
        }
      }
    } catch {
      // ignore parse/storage errors
    }
  }, []);

  // Auto-save (debounced) when students or selections change
  useEffect(() => {
    const payload = JSON.stringify({ students, selections });
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, payload);
      } catch {
        // ignore storage errors
      }
    }, 500);

    return () => clearTimeout(id);
  }, [students, selections]);

  // คำนวณตำแหน่งโหนดอัตโนมัติ
  useEffect(() => {
    const centerX = 400;
    const centerY = 300;
    const radius = 220;
    
    const newPositions: {[key: string]: {x: number, y: number}} = {};
    students.forEach((s, i) => {
      const angle = (i / students.length) * 2 * Math.PI - Math.PI / 2;
      newPositions[s.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
    setPositions(newPositions);
  }, [students]);

  const handleCellClick = (from: string, to: string) => {
    if (from === to) return;
    setEditingCell({ from, to });
    const existing = selections.find(s => s.from === from && s.to === to);
    setEditValue(existing ? existing.rank.toString() : '');
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    
    const value = parseInt(editValue);
    const newSelections = selections.filter(
      s => !(s.from === editingCell.from && s.to === editingCell.to)
    );

    if (!isNaN(value) && value >= 1 && value <= 3) {
      newSelections.push({
        from: editingCell.from,
        to: editingCell.to,
        rank: value
      });
    }

    setSelections(newSelections);
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const addStudent = () => {
    if (!newStudentId || !newStudentName) return;
    if (students.some(s => s.id === newStudentId)) {
      alert('รหัสนักเรียนซ้ำ');
      return;
    }
    setStudents([...students, { id: newStudentId, name: newStudentName }]);
    setNewStudentId('');
    setNewStudentName('');
  };

  const removeStudent = (id: string) => {
    // ลบนักเรียนทันทีโดยไม่ต้องยืนยัน
    setStudents(prev => prev.filter(s => s.id !== id));
    setSelections(prev => prev.filter(s => s.from !== id && s.to !== id));
  };

  const getCellValue = (from: string, to: string) => {
    const sel = selections.find(s => s.from === from && s.to === to);
    return sel ? sel.rank : 0;
  };

  const renderVisualization = () => {
    return (
      <div className="bg-gray-50 rounded-lg p-4 flex justify-center">
        <div className="w-full flex flex-col items-center">
          <div className="w-full flex justify-end gap-2 mb-2">
            <button
              onClick={() => exportAs('jpg')}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm"
            >ดาวน์โหลด JPG</button>
            <button
              onClick={() => exportAs('pdf')}
              className="px-3 py-1 bg-gray-800 hover:bg-gray-900 text-white rounded-md text-sm"
            >ดาวน์โหลด PDF</button>
          </div>
          <SociogramGraph
            students={students}
            selections={selections}
            positions={positions}
            receivedCount={analysis.receivedCount}
            svgRef={svgRef}
            onUpdatePosition={(id: string, pos: { x: number; y: number }) => {
              setPositions(prev => ({ ...prev, [id]: pos }));
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Network className="w-10 h-10 text-purple-600" />
            <h1 className="text-4xl font-bold text-gray-800">แผนผังสังคมมิติ (Sociogram)</h1>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              วิธีการใช้งาน
            </h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• คลิกที่ช่องในตารางเพื่อแก้ไขค่า (ใส่ 1-3 หรือเว้นว่างเพื่อลบ)</li>
              <li>• กด Enter เพื่อบันทึก หรือ Escape เพื่อยกเลิก</li>
              <li>• แผนผังจะปรับตัวอัตโนมัติเมื่อมีการเปลี่ยนแปลงข้อมูล</li>
              <li>• เพิ่มหรือลบนักเรียนได้ด้านล่าง</li>
            </ul>
          </div>

          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">ตารางความสัมพันธ์ (คลิกเพื่อแก้ไข)</h3>
                <div className="text-sm text-gray-600">
                  <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-1"></span> อันดับ 1
                  <span className="inline-block w-3 h-3 bg-blue-500 rounded-full ml-3 mr-1"></span> อันดับ 2
                  <span className="inline-block w-3 h-3 bg-gray-400 rounded-full ml-3 mr-1"></span> อันดับ 3
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-purple-100">
                      <th className="border border-gray-300 px-4 py-2 sticky left-0 bg-purple-100 text-gray-800">ผู้เลือก ↓ / ผู้ถูกเลือก →</th>
                      {students.map(s => (
                        <th key={s.id} className="border border-gray-300 px-4 py-2 text-center min-w-[60px] text-gray-800">
                          {s.id}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s1 => (
                      <tr key={s1.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-semibold bg-purple-50 sticky left-0 text-gray-800">
                          {s1.id}
                        </td>
                        {students.map(s2 => {
                          const isEditing = editingCell?.from === s1.id && editingCell?.to === s2.id;
                          const value = getCellValue(s1.id, s2.id);
                          
                          return (
                            <td 
                              key={s2.id} 
                              className={`border border-gray-300 px-2 py-2 text-center text-gray-800 cursor-pointer hover:bg-blue-50 transition-colors ${
                                s1.id === s2.id ? 'bg-gray-100' : ''
                              }`}
                              onClick={() => handleCellClick(s1.id, s2.id)}
                            >
                              {s1.id === s2.id ? (
                                <span className="text-gray-300">—</span>
                              ) : isEditing ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={handleKeyPress}
                                  className="w-12 h-8 text-center text-black border-2 border-blue-500 rounded focus:outline-none"
                                  autoFocus
                                  placeholder="limit 100"
                                />
                              ) : value > 0 ? (
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-semibold ${
                                  value === 1 ? 'bg-red-500' : value === 2 ? 'bg-blue-500' : 'bg-gray-400'
                                }`}>
                                  {value}
                                </span>
                              ) : (
                                <span className="text-gray-700 text-xs">แก้ไข</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="bg-yellow-50 font-semibold">
                      <td className="border border-gray-300 px-4 py-2 sticky left-0 bg-yellow-50">
                        ได้รับเลือก
                      </td>
                      {students.map(s => (
                        <td key={s.id} className="border border-gray-300 px-4 py-2 text-center">
                          <span className="inline-block bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full font-bold">
                            {analysis.receivedCount[s.id]}
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">แผนผังความสัมพันธ์ (อัปเดตอัตโนมัติ)</h3>
              <div className="mb-4 flex gap-4 text-sm items-center">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1 bg-red-500"></div>
                  <span>อันดับ 1</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1 bg-blue-500"></div>
                  <span>อันดับ 2</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1 bg-gray-400"></div>
                  <span>อันดับ 3</span>
                </div>
                <div className="ml-auto flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                    <span>ปกติ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                    <span>ดาวเด่น</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span>ถูกแยก</span>
                  </div>
                </div>
              </div>
              {renderVisualization()}
              <p className="text-sm text-gray-600 mt-2 text-center">
                * ขนาดของวงกลมแสดงจำนวนครั้งที่ถูกเลือก
              </p>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">จัดการนักเรียน</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-700 mb-3">เพิ่มนักเรียนใหม่</h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="รหัส (เช่น K)"
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value.toUpperCase())}
                    className="px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-32"
                  />
                  <input
                    type="text"
                    placeholder="สัญลักษณ์สำหรับหารายชื่อนักเรียน (ใส่อะไรก็ใส่ไปไม่สำคัญหรอก) "
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent flex-1"
                  />
                  <button
                    onClick={addStudent}
                    disabled={!newStudentId || !newStudentName}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    เพิ่ม
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-3">รายชื่อนักเรียน</h4>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {students.map(student => (
                    <div key={student.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-gray-200">
                      <span className="font-medium text-gray-800">
                        <span className="text-purple-600 font-bold">{student.id}</span> - {student.name}
                      </span>
                      <button
                        onClick={() => removeStudent(student.id)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1"
                        title="ลบนักเรียน"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SociogramApp;