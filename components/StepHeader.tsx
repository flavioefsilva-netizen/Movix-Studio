"use client";

import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface StepHeaderProps {
  stepNumber: number;
  totalSteps?: number;
  stepTitle: string;
  onBack?: () => void;
  onNext?: () => void;
  isNextDisabled?: boolean;
  backLabel?: string;
  nextLabel?: string;
}

export function StepHeader({
  stepNumber,
  totalSteps = 8,
  stepTitle,
  onBack,
  onNext,
  isNextDisabled = false,
  backLabel = "Voltar",
  nextLabel = "Seguir",
}: StepHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3 p-3.5 sm:p-4 bg-sky-100/90 border-2 border-sky-300 rounded-2xl mb-6 shadow-sm">
      {/* Botão VOLTAR */}
      <div className="w-24 sm:w-32 flex justify-start">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-white hover:bg-sky-50 text-sky-950 font-extrabold text-xs border border-sky-300 shadow-xs transition-all cursor-pointer hover:border-sky-400"
            title="Voltar para a etapa anterior"
          >
            <ArrowLeft className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-sky-700" />
            <span>{backLabel}</span>
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {/* Indicador Central da Etapa */}
      <div className="text-center flex-1 min-w-0 px-1 sm:px-2">
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-sky-800 block truncate">
          Passo {stepNumber} de {totalSteps}
        </span>
        <h2 className="text-xs sm:text-base font-black text-sky-950 tracking-tight truncate">
          {stepTitle}
        </h2>
      </div>

      {/* Botão SEGUIR */}
      <div className="w-24 sm:w-32 flex justify-end">
        {onNext ? (
          <button
            type="button"
            disabled={isNextDisabled}
            onClick={onNext}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-35 disabled:cursor-not-allowed text-white font-black text-xs shadow-md shadow-sky-600/25 transition-all cursor-pointer border border-sky-500"
            title="Avançar para a próxima etapa"
          >
            <span>{nextLabel}</span>
            <ArrowRight className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-white" />
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>
    </div>
  );
}

export interface StepNavigationFooterProps {
  stepNumber: number;
  totalSteps?: number;
  onBack?: () => void;
  onNext?: () => void;
  isNextDisabled?: boolean;
  backLabel?: string;
  nextLabel?: string;
}

export function StepNavigationFooter({
  stepNumber,
  totalSteps = 8,
  onBack,
  onNext,
  isNextDisabled = false,
  backLabel = "Voltar",
  nextLabel = "Seguir",
}: StepNavigationFooterProps) {
  return (
    <div className="pt-4 mt-8 mb-2 border-t border-sky-200 flex md:hidden items-center justify-between gap-3">
      {/* Botão VOLTAR no final do quadrante */}
      <div className="flex-1 max-w-[140px] sm:max-w-[160px]">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-950 font-extrabold text-xs sm:text-sm border border-sky-300 shadow-xs transition-all cursor-pointer"
            title="Voltar para a etapa anterior"
          >
            <ArrowLeft className="w-4 h-4 text-sky-700 shrink-0" />
            <span className="truncate">{backLabel}</span>
          </button>
        ) : (
          <div className="w-full" />
        )}
      </div>

      {/* Indicador Central Compacto */}
      <div className="text-center px-1">
        <span className="text-[10px] sm:text-xs font-black text-sky-800 uppercase tracking-wider block">
          Passo {stepNumber} de {totalSteps}
        </span>
      </div>

      {/* Botão SEGUIR no final do quadrante */}
      <div className="flex-1 max-w-[140px] sm:max-w-[160px] flex justify-end">
        {onNext ? (
          <button
            type="button"
            disabled={isNextDisabled}
            onClick={onNext}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-35 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm shadow-md shadow-sky-600/30 transition-all cursor-pointer border border-sky-500"
            title="Avançar para a próxima etapa"
          >
            <span className="truncate">{nextLabel}</span>
            <ArrowRight className="w-4 h-4 text-white shrink-0" />
          </button>
        ) : (
          <div className="w-full" />
        )}
      </div>
    </div>
  );
}
