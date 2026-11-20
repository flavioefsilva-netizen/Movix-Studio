"use client";

import React from "react";
import { Film, Presentation, Sparkles, CheckCircle2 } from "lucide-react";

interface NavbarProps {
  onOpenTelegram?: () => void;
  activeStep: "input" | "slides" | "video";
}

export function Navbar({ activeStep }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-sky-200/80 bg-sky-100/90 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 via-sky-500 to-blue-600 p-0.5 shadow-md shadow-sky-400/30">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
              <Film className="w-5 h-5 text-sky-600" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-sky-950">MOVIX Studio</span>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
