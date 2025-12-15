"use client";

import Navbar from "./Navbar";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

