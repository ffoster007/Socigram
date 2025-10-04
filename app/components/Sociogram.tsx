"use client";
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

type Node = {
  id: string;
  name: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

type Link = {
  source: string;
  target: string;
};

type D3Node = Node & d3.SimulationNodeDatum;
type D3Link = d3.SimulationLinkDatum<D3Node> & { source: string | D3Node; target: string | D3Node };

export default function Sociogram() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [nodes, setNodes] = useState<Node[]>([
    { id: "1", name: "บุคคล 1" },
    { id: "2", name: "บุคคล 2" },
    { id: "3", name: "บุคคล 3" },
  ]);
  const [links, setLinks] = useState<Link[]>([
    { source: "1", target: "2" },
    { source: "2", target: "3" },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nameField, setNameField] = useState("");
  const [countField, setCountField] = useState(1);

  // init simulation
  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    // sanitize links: convert any source/target that are names into node references
    const safeLinks: D3Link[] = links
      .map((l) => {
        const resolve = (v: string | D3Node) => {
          if (typeof v !== "string") return v as D3Node;
          const byId = nodes.find((n) => n.id === v);
          if (byId) return byId as D3Node;
          const byName = nodes.find((n) => n.name === v);
          if (byName) return byName as D3Node;
          return null;
        };

        const s = resolve(l.source as string);
        const t = resolve(l.target as string);
        if (s && t) return { source: s, target: t } as D3Link;
        return null;
      })
      .filter((x): x is D3Link => x !== null);

    const simulation = d3
      .forceSimulation<D3Node>(nodes as unknown as D3Node[])
      .force(
        "link",
        d3
          .forceLink<D3Node, D3Link>(safeLinks)
          .id((d: D3Node) => d.id)
          .distance(120)
      )
      .force("charge", d3.forceManyBody<D3Node>().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .on("tick", ticked);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const linkG = svg.append("g").attr("class", "links");
    const nodeG = svg.append("g").attr("class", "nodes");

    const link = linkG
      .selectAll<SVGLineElement, D3Link>("line")
      .data(safeLinks)
      .enter()
      .append("line")
      .attr("stroke", "#9CA3AF")
      .attr("stroke-width", 1.5);

    const node = nodeG
      .selectAll<SVGGElement, D3Node>("g")
      .data(nodes as unknown as D3Node[], (d) => (d as D3Node).id);
    
    // Remove old nodes
    node.exit().remove();
    
    // Update existing nodes
    node.select("text").text((d: D3Node) => d.name);
    
    // Add new nodes
    const nodeEnter = node.enter()
      .append("g")
      .call(
        d3
          .drag<SVGGElement, D3Node>()
          .on("start", (event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", (_event: unknown, d: D3Node) => {
        setSelectedId(d.id);
        setNameField(d.name);
      });

    nodeEnter
      .append("circle")
      .attr("r", 36)
      .attr("fill", "#60A5FA")
      .attr("stroke", "#1E3A8A")
      .attr("stroke-width", 2);

    nodeEnter
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("font-size", 12)
      .attr("fill", "#071422")
      .text((d: D3Node) => d.name);

    function ticked() {
      link
        .attr("x1", (d: D3Link) => (d.source as D3Node).x as number)
        .attr("y1", (d: D3Link) => (d.source as D3Node).y as number)
        .attr("x2", (d: D3Link) => (d.target as D3Node).x as number)
        .attr("y2", (d: D3Link) => (d.target as D3Node).y as number);

      node.attr("transform", (d: D3Node) => `translate(${d.x},${d.y})`);
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  function addPeople() {
    const newNodes: Node[] = [];
    const currentMax = nodes.length;
    const startIndex = currentMax + 1;
    for (let i = 0; i < countField; i++) {
      const id = String(startIndex + i);
      newNodes.push({ id, name: `บุคคล ${id}` });
    }
    setNodes((s) => [...s, ...newNodes]);
  }

  function updateSelected() {
    if (!selectedId) return;
    setNodes((s) => s.map((n) => (n.id === selectedId ? { ...n, name: nameField } : n)));
  }

  function deleteSelected() {
    if (!selectedId) return;
    setNodes((s) => s.filter((n) => n.id !== selectedId));
    setLinks((l) => l.filter((ln) => ln.source !== selectedId && ln.target !== selectedId));
    setSelectedId(null);
    setNameField("");
  }

  function connect(aId: string, bId: string) {
    if (aId === bId) return;
    // avoid duplicates
    if (links.some((l) => (l.source === aId && l.target === bId) || (l.source === bId && l.target === aId))) return;
    setLinks((l) => [...l, { source: aId, target: bId }]);
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6 bg-white/80 dark:bg-black/60 rounded-xl shadow-lg">
      <h2 className="text-2xl font-semibold mb-4">Sociogram (แผนผังสังคมมิติ)</h2>

      <div className="flex gap-4 mb-4 flex-col sm:flex-row">
        <div className="flex gap-2 items-center">
          <label className="text-sm">จำนวนคนที่จะเพิ่ม:</label>
          <input
            value={countField}
            onChange={(e) => setCountField(Number(e.target.value) || 1)}
            type="number"
            min={1}
            className="border px-2 py-1 rounded w-20"
          />
          <button onClick={addPeople} className="px-3 py-1 bg-sky-600 text-white rounded">เพิ่ม</button>
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-sm">แก้ไขชื่อ:</label>
          <input
            value={nameField}
            onChange={(e) => setNameField(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && updateSelected()}
            placeholder="เลือกโหนดด้านบนเพื่อแก้ไข"
            className="border px-2 py-1 rounded"
          />
          <button onClick={updateSelected} className="px-3 py-1 bg-amber-500 text-white rounded">บันทึก</button>
          <button onClick={deleteSelected} className="px-3 py-1 bg-red-600 text-white rounded">ลบ</button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <svg ref={svgRef} className="w-full h-[520px] bg-gradient-to-br from-white to-sky-50 rounded" />
        </div>

        <aside className="w-72 p-3 border-l">
          <h3 className="font-medium mb-2">รายการบุคคล</h3>
          <div className="flex flex-col gap-2 max-h-[420px] overflow-auto pr-2">
            {nodes.map((n) => (
              <div
                key={n.id}
                className={`p-2 rounded flex items-center justify-between cursor-pointer ${selectedId === n.id ? "bg-sky-100" : "hover:bg-slate-50"}`}
                onClick={() => {
                  setSelectedId(n.id);
                  setNameField(n.name);
                }}
              >
                <div>
                  <div className="font-medium">{n.name}</div>
                  <div className="text-xs text-gray-500">id: {n.id}</div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const other = prompt("เชื่อมต่อกับ id ใด (พิมพ์ id เช่น 3)");
                      if (other) connect(n.id, other);
                    }}
                    className="px-2 py-1 bg-green-500 text-white rounded text-sm"
                  >
                    เชื่อม
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setNodes((s) => s.filter((x) => x.id !== n.id));
                      setLinks((l) => l.filter((ln) => ln.source !== n.id && ln.target !== n.id));
                      if (selectedId === n.id) setSelectedId(null);
                    }}
                    className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
