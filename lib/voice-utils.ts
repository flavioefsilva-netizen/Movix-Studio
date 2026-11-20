import { VoiceGender, TransitionType, VoicePitch, VoiceMood, VoiceSlotId, VoiceSlotConfig } from "@/types/presentation";

export const VOICE_SLOT_IDS: VoiceSlotId[] = ["voz1", "voz2", "voz3", "voz4"];

export function createDefaultVoiceSlots(): Record<VoiceSlotId, VoiceSlotConfig> {
  return {
    voz1: {
      slotId: "voz1",
      label: "VOZ 1",
      gender: "female",
      voiceId: "helena",
      pitch: "agudo",
      mood: "entusiasta",
      isSaved: true,
    },
    voz2: {
      slotId: "voz2",
      label: "VOZ 2",
      gender: "male",
      voiceId: "lucas",
      pitch: "agudo",
      mood: "entusiasta",
      isSaved: true,
    },
    voz3: {
      slotId: "voz3",
      label: "VOZ 3",
      gender: "female",
      voiceId: "camila",
      pitch: "natural",
      mood: "entusiasta",
      isSaved: false,
    },
    voz4: {
      slotId: "voz4",
      label: "VOZ 4",
      gender: "male",
      voiceId: "gabriel",
      pitch: "grave",
      mood: "firme",
      isSaved: false,
    },
  };
}

export interface TransitionOption {
  id: TransitionType;
  name: string;
  shortName: string;
  description: string;
}

export const TRANSITION_OPTIONS: TransitionOption[] = [
  {
    id: "none",
    name: "Nenhuma Transição (Corte Direto)",
    shortName: "Nenhuma",
    description: "Corte instantâneo direto entre fotos ou slides sem interpolação.",
  },
  {
    id: "fade",
    name: "Dissolvência Suave (Crossfade)",
    shortName: "Dissolvência",
    description: "Fusão elegante e suave onde a tela atual esmaece enquanto a próxima surge.",
  },
  {
    id: "slide-left",
    name: "Deslizar para a Esquerda",
    shortName: "Deslizar Esquerda",
    description: "A tela seguinte entra deslizando pela borda direita para a esquerda.",
  },
  {
    id: "slide-right",
    name: "Deslizar para a Direita",
    shortName: "Deslizar Direita",
    description: "A tela seguinte entra deslizando pela borda esquerda para a direita.",
  },
  {
    id: "zoom",
    name: "Zoom / Aproximação",
    shortName: "Zoom",
    description: "Efeito cinematográfico de aproximação progressiva na tela.",
  },
  {
    id: "wipe",
    name: "Cortina / Revelação Lateral",
    shortName: "Cortina",
    description: "A tela seguinte se abre horizontalmente em formato de cortina.",
  },
];

export interface VoicePersona {
  id: string;
  name: string;
  gender: VoiceGender;
  geminiVoice: string;
  badge: string;
  description: string;
}

export const FEMALE_VOICES: VoicePersona[] = [
  {
    id: "helena",
    name: "Helena",
    gender: "female",
    geminiVoice: "Kore",
    badge: "Equilibrada & Natural",
    description: "Voz serena, clara e expressiva para apresentações corporativas e vídeos de fotos.",
  },
  {
    id: "camila",
    name: "Camila",
    gender: "female",
    geminiVoice: "Zephyr",
    badge: "Expressiva & Envolvente",
    description: "Voz calorosa com entonação rica e cativante, ideal para storytelling e produtos.",
  },
  {
    id: "mariana",
    name: "Mariana",
    gender: "female",
    geminiVoice: "Zephyr",
    badge: "Jovem & Dinâmica",
    description: "Voz contemporânea, leve e ágil para conteúdos de ritmo rápido e modernos.",
  },
  {
    id: "beatriz",
    name: "Beatriz",
    gender: "female",
    geminiVoice: "Kore",
    badge: "Institucional & Firme",
    description: "Voz executiva com dicção impecável para relatórios, cursos e apresentações solenes.",
  },
];

