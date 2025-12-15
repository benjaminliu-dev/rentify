"use client";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { ThemeProvider } from "../contexts/ThemeContext";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Sidebar />
      <div className="ml-64">
        <Navbar />
        {children}
      </div>
    </ThemeProvider>
  );
}

