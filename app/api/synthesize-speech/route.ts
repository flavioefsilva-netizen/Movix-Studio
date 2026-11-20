import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const VALID_VOICES = new Set(["Puck", "Charon", "Kore", "Fenrir", "Aoede", "Zephyr"]);

const PERSONA_STYLE_MAP: Record<string, string> = {
  helena: "clear, warm, expressive Brazilian female narrator",
  camila: "engaging, rich, captivating Brazilian female storyteller",
  mariana: "youthful, light, dynamic Brazilian female speaker",
  beatriz: "authoritative, crisp, articulate Brazilian female executive speaker",
  gabriel: "confident, assertive, well-projected Brazilian male executive narrator",
  lucas: "resonant, strong, charismatic Brazilian male narrator",
  rodrigo: "friendly, modern, approachable Brazilian male narrator",
  carlos: "warm, thoughtful, welcoming Brazilian male narrator",
};

const MOOD_STYLE_MAP: Record<string, string> = {
  corporativo:
    "Mood: corporate, neutral, objective, professional and clear delivery in Brazilian Portuguese (pt-BR).",
  entusiasta:
    "Mood: very enthusiastic, vibrant, excited, upbeat, energetic and motivational delivery in Brazilian Portuguese (pt-BR) with lively expressiveness.",
  calmo:
    "Mood: calm, soothing, unhurried, reflective and peaceful delivery in Brazilian Portuguese (pt-BR) with gentle pauses.",
  firme:
    "Mood: firm, confident, assertive, decisive and commanding delivery in Brazilian Portuguese (pt-BR).",
  empatico:
    "Mood: empathetic, warm, caring, human and welcoming delivery in Brazilian Portuguese (pt-BR).",
};

const PITCH_STYLE_MAP: Record<string, string> = {
  grave: "Vocal pitch: deep, low-pitched, heavy chest resonance and bass-rich tone.",
  natural: "Vocal pitch: balanced, natural medium speaking register.",
  agudo:
    "Vocal pitch: higher, bright, crisp, elevated energetic pitch register with sparkling clarity.",
  suave: "Vocal pitch: soft, gentle, smooth, velvety and mellow tone.",
};

interface ParsedGeminiError {
  code: number;
  status: string;
  message: string;
  retryAfterSeconds: number | null;
  isDailyQuota: boolean;
  isRateLimit: boolean;
}

