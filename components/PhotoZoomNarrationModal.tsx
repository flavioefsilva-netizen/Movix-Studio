"use client";

import React, { useState, useRef } from "react";
import { Check, ChevronLeft, ChevronRight, Image as ImageIcon, Save, X } from "lucide-react";
import { PhotoStoryItem } from "@/types/presentation";

interface PhotoZoomNarrationModalProps {
  isOpen: boolean;
  items: PhotoStoryItem[];
  initialItemId?: string;
  onSavePhoto: (id: string, text: string) => void;
  onConfirmAll: (textsById: Record<string, string>) => void;
  onClose: () => void;
}

export function PhotoZoomNarrationModal({
  isOpen,
  items,
  initialItemId,
  onSavePhoto,
  onConfirmAll,
  onClose,
}: PhotoZoomNarrationModalProps) {
  const [activeId, setActiveId] = useState<string>(() => {
    if (initialItemId && items.some((it) => it.id === initialItemId)) {
      return initialItemId;
    }
    return items[0]?.id || "";
  });

  const [draftTexts, setDraftTexts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const item of items) {
      map[item.id] = item.narration || "";
    }
    return map;
  });

  const [savedFlags, setSavedFlags] = useState<Record<string, boolean>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen || items.length === 0) return null;

  const currentIndex = Math.max(
    0,
    items.findIndex((it) => it.id === activeId)
  );
  const currentItem = items[currentIndex] || items[0];
  const currentText =
    draftTexts[currentItem.id] !== undefined
      ? draftTexts[currentItem.id]
      : currentItem.narration || "";
  const isCurrentSaved = Boolean(savedFlags[currentItem.id]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  const handlePrev = () => {
    if (!hasPrev) return;
    setActiveId(items[currentIndex - 1].id);
  };

  const handleNext = () => {
    if (!hasNext) return;
    setActiveId(items[currentIndex + 1].id);
  };

  const handleTextChange = (newValue: string) => {
    setDraftTexts((prev) => ({
      ...prev,
      [currentItem.id]: newValue,
    }));
    setSavedFlags((prev) => ({
      ...prev,
      [currentItem.id]: false,
    }));
  };

  const handleSaveCurrent = () => {
    onSavePhoto(currentItem.id, currentText);
    setSavedFlags((prev) => ({
      ...prev,
      [currentItem.id]: true,
    }));
  };

  const handleConfirmAll = () => {
    onConfirmAll(draftTexts);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (targetTag === "textarea") return;

    if (e.key === "ArrowLeft" && hasPrev) {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight" && hasNext) {
      e.preventDefault();
      handleNext();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-sky-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      {/* Janela 20% menor que a anterior (656px vs 820px) */}
      <div
        className="bg-white border-2 border-sky-300 rounded-3xl p-4 sm:p-5 w-full max-w-[656px] max-h-[92vh] overflow-y-auto shadow-2xl space-y-3.5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com número, posição e nome da foto */}
        <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-sky-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-sky-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
              {currentItem.order}
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <ImageIcon className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="text-xs sm:text-sm font-black text-sky-950 truncate">
                {currentItem.photo?.name || currentItem.title || `Foto ${currentItem.order}`}
              </span>
            </div>
            <span className="text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full shrink-0">
              {currentIndex + 1} / {items.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-sky-100 text-sky-700 transition-colors cursor-pointer shrink-0"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Foto ampliada com setas laterais esquerda e direita */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!hasPrev}
            aria-label="Foto anterior"
            title="Foto anterior"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-950 border-2 border-sky-300 flex items-center justify-center shrink-0 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0 aspect-video rounded-2xl overflow-hidden bg-slate-950 border-2 border-sky-300 shadow-lg flex items-center justify-center">
            {currentItem.photo?.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentItem.photo.dataUrl}
                alt={currentItem.photo?.name || `Foto ${currentItem.order}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <ImageIcon className="w-10 h-10 text-sky-400" />
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={!hasNext}
            aria-label="Próxima foto"
            title="Próxima foto"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-950 border-2 border-sky-300 flex items-center justify-center shrink-0 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Campo de texto embaixo da foto */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-extrabold uppercase tracking-wide text-sky-950 block">
              Texto de Narração da Foto (Opcional)
            </label>
            {isCurrentSaved && (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                Texto salvo
              </span>
            )}
          </div>
          <textarea
            ref={textareaRef}
            rows={3}
            autoFocus
            value={currentText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Digite o texto que será narrado no vídeo durante a exibição desta foto (opcional, pode ficar vazio)..."
            className={`w-full rounded-xl p-3 text-xs sm:text-sm placeholder:text-sky-400 focus:outline-none focus:ring-1 leading-relaxed resize-y font-sans shadow-2xs border-2 transition-colors ${
              isCurrentSaved
                ? "bg-emerald-100/80 focus:bg-emerald-100/80 border-emerald-400 focus:border-emerald-500 text-emerald-950 focus:ring-emerald-500"
                : "bg-white focus:bg-white border-sky-300 focus:border-sky-600 text-sky-950 focus:ring-sky-500"
            }`}
          />
        </div>

        {/* Rodapé: Botão Salvar no canto inferior esquerdo e Confirmar no canto inferior direito */}
        <div className="pt-2.5 border-t border-sky-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSaveCurrent}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs sm:text-sm shadow-md shadow-sky-600/25 border border-sky-500 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar</span>
          </button>

          <button
            type="button"
            onClick={handleConfirmAll}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/30 border border-emerald-500 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Confirmar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
