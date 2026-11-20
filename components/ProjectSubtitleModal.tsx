"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Film, X } from "lucide-react";

interface ProjectSubtitleModalProps {
  isOpen: boolean;
  projectName: string;
  initialSubtitle?: string;
  isEditing?: boolean;
  onConfirm: (chosenName: string) => void;
  onCancel: () => void;
}

export function ProjectSubtitleModal({
  isOpen,
  projectName,
  initialSubtitle = "",
  isEditing = false,
  onConfirm,
  onCancel,
}: ProjectSubtitleModalProps) {
  const [videoName, setVideoName] = useState(initialSubtitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setVideoName(initialSubtitle || (isEditing ? projectName : ""));
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialSubtitle, isEditing, projectName]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName =
      videoName.trim() || (isEditing && projectName ? projectName : "Meu Vídeo");
    onConfirm(finalName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onKeyDown={handleKeyDown}
    >
      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-white border-2 border-sky-400 rounded-3xl p-6 sm:p-8 shadow-2xl text-left space-y-6 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-5 right-5 p-2 rounded-xl text-sky-700 hover:text-sky-950 hover:bg-sky-100 transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-2 pr-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-900 text-xs font-bold border border-sky-300">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>
              {isEditing && projectName ? `EDITANDO: ${projectName}` : "NOME DO PROJETO"}
            </span>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm sm:text-base font-black text-sky-950 mb-2">
              Escolha o nome do seu video
            </label>
            <input
              ref={inputRef}
              type="text"
              value={videoName}
              onChange={(e) => setVideoName(e.target.value)}
              placeholder="Ex: Apresentação Corporativa • Meu Vídeo"
              className="w-full bg-sky-50 border-2 border-sky-300 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-400/20 rounded-xl px-4 py-3 text-sm text-sky-950 placeholder-sky-400 outline-none transition-all font-medium"
            />
            <p className="text-[11px] text-sky-700 mt-1.5">
              Dica: Você pode usar títulos descritivos, temas, datas ou nomes de clientes.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold text-xs sm:text-sm transition-all cursor-pointer border border-sky-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-600 via-sky-500 to-blue-600 hover:from-sky-700 hover:via-sky-600 hover:to-blue-700 text-white font-black text-xs sm:text-sm shadow-xl shadow-sky-500/25 hover:shadow-sky-500/35 transition-all cursor-pointer"
            >
              <Film className="w-4 h-4 stroke-[2.5]" />
              <span>Confirmar e Gerar Vídeo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
