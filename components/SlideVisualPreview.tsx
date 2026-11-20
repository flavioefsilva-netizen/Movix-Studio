"use client";

import React from "react";
import { SlideData } from "@/types/presentation";
import { Sparkles, CheckCircle2, ChevronRight, Layers } from "lucide-react";

interface SlideVisualPreviewProps {
  slide: SlideData;
  index: number;
  totalSlides: number;
  theme?: string;
  customBgColor?: string;
}

export function SlideVisualPreview({
  slide,
  index,
  totalSlides,
  theme = "azul-celeste",
  customBgColor = "#071A2E",
}: SlideVisualPreviewProps) {
  // Determine color scheme based on customBgColor or theme
  const bgColor = customBgColor || "#071A2E";
  const isLightBg = isColorLight(bgColor);
  const textColor = isLightBg ? "#0f172a" : "#f8fafc";
  const subtextColor = isLightBg ? "#334155" : "#94a3b8";
  const cardBg = isLightBg ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
  const cardBorder = isLightBg ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)";
  const accentColor = "#0284c7"; // sky-600

  const isTitleSlide = slide.layout === "title" || index === 0;
  const isConclusion = slide.layout === "conclusion";
  const isCards = slide.layout === "cards";
  const isSplitLeft = slide.layout === "split-left-image";
  const isSplitRight = slide.layout === "split-right-image";

  return (
    <div
      className="w-full aspect-video rounded-xl overflow-hidden relative shadow-md border flex flex-col justify-between p-3 select-none transition-transform"
      style={{
        backgroundColor: bgColor,
        borderColor: cardBorder,
      }}
    >
      {/* Top Slide Header Bar inside slide preview */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <span
            className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase"
            style={{
              backgroundColor: cardBg,
              color: textColor,
              border: `1px solid ${cardBorder}`,
            }}
          >
            Slide #{index + 1}
          </span>

          {slide.highlightTag && (
            <span
              className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest"
              style={{
                backgroundColor: `${accentColor}33`,
                color: isLightBg ? "#0369a1" : "#38bdf8",
                border: `1px solid ${accentColor}66`,
              }}
            >
              {slide.highlightTag}
            </span>
          )}
        </div>

        <span
          className="text-[9px] font-medium opacity-60"
          style={{ color: subtextColor }}
        >
          {index + 1} / {totalSlides}
        </span>
      </div>

      {/* Main Slide Graphic Content */}
      <div className="flex-1 flex flex-col justify-center py-1 z-10 overflow-hidden">
        {isTitleSlide ? (
          /* Title Slide Layout Preview */
          <div className="text-center space-y-1 max-w-[85%] mx-auto">
            <div
              className="w-5 h-0.5 mx-auto rounded-full"
              style={{ backgroundColor: accentColor }}
            />
            <h4
              className="text-xs sm:text-sm font-extrabold leading-tight line-clamp-2"
              style={{ color: textColor }}
            >
              {slide.title || `Slide ${index + 1}`}
            </h4>
            {slide.subtitle && (
              <p
                className="text-[10px] leading-snug line-clamp-1 opacity-90"
                style={{ color: subtextColor }}
              >
                {slide.subtitle}
              </p>
            )}
            <div className="pt-1 flex justify-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full opacity-40"
                style={{ backgroundColor: textColor }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full opacity-20"
                style={{ backgroundColor: textColor }}
              />
            </div>
          </div>
        ) : isCards ? (
          /* Cards Layout Preview */
          <div className="space-y-1.5">
            <h4
              className="text-[11px] font-bold line-clamp-1"
              style={{ color: textColor }}
            >
              {slide.title || `Slide ${index + 1}`}
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              {(slide.bullets.length > 0
                ? slide.bullets.slice(0, 2)
                : ["Ponto de destaque", "Segundo pilar estratégico"]
              ).map((bullet, bIdx) => (
                <div
                  key={bIdx}
                  className="rounded-lg p-1.5 text-left border flex flex-col justify-between"
                  style={{
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                  }}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <span
                      className="w-1 h-1 rounded-full shrink-0"
                      style={{ backgroundColor: accentColor }}
                    />
                    <span
                      className="text-[8px] font-bold uppercase tracking-wide opacity-75"
                      style={{ color: subtextColor }}
                    >
                      Pilar 0{bIdx + 1}
                    </span>
                  </div>
                  <span
                    className="text-[9px] font-medium line-clamp-2 leading-tight"
                    style={{ color: textColor }}
                  >
                    {bullet}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : isSplitLeft || isSplitRight ? (
          /* Split Layout Preview */
          <div className="grid grid-cols-12 gap-2 items-center">
            <div
              className={`${
                isSplitLeft ? "col-span-5 order-2" : "col-span-7"
              } space-y-1`}
            >
              <h4
                className="text-[11px] font-bold line-clamp-1"
                style={{ color: textColor }}
              >
                {slide.title || `Slide ${index + 1}`}
              </h4>
              <div className="space-y-0.5">
                {(slide.bullets.length > 0
                  ? slide.bullets.slice(0, 2)
                  : ["Visão geral", "Resultado projetado"]
                ).map((b, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-1">
                    <CheckCircle2
                      className="w-2.5 h-2.5 shrink-0"
                      style={{ color: accentColor }}
                    />
                    <span
                      className="text-[8.5px] line-clamp-1"
                      style={{ color: subtextColor }}
                    >
                      {b}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={`${
                isSplitLeft ? "col-span-7 order-1" : "col-span-5"
              } h-12 rounded-lg border flex items-center justify-center p-2 text-center`}
              style={{
                backgroundColor: cardBg,
                borderColor: cardBorder,
              }}
            >
              <div className="space-y-0.5">
                <Layers
                  className="w-3.5 h-3.5 mx-auto opacity-70"
                  style={{ color: accentColor }}
                />
                <span
                  className="text-[8px] font-semibold block leading-tight opacity-80"
                  style={{ color: subtextColor }}
                >
                  Layout PPT
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Standard / Conclusion Layout */
          <div className="space-y-1">
            <h4
              className="text-[11px] font-bold line-clamp-1"
              style={{ color: textColor }}
            >
              {slide.title || `Slide ${index + 1}`}
            </h4>
            <div className="space-y-1">
              {(slide.bullets.length > 0
                ? slide.bullets.slice(0, 3)
                : ["Conclusão executiva", "Alinhamento de próximos passos"]
              ).map((bullet, bIdx) => (
                <div
                  key={bIdx}
                  className="rounded px-1.5 py-0.5 flex items-center gap-1.5 border"
                  style={{
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                  }}
                >
                  <ChevronRight
                    className="w-2 h-2 shrink-0"
                    style={{ color: accentColor }}
                  />
                  <span
                    className="text-[8.5px] line-clamp-1"
                    style={{ color: textColor }}
                  >
                    {bullet}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Slide Bottom Bar with layout indicator badge */}
      <div className="flex items-center justify-between text-[8px] z-10 pt-1 border-t border-white/10">
        <span style={{ color: subtextColor }} className="truncate max-w-[70%] font-medium">
          {slide.subtitle || slide.title}
        </span>
        <span
          className="px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider"
          style={{
            backgroundColor: `${accentColor}22`,
            color: isLightBg ? "#0284c7" : "#7dd3fc",
          }}
        >
          {slide.layout || "slide"}
        </span>
      </div>
    </div>
  );
}

// Helper to determine if hex color is light
function isColorLight(hex: string): boolean {
  if (!hex || !hex.startsWith("#")) return false;
  const c = hex.substring(1);
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = rgb & 0xff;
  // Perceived brightness formula
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 140;
}
