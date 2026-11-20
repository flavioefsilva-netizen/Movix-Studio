"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, FileDown, Film, Sparkles, Loader2 } from "lucide-react";
import { PresentationData, AttachedPhoto } from "@/types/presentation";

interface ValidationBannerProps {
  presentation: PresentationData;
  photos: AttachedPhoto[];
  isValidatingOrRendering: boolean;
  onValidateAndTransformToVideo: () => void;
  onDownloadPowerPoint: () => void;
}

export function ValidationBanner({
  presentation,
  photos,
  isValidatingOrRendering,
  onValidateAndTransformToVideo,
  onDownloadPowerPoint,
}: ValidationBannerProps) {
  const slides = presentation.slides || [];
  const totalSlides = slides.length;
  const slidesWithNarration = slides.filter((s) => s.narration && s.narration.trim().length > 0).length;

  const isSlideCountOk = totalSlides >= 1;
  const isNarrationOk = slidesWithNarration === totalSlides;

  return (
    <div className="bg-white border-2 border-sky-300 rounded-2xl p-6 shadow-lg relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sky-100/60 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Left side: Checklist metrics */}
        <div className="w-full lg:w-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 rounded-md bg-sky-100 text-sky-700">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-sky-950">
              Validação da Apresentação
            </h3>
          </div>
          <p className="text-xs text-sky-800 mb-4 max-w-xl">
            Revise os slides criados e os roteiros de narração antes de transformar a sua apresentação em vídeo.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Metric 1 */}
            <div className="flex items-center gap-2.5 bg-sky-50 border border-sky-200 rounded-xl px-4 py-2.5">
              {isSlideCountOk ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <div>
                <span className="text-[11px] text-sky-800 block">Total de Slides</span>
                <span className="text-xs font-bold text-sky-950">{totalSlides} slides</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="flex items-center gap-2.5 bg-sky-50 border border-sky-200 rounded-xl px-4 py-2.5">
              {isNarrationOk ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <div>
                <span className="text-[11px] text-sky-800 block">Roteiro de Voz</span>
                <span className="text-xs font-bold text-sky-950">
                  {slidesWithNarration}/{totalSlides} narrados
                </span>
              </div>
            </div>
          </div>
        </div>


        {/* Right side: Action Buttons */}
        <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3 shrink-0">
          {/* PowerPoint download button */}
          <button
            type="button"
            onClick={onDownloadPowerPoint}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-950 border border-sky-300 text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Baixar arquivo da apresentação no formato Microsoft PowerPoint"
          >
            <FileDown className="w-4 h-4 text-orange-600" />
            <span>Baixar PowerPoint (.pptx)</span>
          </button>

          {/* CRITICAL REQUIRED BUTTON: Exact text matching user requirement */}
          <button
            type="button"
            disabled={isValidatingOrRendering}
            onClick={onValidateAndTransformToVideo}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-600 via-sky-500 to-blue-600 hover:from-sky-700 hover:via-sky-600 hover:to-blue-700 text-white font-black text-sm transition-all shadow-xl shadow-sky-500/25 hover:shadow-sky-500/35 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group border border-sky-400"
          >
            {isValidatingOrRendering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Processando e Renderizando Vídeo...</span>
              </>
            ) : (
              <>
                <Film className="w-5 h-5 group-hover:scale-110 transition-transform text-white" />
                <span className="tracking-tight uppercase sm:capitalize font-black text-white">
                  validar apresentação anexo e transformar em video
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
