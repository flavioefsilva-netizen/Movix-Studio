"use client";

import React, { useState, useEffect } from "react";
import {
  Mic,
  VolumeX,
  Play,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Subtitles,
  Palette,
  Check,
  Music,
  Pause,
} from "lucide-react";
import {
  VoiceGender,
  TransitionType,
  VoicePitch,
  VoiceMood,
  SubtitleColorOption,
  BackgroundMusicTrackId,
  SUBTITLE_9_COLORS,
} from "@/types/presentation";
import {
  TRANSITION_OPTIONS,
  FEMALE_VOICES,
  MALE_VOICES,
  PITCH_OPTIONS,
  MOOD_OPTIONS,
  playVoiceSample,
  stopVoiceSample,
} from "@/lib/voice-utils";
import {
  BACKGROUND_MUSIC_TRACKS,
  playMusicPreview,
  stopMusicPreview,
} from "@/lib/background-music";
import { TransitionPreview } from "./TransitionPreview";

interface VoiceAndTransitionSettingsProps {
  section?: "all" | "voice" | "subtitles" | "transition" | "music";
  voiceGender: VoiceGender;
  onVoiceGenderChange: (gender: VoiceGender) => void;
  voiceId?: string;
  onVoiceIdChange?: (id: string) => void;
  voicePitch?: VoicePitch;
  onVoicePitchChange?: (pitch: VoicePitch) => void;
  voiceMood?: VoiceMood;
  onVoiceMoodChange?: (mood: VoiceMood) => void;
  subtitlesEnabled?: boolean;
  onSubtitlesEnabledChange?: (enabled: boolean) => void;
  subtitleColor?: SubtitleColorOption;
  onSubtitleColorChange?: (color: SubtitleColorOption) => void;
  subtitleBoxColor?: string;
  onSubtitleBoxColorChange?: (color: string) => void;
  transitionType: TransitionType;
  onTransitionTypeChange: (transition: TransitionType) => void;
  enableVoice?: boolean;
  onEnableVoiceChange?: (enabled: boolean) => void;
  hideVoiceSection?: boolean;
  backgroundMusicTrack?: BackgroundMusicTrackId;
  onBackgroundMusicTrackChange?: (track: BackgroundMusicTrackId) => void;
  enableBackgroundMusic?: boolean;
  onEnableBackgroundMusicChange?: (enabled: boolean) => void;
}

