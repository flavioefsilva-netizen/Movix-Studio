"use client";

import React, { useEffect, useRef, useState } from "react";
import { TransitionType } from "@/types/presentation";
import { Eye } from "lucide-react";

interface TransitionPreviewProps {
  transitionType: TransitionType;
}

// 6 beautiful, high-contrast, robust landscape illustrations rendered directly as SVG vector elements
function LandscapeIllustration({ index }: { index: number }) {
  switch (index % 6) {
    case 0:
      return (
        <svg
          viewBox="0 0 600 340"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="ls-sky-1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0284C7" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#BAE6FD" />
            </linearGradient>
            <linearGradient id="ls-mtn-1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0369A1" />
              <stop offset="100%" stopColor="#075985" />
            </linearGradient>
            <linearGradient id="ls-mtn-2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
          </defs>
          <rect width="600" height="340" fill="url(#ls-sky-1)" />
          <circle cx="480" cy="80" r="38" fill="#FEF08A" opacity="0.95" />
          <polygon points="40,340 220,130 380,340" fill="url(#ls-mtn-1)" />
          <polygon points="180,340 360,90 540,340" fill="url(#ls-mtn-2)" />
          <polygon points="340,340 470,160 590,340" fill="#0C4A6E" />
          <polygon points="220,130 195,165 245,165" fill="#F0F9FF" opacity="0.95" />
          <polygon points="360,90 325,135 395,135" fill="#F0F9FF" opacity="0.95" />
          <path d="M0,280 Q150,260 300,285 T600,270 L600,340 L0,340 Z" fill="#0369A1" />
        </svg>
      );

    case 1:
      return (
        <svg
          viewBox="0 0 600 340"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="ls-sky-2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#EA580C" />
              <stop offset="40%" stopColor="#F97316" />
              <stop offset="75%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#F43F5E" />
            </linearGradient>
            <linearGradient id="ls-lake" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C2410C" />
              <stop offset="100%" stopColor="#7C2D12" />
            </linearGradient>
          </defs>
          <rect width="600" height="340" fill="url(#ls-sky-2)" />
          <circle cx="300" cy="180" r="48" fill="#FFFBEB" opacity="0.95" />
          <rect y="210" width="600" height="130" fill="url(#ls-lake)" />
          <ellipse cx="300" cy="235" rx="65" ry="12" fill="#FEF08A" opacity="0.75" />
          <ellipse cx="300" cy="265" rx="90" ry="14" fill="#FEF08A" opacity="0.55" />
          <ellipse cx="300" cy="300" rx="120" ry="16" fill="#FEF08A" opacity="0.35" />
          <polygon points="30,220 50,140 70,220" fill="#431407" />
          <polygon points="55,220 75,120 95,220" fill="#292524" />
          <polygon points="520,220 540,130 560,220" fill="#431407" />
          <polygon points="545,220 565,150 585,220" fill="#292524" />
        </svg>
      );

    case 2:
      return (
        <svg
          viewBox="0 0 600 340"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="ls-sky-3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#A7F3D0" />
            </linearGradient>
            <linearGradient id="ls-hill-1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#047857" />
              <stop offset="100%" stopColor="#065F46" />
            </linearGradient>
            <linearGradient id="ls-hill-2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
          <rect width="600" height="340" fill="url(#ls-sky-3)" />
          <circle cx="120" cy="85" r="38" fill="#FEF9C3" opacity="0.95" />
          <path d="M0,220 Q200,140 400,210 T600,190 L600,340 L0,340 Z" fill="url(#ls-hill-1)" />
          <path d="M0,260 Q180,200 360,270 T600,240 L600,340 L0,340 Z" fill="url(#ls-hill-2)" />
          <polygon points="120,270 140,180 160,270" fill="#064E3B" />
          <polygon points="145,280 165,190 185,280" fill="#022C22" />
          <polygon points="260,260 280,170 300,260" fill="#064E3B" />
          <polygon points="460,250 480,160 500,250" fill="#064E3B" />
        </svg>
      );

    case 3:
      return (
        <svg
          viewBox="0 0 600 340"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="ls-sky-4" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0284C7" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#E0F2FE" />
            </linearGradient>
            <linearGradient id="ls-ocean" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0369A1" />
              <stop offset="100%" stopColor="#0C4A6E" />
            </linearGradient>
            <linearGradient id="ls-sand" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#FACC15" />
            </linearGradient>
          </defs>
          <rect width="600" height="340" fill="url(#ls-sky-4)" />
          <circle cx="500" cy="70" r="32" fill="#FFFBEB" />
          <rect y="160" width="600" height="100" fill="url(#ls-ocean)" />
          <path d="M0,230 Q250,210 600,245 L600,340 L0,340 Z" fill="url(#ls-sand)" />
          <path d="M70,340 Q95,240 110,140 Q112,130 115,140" stroke="#78350F" strokeWidth="8" fill="none" />
          <ellipse cx="115" cy="130" rx="35" ry="8" fill="#15803D" transform="rotate(-20 115 130)" />
          <ellipse cx="115" cy="130" rx="35" ry="8" fill="#15803D" transform="rotate(30 115 130)" />
          <ellipse cx="115" cy="130" rx="30" ry="7" fill="#166534" transform="rotate(80 115 130)" />
        </svg>
      );

    case 4:
      return (
        <svg
          viewBox="0 0 600 340"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="ls-sky-5" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9A3412" />
              <stop offset="40%" stopColor="#C2410C" />
              <stop offset="100%" stopColor="#FDBA74" />
            </linearGradient>
            <linearGradient id="ls-dune-1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#9A3412" />
            </linearGradient>
            <linearGradient id="ls-dune-2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#C2410C" />
            </linearGradient>
          </defs>
          <rect width="600" height="340" fill="url(#ls-sky-5)" />
          <circle cx="280" cy="135" r="42" fill="#FEF08A" opacity="0.95" />
          <path d="M0,200 Q150,160 320,230 T600,190 L600,340 L0,340 Z" fill="url(#ls-dune-1)" />
          <path d="M0,250 Q200,210 420,280 T600,240 L600,340 L0,340 Z" fill="url(#ls-dune-2)" />
        </svg>
      );

    case 5:
    default:
      return (
        <svg
          viewBox="0 0 600 340"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="ls-sky-6" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="60%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
            <linearGradient id="ls-rock" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>
            <linearGradient id="ls-water" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>
          <rect width="600" height="340" fill="url(#ls-sky-6)" />
          <polygon points="0,80 180,80 230,340 0,340" fill="url(#ls-rock)" />
          <polygon points="420,100 600,100 600,340 370,340" fill="url(#ls-rock)" />
          <rect x="250" y="110" width="90" height="230" fill="url(#ls-water)" opacity="0.95" />
          <ellipse cx="295" cy="330" rx="90" ry="15" fill="#E0F2FE" opacity="0.85" />
        </svg>
      );
  }
}

