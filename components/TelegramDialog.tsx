"use client";

import React, { useState } from "react";
import { X, Send, CheckCircle2, AlertCircle, Loader2, Bot } from "lucide-react";
import { PresentationData, AttachedPhoto } from "@/types/presentation";

interface TelegramDialogProps {
  isOpen: boolean;
  onClose: () => void;
  presentation: PresentationData;
  photos: AttachedPhoto[];
  videoDuration?: number;
}

export function TelegramDialog({
  isOpen,
  onClose,
  presentation,
  photos,
  videoDuration,
}: TelegramDialogProps) {
  const [destino, setDestino] = useState<"usuario" | "grupo" | "ambos">("ambos");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const defaultMessage = `<b>MOVIX - Relatório de Apresentação e Vídeo</b>
<b>Título:</b> ${presentation.title || "Apresentação Estratégica"}
<b>Total de Slides:</b> ${presentation.slides.length} slides
<b>Fotos Anexadas:</b> ${photos.length} fotos vinculadas
<b>Status:</b> ${videoDuration ? `Vídeo pronto (${Math.floor(videoDuration / 60)}m ${Math.floor(videoDuration % 60)}s)` : "Apresentação validada"}
<i>Mensagem automática enviada via MOVIX SlideVideo Studio.</i>`;

  const [message, setMessage] = useState(defaultMessage);

  if (!isOpen) return null;

  const handleSend = async (customText?: string) => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/telegram-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagem: customText || message,
          destino,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: `Mensagem enviada com sucesso para o Telegram (${destino})!`,
        });
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || "Falha ao enviar mensagem ao Telegram.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Erro de conexão com o Telegram.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestBot = () => {
    const testMsg = "<b>MOVIX - Teste de Envio</b>\nO bot está conectado corretamente.";
    handleSend(testMsg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border-2 border-sky-400 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-sky-700 hover:text-sky-950 hover:bg-sky-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 border border-sky-300 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-sky-950">
              Notificação Telegram • MOVIX Bot
            </h3>
            <p className="text-xs text-sky-800">
              Bot Token: <code className="text-sky-900 font-semibold">8969...4JUc</code>
            </p>
          </div>
        </div>

        {/* Destino Selector */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-sky-950 mb-1.5">
            Destinatário do Telegram
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDestino("usuario")}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                destino === "usuario"
                  ? "bg-sky-600 text-white border-sky-500 shadow-sm"
                  : "bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100"
              }`}
            >
              Usuário (Privado)
            </button>
            <button
              type="button"
              onClick={() => setDestino("grupo")}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                destino === "grupo"
                  ? "bg-sky-600 text-white border-sky-500 shadow-sm"
                  : "bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100"
              }`}
            >
              Grupo Telegram
            </button>
            <button
              type="button"
              onClick={() => setDestino("ambos")}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                destino === "ambos"
                  ? "bg-sky-600 text-white border-sky-500 shadow-sm"
                  : "bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100"
              }`}
            >
              Ambos (Recomendado)
            </button>
          </div>
          <div className="mt-1.5 text-[11px] text-sky-700">
            ID Usuário: <code className="text-sky-950 font-semibold">8987478627</code> • ID Grupo:{" "}
            <code className="text-sky-950 font-semibold">-1004383006162</code>
          </div>
        </div>

        {/* Message editor */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-sky-950">
              Conteúdo da Mensagem (Suporta tags HTML &lt;b&gt;, &lt;i&gt;)
            </label>
            <button
              type="button"
              onClick={handleTestBot}
              disabled={isLoading}
              className="text-xs text-sky-700 hover:text-sky-950 font-bold underline cursor-pointer"
            >
              Testar Envio Rápido
            </button>
          </div>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-sky-50 border border-sky-300 focus:bg-white focus:border-sky-500 rounded-xl p-3 text-xs text-sky-950 outline-none leading-relaxed font-mono"
          />
        </div>

        {statusMessage && (
          <div
            className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                : "bg-red-50 text-red-800 border border-red-300"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-sky-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-xs font-bold text-sky-900 transition-colors cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleSend()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs font-black transition-all shadow-md shadow-sky-500/20 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar Notificação Agora</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