export const MALE_VOICES: VoicePersona[] = [
  {
    id: "gabriel",
    name: "Gabriel",
    gender: "male",
    geminiVoice: "Puck",
    badge: "Executivo & Firme",
    description: "Voz confiante, assertiva e de excelente projeção para negócios e tecnologia.",
  },
  {
    id: "lucas",
    name: "Lucas",
    gender: "male",
    geminiVoice: "Charon",
    badge: "Grave & Autoritário",
    description: "Timbre grave, profundo e imponente que transmite segurança e autoridade.",
  },
  {
    id: "rodrigo",
    name: "Rodrigo",
    gender: "male",
    geminiVoice: "Fenrir",
    badge: "Amigável & Moderno",
    description: "Voz descontraída, próxima e empática com fluidez natural.",
  },
  {
    id: "carlos",
    name: "Carlos",
    gender: "male",
    geminiVoice: "Charon",
    badge: "Calmo & Inspirador",
    description: "Voz pausada e acolhedora para reflexões, jornadas e conteúdos instrutivos.",
  },
];

export interface PitchOption {
  id: VoicePitch;
  name: string;
  tag: string;
  pitchFactor: number;
}

export const PITCH_OPTIONS: PitchOption[] = [
  { id: "grave", name: "Grave / Profundo", tag: "Baixa frequência", pitchFactor: 0.82 },
  { id: "natural", name: "Natural / Médio", tag: "Padrão neutro", pitchFactor: 1.0 },
  { id: "agudo", name: "Agudo / Enérgico", tag: "Mais brilhante", pitchFactor: 1.2 },
  { id: "suave", name: "Suave / Aveludado", tag: "Tom calmo e macio", pitchFactor: 0.94 },
];

export interface MoodOption {
  id: VoiceMood;
  name: string;
  description: string;
  rateFactor: number;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { id: "corporativo", name: "Corporativo & Neutro", description: "Claro, objetivo e formal", rateFactor: 1.0 },
  { id: "entusiasta", name: "Entusiasta & Vibrante", description: "Enérgico e motivador", rateFactor: 1.08 },
  { id: "calmo", name: "Calmo & Inspirador", description: "Pausado e reflexivo", rateFactor: 0.92 },
  { id: "firme", name: "Firme & Confiante", description: "Seguro, assertivo e direto", rateFactor: 1.02 },
  { id: "empatico", name: "Empático & Acolhedor", description: "Caloroso, humano e próximo", rateFactor: 0.98 },
];

export function getVoicePersona(gender: VoiceGender, voiceId?: string): VoicePersona {
  const list = gender === "male" ? MALE_VOICES : FEMALE_VOICES;
  if (voiceId) {
    const found = list.find((v) => v.id === voiceId);
    if (found) return found;
  }
  return list[0];
}

export function getVoiceAcousticParams(
  pitch: VoicePitch = "natural",
  mood: VoiceMood = "corporativo"
) {
  let rate = 1.0;
  let lowGain = 0;
  let midGain = 0;
  let highGain = 0;

  switch (pitch) {
    case "agudo":
      rate *= 1.045;
      highGain += 4.5;
      midGain += 2.0;
      lowGain -= 2.5;
      break;
    case "grave":
      rate *= 0.955;
      lowGain += 5.0;
      highGain -= 3.0;
      break;
    case "suave":
      rate *= 0.98;
      highGain -= 3.5;
      lowGain += 1.5;
      break;
    case "natural":
    default:
      break;
  }

  switch (mood) {
    case "entusiasta":
      rate *= 1.04;
      highGain += 2.0;
      midGain += 1.5;
      break;
    case "calmo":
      rate *= 0.94;
      highGain -= 2.0;
      lowGain += 1.0;
      break;
    case "firme":
      rate *= 1.015;
      midGain += 2.5;
      lowGain += 1.5;
      break;
    case "empatico":
      rate *= 0.985;
      lowGain += 2.0;
      midGain -= 0.5;
      break;
    case "corporativo":
    default:
      break;
  }

  const clampedRate = Math.max(0.91, Math.min(1.09, rate));
  return { rate: clampedRate, lowGain, midGain, highGain };
}

