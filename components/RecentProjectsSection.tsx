"use client";

import React, { useState } from "react";
import {
  FolderClock,
  Play,
  Film,
  Download,
  Share2,
  Clock,
  Edit3,
  Trash2,
  Layers,
  Image as ImageIcon,
  Presentation,
} from "lucide-react";
import { SavedProject } from "@/types/project";
import { isPlayableVideoUrl } from "@/lib/projects-store";

interface RecentProjectsSectionProps {
  projects: SavedProject[];
  activeProjectId?: string | null;
  onLoadProject: (project: SavedProject) => void;
  onDeleteProject?: (id: string) => void;
}

export function RecentProjectsSection({
  projects,
  activeProjectId,
  onLoadProject,
  onDeleteProject,
}: RecentProjectsSectionProps) {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const formatDate = (timestamp: number) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Data recente";
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <section
      id="quadrante-ultimos-projetos"
      className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6"
    >
      {/* Quadrant Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-sky-200">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-700 border border-sky-300 flex items-center justify-center font-black shadow-sm">
            <FolderClock className="w-6 h-6 text-sky-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-sky-950 tracking-tight">
                Últimos Projetos
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-200">
                {projects.length} de 5 salvos
              </span>
            </div>
            <p className="text-xs text-sky-800 mt-0.5">
              Histórico dos últimos 5 vídeos gravados. Ao criar o 6º projeto, o mais antigo é substituído automaticamente.
            </p>
          </div>
        </div>

        {activeProjectId && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-100 border border-sky-300 text-sky-900 text-xs font-bold animate-pulse">
            <Edit3 className="w-3.5 h-3.5 text-sky-600" />
            <span>Projeto atualmente em edição nos campos</span>
          </div>
        )}
      </div>

      {/* Projects List or Empty State */}
      {projects.length === 0 ? (
        <div className="border-2 border-dashed border-sky-300 rounded-2xl p-10 text-center bg-sky-50/50 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 border border-sky-200 flex items-center justify-center mx-auto text-sky-600">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-sky-950">
            Nenhum projeto gravado ainda
          </h3>
          <p className="text-xs text-sky-800 max-w-md mx-auto leading-relaxed">
            Ao validar e criar o seu primeiro vídeo, ele será salvo neste quadrante com o nome que você escolher antes da gravação.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project, index) => {
            const isCurrentEditing = activeProjectId === project.id;
            const isPlayingThis = playingVideoId === project.id;
            const hasPlayableVideo = isPlayableVideoUrl(project.videoUrl);
            const hasPlayableWebm = isPlayableVideoUrl(project.webmUrl || project.videoUrl);
            const isPhotos = project.mode === "photos-text";
            const itemCount = isPhotos
              ? project.photoStoryData?.photoItems?.length || 0
              : project.presentationData?.presentation?.slides?.length || 0;

            return (
              <div
                key={project.id}
                className={`relative flex flex-col justify-between rounded-2xl border-2 transition-all overflow-hidden ${
                  isCurrentEditing
                    ? "bg-white border-sky-500 shadow-xl shadow-sky-400/20 ring-2 ring-sky-400"
                    : "bg-white border-sky-200 hover:border-sky-400 hover:shadow-lg shadow-sm"
                }`}
              >
                {/* Card Header & Content */}
                <div className="p-5 space-y-3.5">
                  {/* Top Bar inside card */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        isPhotos
                          ? "bg-sky-100 text-sky-900 border border-sky-200"
                          : "bg-blue-100 text-blue-900 border border-blue-200"
                      }`}
                    >
                      {isPhotos ? (
                        <>
                          <ImageIcon className="w-3 h-3 text-sky-600" />
                          <span>Fotos & Textos</span>
                        </>
                      ) : (
                        <>
                          <Presentation className="w-3 h-3 text-blue-600" />
                          <span>Apresentação & PPT</span>
                        </>
                      )}
                    </span>

                    <span className="text-[10px] text-sky-800/70 font-medium">
                      #{index + 1} • {formatDate(project.updatedAt || project.createdAt)}
                    </span>
                  </div>

                  {/* PROJECT NAME (e.g. "Projeto 1") */}
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-sky-950 tracking-tight flex items-center justify-between">
                      <span>{project.name}</span>
                      {isCurrentEditing && (
                        <span className="text-[10px] font-bold text-sky-900 uppercase bg-sky-100 px-2 py-0.5 rounded border border-sky-300">
                          Editando
                        </span>
                      )}
                    </h3>

                    {/* NOME DO PROJETO */}
                    {project.subtitle && project.subtitle !== project.name && (
                      <div className="text-xs font-semibold leading-snug break-words bg-sky-50 px-3 py-2 rounded-xl border border-sky-200">
                        <p className="italic text-sky-950 font-medium">
                          &quot;{project.subtitle}&quot;
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Metrics Badges */}
                  <div className="flex items-center gap-2 text-[11px] text-sky-800 pt-1">
                    <span className="flex items-center gap-1 bg-sky-50 px-2 py-1 rounded-md border border-sky-200 font-semibold">
                      <Clock className="w-3 h-3 text-sky-600" />
                      {formatDuration(project.duration || 0)} min
                    </span>
                    <span className="flex items-center gap-1 bg-sky-50 px-2 py-1 rounded-md border border-sky-200 font-semibold">
                      <Layers className="w-3 h-3 text-sky-600" />
                      {itemCount} {isPhotos ? "fotos" : "slides"}
                    </span>
                  </div>

                  {/* Inline Mini Video Player or Preview Trigger */}
                  {hasPlayableVideo ? (
                    <div className="pt-1">
                      {isPlayingThis ? (
                        <div className="rounded-xl overflow-hidden bg-black border border-sky-400 aspect-video">
                          <video
                            src={project.videoUrl}
                            controls
                            autoPlay
                            playsInline
                            className="w-full h-full object-contain"
                            onError={() => {
                              setPlayingVideoId(null);
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPlayingVideoId(project.id)}
                          className="w-full py-2 px-3 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-950 border border-sky-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 text-sky-700 fill-sky-700" />
                          <span>Assistir Vídeo Gravado</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="pt-1">
                      <p className="text-[11px] text-sky-700 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-center font-medium">
                        Clique em &quot;Carregar para Edição&quot; para gerar um novo vídeo neste projeto.
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer: Action Buttons */}
                <div className="p-4 bg-sky-50/70 border-t border-sky-100 space-y-2">
                  {/* CRITICAL BUTTON: Carregar para Edição */}
                  <button
                    type="button"
                    onClick={() => onLoadProject(project)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-black text-xs transition-all shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer"
                    title="Carregar este projeto nos campos do formulário para editar e gerar um novo vídeo mantendo o mesmo nome"
                  >
                    <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Carregar para Edição</span>
                  </button>

                  {/* Downloads & Delete Row */}
                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <div className="flex items-center gap-1.5 flex-1">
                      {hasPlayableVideo && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDownload(
                              project.videoUrl,
                              `${project.name.toLowerCase().replace(/\s+/g, "_")}.mp4`
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-sky-100 text-sky-950 border border-sky-200 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                          title="Baixar MP4"
                        >
                          <Download className="w-3 h-3 text-sky-600" />
                          <span>MP4</span>
                        </button>
                      )}

                      {hasPlayableWebm && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDownload(
                              project.webmUrl || project.videoUrl,
                              `${project.name.toLowerCase().replace(/\s+/g, "_")}_whatsapp.webm`
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-sky-100 text-sky-950 border border-sky-200 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                          title="Baixar WEBM para WhatsApp"
                        >
                          <Share2 className="w-3 h-3 text-emerald-600" />
                          <span>WEBM</span>
                        </button>
                      )}
                    </div>

                    {onDeleteProject && (
                      <button
                        type="button"
                        onClick={() => onDeleteProject(project.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remover projeto da lista"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
