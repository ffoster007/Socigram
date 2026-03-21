import type { NextConfig } from "next";

const nextConfig = {
  output: 'export',        // ← ต้องมี
  images: {
    unoptimized: true      // ← ต้องมี
  },
  assetPrefix: './',       // ← เพิ่มนี้ด้วย สำคัญมากสำหรับ Electron
}

export default nextConfig as NextConfig;

// ============== เผื่อ Error ใช้ โค๊ดนี้ ====================

// const nextConfig = {
//   output: 'export',        // ← ต้องมี
//   images: {
//     unoptimized: true      // ← ต้องมี
//   },
//   assetPrefix: './',       // ← เพิ่มนี้ด้วย สำคัญมากสำหรับ Electron
// }

// export default nextConfig