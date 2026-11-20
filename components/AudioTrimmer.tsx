"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  Music,
  Play,
  Pause,
  Scissors,
  Clock,
  AlertCircle,
  Volume2,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
} from "lucide-react";
import { CustomAudioSlice } from "@/types/presentation";

interface AudioTrimmerProps {
  totalPhotosCount: number;
  audioSlice: CustomAudioSlice | null;
  onAudioSliceChange: (slice: CustomAudioSlice | null) => void;
  triggerPickerOnMount?: boolean;
}

export function AudioTrimmer({
  totalPhotosCount,
  audioSlice,
  onAudioSliceChange,
  triggerPickerOnMount = false,
}: AudioTrimmerProps) {
  const audioUrl = audioSlice?.audioUrl || null;
  const fileName = audioSlice?.fileName || "";
  const totalDuration = audioSlice?.totalDuration || 0;
  const startTime = audioSlice?.startTime || 0;
  const endTime = audioSlice?.endTime || 0;

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mouse drag state on waveform: "none" | "start" | "end" | "move"
  const [draggingMode, setDraggingMode] = useState<"none" | "start" | "end" | "move">("none");
  const trackRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Auto trigger file picker if requested and no audio loaded yet
  useEffect(() => {
    if (triggerPickerOnMount && !audioUrl) {
      const timer = setTimeout(() => {
        fileInputRef.current?.click();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [triggerPickerOnMount, audioUrl]);

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec < 0) return "00:00.0";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}.${ms}`;
  };

  // Handle audio file selection
  const handleAudioFile = (file: File) => {
    if (!file) return;
    setErrorMsg(null);

    if (audioUrl) {
      try {
        URL.revokeObjectURL(audioUrl);
      } catch {
        // ignore
      }
    }

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);

    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      if (!dur || isNaN(dur) || dur < 1) {
        setErrorMsg("Não foi possível carregar o arquivo de áudio. Verifique o formato.");
        return;
      }

      // Default slice: start at 0, end at min(30s, dur)
      const defaultEnd = Math.min(dur, Math.max(5, Math.min(30, dur)));

      onAudioSliceChange({
        audioUrl: url,
        fileName: file.name,
        fileSize: file.size,
        totalDuration: dur,
        startTime: 0,
        endTime: defaultEnd,
        sliceDuration: defaultEnd,
      });

      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = audio;
      setCurrentTime(0);
    };

    audio.onerror = () => {
      setErrorMsg("Erro ao decodificar arquivo de áudio. Tente outro formato (ex: MP3 ou WAV).");
    };
  };

  // Keep Audio Element in sync
  useEffect(() => {
    if (!audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    if (!audioRef.current || audioRef.current.src !== audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
    }
  }, [audioUrl]);

  // Playback loop for previewing selected slice
  const startPlaybackLoop = useCallback(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const checkTime = () => {
      if (!audio) return;
      setCurrentTime(audio.currentTime);

      if (audio.currentTime >= endTime) {
        audio.currentTime = startTime;
        audio.pause();
        setIsPlaying(false);
        return;
      }

      if (!audio.paused) {
        animFrameRef.current = requestAnimationFrame(checkTime);
      } else {
        setIsPlaying(false);
      }
    };

    animFrameRef.current = requestAnimationFrame(checkTime);
  }, [endTime, startTime]);

  // Toggle playback
  const togglePlaySlice = () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      audio.currentTime = startTime;
      audio.play().then(() => {
        setIsPlaying(true);
        startPlaybackLoop();
      }).catch((err) => {
        console.warn("Autoplay bloqueado:", err);
      });
    }
  };

  // Adjust Start Time
  const updateStartTime = useCallback((newStart: number) => {
    if (!audioSlice) return;
    const clamped = Math.max(0, Math.min(endTime - 0.5, Math.round(newStart * 10) / 10));
    onAudioSliceChange({
      ...audioSlice,
      startTime: clamped,
      sliceDuration: Math.max(0.5, endTime - clamped),
    });
  }, [audioSlice, endTime, onAudioSliceChange]);

  // Adjust End Time
  const updateEndTime = useCallback((newEnd: number) => {
    if (!audioSlice) return;
    const clamped = Math.max(startTime + 0.5, Math.min(totalDuration, Math.round(newEnd * 10) / 10));
    onAudioSliceChange({
      ...audioSlice,
      endTime: clamped,
      sliceDuration: Math.max(0.5, clamped - startTime),
    });
  }, [audioSlice, startTime, totalDuration, onAudioSliceChange]);

  // Step 0.1s helpers
  const stepStart = (delta: number) => {
    updateStartTime(startTime + delta);
  };

  const stepEnd = (delta: number) => {
    updateEndTime(endTime + delta);
  };

  // Mouse / Touch Dragging on Waveform
  const handleTrackPointer = useCallback((e: MouseEvent | TouchEvent) => {
    if (draggingMode === "none" || !trackRef.current || totalDuration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetSec = ratio * totalDuration;

    if (draggingMode === "start") {
      updateStartTime(targetSec);
    } else if (draggingMode === "end") {
      updateEndTime(targetSec);
    }
  }, [draggingMode, totalDuration, updateStartTime, updateEndTime]);

  const handlePointerUp = useCallback(() => {
    setDraggingMode("none");
  }, []);

  useEffect(() => {
    if (draggingMode !== "none") {
      window.addEventListener("mousemove", handleTrackPointer);
      window.addEventListener("mouseup", handlePointerUp);
      window.addEventListener("touchmove", handleTrackPointer);
      window.addEventListener("touchend", handlePointerUp);
      return () => {
        window.removeEventListener("mousemove", handleTrackPointer);
        window.removeEventListener("mouseup", handlePointerUp);
        window.removeEventListener("touchmove", handleTrackPointer);
        window.removeEventListener("touchend", handlePointerUp);
      };
    }
  }, [draggingMode, handleTrackPointer, handlePointerUp]);

  // Handle click on timeline to set nearest point
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || totalDuration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const clickedSec = ratio * totalDuration;

    // Pick whichever marker is closer
    const distToStart = Math.abs(clickedSec - startTime);
    const distToEnd = Math.abs(clickedSec - endTime);

    if (distToStart < distToEnd) {
      updateStartTime(clickedSec);
    } else {
      updateEndTime(clickedSec);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const sliceDuration = Math.max(0, endTime - startTime);
  // Total video duration = 1s leading silence + sliceDuration + 1s trailing silence (Reduzido para 1s conforme solicitado)
  const totalVideoDuration = sliceDuration > 0 ? sliceDuration + 2.0 : 0;
  const photosCount = Math.max(1, totalPhotosCount);
  const timePerPhoto = totalVideoDuration > 0 ? totalVideoDuration / photosCount : 0;

  return (
    <div className="bg-sky-50/70 border-2 border-sky-300 rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-200 text-sky-800 flex items-center justify-center border border-sky-300">
            <Music className="w-4 h-4 text-sky-700" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-sky-950">
              Carregar & Cortar Áudio para o Vídeo
            </h3>
          </div>
        </div>

        {audioUrl && (
          <button
            type="button"
            onClick={() => {
              if (audioRef.current) audioRef.current.pause();
              onAudioSliceChange(null);
            }}
            className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
          >
            Remover Áudio
          </button>
        )}
      </div>

      {/* Upload Zone */}
      {!audioUrl ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-xl p-5 text-center bg-white hover:bg-sky-50/50 transition-all cursor-pointer group space-y-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAudioFile(file);
            }}
            className="hidden"
          />
          <div className="w-10 h-10 rounded-xl bg-sky-100 group-hover:bg-sky-200 text-sky-700 flex items-center justify-center mx-auto transition-transform group-hover:scale-105 border border-sky-200">
            <Upload className="w-5 h-5 text-sky-700" />
          </div>
          <p className="text-xs font-bold text-sky-950">
            Clique para carregar o arquivo de áudio (MP3, WAV, M4A, etc.)
          </p>
          <p className="text-[11px] text-sky-700">
            O áudio será embutido no vídeo final respeitando 1 segundo sem áudio no início e 1 segundo no fim
          </p>
        </div>
      ) : (
        /* Audio Timeline & Trimmer Bar */
        <div className="bg-white rounded-xl border border-sky-200 p-4 space-y-4 shadow-xs">
          {/* File info bar */}
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
              <Volume2 className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-sky-950 block truncate max-w-xs sm:max-w-md">
                {fileName}
              </span>
              <span className="text-[11px] text-sky-700">
                Duração total do arquivo: {formatSeconds(totalDuration)}
              </span>
            </div>
          </div>

          {/* Visual Waveform / Bar Track with Mouse Cursor Dragging */}
          <div className="space-y-2">
            {/* Interactive Timeline Track: Clickable & Draggable */}
            <div
              ref={trackRef}
              onClick={handleTimelineClick}
              className="relative h-14 bg-sky-100 rounded-xl overflow-hidden border-2 border-sky-300 cursor-crosshair select-none"
              title="Clique ou arraste com o mouse para reposicionar o início e o fim do corte"
            >
              {/* Simulated Waveform Bars */}
              <div className="absolute inset-0 flex items-center justify-between px-2 opacity-40 pointer-events-none">
                {Array.from({ length: 54 }).map((_, i) => {
                  const h = 18 + Math.sin(i * 0.45) * 18 + (i % 3 === 0 ? 12 : 0);
                  return (
                    <div
                      key={i}
                      className="w-1 bg-sky-800 rounded-full"
                      style={{ height: `${Math.min(46, Math.max(8, h))}px` }}
                    />
                  );
                })}
              </div>

              {/* Selected Highlight Region */}
              <div
                className="absolute top-0 bottom-0 bg-sky-500/35 border-x-2 border-sky-600 z-10"
                style={{
                  left: `${(startTime / totalDuration) * 100}%`,
                  width: `${((endTime - startTime) / totalDuration) * 100}%`,
                }}
              >
                {/* Left Drag Handle (Início) */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingMode("start");
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setDraggingMode("start");
                  }}
                  className="absolute left-0 top-0 bottom-0 w-3 -translate-x-1.5 bg-sky-700 hover:bg-sky-900 cursor-ew-resize flex items-center justify-center z-30 shadow-md group"
                  title="Arraste para mover o Ponto de Início"
                >
                  <MoveHorizontal className="w-2.5 h-2.5 text-white opacity-80" />
                </div>

                {/* Right Drag Handle (Fim) */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingMode("end");
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setDraggingMode("end");
                  }}
                  className="absolute right-0 top-0 bottom-0 w-3 translate-x-1.5 bg-sky-700 hover:bg-sky-900 cursor-ew-resize flex items-center justify-center z-30 shadow-md group"
                  title="Arraste para mover o Ponto Final"
                >
                  <MoveHorizontal className="w-2.5 h-2.5 text-white opacity-80" />
                </div>
              </div>

              {/* Current Playback Marker */}
              {isPlaying && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-amber-500 z-20 shadow-md"
                  style={{
                    left: `${(currentTime / totalDuration) * 100}%`,
                  }}
                />
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-sky-700 px-1">
              <span>0,0s</span>
              <span>{formatSeconds(totalDuration)}</span>
            </div>

            {/* Compact Ponto de Início and Ponto Final with Ouvir Trecho Selecionado to the right */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-sky-100">
              {/* Ponto de Início (largura reduzida) */}
              <div className="w-44 sm:w-48 space-y-1 bg-sky-50/70 p-2 rounded-xl border border-sky-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold text-sky-950 uppercase tracking-wide">
                    Ponto de Início
                  </label>
                  <span className="text-[11px] font-bold text-sky-700 bg-white px-1.5 py-0.5 rounded border border-sky-300">
                    {formatSeconds(startTime)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, totalDuration - 0.5)}
                  step={0.1}
                  value={startTime}
                  onChange={(e) => updateStartTime(parseFloat(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer h-1.5"
                />

                <div className="flex items-center justify-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => stepStart(-0.1)}
                    disabled={startTime <= 0}
                    className="p-1 px-2.5 rounded-lg bg-white hover:bg-sky-100 border border-sky-300 text-sky-950 flex items-center justify-center disabled:opacity-40 cursor-pointer shadow-2xs transition-colors"
                    title="Recuar início"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-sky-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepStart(0.1)}
                    disabled={startTime >= endTime - 0.5}
                    className="p-1 px-2.5 rounded-lg bg-white hover:bg-sky-100 border border-sky-300 text-sky-950 flex items-center justify-center disabled:opacity-40 cursor-pointer shadow-2xs transition-colors"
                    title="Adiantar início"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-sky-700" />
                  </button>
                </div>
              </div>

              {/* Ponto Final (largura reduzida) */}
              <div className="w-44 sm:w-48 space-y-1 bg-sky-50/70 p-2 rounded-xl border border-sky-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold text-sky-950 uppercase tracking-wide">
                    Ponto Final
                  </label>
                  <span className="text-[11px] font-bold text-sky-700 bg-white px-1.5 py-0.5 rounded border border-sky-300">
                    {formatSeconds(endTime)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={totalDuration}
                  step={0.1}
                  value={endTime}
                  onChange={(e) => updateEndTime(parseFloat(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer h-1.5"
                />

                <div className="flex items-center justify-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => stepEnd(-0.1)}
                    disabled={endTime <= startTime + 0.5}
                    className="p-1 px-2.5 rounded-lg bg-white hover:bg-sky-100 border border-sky-300 text-sky-950 flex items-center justify-center disabled:opacity-40 cursor-pointer shadow-2xs transition-colors"
                    title="Recuar final"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-sky-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepEnd(0.1)}
                    disabled={endTime >= totalDuration}
                    className="p-1 px-2.5 rounded-lg bg-white hover:bg-sky-100 border border-sky-300 text-sky-950 flex items-center justify-center disabled:opacity-40 cursor-pointer shadow-2xs transition-colors"
                    title="Adiantar final"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-sky-700" />
                  </button>
                </div>
              </div>

              {/* Botão Ouvir Trecho Selecionado ao lado direito do Ponto Final */}
              <button
                type="button"
                onClick={togglePlaySlice}
                className="h-11 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md transition-colors self-center shrink-0"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pausar Trecho</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Ouvir Trecho Selecionado</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* CRITICAL REQUIRED RULE: Calculation display with 1s silence leading and trailing */}
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-sky-900">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>Regra de Duração & Divisão pelas Fotos (1s de silêncio no início e fim):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="bg-white p-2 rounded-lg border border-sky-200">
                <span className="text-sky-700 block">Tempo do Áudio Cortado:</span>
                <span className="font-bold text-sky-950">{sliceDuration.toFixed(1)} segundos</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-sky-200">
                <span className="text-sky-700 block">Estrutura do Vídeo:</span>
                <span className="font-bold text-sky-950">
                  1s silêncio + {sliceDuration.toFixed(1)}s + 1s silêncio = <strong>{totalVideoDuration.toFixed(1)}s</strong>
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-sky-200">
                <span className="text-sky-700 block">Exibição de Cada Foto:</span>
                <span className="font-bold text-sky-600">
                  {timePerPhoto.toFixed(1)}s por foto ({photosCount} {photosCount === 1 ? "foto" : "fotos"})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
