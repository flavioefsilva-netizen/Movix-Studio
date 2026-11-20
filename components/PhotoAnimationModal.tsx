"use client";

import React, { useState } from "react";
import { Sparkles, Trash2, Check, X } from "lucide-react";

interface PhotoAnimationModalProps {
  isOpen: boolean;
  photoTitle?: string;
  photoOrder?: number;
  photoThumbnail?: string;
  initialText: string;
  onSave?: (text: string) => void;
  onClose?: () => void;
  onConfirm?: (text: string) => void;
  onCancel?: () => void;
}

const PRESET_SUGGESTIONS = [
  {
    id: "zoom-in",
    label: "Zoom In Suave (Aproximação)",
    text: "Zoom in lento e contínuo em direção ao centro da imagem",
    animation: "movix-demo-zoom-in 3.5s ease-in-out infinite alternate",
  },
  {
    id: "zoom-out",
    label: "Zoom Out (Afastamento)",
    text: "Zoom out suave partindo do detalhe para revelar toda a foto",
    animation: "movix-demo-zoom-out 3.5s ease-in-out infinite alternate",
  },
  {
    id: "pan-right",
    label: "Panorâmica → Direita",
    text: "Panorâmica horizontal suave deslizando da esquerda para a direita",
    animation: "movix-demo-pan-right 3.5s ease-in-out infinite alternate",
  },
  {
    id: "pan-left",
    label: "Panorâmica ← Esquerda",
    text: "Panorâmica horizontal suave deslizando da direita para a esquerda",
    animation: "movix-demo-pan-left 3.5s ease-in-out infinite alternate",
  },
  {
    id: "pan-up",
    label: "Movimento ↑ Baixo para Cima",
    text: "Movimento vertical suave subindo de baixo para cima",
    animation: "movix-demo-pan-up 3.5s ease-in-out infinite alternate",
  },
  {
    id: "pan-down",
    label: "Movimento ↓ Cima para Baixo",
    text: "Movimento vertical suave descendo do topo para a base",
    animation: "movix-demo-pan-down 3.5s ease-in-out infinite alternate",
  },
  {
    id: "ken-burns",
    label: "Ken Burns Cinematográfico",
    text: "Efeito Ken Burns cinematográfico com zoom e deslocamento diagonal",
    animation: "movix-demo-ken-burns 3.5s ease-in-out infinite alternate",
  },
  {
    id: "subtle-rotate",
    label: "Giro Sutil com Foco",
    text: "Leve rotação de câmera combinada com aproximação progressiva",
    animation: "movix-demo-rotate 3.5s ease-in-out infinite alternate",
  },
];

export function PhotoAnimationModal({
  isOpen,
  photoThumbnail,
  initialText,
  onSave,
  onClose,
  onConfirm,
  onCancel,
}: PhotoAnimationModalProps) {
  const [animationText, setAnimationText] = useState(initialText || "");
  const [prevInitialText, setPrevInitialText] = useState(initialText);
  const [activeMotionId, setActiveMotionId] = useState<string | null>(() => {
    if (!initialText) return null;
    const match = PRESET_SUGGESTIONS.find((p) => p.text === initialText);
    return match ? match.id : "zoom-in";
  });
  const [animTriggerKey, setAnimTriggerKey] = useState(0);

  // Sync state cleanly when initialText prop changes without triggering cascading renders
  if (initialText !== prevInitialText) {
    setPrevInitialText(initialText);
    setAnimationText(initialText || "");
    const match = PRESET_SUGGESTIONS.find((p) => p.text === initialText);
    setActiveMotionId(match ? match.id : initialText ? "zoom-in" : null);
  }

  if (!isOpen) return null;

  const handleClose = () => {
    if (onCancel) onCancel();
    else if (onClose) onClose();
  };

  const handleClear = () => {
    setAnimationText("");
    setActiveMotionId(null);
  };

  const handleConfirm = () => {
    const trimmed = animationText.trim();
    if (onConfirm) onConfirm(trimmed);
    else if (onSave) onSave(trimmed);
    handleClose();
  };

  const handleSelectPreset = (preset: typeof PRESET_SUGGESTIONS[number]) => {
    setAnimationText(preset.text);
    setActiveMotionId(preset.id);
    setAnimTriggerKey((k) => k + 1);
  };

  const currentPreset = PRESET_SUGGESTIONS.find((p) => p.id === activeMotionId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <style>{`
        @keyframes movix-demo-zoom-in {
          0% { transform: scale(1.0); }
          100% { transform: scale(1.28); }
        }
        @keyframes movix-demo-zoom-out {
          0% { transform: scale(1.28); }
          100% { transform: scale(1.0); }
        }
        @keyframes movix-demo-pan-right {
          0% { transform: scale(1.15) translateX(-8%); }
          100% { transform: scale(1.15) translateX(8%); }
        }
        @keyframes movix-demo-pan-left {
          0% { transform: scale(1.15) translateX(8%); }
          100% { transform: scale(1.15) translateX(-8%); }
        }
        @keyframes movix-demo-pan-up {
          0% { transform: scale(1.15) translateY(8%); }
          100% { transform: scale(1.15) translateY(-8%); }
        }
        @keyframes movix-demo-pan-down {
          0% { transform: scale(1.15) translateY(-8%); }
          100% { transform: scale(1.15) translateY(8%); }
        }
        @keyframes movix-demo-ken-burns {
          0% { transform: scale(1.0) translate(-4%, -4%); }
          100% { transform: scale(1.25) translate(4%, 4%); }
        }
        @keyframes movix-demo-rotate {
          0% { transform: scale(1.08) rotate(-2.5deg); }
          100% { transform: scale(1.2) rotate(2.5deg); }
        }
      `}</style>

      <div
        className="bg-white border-2 border-sky-300 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Clean: without "Personalizar movimentos para Foto #1" or "Movimento de Câmera") */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-sky-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 border border-sky-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-sky-950">
                Animação da Foto
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl hover:bg-sky-100 text-sky-700 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Widescreen Photo Live Demonstration (NO text on photo, pure photo executing motion) */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border-2 border-sky-300 shadow-md">
          {photoThumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${activeMotionId || "none"}-${animTriggerKey}`}
              src={photoThumbnail}
              alt="Demonstração da Foto"
              className="w-full h-full object-cover"
              style={{
                animation: currentPreset ? currentPreset.animation : "none",
                transformOrigin: "center center",
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-sky-300">
              <Sparkles className="w-8 h-8 opacity-60 mb-1" />
              <span className="text-xs font-semibold">Sem foto para demonstração</span>
            </div>
          )}
        </div>

        {/* Sugestões Rápidas de Movimento */}
        <div className="space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-800 block">
            Sugestões Rápidas de Movimento:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
            {PRESET_SUGGESTIONS.map((sug) => {
              const isSelected = activeMotionId === sug.id;
              return (
                <button
                  key={sug.id}
                  type="button"
                  onClick={() => handleSelectPreset(sug)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border shadow-2xs ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400 font-black scale-[1.02]"
                      : "bg-sky-50/80 hover:bg-sky-100 text-sky-950 border-sky-300"
                  }`}
                  title={sug.text}
                >
                  {sug.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions: Limpar, Cancelar e OK */}
        <div className="pt-2 border-t border-sky-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-red-300 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs"
            title="Limpar animação da foto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpar</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold text-xs sm:text-sm border border-sky-300 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/30 border border-emerald-500 transition-all cursor-pointer"
              title="Salvar animação da foto"
            >
              <Check className="w-4 h-4" />
              <span>OK</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
