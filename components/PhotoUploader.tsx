"use client";

import React, { useRef } from "react";
import { UploadCloud, Image as ImageIcon, Trash2, Plus, Sparkles } from "lucide-react";
import { AttachedPhoto } from "@/types/presentation";
import { generateSamplePhoto } from "@/lib/sample-data";

interface PhotoUploaderProps {
  photos: AttachedPhoto[];
  onPhotosChange: (photos: AttachedPhoto[]) => void;
}

export function PhotoUploader({ photos, onPhotosChange }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newPhotos: AttachedPhoto[] = [];
    const readers: Promise<void>[] = [];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const promise = new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          newPhotos.push({
            id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            name: file.name,
            dataUrl,
            type: file.type,
            size: file.size,
            caption: file.name.replace(/\.[^/.]+$/, ""),
          });
          resolve();
        };
        reader.onerror = () => resolve();
        reader.readAsDataURL(file);
      });

      readers.push(promise);
    });

    Promise.all(readers).then(() => {
      onPhotosChange([...photos, ...newPhotos]);
    });
  };

  const handleRemove = (id: string) => {
    onPhotosChange(photos.filter((p) => p.id !== id));
  };

  const handleAddSamplePhotos = () => {
    const p1 = generateSamplePhoto("Crescimento & Métricas", "#38BDF8", "#1E40AF");
    const p2 = generateSamplePhoto("Inovação Tecnológica", "#818CF8", "#4C1D95");
    const p3 = generateSamplePhoto("Resultados Operacionais", "#34D399", "#065F46");
    onPhotosChange([...photos, p1, p2, p3]);
  };

  return (
    <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-sky-950 flex items-center gap-2">
              Campo para Anexar Fotos
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-200 text-sky-900 font-semibold">
                {photos.length} {photos.length === 1 ? "foto" : "fotos"}
              </span>
            </h3>
            <p className="text-xs text-sky-800">
              Fotos que serão inseridas na apresentação de PowerPoint e no vídeo narrado
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddSamplePhotos}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-sky-100 text-sky-900 border border-sky-300 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          title="Adicionar fotos de teste prontas"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>Exemplos de Fotos</span>
        </button>
      </div>

      {/* Drop Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleFiles(e.dataTransfer.files);
        }}
        className="group relative border-2 border-dashed border-sky-300 hover:border-sky-500 bg-white hover:bg-sky-50/60 rounded-xl p-6 transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-2 shadow-xs"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="w-12 h-12 rounded-full bg-sky-100 group-hover:bg-sky-200 text-sky-700 flex items-center justify-center transition-colors">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <span className="text-sm font-bold text-sky-950 group-hover:text-sky-700 transition-colors">
            Clique para selecionar ou arraste fotos aqui
          </span>
          <p className="text-xs text-sky-700 mt-0.5">
            Formatos suportados: PNG, JPG, JPEG, WEBP ou SVG (Alta Resolução)
          </p>
        </div>
      </div>

      {/* Photo Gallery Grid */}
      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className="group relative bg-white border border-sky-200 rounded-xl overflow-hidden shadow-xs hover:border-sky-400 transition-all flex flex-col"
            >
              <div className="relative aspect-video w-full bg-slate-900 overflow-hidden flex items-center justify-center">
                {photo.dataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photo.dataUrl}
                    alt={photo.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-sky-400" />
                )}
                <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-950/80 text-white backdrop-blur-xs">
                  #{idx + 1}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(photo.id);
                  }}
                  className="absolute top-1.5 right-1.5 p-1 rounded-md bg-red-600/90 hover:bg-red-600 text-white transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Remover foto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-2 text-left bg-white">
                <p className="text-xs font-semibold text-sky-950 truncate" title={photo.name}>
                  {photo.name}
                </p>
                <p className="text-[10px] text-sky-700">
                  {photo.size ? `${Math.round(photo.size / 1024)} KB` : "Imagem pronta"}
                </p>
              </div>
            </div>
          ))}

          {/* Add more button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-xl flex flex-col items-center justify-center p-4 text-sky-700 hover:text-sky-950 bg-white transition-colors cursor-pointer min-h-[100px]"
          >
            <Plus className="w-5 h-5 mb-1 text-sky-600" />
            <span className="text-xs font-bold">Mais Fotos</span>
          </button>
        </div>
      )}
    </div>
  );
}