export function TransitionPreview({ transitionType }: TransitionPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0); // 0 to 5 (6 photos)
  const [nextSlide, setNextSlide] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0); // 0 to 1
  const [isPlaying, setIsPlaying] = useState(true);

  const totalPhotos = 6;
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const timerRef = useRef<number>(0);

  // Play animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const DURATION_HOLD_MS = 2400; // Hold photo for 2.4s
    const DURATION_TRANS_MS = 900; // Transition duration 0.9s

    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      const dt = time - lastTimeRef.current;
      lastTimeRef.current = time;
      timerRef.current += dt;

      if (!isTransitioning) {
        if (timerRef.current >= DURATION_HOLD_MS) {
          timerRef.current = 0;
          setIsTransitioning(true);
          setTransitionProgress(0);
          setNextSlide((currentSlide + 1) % totalPhotos);
        }
      } else {
        const p = Math.min(1.0, timerRef.current / DURATION_TRANS_MS);
        setTransitionProgress(p);

        if (p >= 1.0) {
          timerRef.current = 0;
          setIsTransitioning(false);
          setTransitionProgress(0);
          setCurrentSlide((prev) => (prev + 1) % totalPhotos);
        }
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, isTransitioning, currentSlide, totalPhotos]);

  // Handle transition styling based on transitionType
  const getStyles = () => {
    const p = transitionProgress;

    switch (transitionType) {
      case "none":
        return {
          current: { opacity: p < 0.5 ? 1 : 0 },
          next: { opacity: p >= 0.5 ? 1 : 0 },
        };

      case "fade":
        return {
          current: { opacity: 1 - p },
          next: { opacity: p },
        };

      case "slide-left":
        return {
          current: {
            transform: `translateX(-${p * 100}%)`,
            opacity: 1,
          },
          next: {
            transform: `translateX(${100 - p * 100}%)`,
            opacity: 1,
          },
        };

      case "slide-right":
        return {
          current: {
            transform: `translateX(${p * 100}%)`,
            opacity: 1,
          },
          next: {
            transform: `translateX(-${100 - p * 100}%)`,
            opacity: 1,
          },
        };

      case "zoom":
        return {
          current: {
            transform: `scale(${1.0 + p * 0.25})`,
            opacity: 1 - p,
          },
          next: {
            transform: `scale(${0.85 + p * 0.15})`,
            opacity: p,
          },
        };

      case "wipe":
        return {
          current: {
            clipPath: `inset(0 ${p * 100}% 0 0)`,
            opacity: 1,
          },
          next: {
            clipPath: `inset(0 0 0 ${100 - p * 100}%)`,
            opacity: 1,
          },
        };

      default:
        return {
          current: { opacity: 1 - p },
          next: { opacity: p },
        };
    }
  };

  const styles = getStyles();

  return (
    <div className="bg-sky-50/70 border border-sky-300 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
      <div className="flex items-center justify-between pb-1.5 border-b border-sky-200">
        <div className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-sky-600" />
          <span className="text-xs font-bold text-sky-950">
            Demonstração de Transição
          </span>
        </div>
      </div>

      {/* Screen Frame: light celestial background so it never flashes black */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-sky-200 border-2 border-sky-400 shadow-md">
        {/* Next Slide (prepared underneath or sliding in) */}
        <div
          className="absolute inset-0 transition-none will-change-transform"
          style={styles.next}
        >
          <LandscapeIllustration index={nextSlide} />
        </div>

        {/* Current Slide */}
        <div
          className="absolute inset-0 transition-none will-change-transform"
          style={styles.current}
        >
          <LandscapeIllustration index={currentSlide} />
        </div>

        {/* Contador de fotos de 1 a 6 no canto inferior direito da foto */}
        <div className="absolute bottom-2.5 right-2.5 z-20">
          <span className="px-2.5 py-1 rounded-lg bg-sky-950/90 backdrop-blur-xs text-xs font-black text-white border border-sky-400/50 shadow-md">
            Foto {currentSlide + 1} de {totalPhotos}
          </span>
        </div>
      </div>
    </div>
  );
}
