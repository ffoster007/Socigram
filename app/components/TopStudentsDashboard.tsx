"use client";

import React from 'react';

interface Props {
  students: { id: string; name: string }[];
  receivedCount: { [key: string]: number };
  maxItems?: number;
}

const TopStudentsDashboard: React.FC<Props> = ({ students, receivedCount, maxItems = 5 }) => {
  const list = React.useMemo(() => {
    return students
      .map(s => ({ id: s.id, name: s.name, count: receivedCount[s.id] || 0 }))
      .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
      .slice(0, maxItems);
  }, [students, receivedCount, maxItems]);

  const maxCount = Math.max(...list.map(l => l.count), 1);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm w-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-semibold text-gray-800">นักเรียนที่เพื่อนเลือกมากที่สุด (เรียลไทม์)</h4>
        <div className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">Realtime</div>
      </div>

      <div className="space-y-3">
        {list.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="w-8 text-sm font-bold text-gray-700">{idx + 1}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium text-gray-800">
                  <span className="text-purple-600 font-bold">{item.id}</span>
                </div>
                <div className="text-sm font-semibold text-gray-700">{item.count}</div>
              </div>
              <div className="h-2 bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}

        {list.length === 0 && (
          <div className="text-sm text-gray-500">ยังไม่มีข้อมูลการเลือก</div>
        )}
      </div>
    </div>
  );
};

export default TopStudentsDashboard;