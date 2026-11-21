"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Upload,
  FileVideo,
  RefreshCw,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  VolumeX,
  Volume2,
  Scissors,
  Sliders,
  Sparkles,
  ExternalLink,
  Link2,
  Trash2,
  Film,
  Music,
} from "lucide-react";
import { VideoConvertTargetFormat } from "@/app/api/convert-video/route";
import { convertVideoInBrowser } from "@/lib/client-video-converter";

interface VideoConverterEnvironmentProps {
  onBackToModeSelection: () => void;
}

interface FormatOption {
  id: VideoConvertTargetFormat;
  label: string;
  badge: string;
  desc: string;
  kind: "video" | "audio" | "image";
}

const FORMAT_OPTIONS: FormatOption[] = [
  { id: "webm", label: "WebM", badge: "VP8 / Opus", desc: "Leve e otimizado para navegadores e web", kind: "video" },
  { id: "mp4", label: "MP4", badge: "H.264 / AAC", desc: "Compatível com celulares, YouTube, WhatsApp e TVs", kind: "video" },
  { id: "mov", label: "MOV", badge: "QuickTime", desc: "Ideal para edição no Mac, iPhone e iMovie", kind: "video" },
  { id: "avi", label: "AVI", badge: "MPEG-4 / MP3", desc: "Formato clássico compatível com players Windows", kind: "video" },
  { id: "mkv", label: "MKV", badge: "Matroska", desc: "Contêiner flexível de alta qualidade", kind: "video" },
  { id: "gif", label: "GIF", badge: "Animado", desc: "Clipe animado sem áudio para redes e chats", kind: "image" },
  { id: "mp3", label: "MP3", badge: "Áudio", desc: "Extrai somente a faixa de áudio em MP3", kind: "audio" },
  { id: "wav", label: "WAV", badge: "Sem perdas", desc: "Extrai o áudio puro em alta fidelidade PCM", kind: "audio" },
];