export async function shapeVoiceAudioBuffer(
  sourceBuffer: AudioBuffer,
  pitch: VoicePitch = "natural",
  mood: VoiceMood = "corporativo"
): Promise<AudioBuffer> {
  const { rate, lowGain, midGain, highGain } = getVoiceAcousticParams(pitch, mood);
  if (rate === 1.0 && lowGain === 0 && midGain === 0 && highGain === 0) {
    return sourceBuffer;
  }

  if (typeof OfflineAudioContext === "undefined") {
    return sourceBuffer;
  }

  try {
    const outLength = Math.max(1, Math.ceil(sourceBuffer.length / rate));
    const offlineCtx = new OfflineAudioContext(
      sourceBuffer.numberOfChannels,
      outLength,
      sourceBuffer.sampleRate
    );

    const src = offlineCtx.createBufferSource();
    src.buffer = sourceBuffer;
    src.playbackRate.value = rate;

    const lowShelf = offlineCtx.createBiquadFilter();
    lowShelf.type = "lowshelf";
    lowShelf.frequency.value = 240;
    lowShelf.gain.value = lowGain;

    const midPeak = offlineCtx.createBiquadFilter();
    midPeak.type = "peaking";
    midPeak.frequency.value = 1600;
    midPeak.Q.value = 1.0;
    midPeak.gain.value = midGain;

    const highShelf = offlineCtx.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = 2800;
    highShelf.gain.value = highGain;

    src.connect(lowShelf);
    lowShelf.connect(midPeak);
    midPeak.connect(highShelf);
    highShelf.connect(offlineCtx.destination);

    src.start(0);
    return await offlineCtx.startRendering();
  } catch {
    return sourceBuffer;
  }
}

let currentAudioElement: HTMLAudioElement | null = null;
let currentPreviewAudioCtx: AudioContext | null = null;
let currentPreviewSource: AudioBufferSourceNode | null = null;

const speechCache = new Map<string, string>();
const inFlightSpeechRequests = new Map<string, Promise<string>>();

export class SpeechSynthesisApiError extends Error {
  status: number;
  isDailyQuota: boolean;
  isRateLimit: boolean;
  retryAfterSeconds?: number;

