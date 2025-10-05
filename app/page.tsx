"use client";
import React from "react";
import Sociogram from "./components/Sociogram";
import { Analytics } from "@vercel/analytics/next"

export default function Page() {
  return (
    <>
    <Analytics />
    <main className="p-6">
      <Sociogram />
    </main>
    </>
  );
}