function parseGeminiError(err: unknown): ParsedGeminiError {
  const raw = err instanceof Error ? err.message : String(err);
  let code = 500;
  let status = "UNKNOWN";
  let message = raw;
  let retryAfterSeconds: number | null = null;
  let isDailyQuota = false;

  try {
    const jsonStart = raw.indexOf("{");
    if (jsonStart >= 0) {
      const parsed = JSON.parse(raw.slice(jsonStart));
      const inner = parsed?.error || parsed;
      if (typeof inner?.code === "number") code = inner.code;
      if (typeof inner?.status === "string") status = inner.status;
      if (typeof inner?.message === "string") message = inner.message;

      const details = Array.isArray(inner?.details) ? inner.details : [];
      for (const d of details) {
        if (typeof d?.retryDelay === "string") {
          const match = d.retryDelay.match(/(\d+(?:\.\d+)?)s/);
          if (match) retryAfterSeconds = Math.ceil(parseFloat(match[1]));
        }
        if (Array.isArray(d?.violations)) {
          for (const v of d.violations) {
            const qId = String(v?.quotaId || "");
            const qDesc = String(v?.description || "");
            if (qId.includes("PerDay") || qDesc.toLowerCase().includes("per day")) {
              isDailyQuota = true;
            }
          }
        }
      }
    }
  } catch {
    // Use regex fallbacks below
  }

  if (code === 500 && (raw.includes("429") || raw.includes("RESOURCE_EXHAUSTED"))) {
    code = 429;
    status = "RESOURCE_EXHAUSTED";
  } else if (code === 500 && (raw.includes("503") || raw.includes("UNAVAILABLE"))) {
    code = 503;
    status = "UNAVAILABLE";
  } else if (code === 500 && (raw.includes("404") || raw.includes("NOT_FOUND"))) {
    code = 404;
    status = "NOT_FOUND";
  } else if (code === 500 && (raw.includes("403") || raw.includes("PERMISSION_DENIED"))) {
    code = 403;
    status = "PERMISSION_DENIED";
  } else if (code === 500 && (raw.includes("400") || raw.includes("API_KEY_INVALID"))) {
    code = 400;
    status = "INVALID_ARGUMENT";
  }

  if (message.toLowerCase().includes("per day") || message.includes("PerDay")) {
    isDailyQuota = true;
  }

  if (retryAfterSeconds === null) {
    const mSec = message.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
    if (mSec) retryAfterSeconds = Math.ceil(parseFloat(mSec[1]));
  }

  const isRateLimit = code === 429 || status === "RESOURCE_EXHAUSTED";

  return {
    code,
    status,
    message,
    retryAfterSeconds,
    isDailyQuota,
    isRateLimit,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      text,
      gender = "female",
      voiceId = "",
      pitch = "natural",
      mood = "corporativo",
    } = body;
    let voiceName = body.voiceName;

    if (!voiceName || !VALID_VOICES.has(voiceName)) {
      voiceName = gender === "male" ? "Charon" : "Kore";
    }

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Texto não informado" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "GEMINI_API_KEY não configurada no servidor.",
          errorCode: 500,
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Clean text to avoid markdown artifacts while preserving natural punctuation
    const cleanText = text.replace(/[*_#`~]/g, "").replace(/\s+/g, " ").trim();

    const personaDesc =
      PERSONA_STYLE_MAP[voiceId] ||
      (gender === "male"
        ? "professional Brazilian male narrator"
        : "professional Brazilian female narrator");

    const stylePrompt = [
      `Speak in Brazilian Portuguese (pt-BR) as a ${personaDesc}.`,
      PITCH_STYLE_MAP[pitch] || PITCH_STYLE_MAP.natural,
      MOOD_STYLE_MAP[mood] || MOOD_STYLE_MAP.corporativo,
      "Strictly follow both the vocal pitch register and emotional mood throughout the entire sentence.",
    ].join(" ");

    const primaryModel = "gemini-3.8-flash-lite-tts";
    let lastParsedError: ParsedGeminiError | null = null;

    const callTtsModel = async (model: string) => {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: stylePrompt,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    };

    // Try primary high-throughput single-speaker TTS model with smart transient backoff
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const base64Audio = await callTtsModel(primaryModel);
        if (base64Audio) {
          return NextResponse.json({
            success: true,
            audioBase64: base64Audio,
            mimeType: "audio/wav",
            model: primaryModel,
          });
        }
      } catch (err: unknown) {
        const parsed = parseGeminiError(err);
        lastParsedError = parsed;

        // Only retry inline on transient 5xx/UNAVAILABLE or short RPM backoff <= 5s
        const canRetryInline =
          attempt === 1 &&
          !parsed.isDailyQuota &&
          (parsed.code === 503 ||
            parsed.code === 500 ||
            (parsed.isRateLimit && (parsed.retryAfterSeconds === null || parsed.retryAfterSeconds <= 5)));

        if (canRetryInline) {
          const waitMs = parsed.retryAfterSeconds ? Math.min(5000, parsed.retryAfterSeconds * 1000 + 250) : 1200;
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        // Fallback once to gemini-3.8-flash-tts if primary model returned 404 OR its daily quota is exhausted
        if (parsed.code === 404 || parsed.isDailyQuota) {
          try {
            const fallbackAudio = await callTtsModel("gemini-3.8-flash-tts");
            if (fallbackAudio) {
              return NextResponse.json({
                success: true,
                audioBase64: fallbackAudio,
                mimeType: "audio/wav",
                model: "gemini-3.8-flash-tts",
              });
            }
          } catch (fbErr: unknown) {
            lastParsedError = parseGeminiError(fbErr);
          }
        }
        break;
      }
    }

    const finalErr = lastParsedError || {
      code: 502,
      status: "EMPTY_RESPONSE",
      message: "Nenhum áudio gerado pelo serviço Gemini TTS.",
      retryAfterSeconds: null,
      isDailyQuota: false,
      isRateLimit: false,
    };

    const httpStatus =
      finalErr.code >= 400 && finalErr.code < 600 ? finalErr.code : 500;

    const friendlyMessage = finalErr.isDailyQuota
      ? "Limite diário gratuito do serviço de narração Gemini TTS atingido nesta chave de API. Aguarde a renovação da cota ou utilize uma chave com plano ativo."
      : finalErr.isRateLimit
      ? "Limite temporário de requisições por minuto no serviço de voz. Aguarde alguns segundos e tente novamente."
      : finalErr.message;

    return NextResponse.json(
      {
        success: false,
        error: friendlyMessage,
        errorCode: finalErr.code,
        errorStatus: finalErr.status,
        retryAfterSeconds: finalErr.retryAfterSeconds,
        isDailyQuota: finalErr.isDailyQuota,
        isRateLimit: finalErr.isRateLimit,
      },
      { status: httpStatus }
    );
  } catch (err: unknown) {
    const parsed = parseGeminiError(err);
    const status = parsed.code >= 400 && parsed.code < 600 ? parsed.code : 500;
    return NextResponse.json(
      {
        success: false,
        error: parsed.message || "Erro na geração de voz",
        errorCode: parsed.code,
        errorStatus: parsed.status,
        retryAfterSeconds: parsed.retryAfterSeconds,
        isDailyQuota: parsed.isDailyQuota,
        isRateLimit: parsed.isRateLimit,
      },
      { status }
    );
  }
}
