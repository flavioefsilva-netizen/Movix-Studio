"use client";

import React, { useRef } from "react";
import {
  Download,
  FileDown,
  CheckCircle2,
  Clock,
  Tv,
  Layers,
  RotateCcw,
  Share2,
} from "lucide-react";
import { PresentationData, AttachedPhoto } from "@/types/presentation";

interface VideoPlayerCardProps {
  videoUrl: string;
  webmUrl?: string;
  videoDuration: number;
  presentation: PresentationData;
  photos: AttachedPhoto[];
  onDownloadPowerPoint: () => void;
  onReRender: () => void;
}

export function VideoPlayerCard({
  videoUrl,
  webmUrl,
  videoDuration,
  presentation,
  onDownloadPowerPoint,
  onReRender,
}: VideoPlayerCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const cleanTitle = (presentation.title || "video_apresentacao_movix").replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  );

  const handleDownloadVideoMp4 = () => {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `${cleanTitle}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadVideoWebm = () => {
    const a = document.createElement("a");
    a.href = webmUrl || videoUrl;
    a.download = `${cleanTitle}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="bg-white border-2 border-sky-400 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-sky-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center shadow-sm">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-sky-950">
                Vídeo Narrado Concluído com Sucesso!
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                HD 720p • MP4 & WEBM
              </span>
            </div>
            <p className="text-xs text-sky-800">
              Assista ao vídeo abaixo diretamente no app ou baixe em formato MP4 ou WEBM (WhatsApp)
            </p>
          </div>
        </div>

        {/* Primary Action Buttons: MP4 and WEBM */}
        <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
          {/* Botão: MP4 */}
          <button
            type="button"
            onClick={handleDownloadVideoMp4}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-black text-sm transition-all shadow-lg shadow-sky-500/20 cursor-pointer"
            title="Baixar vídeo em formato MP4"
          >
            <Download className="w-4 h-4 stroke-[3]" />
            <span>MP4</span>
          </button>

          {/* Botão: WEBM */}
          <button
            type="button"
            onClick={handleDownloadVideoWebm}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-950 border border-sky-300 font-black text-xs sm:text-sm transition-all shadow-sm cursor-pointer group"
            title="Baixar vídeo em formato WEBM"
          >
            <Download className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span>WEBM</span>
          </button>
        </div>
      </div>


      {/* Video Player Display Container */}
      <div className="relative rounded-2xl overflow-hidden bg-black border border-sky-300 shadow-2xl aspect-video max-w-4xl mx-auto">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        >
          Seu navegador não suporta a tag de vídeo HTML5.
        </video>
      </div>

      {/* Video Statistics & Quick Actions Bar */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center gap-3">
          <Clock className="w-4 h-4 text-sky-600" />
          <div>
            <span className="text-[11px] text-sky-800 block">Duração do Vídeo</span>
            <span className="text-xs font-bold text-sky-950">
              {formatTime(videoDuration)} minutos
            </span>
          </div>
        </div>

        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center gap-3">
          <Tv className="w-4 h-4 text-blue-600" />
          <div>
            <span className="text-[11px] text-sky-800 block">Formatos Disponíveis</span>
            <span className="text-xs font-bold text-sky-950">MP4 & WEBM (WhatsApp) • 720p HD</span>
          </div>
        </div>

        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center gap-3">
          <Layers className="w-4 h-4 text-teal-600" />
          <div>
            <span className="text-[11px] text-sky-800 block">Slides Narrados</span>
            <span className="text-xs font-bold text-sky-950">
              {presentation.slides.length} slides sincronizados
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-sky-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDownloadPowerPoint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-950 border border-sky-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <FileDown className="w-4 h-4 text-orange-600" />
            <span>Baixar Apresentação PowerPoint (.pptx)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onReRender}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-sky-50 text-sky-950 border border-sky-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
          <span>Editar & Renderizar Novamente</span>
        </button>
      </div>
    </div>
  );
}
