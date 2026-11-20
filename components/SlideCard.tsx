"use client";

import React, { useState } from "react";
import {
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ChevronRight,
  Layout,
} from "lucide-react";
import { SlideData, VoiceGender, VoicePitch, VoiceMood } from "@/types/presentation";
import { SlideVisualPreview } from "./SlideVisualPreview";
import { playVoiceSample, stopVoiceSample } from "@/lib/voice-utils";

interface SlideCardProps {
  slide: SlideData;
  index: number;
  totalSlides: number;
  theme?: string;
  customBgColor?: string;
  voiceGender?: VoiceGender;
  voiceId?: string;
  voicePitch?: VoicePitch;
  voiceMood?: VoiceMood;
  onUpdateSlide: (updated: SlideData) => void;
  onDeleteSlide: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function SlideCard({
  slide,
  index,
  totalSlides,
  theme = "azul-celeste",
  customBgColor = "#071A2E",
  voiceGender,
  voiceId,
  voicePitch,
  voiceMood,
  onUpdateSlide,
  onDeleteSlide,
  onMoveUp,
  onMoveDown,
}: SlideCardProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);

  // Play narration audio preview via Gemini TTS / speech sample with selected voice
  const handleToggleVoicePreview = () => {
    if (isPlayingAudio) {
      stopVoiceSample();
      setIsPlayingAudio(false);
      return;
    }

    stopVoiceSample();
    const textToSpeak = slide.narration || slide.title;
    setIsPlayingAudio(true);

    playVoiceSample(
      textToSpeak,
      {
        gender: voiceGender || "female",
        voiceId: voiceId || "helena",
        pitch: voicePitch || "natural",
        mood: voiceMood || "corporativo",
      },
      {
        onEnd: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false),
      }
    );
  };


  const handleAddBullet = () => {
    const updatedBullets = [...slide.bullets, "Novo ponto importante"];
    onUpdateSlide({ ...slide, bullets: updatedBullets });
  };

  const handleUpdateBullet = (bIdx: number, val: string) => {
    const updatedBullets = [...slide.bullets];
    updatedBullets[bIdx] = val;
    onUpdateSlide({ ...slide, bullets: updatedBullets });
  };

  const handleRemoveBullet = (bIdx: number) => {
    const updatedBullets = slide.bullets.filter((_, i) => i !== bIdx);
    onUpdateSlide({ ...slide, bullets: updatedBullets });
  };

  const wordCount = (slide.narration || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="bg-white border-2 border-sky-300 hover:border-sky-500 rounded-3xl p-5 shadow-md hover:shadow-lg transition-all flex flex-col justify-between space-y-4">
      {/* 1. Header Toolbar: Slide number, badges & reorder/delete actions */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-sky-100">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-900 font-extrabold text-xs flex items-center justify-center border border-sky-300">
            #{index + 1}
          </span>
          <h4 className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
            Slide {index + 1} de {totalSlides}
            {slide.highlightTag && (
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                {slide.highlightTag}
              </span>
            )}
          </h4>
        </div>

        {/* Action Buttons: Move Up, Move Down, Delete */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 disabled:opacity-30 text-sky-900 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Mover slide para cima"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalSlides - 1}
            className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 disabled:opacity-30 text-sky-900 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Mover slide para baixo"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDeleteSlide}
            disabled={totalSlides <= 1}
            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 disabled:opacity-30 text-red-600 border border-red-200 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Excluir slide"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. NO TOPO DE CADA QUADRANTE: Imagem visual de alta fidelidade do slide */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-bold text-sky-950 uppercase tracking-wide">
            Imagem do Slide
          </label>
          <span className="text-[10px] text-sky-700">Preview 16:9 PowerPoint</span>
        </div>
        <SlideVisualPreview
          slide={slide}
          index={index}
          totalSlides={totalSlides}
          theme={theme}
          customBgColor={customBgColor}
        />
      </div>

      {/* 3. LOGO ABAIXO: Título, Subtítulo e o Roteiro de Narração para o vídeo */}
      <div className="space-y-3.5 pt-1">
        {/* Título do Slide */}
        <div>
          <label className="block text-xs font-bold text-sky-950 mb-1">
            Título do Slide
          </label>
          <input
            type="text"
            value={slide.title}
            onChange={(e) => onUpdateSlide({ ...slide, title: e.target.value })}
            className="w-full bg-sky-50/70 border border-sky-300 rounded-xl px-3 py-2 text-xs text-sky-950 font-semibold focus:outline-none focus:border-sky-600 focus:bg-white"
            placeholder="Digite o título do slide..."
          />
        </div>

        {/* Subtítulo do Slide */}
        <div>
          <label className="block text-xs font-bold text-sky-950 mb-1">
            Subtítulo do Slide
          </label>
          <input
            type="text"
            value={slide.subtitle || ""}
            onChange={(e) => onUpdateSlide({ ...slide, subtitle: e.target.value })}
            className="w-full bg-sky-50/70 border border-sky-300 rounded-xl px-3 py-2 text-xs text-sky-950 focus:outline-none focus:border-sky-600 focus:bg-white"
            placeholder="Subtítulo ou mensagem central..."
          />
        </div>

        {/* Roteiro de Narração para o Vídeo */}
        <div className="bg-sky-50/80 rounded-2xl p-3.5 border border-sky-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <label className="text-xs font-extrabold text-sky-950">
                Roteiro de Narração para o Vídeo
              </label>
              <span className="text-[10px] text-sky-700 font-medium">
                ({wordCount} {wordCount === 1 ? "palavra" : "palavras"})
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggleVoicePreview}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isPlayingAudio
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                  : "bg-white hover:bg-sky-100 text-sky-950 border border-sky-300"
              }`}
              title="Ouvir voz da narração deste slide"
            >
              {isPlayingAudio ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Parar</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>Ouvir</span>
                </>
              )}
            </button>
          </div>

          <textarea
            rows={3}
            value={slide.narration}
            onChange={(e) => onUpdateSlide({ ...slide, narration: e.target.value })}
            className="w-full bg-white border border-sky-300 rounded-xl p-2.5 text-xs text-sky-950 focus:outline-none focus:border-sky-600 leading-relaxed resize-none font-sans"
            placeholder="Digite o texto que a voz sintetizada irá narrar durante este slide no vídeo..."
          />
        </div>

        {/* 4. Opções Adicionais Expansíveis: Tópicos e Layout do Slide */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-sky-50/60 hover:bg-sky-100/70 border border-sky-200 text-xs font-semibold text-sky-900 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Layout className="w-3.5 h-3.5 text-sky-600" />
              Tópicos & Layout do Slide ({slide.bullets.length} tópicos)
            </span>
            <ChevronRight
              className={`w-3.5 h-3.5 text-sky-600 transition-transform ${
                showAdvancedDetails ? "rotate-90" : ""
              }`}
            />
          </button>

          {showAdvancedDetails && (
            <div className="mt-2.5 p-3 rounded-2xl bg-sky-50/40 border border-sky-200 space-y-3 animate-in fade-in duration-150">
              {/* Layout Selector */}
              <div>
                <label className="block text-[11px] font-bold text-sky-950 mb-1">
                  Layout Gráfico do Slide
                </label>
                <select
                  value={slide.layout}
                  onChange={(e) => onUpdateSlide({ ...slide, layout: e.target.value })}
                  className="w-full bg-white border border-sky-300 rounded-lg px-2.5 py-1.5 text-xs text-sky-950 focus:outline-none focus:border-sky-500 font-medium cursor-pointer"
                >
                  <option value="title">Slide de Título / Abertura</option>
                  <option value="cards">Tópicos em Cards Corporativos</option>
                  <option value="split-right-image">Destaque com Conteúdo à Direita</option>
                  <option value="split-left-image">Destaque com Conteúdo à Esquerda</option>
                  <option value="conclusion">Conclusão / Resumo Executivo</option>
                </select>
              </div>

              {/* Bullets List */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-sky-950">
                    Tópicos Chave (Bullets)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddBullet}
                    className="text-[11px] text-sky-700 hover:text-sky-950 flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Adicionar Tópico
                  </button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {slide.bullets.map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-600 shrink-0" />
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) => handleUpdateBullet(bIdx, e.target.value)}
                        className="flex-1 bg-white border border-sky-300 rounded-lg px-2 py-1 text-xs text-sky-950 focus:outline-none focus:border-sky-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveBullet(bIdx)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Remover tópico"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