const WEBM_STUDIO_URL_STORAGE_KEY = "movix_webm_studio_external_url";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, idx)).toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
}

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoConverterEnvironment({
  onBackToModeSelection,
}: VideoConverterEnvironmentProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const [sourceMeta, setSourceMeta] = useState<{
    duration: number;
    width: number;
    height: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // WebM is first in FORMAT_OPTIONS and pre-selected
  const [targetFormat, setTargetFormat] = useState<VideoConvertTargetFormat>("webm");
  const [resolution, setResolution] = useState<"original" | "1080p" | "720p" | "480p" | "360p">("original");
  const [quality, setQuality] = useState<"high" | "balanced" | "compact">("balanced");
  const [fps, setFps] = useState<string>("original");
  const [removeAudio, setRemoveAudio] = useState(false);
  const [trimStart, setTrimStart] = useState<string>("0");
  const [trimEnd, setTrimEnd] = useState<string>("");

  const [isConverting, setIsConverting] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [progressPct, setProgressPct] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [serverFfmpegAvailable, setServerFfmpegAvailable] = useState<boolean | null>(null);

  const [convertedResult, setConvertedResult] = useState<{
    url: string;
    fileName: string;
    mimeType: string;
    format: VideoConvertTargetFormat;
    originalSize: number;
    convertedSize: number;
  } | null>(null);

  // Optional external WebM Studio link from user's My Apps
  const [showExternalLinkBar, setShowExternalLinkBar] = useState(false);
  const [savedExternalUrl, setSavedExternalUrl] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(WEBM_STUDIO_URL_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [externalWebmStudioUrl, setExternalWebmStudioUrl] = useState<string>(savedExternalUrl);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/convert-video", { method: "GET" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.available === "boolean") {
          setServerFfmpegAvailable(data.available);
        }
      })
      .catch(() => {
        if (!cancelled) setServerFfmpegAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl);
    };
  }, [sourcePreviewUrl]);

  useEffect(() => {
    return () => {
      if (convertedResult?.url) URL.revokeObjectURL(convertedResult.url);
    };
  }, [convertedResult]);

  const handleSelectFile = (file: File) => {
    setErrorMsg(null);
    if (convertedResult?.url) {
      URL.revokeObjectURL(convertedResult.url);
      setConvertedResult(null);
    }
    if (sourcePreviewUrl) {
      URL.revokeObjectURL(sourcePreviewUrl);
    }

    const url = URL.createObjectURL(file);
    setSourceFile(file);
    setSourcePreviewUrl(url);
    setSourceMeta(null);
    setTrimStart("0");
    setTrimEnd("");
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSelectFile(file);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleSelectFile(file);
    }
  };

  const handleClearFile = () => {
    if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl);
    if (convertedResult?.url) URL.revokeObjectURL(convertedResult.url);
    setSourceFile(null);
    setSourcePreviewUrl(null);
    setSourceMeta(null);
    setConvertedResult(null);
    setErrorMsg(null);
  };

  const handleSaveExternalUrl = () => {
    const trimmed = externalWebmStudioUrl.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      setErrorMsg("Informe um endereço válido começando com https:// ou http://");
      return;
    }
    setErrorMsg(null);
    setSavedExternalUrl(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem(WEBM_STUDIO_URL_STORAGE_KEY, trimmed);
      } else {
        localStorage.removeItem(WEBM_STUDIO_URL_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
    setShowExternalLinkBar(false);
  };

  const handleConvert = async () => {
    if (!sourceFile) return;

    setIsConverting(true);
    setErrorMsg(null);
    setProgressPct(5);
    setProgressMsg(`Preparando envio para ${targetFormat.toUpperCase()}...`);

    if (convertedResult?.url) {
      URL.revokeObjectURL(convertedResult.url);
      setConvertedResult(null);
    }

    let progressTimer: ReturnType<typeof setInterval> | null = null;

    const runBrowserFallback = async () => {
      setProgressMsg("Convertendo diretamente no navegador...");
      const fallback = await convertVideoInBrowser(sourceFile, {
        targetFormat: targetFormat === "mp4" ? "mp4" : "webm",
        resolution,
        quality,
        fps,
        removeAudio,
        trimStart: Number(trimStart || 0),
        trimEnd: Number(trimEnd || 0),
        onProgress: (pct, msg) => {
          setProgressPct(pct);
          setProgressMsg(msg);
        },
      });
      const url = URL.createObjectURL(fallback.blob);
      const baseName = sourceFile.name.replace(/\.[^.]+$/, "") || "video";
      setConvertedResult({
        url,
        fileName: `${baseName}.${fallback.extension}`,
        mimeType: fallback.mimeType,
        format: fallback.extension as VideoConvertTargetFormat,
        originalSize: sourceFile.size,
        convertedSize: fallback.blob.size,
      });
    };

    const readConvertedResponse = async (response: Response) => {
      const contentType = response.headers.get("Content-Type") || "";
      if (contentType.includes("application/json")) {
        const meta = await response.json();
        if (meta?.chunkedDownload && meta?.downloadId && meta?.totalSize > 0) {
          const totalSize = Number(meta.totalSize);
          const sliceSize = 4 * 1024 * 1024;
          const parts: BlobPart[] = [];
          let offset = 0;

          while (offset < totalSize) {
            const len = Math.min(sliceSize, totalSize - offset);
            const pct = 92 + Math.round(((offset + len) / totalSize) * 7);
            setProgressPct(pct);
            setProgressMsg(`Baixando vídeo convertido (${pct}%)...`);

            const dlRes = await fetch(
              `/api/convert-video?downloadId=${encodeURIComponent(meta.downloadId)}&offset=${offset}&length=${len}`
            );
            if (!dlRes.ok) {
              throw new Error(`Falha ao baixar parte do vídeo convertido (HTTP ${dlRes.status}).`);
            }
            parts.push(await dlRes.arrayBuffer());
            offset += len;
          }

          fetch(`/api/convert-video?downloadId=${encodeURIComponent(meta.downloadId)}`, {
            method: "DELETE",
          }).catch(() => {});

          const blob = new Blob(parts, {
            type: meta.mimeType || `video/${targetFormat}`,
          });
          if (blob.size < 256) {
            throw new Error("O arquivo convertido veio vazio. Tente novamente com outro formato.");
          }
          const url = URL.createObjectURL(blob);
          setProgressPct(100);
          setProgressMsg("Conversão concluída com sucesso!");
          setConvertedResult({
            url,
            fileName: meta.fileName || `video.${targetFormat}`,
            mimeType: blob.type,
            format: targetFormat,
            originalSize: sourceFile.size,
            convertedSize: blob.size,
          });
          return;
        }
        throw new Error(meta?.error || "Resposta inesperada do servidor de conversão.");
      }

      setProgressPct(96);
      setProgressMsg("Finalizando arquivo convertido...");
      const blob = await response.blob();
      if (!blob || blob.size < 256) {
        throw new Error("O arquivo convertido veio vazio. Tente novamente com outro formato ou ajuste.");
      }
      const url = URL.createObjectURL(blob);
      const baseName = sourceFile.name.replace(/\.[^.]+$/, "") || "video";
      const fileName = `${baseName}.${targetFormat}`;

      setProgressPct(100);
      setProgressMsg("Conversão concluída com sucesso!");
      setConvertedResult({
        url,
        fileName,
        mimeType: blob.type || `video/${targetFormat}`,
        format: targetFormat,
        originalSize: sourceFile.size,
        convertedSize: blob.size,
      });
    };

    try {
      const canUseBrowserDirectly =
        serverFfmpegAvailable === false &&
        (targetFormat === "webm" || targetFormat === "mp4");

      if (canUseBrowserDirectly) {
        await runBrowserFallback();
        return;
      }

      const uploadAndConvertChunked = async (chunkSizeBytes: number): Promise<Response> => {
        const uploadId =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `up_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const totalChunks = Math.max(1, Math.ceil(sourceFile.size / chunkSizeBytes));

        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSizeBytes;
          const end = Math.min(sourceFile.size, start + chunkSizeBytes);
          const chunk = sourceFile.slice(start, end);

          const chunkForm = new FormData();
          chunkForm.append("action", "upload-chunk");
          chunkForm.append("uploadId", uploadId);
          chunkForm.append("chunkIndex", String(i));
          chunkForm.append("totalChunks", String(totalChunks));
          chunkForm.append("fileName", sourceFile.name);
          chunkForm.append("chunk", chunk, `${sourceFile.name}.part${i}`);

          setProgressMsg(`Enviando vídeo (${i + 1}/${totalChunks})...`);
          const chunkRes = await fetch("/api/convert-video", {
            method: "POST",
            body: chunkForm,
          });

          if (!chunkRes.ok) {
            return chunkRes;
          }

          const uploadPct = Math.max(8, Math.round(((i + 1) / totalChunks) * 55));
          setProgressPct(uploadPct);
        }

        setProgressPct(58);
        setProgressMsg(`Convertendo para ${targetFormat.toUpperCase()}...`);
        progressTimer = setInterval(() => {
          setProgressPct((prev) => {
            if (prev >= 90) return prev;
            const step = prev < 75 ? 4 : 1;
            return Math.min(90, prev + step);
          });
        }, 450);

        const finalForm = new FormData();
        finalForm.append("action", "finalize");
        finalForm.append("uploadId", uploadId);
        finalForm.append("totalChunks", String(totalChunks));
        finalForm.append("fileName", sourceFile.name);
        finalForm.append("targetFormat", targetFormat);
        finalForm.append("resolution", resolution);
        finalForm.append("quality", quality);
        finalForm.append("fps", fps);
        finalForm.append("removeAudio", String(removeAudio));
        finalForm.append("trimStart", trimStart || "0");
        finalForm.append("trimEnd", trimEnd || "0");

        return await fetch("/api/convert-video", {
          method: "POST",
          body: finalForm,
        });
      };

      const DIRECT_LIMIT = 4 * 1024 * 1024; // 4 MB safely below Cloud Run 32MB limit
      let response: Response;

      if (sourceFile.size <= DIRECT_LIMIT) {
        const formData = new FormData();
        formData.append("action", "direct");
        formData.append("file", sourceFile);
        formData.append("targetFormat", targetFormat);
        formData.append("resolution", resolution);
        formData.append("quality", quality);
        formData.append("fps", fps);
        formData.append("removeAudio", String(removeAudio));
        formData.append("trimStart", trimStart || "0");
        formData.append("trimEnd", trimEnd || "0");

        setProgressPct(18);
        setProgressMsg(`Enviando e convertendo para ${targetFormat.toUpperCase()}...`);
        progressTimer = setInterval(() => {
          setProgressPct((prev) => {
            if (prev >= 90) return prev;
            const step = prev < 50 ? 6 : prev < 75 ? 3 : 1;
            return Math.min(90, prev + step);
          });
        }, 450);

        response = await fetch("/api/convert-video", {
          method: "POST",
          body: formData,
        });

        // If a strict proxy still rejected with 413, automatically retry with 1.5MB chunks
        if (response.status === 413) {
          if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
          }
          response = await uploadAndConvertChunked(1536 * 1024);
        }
      } else {
        response = await uploadAndConvertChunked(DIRECT_LIMIT);
        // If proxy rejected 4MB chunk with 413, retry with 1.5MB chunks
        if (response.status === 413) {
          if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
          }
          response = await uploadAndConvertChunked(1536 * 1024);
        }
      }

      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }

      if (response.ok) {
        await readConvertedResponse(response);
        return;
      }

      const errData = await response.json().catch(() => null);
      if (
        (response.status === 501 || errData?.ffmpegMissing) &&
        (targetFormat === "webm" || targetFormat === "mp4")
      ) {
        await runBrowserFallback();
        return;
      }

      if (response.status === 413) {
        throw new Error(
          "O servidor recusou o tamanho do envio (HTTP 413). Tente novamente com um vídeo menor ou selecione qualidade compacta."
        );
      }

      throw new Error(errData?.error || `Falha na conversão (HTTP ${response.status}).`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Não foi possível converter este vídeo.");
    } finally {
      if (progressTimer) {
        clearInterval(progressTimer);
      }
      setIsConverting(false);
    }
  };

  const selectedFormatInfo = FORMAT_OPTIONS.find((f) => f.id === targetFormat)!;
  const isAudioOutput = selectedFormatInfo.kind === "audio";
  const isGifOutput = selectedFormatInfo.kind === "image";

  const sizeDiffPct =
    convertedResult && convertedResult.originalSize > 0
      ? Math.round(
          ((convertedResult.originalSize - convertedResult.convertedSize) /
            convertedResult.originalSize) *
            100
        )
      : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Main Container */}
      <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-5 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-sky-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToModeSelection}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-950 text-xs font-bold border border-sky-300 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Início
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-sky-950 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-sky-600" />
                Converter Vídeos
              </h2>
              <p className="text-xs text-sky-800">
                Converta vídeos entre WebM, MP4, MOV, AVI, MKV, GIF ou extraia áudio em MP3/WAV
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {savedExternalUrl && (
              <a
                href={savedExternalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir WebM Studio
              </a>
            )}
            <button
              type="button"
              onClick={() => setShowExternalLinkBar((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 text-xs font-bold border border-sky-200 transition-colors cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5 text-sky-600" />
              {savedExternalUrl ? "Editar link WebM Studio" : "Conectar URL do WebM Studio"}
            </button>
          </div>
        </div>

        {/* Optional WebM Studio external URL configuration */}
        {showExternalLinkBar && (
          <div className="bg-sky-50/90 border border-sky-300 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-xs font-black text-sky-950">
                  Vincular link do seu app &quot;WebM Studio&quot; (My Apps)
                </h3>
                <p className="text-[11px] text-sky-800 mt-0.5">
                  Todas as funções de conversão já estão integradas abaixo. Se também desejar abrir seu aplicativo separado &quot;WebM Studio&quot; com 1 clique, cole a URL dele aqui:
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={externalWebmStudioUrl}
                onChange={(e) => setExternalWebmStudioUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-white border border-sky-300 rounded-xl px-3 py-2 text-xs text-sky-950 focus:outline-none focus:border-sky-600"
              />
              <button
                type="button"
                onClick={handleSaveExternalUrl}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
              >
                Salvar Link
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-300 text-red-900 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Converter Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Original Video + Converted Video stacked below with matching size */}
          <div className="lg:col-span-5 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.webm,.mov,.avi,.mkv,.m4v,.ogv,.flv,.wmv"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {!sourceFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[300px] ${
                  isDragging
                    ? "border-sky-600 bg-sky-100/80 scale-[1.01]"
                    : "border-sky-300 bg-sky-50/60 hover:border-sky-500 hover:bg-sky-100/50"
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md mb-4">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-black text-sky-950">
                  Clique ou arraste seu vídeo aqui
                </h3>
                <p className="text-xs text-sky-800 mt-1.5 max-w-xs">
                  Suporta arquivos MP4, WebM, MOV, AVI, MKV, OGV e outros formatos de vídeo
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-sm">
                  <FileVideo className="w-4 h-4" />
                  Selecionar Vídeo
                </span>
              </div>
            ) : (
              <div className="bg-sky-50/70 border border-sky-300 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-sky-950 truncate" title={sourceFile.name}>
                      Original: {sourceFile.name}
                    </p>
                    <p className="text-[11px] text-sky-800">
                      Tamanho: <strong>{formatBytes(sourceFile.size)}</strong>
                      {sourceMeta ? (
                        <>
                          {" "}
                          • {sourceMeta.width}x{sourceMeta.height}
                          {Number.isFinite(sourceMeta.duration) && sourceMeta.duration > 0
                            ? ` • ${formatDuration(sourceMeta.duration)}`
                            : ""}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-sky-100 text-sky-950 text-[11px] font-bold border border-sky-300 cursor-pointer"
                    >
                      Trocar
                    </button>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      title="Remover vídeo"
                      className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-sky-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {sourcePreviewUrl && (
                  <div className="rounded-xl overflow-hidden bg-slate-950 border border-sky-200">
                    <video
                      src={sourcePreviewUrl}
                      controls
                      onLoadedMetadata={(e) => {
                        const vid = e.currentTarget;
                        setSourceMeta({
                          duration: vid.duration,
                          width: vid.videoWidth,
                          height: vid.videoHeight,
                        });
                      }}
                      className="w-full h-[240px] object-contain mx-auto"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Converted Video Quadrant: directly below the original video with matching size & download button below video */}
            {convertedResult && (
              <div
                data-testid="converted-video-card"
                className="bg-emerald-50/90 border-2 border-emerald-400 rounded-2xl p-4 space-y-3 animate-in fade-in duration-300"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-black text-emerald-950 truncate"
                      title={convertedResult.fileName}
                    >
                      Convertido: {convertedResult.fileName}
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      Original: <strong>{formatBytes(convertedResult.originalSize)}</strong> →{" "}
                      Convertido: <strong>{formatBytes(convertedResult.convertedSize)}</strong>
                      {sizeDiffPct > 0 ? ` (${sizeDiffPct}% menor)` : ""}
                    </p>
                  </div>
                </div>

                {convertedResult.format === "mp3" || convertedResult.format === "wav" ? (
                  <div className="bg-white border border-emerald-200 rounded-xl p-4 h-[240px] flex flex-col items-center justify-center gap-3">
                    <Music className="w-8 h-8 text-emerald-600 shrink-0" />
                    <audio src={convertedResult.url} controls className="w-full" />
                  </div>
                ) : convertedResult.format === "gif" ? (
                  <div className="rounded-xl overflow-hidden bg-slate-950 border border-emerald-200 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={convertedResult.url}
                      alt={convertedResult.fileName}
                      referrerPolicy="no-referrer"
                      className="w-full h-[240px] object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden bg-slate-950 border border-emerald-200">
                    <video
                      src={convertedResult.url}
                      controls
                      className="w-full h-[240px] object-contain mx-auto"
                    />
                  </div>
                )}

                <a
                  href={convertedResult.url}
                  download={convertedResult.fileName}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Baixar {convertedResult.format.toUpperCase()}
                </a>
              </div>
            )}
          </div>

          {/* Right Column: Target Format & Conversion Options */}
          <div className="lg:col-span-7 space-y-5">
            {/* Format Picker */}
            <div className="space-y-2.5">
              <label className="text-xs font-black uppercase tracking-wider text-sky-950 flex items-center gap-1.5">
                <Film className="w-4 h-4 text-sky-600" />
                1. Escolha o Formato de Saída
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {FORMAT_OPTIONS.map((fmt) => {
                  const selected = targetFormat === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setTargetFormat(fmt.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        selected
                          ? "border-sky-600 bg-sky-100 shadow-sm"
                          : "border-sky-200 bg-white hover:border-sky-400 hover:bg-sky-50/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-black text-sky-950">{fmt.label}</span>
                        <span className="text-[10px] font-bold text-sky-700">{fmt.badge}</span>
                      </div>
                      <p className="text-[10px] text-sky-800 mt-1 leading-snug line-clamp-2">
                        {fmt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Technical Options */}
            <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-1.5 text-xs font-black text-sky-950">
                <Sliders className="w-4 h-4 text-sky-600" />
                2. Ajustes de Qualidade e Recorte
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Resolution */}
                <div>
                  <label className="block text-[11px] font-bold text-sky-900 mb-1">
                    Resolução
                  </label>
                  <select
                    value={resolution}
                    disabled={isAudioOutput}
                    onChange={(e) => setResolution(e.target.value as any)}
                    className="w-full bg-white border border-sky-300 rounded-xl px-3 py-2 text-xs text-sky-950 font-medium disabled:opacity-50 cursor-pointer"
                  >
                    <option value="original">Original (Manter)</option>
                    <option value="1080p">1080p (Full HD)</option>
                    <option value="720p">720p (HD)</option>
                    <option value="480p">480p (SD)</option>
                    <option value="360p">360p (Compacto)</option>
                  </select>
                </div>

                {/* Quality */}
                <div>
                  <label className="block text-[11px] font-bold text-sky-900 mb-1">
                    Qualidade / Compressão
                  </label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as any)}
                    className="w-full bg-white border border-sky-300 rounded-xl px-3 py-2 text-xs text-sky-950 font-medium cursor-pointer"
                  >
                    <option value="high">Alta Qualidade</option>
                    <option value="balanced">Balanceada (Recomendado)</option>
                    <option value="compact">Compacta (Menor arquivo)</option>
                  </select>
                </div>

                {/* FPS */}
                <div>
                  <label className="block text-[11px] font-bold text-sky-900 mb-1">
                    Taxa de Quadros (FPS)
                  </label>
                  <select
                    value={fps}
                    disabled={isAudioOutput}
                    onChange={(e) => setFps(e.target.value)}
                    className="w-full bg-white border border-sky-300 rounded-xl px-3 py-2 text-xs text-sky-950 font-medium disabled:opacity-50 cursor-pointer"
                  >
                    <option value="original">Original</option>
                    <option value="60">60 fps</option>
                    <option value="30">30 fps</option>
                    <option value="24">24 fps</option>
                    <option value="15">15 fps</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
                {/* Trim Start */}
                <div>
                  <label className="block text-[11px] font-bold text-sky-900 mb-1 flex items-center gap-1">
                    <Scissors className="w-3 h-3 text-sky-600" />
                    Início do Corte (seg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={trimStart}
                    onChange={(e) => setTrimStart(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white border border-sky-300 rounded-xl px-3 py-2 text-xs text-sky-950 font-medium"
                  />
                </div>

                {/* Trim End */}
                <div>
                  <label className="block text-[11px] font-bold text-sky-900 mb-1">
                    Fim do Corte (seg, opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(e.target.value)}
                    placeholder={
                      sourceMeta && Number.isFinite(sourceMeta.duration) && sourceMeta.duration > 0
                        ? String(Math.ceil(sourceMeta.duration))
                        : "Final"
                    }
                    className="w-full bg-white border border-sky-300 rounded-xl px-3 py-2 text-xs text-sky-950 font-medium"
                  />
                </div>

                {/* Audio Toggle */}
                {!isAudioOutput && !isGifOutput && (
                  <button
                    type="button"
                    onClick={() => setRemoveAudio((v) => !v)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                      removeAudio
                        ? "bg-amber-100 border-amber-400 text-amber-950"
                        : "bg-white border-sky-300 text-sky-950 hover:bg-sky-100"
                    }`}
                  >
                    {removeAudio ? (
                      <>
                        <VolumeX className="w-4 h-4 text-amber-700" />
                        Áudio Removido
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 text-sky-600" />
                        Manter Áudio
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Convert CTA & Progress Bar with right-side percentage */}
            <div className="space-y-3">
              <button
                type="button"
                disabled={!sourceFile || isConverting}
                onClick={handleConvert}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {progressMsg || "Convertendo vídeo..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Converter para {targetFormat.toUpperCase()}
                  </>
                )}
              </button>

              {isConverting && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-sky-100 rounded-full h-2.5 overflow-hidden border border-sky-200">
                    <div
                      className="bg-sky-600 h-full transition-all duration-300"
                      style={{ width: `${Math.max(5, Math.min(100, progressPct))}%` }}
                    />
                  </div>
                  <span
                    data-testid="conversion-progress-pct"
                    className="text-xs font-black text-sky-950 tabular-nums shrink-0 min-w-[38px] text-right"
                  >
                    {Math.round(progressPct)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