  constructor(
    message: string,
    options: {
      status: number;
      isDailyQuota?: boolean;
      isRateLimit?: boolean;
      retryAfterSeconds?: number;
    }
  ) {
    super(message);
    this.name = "SpeechSynthesisApiError";
    this.status = options.status;
    this.isDailyQuota = Boolean(options.isDailyQuota);
    this.isRateLimit = Boolean(options.isRateLimit);
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function getSpeechCacheKey(
  text: string,
  gender: string,
  voiceId?: string,
  pitch?: string,
  mood?: string
): string {
  const clean = text.replace(/[*_#`~]/g, "").trim().toLowerCase();
  const persona = getVoicePersona(gender as VoiceGender, voiceId);
  return `${clean}__${gender}__${persona.id}__${persona.geminiVoice}__${pitch || "natural"}__${mood || "corporativo"}`;
}

export function getCachedSpeech(key: string): string | undefined {
  return speechCache.get(key);
}

export function setCachedSpeech(key: string, base64: string): void {
  speechCache.set(key, base64);
}

export async function synthesizeSpeechBase64(
  text: string,
  options: {
    gender: VoiceGender;
    voiceId?: string;
    pitch?: VoicePitch;
    mood?: VoiceMood;
  }
): Promise<string> {
  const cleanText = text.replace(/[*_#`~]/g, "").trim();
  if (!cleanText) {
    throw new SpeechSynthesisApiError("Texto de narração vazio.", { status: 400 });
  }

  const { gender, voiceId, pitch = "natural", mood = "corporativo" } = options;
  const persona = getVoicePersona(gender, voiceId);
  const cacheKey = getSpeechCacheKey(cleanText, gender, voiceId, pitch, mood);

  const cached = getCachedSpeech(cacheKey);
  if (cached) {
    return cached;
  }

  const existingInFlight = inFlightSpeechRequests.get(cacheKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const requestPromise = (async () => {
    const maxAttempts = 2;
    let lastError: SpeechSynthesisApiError | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch("/api/synthesize-speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: cleanText,
            gender,
            voiceId: persona.id,
            voiceName: persona.geminiVoice,
            pitch,
            mood,
          }),
        });

        let payload: any = {};
        try {
          payload = await res.json();
        } catch {
          payload = {};
        }

        if (res.ok && payload?.audioBase64) {
          setCachedSpeech(cacheKey, payload.audioBase64);
          return payload.audioBase64 as string;
        }

        const errMsg =
          payload?.error ||
          `Falha ao sintetizar narração de voz (HTTP ${res.status}).`;
        const isDailyQuota = Boolean(payload?.isDailyQuota);
        const isRateLimit = Boolean(payload?.isRateLimit) || res.status === 429;
        const retryAfterSeconds =
          typeof payload?.retryAfterSeconds === "number"
            ? payload.retryAfterSeconds
            : undefined;

        lastError = new SpeechSynthesisApiError(errMsg, {
          status: res.status,
          isDailyQuota,
          isRateLimit,
          retryAfterSeconds,
        });

        // Do not retry client errors or hard daily quotas
        if (isDailyQuota || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
          throw lastError;
        }

        if (attempt < maxAttempts) {
          const waitMs = retryAfterSeconds
            ? Math.min(20000, Math.max(1000, retryAfterSeconds * 1000))
            : 2500;
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      } catch (err: any) {
        if (err instanceof SpeechSynthesisApiError) {
          lastError = err;
          if (err.isDailyQuota || (err.status >= 400 && err.status < 500 && err.status !== 429)) {
            throw err;
          }
        } else {
          lastError = new SpeechSynthesisApiError(
            err?.message || "Erro de conexão com o serviço de narração.",
            { status: 503 }
          );
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
      }
    }

    throw (
      lastError ||
      new SpeechSynthesisApiError("Não foi possível gerar o áudio da narração.", {
        status: 500,
      })
    );
  })();

  inFlightSpeechRequests.set(cacheKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    inFlightSpeechRequests.delete(cacheKey);
  }
}

async function playShapedBase64Audio(
  base64Audio: string,
  pitch: VoicePitch,
  mood: VoiceMood,
  callbacks?: {
    onEnd?: () => void;
    onFallback?: () => void;
  }
): Promise<boolean> {
  try {
    const AudioCtxClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      const ctx = new AudioCtxClass();
      currentPreviewAudioCtx = ctx;
      const binaryStr = atob(base64Audio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));
      const shaped = await shapeVoiceAudioBuffer(decoded, pitch, mood);

      // Check if stopVoiceSample() was called while decoding
      if (currentPreviewAudioCtx !== ctx) {
        try {
          await ctx.close();
        } catch {
          // ignore
        }
        return true;
      }

      const source = ctx.createBufferSource();
      source.buffer = shaped;
      source.connect(ctx.destination);
      currentPreviewSource = source;

      source.onended = () => {
        if (currentPreviewSource === source) {
          currentPreviewSource = null;
        }
        if (currentPreviewAudioCtx === ctx) {
          currentPreviewAudioCtx = null;
          try {
            ctx.close();
          } catch {
            // ignore
          }
          callbacks?.onEnd?.();
        }
      };

      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      source.start(0);
      return true;
    }
  } catch {
    // Fallback below to <audio>
  }

  try {
    const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
    currentAudioElement = audio;
    audio.playbackRate = getVoiceAcousticParams(pitch, mood).rate;

    audio.onended = () => {
      currentAudioElement = null;
      callbacks?.onEnd?.();
    };

    audio.onerror = () => {
      callbacks?.onFallback?.();
    };

    await audio.play();
    return true;
  } catch {
    return false;
  }
}

export async function playVoiceSample(
  text: string,
  options: {
    gender: VoiceGender;
    voiceId?: string;
    pitch?: VoicePitch;
    mood?: VoiceMood;
  },
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): Promise<() => void> {
  // Stop any currently playing audio or speech synthesis
  stopVoiceSample();

  callbacks?.onStart?.();

  const { gender, voiceId, pitch = "natural", mood = "corporativo" } = options;

  try {
    const audioBase64 = await synthesizeSpeechBase64(text.slice(0, 800), {
      gender,
      voiceId,
      pitch,
      mood,
    });
    const played = await playShapedBase64Audio(audioBase64, pitch, mood, {
      onEnd: callbacks?.onEnd,
      onFallback: () => fallbackBrowserSpeech(text, gender, pitch, mood, callbacks),
    });
    if (played) {
      return () => stopVoiceSample();
    }
  } catch {
    // Interactive preview falls back smoothly to browser speech without polluting console errors
  }

  return fallbackBrowserSpeech(text, gender, pitch, mood, callbacks);
}

function fallbackBrowserSpeech(
  text: string,
  gender: VoiceGender,
  pitch: VoicePitch,
  mood: VoiceMood,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    callbacks?.onEnd?.();
    return () => {};
  }

  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "pt-BR";

    const pitchOpt = PITCH_OPTIONS.find((p) => p.id === pitch) || PITCH_OPTIONS[1];
    const moodOpt = MOOD_OPTIONS.find((m) => m.id === mood) || MOOD_OPTIONS[0];

    // Base pitch adjustment
    if (gender === "female") {
      utter.pitch = 1.25 * pitchOpt.pitchFactor;
    } else {
      utter.pitch = 0.85 * pitchOpt.pitchFactor;
    }

    utter.rate = moodOpt.rateFactor;

    // Try finding an appropriate browser voice
    const voices = window.speechSynthesis.getVoices();
    const ptVoices = voices.filter((v) => v.lang.startsWith("pt"));
    if (ptVoices.length > 0) {
      if (gender === "female") {
        const femVoice = ptVoices.find(
          (v) =>
            v.name.toLowerCase().includes("maria") ||
            v.name.toLowerCase().includes("luciana") ||
            v.name.toLowerCase().includes("female") ||
            v.name.toLowerCase().includes("francisca")
        );
        if (femVoice) utter.voice = femVoice;
        else utter.voice = ptVoices[0];
      } else {
        const mascVoice = ptVoices.find(
          (v) =>
            v.name.toLowerCase().includes("daniel") ||
            v.name.toLowerCase().includes("felipe") ||
            v.name.toLowerCase().includes("male") ||
            v.name.toLowerCase().includes("antonio")
        );
        if (mascVoice) utter.voice = mascVoice;
        else if (ptVoices.length > 1) utter.voice = ptVoices[1];
        else utter.voice = ptVoices[0];
      }
    }

    utter.onend = () => {
      callbacks?.onEnd?.();
    };
    utter.onerror = () => {
      callbacks?.onEnd?.();
    };

    window.speechSynthesis.speak(utter);

    return () => {
      window.speechSynthesis.cancel();
      callbacks?.onEnd?.();
    };
  } catch {
    callbacks?.onEnd?.();
    return () => {};
  }
}

export function stopVoiceSample() {
  if (currentPreviewSource) {
    try {
      currentPreviewSource.onended = null;
      currentPreviewSource.stop();
    } catch {
      // ignore
    }
    currentPreviewSource = null;
  }

  if (currentPreviewAudioCtx) {
    const ctxToClose = currentPreviewAudioCtx;
    currentPreviewAudioCtx = null;
    try {
      ctxToClose.close();
    } catch {
      // ignore
    }
  }

  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
    } catch {
      // ignore
    }
    currentAudioElement = null;
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}
