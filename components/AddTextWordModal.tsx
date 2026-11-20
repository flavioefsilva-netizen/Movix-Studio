"use client";

import React, { useRef } from "react";
import { AlertCircle, Download, FileText, Loader2, Upload, X } from "lucide-react";

interface AddTextWordModalProps {
  isOpen: boolean;
  isProcessing: boolean;
  errorMessage: string | null;
  onDownloadTemplate: () => void | Promise<void>;
  onUploadWordFile: (file: File) => void | Promise<void>;
  onClose: () => void;
}

export function AddTextWordModal({
  isOpen,
  isProcessing,
  errorMessage,
  onDownloadTemplate,
  onUploadWordFile,
  onClose,
}: AddTextWordModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (file) {
      onUploadWordFile(file);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-text-word-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-sky-300 rounded-3xl p-5 sm:p-7 w-full max-w-xl shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.doc,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-sky-200">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-sky-100 text-sky-700 border border-sky-200">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3
                id="add-text-word-modal-title"
                className="text-base sm:text-lg font-black text-sky-950"
              >
                Adicionar Texto
              </h3>
              <p className="text-[11px] sm:text-xs text-sky-700 font-medium">
                Baixe o modelo em Word ou carregue seu arquivo com os textos das fotos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-sky-100 text-sky-700 transition-colors cursor-pointer shrink-0"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Erro de validação (ex: falta FOTO 1) */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs font-bold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Duas opções principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onDownloadTemplate}
            className="group p-5 rounded-2xl border-2 border-sky-300 hover:border-sky-500 bg-gradient-to-b from-white to-sky-50/70 hover:to-sky-100/70 shadow-md transition-all cursor-pointer text-left flex flex-col justify-between space-y-4 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-100 group-hover:bg-sky-200 text-sky-800 border border-sky-300 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <Download className="w-6 h-6 text-sky-700" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm sm:text-base font-black text-sky-950">
                Baixar modelo de Word
              </h4>
              <p className="text-[11px] text-sky-800 leading-relaxed">
                Baixa um arquivo Word com <strong>FOTO 1</strong>, <strong>FOTO 2</strong> e textos modelo prontos para editar.
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="group p-5 rounded-2xl border-2 border-sky-500 hover:border-sky-600 bg-gradient-to-b from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-lg shadow-sky-600/20 transition-all cursor-pointer text-left flex flex-col justify-between space-y-4 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm sm:text-base font-black text-white">
                {isProcessing ? "Carregando..." : "Carregar Texto"}
              </h4>
              <p className="text-[11px] text-sky-100 leading-relaxed">
                Selecione o arquivo Word (.docx) contendo <strong>FOTO 1</strong> e o texto de cada foto abaixo.
              </p>
            </div>
          </button>
        </div>

        {/* Nota de formato obrigatório */}
        <div className="rounded-2xl bg-sky-50 border border-sky-200 p-3.5 text-[11px] text-sky-900 space-y-1">
          <p className="font-extrabold text-sky-950">Formato esperado no arquivo Word:</p>
          <p className="font-mono text-[11px] text-sky-800 leading-relaxed">
            FOTO 1<br />
            Texto da primeira foto...<br />
            FOTO 2<br />
            Texto da segunda foto...
          </p>
        </div>

        {/* Rodapé */}
        <div className="pt-2 border-t border-sky-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold text-xs border border-sky-300 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