export function VoiceAndTransitionSettings({
  section = "all",
  voiceGender,
  onVoiceGenderChange,
  voiceId,
  onVoiceIdChange,
  voicePitch = "natural",
  onVoicePitchChange,
  voiceMood = "corporativo",
  onVoiceMoodChange,
  subtitlesEnabled = false,
  onSubtitlesEnabledChange,
  subtitleColor = "#ffffff",
  onSubtitleColorChange,
  subtitleBoxColor = "#000000",
  onSubtitleBoxColorChange,
  transitionType,
  onTransitionTypeChange,
  enableVoice = true,
  onEnableVoiceChange,
  hideVoiceSection = false,
  backgroundMusicTrack = "acustica-suave",
  onBackgroundMusicTrackChange,
  enableBackgroundMusic = true,
  onEnableBackgroundMusicChange,
}: VoiceAndTransitionSettingsProps) {
  const [testText, setTestText] = useState(
    "Olá! Esta é uma demonstração da voz selecionada para narrar o seu vídeo com alta qualidade e clareza."
  );
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [playingMusicId, setPlayingMusicId] = useState<BackgroundMusicTrackId | null>(null);

  // Available personas for current gender
  const currentPersonas = voiceGender === "male" ? MALE_VOICES : FEMALE_VOICES;
  const activeVoiceId = voiceId || currentPersonas[0].id;
  const currentPersona = currentPersonas.find((p) => p.id === activeVoiceId) || currentPersonas[0];

  // Stop test voice and music when unmounting
  useEffect(() => {
    return () => {
      stopVoiceSample();
      stopMusicPreview();
    };
  }, []);

  const handleTestVoice = async () => {
    if (isPlayingTest) {
      stopVoiceSample();
      setIsPlayingTest(false);
      return;
    }

    stopMusicPreview();
    setPlayingMusicId(null);
    setIsPlayingTest(true);

    await playVoiceSample(
      testText,
      {
        gender: voiceGender,
        voiceId: activeVoiceId,
        pitch: voicePitch,
        mood: voiceMood,
      },
      {
        onStart: () => setIsPlayingTest(true),
        onEnd: () => setIsPlayingTest(false),
        onError: () => setIsPlayingTest(false),
      }
    );
  };

  const handleToggleMusicPreview = (trackId: BackgroundMusicTrackId) => {
    stopVoiceSample();
    setIsPlayingTest(false);

    if (playingMusicId === trackId) {
      stopMusicPreview();
      setPlayingMusicId(null);
    } else {
      setPlayingMusicId(trackId);
      playMusicPreview(trackId, () => {
        setPlayingMusicId(null);
      });
    }
  };

  // =========================================================================
  // SUB-RENDER: QUADRANTE DE VOZ IA
  // =========================================================================
  const renderVoiceCard = () => {
    if (hideVoiceSection) {
      return (
        <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-6 text-center space-y-2">
          <p className="text-sm font-bold text-sky-950">
            Trilha de Áudio Própria Carregada
          </p>
          <p className="text-xs text-sky-800">
            Você selecionou um arquivo de áudio para o vídeo. A narração sintética de IA foi desativada automaticamente.
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white border-2 border-sky-300 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-sky-200">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-sky-100 text-sky-700 border border-sky-200">
              <Mic className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-sky-950">
                Narração Vocal com IA
              </h4>
              <p className="text-[11px] text-sky-800">
                Selecione o gênero vocal, a voz de quem vai narrar e teste o áudio
              </p>
            </div>
          </div>

          {onEnableVoiceChange && (
            <label className="flex items-center gap-2 text-xs font-semibold text-sky-900 cursor-pointer">
              <input
                type="checkbox"
                checked={enableVoice}
                onChange={(e) => onEnableVoiceChange(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500 accent-sky-600"
              />
              <span>Ativar Voz</span>
            </label>
          )}
        </div>

        {/* Conteúdo interno do quadrante de voz (desabilitado quando enableVoice for false) */}
        <div
          className={`space-y-4 transition-opacity ${
            !enableVoice ? "opacity-40 pointer-events-none select-none" : ""
          }`}
        >
          {/* Linha com Gênero Vocal Principal à esquerda e Nome de quem vai narrar à direita */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Campo: Gênero Vocal Principal em um quadrante único */}
            <div className="bg-sky-50/70 border-2 border-sky-200 hover:border-sky-400 rounded-xl p-3.5 space-y-1.5 transition-colors">
              <label className="block text-[11px] font-extrabold text-sky-950 uppercase tracking-wide">
                Gênero Vocal Principal
              </label>
              <select
                disabled={!enableVoice}
                value={voiceGender}
                onChange={(e) => {
                  const newGender = e.target.value as VoiceGender;
                  stopVoiceSample();
                  setIsPlayingTest(false);
                  onVoiceGenderChange(newGender);
                  const personas = newGender === "male" ? MALE_VOICES : FEMALE_VOICES;
                  if (onVoiceIdChange) onVoiceIdChange(personas[0].id);
                }}
                className="w-full bg-white border border-sky-300 rounded-lg px-2.5 py-2 text-xs text-sky-950 font-bold focus:outline-none focus:border-sky-600 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <option value="female">♀ Voz Feminina</option>
                <option value="male">♂ Voz Masculina</option>
              </select>
              <span className="text-[10px] text-sky-700 block">
                {voiceGender === "female" ? "Locutoras femininas expressivas" : "Locutores masculinos executivos"}
              </span>
            </div>

            {/* Campo: Nome de quem vai narrar (à direita do Gênero Vocal Principal) */}
            <div className="bg-sky-50/70 border-2 border-sky-200 hover:border-sky-400 rounded-xl p-3.5 space-y-1.5 transition-colors">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-extrabold text-sky-950 uppercase tracking-wide">
                  Nome de quem vai narrar
                </label>
                <span className="text-[10px] font-semibold text-sky-700">
                  {currentPersona.badge}
                </span>
              </div>
              <select
                disabled={!enableVoice}
                value={activeVoiceId}
                onChange={(e) => {
                  stopVoiceSample();
                  setIsPlayingTest(false);
                  if (onVoiceIdChange) onVoiceIdChange(e.target.value);
                }}
                className="w-full bg-white border border-sky-300 rounded-lg px-2.5 py-2 text-xs text-sky-950 font-bold focus:outline-none focus:border-sky-600 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {currentPersonas.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name} — {persona.badge}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-sky-700 block truncate">
                {currentPersona.description}
              </span>
            </div>
          </div>

          {/* Tom de Voz e Humor de Voz */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* Tom de Voz */}
            <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-3 space-y-1">
              <label className="text-[10px] font-bold text-sky-950 uppercase tracking-wide flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-sky-600" />
                Tom de Voz (Timbre)
              </label>
              <select
                disabled={!enableVoice}
                value={voicePitch}
                onChange={(e) => {
                  stopVoiceSample();
                  setIsPlayingTest(false);
                  if (onVoicePitchChange) onVoicePitchChange(e.target.value as VoicePitch);
                }}
                className="w-full bg-white border border-sky-300 rounded-lg px-2 py-1.5 text-xs text-sky-950 font-medium focus:outline-none focus:border-sky-500 cursor-pointer disabled:opacity-50"
              >
                {PITCH_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.tag})
                  </option>
                ))}
              </select>
            </div>

            {/* Humor de Voz */}
            <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-3 space-y-1">
              <label className="text-[10px] font-bold text-sky-950 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-600" />
                Humor de Voz (Estilo)
              </label>
              <select
                disabled={!enableVoice}
                value={voiceMood}
                onChange={(e) => {
                  stopVoiceSample();
                  setIsPlayingTest(false);
                  if (onVoiceMoodChange) onVoiceMoodChange(e.target.value as VoiceMood);
                }}
                className="w-full bg-white border border-sky-300 rounded-lg px-2 py-1.5 text-xs text-sky-950 font-medium focus:outline-none focus:border-sky-500 cursor-pointer disabled:opacity-50"
              >
                {MOOD_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Campo de Texto para Teste e Botão de Ouvir Demonstração */}
          <div className="space-y-2.5 pt-2 border-t border-sky-100">
            <label className="block text-[10px] font-bold text-sky-950 uppercase tracking-wide">
              Texto para Teste da Voz
            </label>
            <textarea
              disabled={!enableVoice}
              rows={2}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Digite um texto qualquer para testar a voz selecionada..."
              className="w-full bg-sky-50/60 border border-sky-300 focus:border-sky-600 rounded-xl p-2.5 text-xs text-sky-950 placeholder:text-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none font-sans disabled:opacity-50"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <span className="text-[11px] text-sky-800">
                Locutor(a): <strong>{currentPersona.name}</strong> •{" "}
                <span className="text-sky-700">
                  {PITCH_OPTIONS.find((p) => p.id === voicePitch)?.name.split("/")[0].trim()} •{" "}
                  {MOOD_OPTIONS.find((m) => m.id === voiceMood)?.name.split("&")[0].trim()}
                </span>
              </span>

              <button
                type="button"
                disabled={!enableVoice}
                onClick={handleTestVoice}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed ${
                  isPlayingTest
                    ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                    : "bg-sky-600 hover:bg-sky-700 text-white"
                }`}
                title="Ouvir demonstração da voz no navegador antes de gerar o vídeo"
              >
                {isPlayingTest ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Parar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Testar Voz Agora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // SUB-RENDER: QUADRANTE DE LEGENDAS DO VÍDEO
  // =========================================================================
  const renderSubtitlesCard = () => {
    // Current letter color hex
    const currentTextColor = subtitleColor === "ai-auto" ? "#ffffff" : subtitleColor;
    const currentBoxColor = subtitleBoxColor || "#000000";

    const handleSelectTextColor = (hex: string) => {
      onSubtitleColorChange?.(hex as SubtitleColorOption);
      // If box color is currently the same as chosen text color, automatically switch box color
      if (currentBoxColor.toLowerCase() === hex.toLowerCase()) {
        const fallbackBox = hex.toLowerCase() === "#ffffff" ? "#000000" : "#ffffff";
        onSubtitleBoxColorChange?.(fallbackBox);
      }
    };

    return (
      <div className="bg-white border-2 border-sky-300 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-sky-200">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-sky-100 text-sky-700 border border-sky-200">
              <Subtitles className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-sky-950">
                Legendas do Vídeo
              </h4>
              <p className="text-[11px] text-sky-800">
                Configuração de legendas sincronizadas gravadas diretamente no vídeo
              </p>
            </div>
          </div>
        </div>

        {/* Botão de dupla opção: "Sem Legenda" (padrão) e "Ativar Legendas" */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onSubtitlesEnabledChange && onSubtitlesEnabledChange(false)}
            className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
              !subtitlesEnabled
                ? "bg-sky-600 border-sky-700 text-white font-black shadow-md ring-2 ring-sky-400"
                : "bg-sky-50/60 border-sky-200 hover:border-sky-300 text-sky-950 font-bold"
            }`}
          >
            <div>
              <span className="text-xs font-black block">Sem Legenda</span>
              <span
                className={`text-[10px] block ${
                  !subtitlesEnabled ? "text-sky-100" : "text-sky-700"
                }`}
              >
                Apenas o áudio / narração
              </span>
            </div>
            {!subtitlesEnabled && <Check className="w-4 h-4 text-white shrink-0" />}
          </button>

          <button
            type="button"
            onClick={() => onSubtitlesEnabledChange && onSubtitlesEnabledChange(true)}
            className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
              subtitlesEnabled
                ? "bg-sky-600 border-sky-700 text-white font-black shadow-md ring-2 ring-sky-400"
                : "bg-sky-50/60 border-sky-200 hover:border-sky-300 text-sky-950 font-bold"
            }`}
          >
            <div>
              <span className="text-xs font-black block">Ativar Legendas</span>
              <span
                className={`text-[10px] block ${
                  subtitlesEnabled ? "text-sky-100" : "text-sky-700"
                }`}
              >
                Exibir texto no rodapé do vídeo
              </span>
            </div>
            {subtitlesEnabled && <Check className="w-4 h-4 text-white shrink-0" />}
          </button>
        </div>

        {/* Campos visíveis apenas quando "Ativar Legendas" estiver selecionado */}
        {subtitlesEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-2 border-t border-sky-100 animate-in fade-in duration-200">
            {/* Campo 1: Cor da Letra da Legenda (3x3 grid) */}
            <div className="md:col-span-4 bg-sky-50/70 border border-sky-200 rounded-xl p-3 space-y-2">
              <label className="text-[10px] font-black text-sky-950 uppercase tracking-wide flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-sky-600" />
                Cor da Letra da Legenda
              </label>
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {SUBTITLE_9_COLORS.map((c) => {
                  const isSelected = currentTextColor.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => handleSelectTextColor(c.hex)}
                      className={`h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer relative shadow-2xs ${
                        c.hex === "#ffffff" ? "border border-slate-300" : "border border-black/15"
                      } ${
                        isSelected
                          ? "ring-2 ring-sky-600 ring-offset-1 scale-105"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={`Cor da Letra: ${c.name}`}
                    >
                      {isSelected && (
                        <Check
                          className={`w-3.5 h-3.5 ${
                            c.hex === "#ffffff" || c.hex === "#facc15" || c.hex === "#eab308" || c.hex === "#38bdf8" || c.hex === "#a3e635"
                              ? "text-black"
                              : "text-white"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <span className="text-[10px] text-sky-800 font-semibold block text-center truncate">
                Letra: {SUBTITLE_9_COLORS.find((c) => c.hex.toLowerCase() === currentTextColor.toLowerCase())?.name || currentTextColor}
              </span>
            </div>

            {/* Campo 2: Cor da caixa da Legenda (3x3 grid - cor da letra desabilitada) */}
            <div className="md:col-span-4 bg-sky-50/70 border border-sky-200 rounded-xl p-3 space-y-2">
              <label className="text-[10px] font-black text-sky-950 uppercase tracking-wide flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-sky-600" />
                Cor da caixa da Legenda
              </label>
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {SUBTITLE_9_COLORS.map((c) => {
                  const isLetterColor = c.hex.toLowerCase() === currentTextColor.toLowerCase();
                  const isSelected = currentBoxColor.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      disabled={isLetterColor}
                      onClick={() => onSubtitleBoxColorChange?.(c.hex)}
                      className={`h-8 rounded-lg flex items-center justify-center transition-all relative shadow-2xs ${
                        c.hex === "#ffffff" ? "border border-slate-300" : "border border-black/15"
                      } ${
                        isLetterColor
                          ? "opacity-20 cursor-not-allowed line-through"
                          : isSelected
                          ? "ring-2 ring-sky-600 ring-offset-1 scale-105 cursor-pointer"
                          : "hover:scale-105 cursor-pointer"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={
                        isLetterColor
                          ? `Desabilitada (mesma cor da letra)`
                          : `Cor da Caixa: ${c.name}`
                      }
                    >
                      {isSelected && !isLetterColor && (
                        <Check
                          className={`w-3.5 h-3.5 ${
                            c.hex === "#ffffff" || c.hex === "#facc15" || c.hex === "#eab308" || c.hex === "#38bdf8" || c.hex === "#a3e635"
                              ? "text-black"
                              : "text-white"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-sky-200/70">
                <button
                  type="button"
                  onClick={() => onSubtitleBoxColorChange?.("transparent")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    currentBoxColor === "transparent"
                      ? "bg-sky-600 text-white border-sky-600 ring-2 ring-sky-400 font-black shadow-xs"
                      : "bg-white hover:bg-sky-100 text-sky-950 border-sky-300 shadow-2xs"
                  }`}
                  title="Fundo transparente (sem caixa de legenda, apenas texto puro com sombra)"
                >
                  <span className="w-2.5 h-2.5 rounded-full border border-sky-400 bg-transparent shrink-0" />
                  <span>Transparente</span>
                  {currentBoxColor === "transparent" && <Check className="w-3.5 h-3.5 text-white" />}
                </button>

                <span className="text-[10px] text-sky-800 font-semibold truncate text-right">
                  Caixa: {currentBoxColor === "transparent" ? "Transparente" : (SUBTITLE_9_COLORS.find((c) => c.hex.toLowerCase() === currentBoxColor.toLowerCase())?.name || currentBoxColor)}
                </span>
              </div>
            </div>

            {/* Campo 3: Exemplo de exibição no rodapé do vídeo (ao lado) */}
            <div className="md:col-span-4 bg-sky-50/70 border border-sky-200 rounded-xl p-3 flex flex-col justify-between space-y-2">
              <label className="text-[10px] font-black text-sky-950 uppercase tracking-wide block">
                Exemplo de exibição no rodapé do vídeo:
              </label>

              {/* Live Preview Display Box */}
              <div className="flex-1 min-h-[72px] bg-sky-950/20 rounded-xl p-2.5 flex items-center justify-center border border-sky-300">
                <div
                  className="px-3 py-1.5 rounded-lg text-center shadow-md transition-all max-w-full"
                  style={{
                    backgroundColor: currentBoxColor === "transparent" ? "transparent" : currentBoxColor,
                    color: currentTextColor,
                    border: currentBoxColor === "transparent" ? "1px dashed rgba(255, 255, 255, 0.4)" : "1px solid rgba(255, 255, 255, 0.2)",
                    textShadow: currentBoxColor === "transparent" ? "0 2px 6px rgba(0,0,0,0.95)" : undefined,
                  }}
                >
                  <span className="text-xs sm:text-sm font-black tracking-wide block truncate">
                    Exemplo de Legenda
                  </span>
                </div>
              </div>


              <span className="text-[9px] text-sky-700 text-center block">
                Visualização exata das cores no vídeo
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // SUB-RENDER: QUADRANTE DE TRANSIÇÃO ENTRE AS TELAS
  // =========================================================================
  const renderTransitionsCard = () => (
    <div className="bg-white border-2 border-sky-300 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-sky-200">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-sky-100 text-sky-700 border border-sky-200">
            <Layers className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-sky-950">
              Transição entre as telas
            </h4>
            <p className="hidden md:block text-[11px] text-sky-800">
              Escolha o efeito visual entre fotos ou slides com demonstração prática contínua
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Único quadrante com todas as opções de transição */}
        <div className="md:col-span-5 bg-sky-50/70 border-2 border-sky-200 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-extrabold text-sky-950 uppercase tracking-wide mb-1.5">
              Tipo de Transição
            </label>
            <select
              value={transitionType}
              onChange={(e) => onTransitionTypeChange(e.target.value as TransitionType)}
              className="w-full bg-white border border-sky-300 rounded-xl px-3 py-2.5 text-xs text-sky-950 font-bold focus:outline-none focus:border-sky-600 cursor-pointer shadow-xs"
            >
              {TRANSITION_OPTIONS.map((opt, idx) => (
                <option key={opt.id} value={opt.id}>
                  {idx === 0 ? "1. " : `${idx + 1}. `}
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden md:block p-3 rounded-lg bg-white border border-sky-200 space-y-1">
            <span className="text-[10px] font-extrabold text-sky-800 uppercase tracking-wide block">
              Descrição do efeito selecionado:
            </span>
            <p className="text-xs text-sky-950 font-medium leading-relaxed">
              {TRANSITION_OPTIONS.find((t) => t.id === transitionType)?.description}
            </p>
          </div>
        </div>

        {/* Demonstração Prática (6 paisagens em vetor SVG sem tela preta) */}
        <div className="md:col-span-7">
          <TransitionPreview transitionType={transitionType} />
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // SUB-RENDER: QUADRANTE DE MÚSICA DE FUNDO
  // =========================================================================
  const renderMusicCard = () => (
    <div className="bg-white border-2 border-sky-300 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-sky-200">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-sky-100 text-sky-700 border border-sky-200">
            <Music className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-sky-950">
              Música de Fundo do Vídeo
            </h4>
            <p className="text-[11px] text-sky-800">
              Trilha sonora de fundo harmonizada com o volume da locução
            </p>
          </div>
        </div>

        {onEnableBackgroundMusicChange && (
          <label className="flex items-center gap-1.5 text-xs font-semibold text-sky-900 cursor-pointer">
            <input
              type="checkbox"
              checked={enableBackgroundMusic}
              onChange={(e) => onEnableBackgroundMusicChange(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500 accent-sky-600"
            />
            <span>Ativar Música</span>
          </label>
        )}
      </div>

      {onBackgroundMusicTrackChange && (
        <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5 space-y-3">
          <label className="text-[11px] font-extrabold text-sky-950 uppercase tracking-wide block">
            Selecione a Trilha Sonora
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full min-w-0">
            <select
              disabled={!enableBackgroundMusic}
              value={backgroundMusicTrack}
              onChange={(e) =>
                onBackgroundMusicTrackChange(e.target.value as BackgroundMusicTrackId)
              }
              className="w-full sm:flex-1 min-w-0 bg-white border border-sky-300 rounded-xl px-3 py-2 text-xs text-sky-950 font-bold focus:outline-none focus:border-sky-500 cursor-pointer disabled:opacity-40 truncate"
            >
              {BACKGROUND_MUSIC_TRACKS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.genre})
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!enableBackgroundMusic}
              onClick={() => handleToggleMusicPreview(backgroundMusicTrack)}
              className={`w-full sm:w-auto shrink-0 justify-center px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-40 ${
                playingMusicId === backgroundMusicTrack
                  ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                  : "bg-sky-600 hover:bg-sky-700 text-white"
              }`}
              title="Ouvir prévia da música selecionada"
            >
              {playingMusicId === backgroundMusicTrack ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Parar</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Ouvir Música</span>
                </>
              )}
            </button>
          </div>

          {BACKGROUND_MUSIC_TRACKS.find((t) => t.id === backgroundMusicTrack)?.description ? (
            <p className="text-[11px] text-sky-800">
              {BACKGROUND_MUSIC_TRACKS.find((t) => t.id === backgroundMusicTrack)?.description}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );

  // Return specific section if requested
  if (section === "voice") {
    return renderVoiceCard();
  }
  if (section === "subtitles") {
    return renderSubtitlesCard();
  }
  if (section === "transition") {
    return renderTransitionsCard();
  }
  if (section === "music") {
    return renderMusicCard();
  }

  // Default "all": render everything
  return (
    <div className="space-y-6 pt-2">
      <div
        className={`grid grid-cols-1 ${
          !hideVoiceSection ? "lg:grid-cols-2" : "grid-cols-1"
        } gap-6`}
      >
        {!hideVoiceSection && renderVoiceCard()}
        {renderSubtitlesCard()}
      </div>

      {renderTransitionsCard()}
    </div>
  );
}
