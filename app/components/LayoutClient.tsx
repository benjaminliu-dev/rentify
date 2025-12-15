"use client";

import Navbar from "./Navbar";
import { ThemeProvider } from "../contexts/ThemeContext";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Navbar />
      {children}
    </ThemeProvider>
  );
}

