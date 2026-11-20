"use client";

import React, { useState, useEffect } from "react";
import {
  Mic,
  VolumeX,
  Play,
  SlidersHorizontal,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import {
  VoiceGender,
  VoicePitch,
  VoiceMood,
  VoiceSlotId,
  VoiceSlotConfig,
} from "@/types/presentation";
import {
  FEMALE_VOICES,
  MALE_VOICES,
  PITCH_OPTIONS,
  MOOD_OPTIONS,
  VOICE_SLOT_IDS,
  getVoicePersona,
  playVoiceSample,
  stopVoiceSample,
} from "@/lib/voice-utils";

interface VoiceConfigModalProps {
  isOpen: boolean;
  slotConfig: VoiceSlotConfig | null;
  onSave: (updated: VoiceSlotConfig) => void;
  onClose: () => void;
}

function VoiceConfigModal({
  isOpen,
  slotConfig,
  onSave,
  onClose,
}: VoiceConfigModalProps) {
  const [gender, setGender] = useState<VoiceGender>(slotConfig?.gender || "female");
  const [voiceId, setVoiceId] = useState<string>(slotConfig?.voiceId || "helena");
  const [pitch, setPitch] = useState<VoicePitch>(slotConfig?.pitch || "natural");
  const [mood, setMood] = useState<VoiceMood>(slotConfig?.mood || "corporativo");
  const [testText, setTestText] = useState(
    "Olá! Esta é uma demonstração da voz selecionada para narrar o seu vídeo com alta qualidade e clareza."
  );
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  // Sync draft state when slotConfig prop changes without using useEffect setState
  const [prevSlotKey, setPrevSlotKey] = useState<string>("");
  const slotKey = slotConfig
    ? `${slotConfig.slotId}-${slotConfig.gender}-${slotConfig.voiceId}-${slotConfig.pitch}-${slotConfig.mood}`
    : "";
  if (slotConfig && slotKey !== prevSlotKey) {
    setPrevSlotKey(slotKey);
    setGender(slotConfig.gender);
    setVoiceId(slotConfig.voiceId);
    setPitch(slotConfig.pitch);
    setMood(slotConfig.mood);
  }

  useEffect(() => {
    return () => {
      stopVoiceSample();
    };
  }, []);

  if (!isOpen || !slotConfig) return null;

  const currentPersonas = gender === "male" ? MALE_VOICES : FEMALE_VOICES;
  const activeVoiceId = currentPersonas.some((p) => p.id === voiceId)
    ? voiceId
    : currentPersonas[0].id;
  const currentPersona =
    currentPersonas.find((p) => p.id === activeVoiceId) || currentPersonas[0];

  const handleTestVoice = async () => {
    if (isPlayingTest) {
      stopVoiceSample();
      setIsPlayingTest(false);
      return;
    }

    setIsPlayingTest(true);
    await playVoiceSample(
      testText,
      {
        gender,
        voiceId: activeVoiceId,
        pitch,
        mood,
      },
      {
        onStart: () => setIsPlayingTest(true),
        onEnd: () => setIsPlayingTest(false),
        onError: () => setIsPlayingTest(false),
      }
    );
  };

  const handleClose = () => {
    stopVoiceSample();
    setIsPlayingTest(false);
    onClose();
  };

  const handleSaveClick = () => {
    stopVoiceSample();
    setIsPlayingTest(false);
    onSave({
      ...slotConfig,
      gender,
      voiceId: activeVoiceId,
      pitch,
      mood,
      isSaved: true,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-sky-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div
        className="bg-white border-2 border-sky-300 rounded-3xl p-5 sm:p-6 w-full max-w-[680px] max-h-[92vh] overflow-y-auto shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header da janela: Narração Vocal com IA */}
        <div className="flex items-center justify-between pb-3 border-b border-sky-200">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-sky-100 text-sky-700 border border-sky-200">
              <Mic className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base sm:text-lg font-extrabold text-sky-950">
                  Narração Vocal com IA
                </h4>
                <span className="px-2 py-0.5 rounded-lg bg-sky-600 text-white text-xs font-black tracking-wide">
                  {slotConfig.label}
                </span>
              </div>
              <p className="text-[11px] text-sky-800">
                Selecione o gênero vocal, a voz de quem vai narrar e salve para representar {slotConfig.label}
              </p>
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

        {/* Gênero Vocal Principal & Nome de quem vai narrar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="bg-sky-50/70 border-2 border-sky-200 hover:border-sky-400 rounded-xl p-3.5 space-y-1.5 transition-colors">
            <label className="block text-[11px] font-extrabold text-sky-950 uppercase tracking-wide">
              Gênero Vocal Principal
            </label>
            <select
              value={gender}
              onChange={(e) => {
                const newGender = e.target.value as VoiceGender;
                stopVoiceSample();
                setIsPlayingTest(false);
                setGender(newGender);
                const personas = newGender === "male" ? MALE_VOICES : FEMALE_VOICES;
                setVoiceId(personas[0].id);
              }}
              className="w-full bg-white border border-sky-300 rounded-lg px-2.5 py-2 text-xs text-sky-950 font-bold focus:outline-none focus:border-sky-600 cursor-pointer shadow-2xs"
            >
              <option value="female">♀ Voz Feminina</option>
              <option value="male">♂ Voz Masculina</option>
            </select>
            <span className="text-[10px] text-sky-700 block">
              {gender === "female"
                ? "Locutoras femininas expressivas"
                : "Locutores masculinos executivos"}
            </span>
          </div>

          <div className="bg-sky-50/70 border-2 border-sky-200 hover:border-sky-400 rounded-xl p-3.5 space-y-1.5 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-[11px] font-extrabold text-sky-950 uppercase tracking-wide">
                Nome de quem vai narrar
              </label>
              <span className="text-[10px] font-semibold text-sky-700 truncate">
                {currentPersona.badge}
              </span>
            </div>
            <select
              value={activeVoiceId}
              onChange={(e) => {
                stopVoiceSample();
                setIsPlayingTest(false);
                setVoiceId(e.target.value);
              }}
              className="w-full bg-white border border-sky-300 rounded-lg px-2.5 py-2 text-xs text-sky-950 font-bold focus:outline-none focus:border-sky-600 cursor-pointer shadow-2xs"
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

        {/* Tom de Voz & Humor de Voz */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-3 space-y-1">
            <label className="text-[10px] font-bold text-sky-950 uppercase tracking-wide flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-sky-600" />
              Tom de Voz (Timbre)
            </label>
            <select
              value={pitch}
              onChange={(e) => {
                stopVoiceSample();
                setIsPlayingTest(false);
                setPitch(e.target.value as VoicePitch);
              }}
              className="w-full bg-white border border-sky-300 rounded-lg px-2 py-1.5 text-xs text-sky-950 font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {PITCH_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.tag})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-3 space-y-1">
            <label className="text-[10px] font-bold text-sky-950 uppercase tracking-wide flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sky-600" />
              Humor de Voz (Estilo)
            </label>
            <select
              value={mood}
              onChange={(e) => {
                stopVoiceSample();
                setIsPlayingTest(false);
                setMood(e.target.value as VoiceMood);
              }}
              className="w-full bg-white border border-sky-300 rounded-lg px-2 py-1.5 text-xs text-sky-950 font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {MOOD_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Texto para Teste & Ouvir Demonstração */}
        <div className="space-y-2.5 pt-2 border-t border-sky-100">
          <label className="block text-[10px] font-bold text-sky-950 uppercase tracking-wide">
            Texto para Teste da Voz
          </label>
          <textarea
            rows={2}
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Digite um texto qualquer para testar a voz selecionada..."
            className="w-full bg-sky-50/60 border border-sky-300 focus:border-sky-600 rounded-xl p-2.5 text-xs text-sky-950 placeholder:text-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none font-sans"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <span className="text-[11px] text-sky-800">
              Locutor(a): <strong>{currentPersona.name}</strong> •{" "}
              <span className="text-sky-700">
                {PITCH_OPTIONS.find((p) => p.id === pitch)?.name.split("/")[0].trim()} •{" "}
                {MOOD_OPTIONS.find((m) => m.id === mood)?.name.split("&")[0].trim()}
              </span>
            </span>

            <button
              type="button"
              onClick={handleTestVoice}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                isPlayingTest
                  ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                  : "bg-sky-600 hover:bg-sky-700 text-white"
              }`}
              title="Ouvir demonstração da voz selecionada"
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

        {/* Rodapé com Cancelar e Salvar */}
        <div className="pt-3 border-t border-sky-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold text-xs sm:text-sm border border-sky-300 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveClick}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/30 border border-emerald-500 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Salvar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface VoiceSlotsSelectorProps {
  voiceSlots: Record<VoiceSlotId, VoiceSlotConfig>;
  onSaveSlot: (updated: VoiceSlotConfig) => void;
  enableVoice?: boolean;
  onEnableVoiceChange?: (enabled: boolean) => void;
  activeSlotId?: VoiceSlotId;
  onSelectActiveSlot?: (slotId: VoiceSlotId) => void;
}

export function VoiceSlotsSelector({
  voiceSlots,
  onSaveSlot,
  enableVoice = true,
  onEnableVoiceChange,
  activeSlotId,
  onSelectActiveSlot,
}: VoiceSlotsSelectorProps) {
  const [editingSlotId, setEditingSlotId] = useState<VoiceSlotId | null>(null);

  const editingSlotConfig = editingSlotId ? voiceSlots[editingSlotId] : null;

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
              Clique em cada botão abaixo para configurar e salvar até 4 vozes diferentes para usar nas suas fotos
            </p>
          </div>
        </div>

        {onEnableVoiceChange && (
          <label className="flex items-center gap-2 text-xs font-semibold text-sky-900 cursor-pointer shrink-0">
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

      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 transition-opacity ${
          !enableVoice ? "opacity-40 pointer-events-none select-none" : ""
        }`}
      >
        {VOICE_SLOT_IDS.map((slotId) => {
          const slot = voiceSlots[slotId];
          const persona = getVoicePersona(slot.gender, slot.voiceId);
          const pitchName =
            PITCH_OPTIONS.find((p) => p.id === slot.pitch)?.name.split("/")[0].trim() || "Natural";
          const moodName =
            MOOD_OPTIONS.find((m) => m.id === slot.mood)?.name.split("&")[0].trim() || "Corporativo";
          const isSelected = activeSlotId ? activeSlotId === slotId : Boolean(slot.isSaved);

          return (
            <button
              key={slotId}
              type="button"
              disabled={!enableVoice}
              onClick={() => {
                onSelectActiveSlot?.(slotId);
                setEditingSlotId(slotId);
              }}
              className={`group p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-sm hover:scale-[1.02] ${
                isSelected
                  ? "bg-gradient-to-b from-sky-50 to-white border-sky-500 ring-2 ring-sky-300/60"
                  : "bg-sky-50/50 hover:bg-sky-50 border-sky-200 hover:border-sky-400"
              }`}
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="px-3 py-1 rounded-xl bg-sky-600 group-hover:bg-sky-700 text-white text-xs sm:text-sm font-black tracking-wide shadow-xs">
                  {slot.label}
                </span>

                {slot.isSaved ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold">
                    <Check className="w-3 h-3" />
                    <span>Salva</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-sky-700 px-2 py-0.5 rounded-full bg-sky-100 border border-sky-200">
                    Configurar
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-sky-950">
                    {slot.gender === "female" ? "♀" : "♂"} {persona.name}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-sky-800 truncate">
                  {persona.badge}
                </p>
                <p className="text-[10px] text-sky-700 truncate">
                  Tom {pitchName} • {moodName}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <VoiceConfigModal
        key={editingSlotId || "voice-modal-closed"}
        isOpen={Boolean(editingSlotId)}
        slotConfig={editingSlotConfig}
        onSave={(updated) => {
          onSaveSlot(updated);
          setEditingSlotId(null);
        }}
        onClose={() => setEditingSlotId(null)}
      />
    </div>
  );
}
