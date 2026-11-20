import {
  PresentationData,
  AttachedPhoto,
  SlideData,
  VoiceGender,
  VoicePitch,
  VoiceMood,
  SubtitleSettings,
  SubtitleColorOption,
  BackgroundMusicTrackId,
  TransitionType,
  CustomAudioSlice,
} from "@/types/presentation";
import { THEME_PALETTES } from "./pptx-generator";
import {
  getVoicePersona,
  synthesizeSpeechBase64,
  shapeVoiceAudioBuffer,
} from "./voice-utils";
import { generateBackgroundMusicBuffer } from "./background-music";
import { parseAnimationInstructions, calculateMotionTransform } from "./animation-engine";

export interface RenderProgress {
  currentSlide: number;
  totalSlides: number;
  phase: "init" | "audio" | "slides" | "encoding" | "complete";
  percentage: number;
  message: string;
}

function getDimensionsForAspectRatio(
  aspectRatio: "16:9" | "9:16" | "1:1" = "16:9"
): { width: number; height: number } {
  switch (aspectRatio) {
    case "9:16":
      return { width: 720, height: 1280 };
    case "1:1":
      return { width: 720, height: 720 };
    case "16:9":
    default:
      return { width: 1280, height: 720 };
  }
}

async function decodeAndShapeSpeech(
  base64Audio: string,
  audioCtx: AudioContext,
  voicePitch: VoicePitch = "natural",
  voiceMood: VoiceMood = "corporativo"
): Promise<AudioBuffer> {
  const binaryStr = atob(base64Audio);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const decoded = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
  if (!decoded || decoded.duration <= 0.05) {
    throw new Error("O áudio sintetizado retornou vazio ou corrompido.");
  }
  return await shapeVoiceAudioBuffer(decoded, voicePitch, voiceMood);
}

// Fetch real voice speech audio for a slide or unified script via Gemini TTS with cache & deduplication
async function fetchSlideAudioBuffer(
  text: string,
  audioCtx: AudioContext,
  voiceGender: VoiceGender = "female",
  voiceId?: string,
  voicePitch: VoicePitch = "natural",
  voiceMood: VoiceMood = "corporativo"
): Promise<AudioBuffer> {
  const cleanText = text.replace(/[*_#`~]/g, "").trim();
  const base64Audio = await synthesizeSpeechBase64(cleanText, {
    gender: voiceGender,
    voiceId,
    pitch: voicePitch,
    mood: voiceMood,
  });

  return await decodeAndShapeSpeech(base64Audio, audioCtx, voicePitch, voiceMood);
}

function createPortraitBlurredBackground(
  img: HTMLImageElement,
  w: number,
  h: number
): HTMLCanvasElement {
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = w;
  bgCanvas.height = h;
  const bgCtx = bgCanvas.getContext("2d", { alpha: false });
  if (!bgCtx) return bgCanvas;

  bgCtx.fillStyle = "#000000";
  bgCtx.fillRect(0, 0, w, h);

  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;
  if (natW <= 0 || natH <= 0) return bgCanvas;

  const bgScale = Math.max(w / natW, h / natH);
  const bgW = natW * bgScale;
  const bgH = natH * bgScale;

  bgCtx.save();
  try {
    bgCtx.filter = "blur(24px) brightness(0.55)";
    bgCtx.drawImage(img, (w - bgW) / 2, (h - bgH) / 2, bgW, bgH);
  } catch {
    bgCtx.drawImage(img, (w - bgW) / 2, (h - bgH) / 2, bgW, bgH);
    bgCtx.fillStyle = "rgba(0, 0, 0, 0.45)";
    bgCtx.fillRect(0, 0, w, h);
  }
  bgCtx.restore();

  return bgCanvas;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export async function renderPresentationVideo(
  presentation: PresentationData,
  attachedPhotos: AttachedPhoto[],
  options: {
    secondsPerSlide?: number;
    aspectRatio?: "16:9" | "9:16" | "1:1";
    voiceEnabled?: boolean;
    voiceGender?: VoiceGender;
    voiceId?: string;
    voicePitch?: VoicePitch;
    voiceMood?: VoiceMood;
    unifiedNarrationText?: string;
    subtitles?: SubtitleSettings;
    backgroundMusicTrack?: BackgroundMusicTrackId;
    transitionType?: TransitionType;
    customAudioSlice?: CustomAudioSlice | null;
    speechRate?: number;
    backgroundMusic?: boolean;
    onProgress?: (progress: RenderProgress) => void;
  } = {}
): Promise<{
  videoBlob: Blob;
  videoUrl: string;
  webmBlob: Blob;
  webmUrl: string;
  duration: number;
}> {
  const {
    secondsPerSlide = 6,
    aspectRatio = "16:9",
    voiceEnabled = true,
    voiceGender = "female",
    voiceId,
    voicePitch = "natural",
    voiceMood = "corporativo",
    unifiedNarrationText,
    subtitles = { enabled: false, color: "ai-auto" },
    backgroundMusicTrack = "acustica-suave",
    backgroundMusic = true,
    transitionType = "none",
    customAudioSlice,
    onProgress,
  } = options;
  const totalSlides = presentation.slides.length;

  if (totalSlides === 0) {
    throw new Error("A apresentação não contém slides.");
  }

  // Throttled progress emitter so React UI never experiences 30fps re-render storms
  let lastProgressAt = 0;
  let lastProgressPct = -1;
  let lastProgressPhase = "";
  let lastProgressSlide = -1;
  const emitProgress = (progress: RenderProgress, force = false) => {
    if (!onProgress) return;
    const now = performance.now();
    if (
      force ||
      progress.phase !== lastProgressPhase ||
      progress.currentSlide !== lastProgressSlide ||
      progress.percentage !== lastProgressPct ||
      now - lastProgressAt >= 250
    ) {
      lastProgressAt = now;
      lastProgressPct = progress.percentage;
      lastProgressPhase = progress.phase;
      lastProgressSlide = progress.currentSlide;
      onProgress(progress);
    }
  };

  const { width, height } = getDimensionsForAspectRatio(aspectRatio);
  const fps = 30;

  // Initialize Canvas and attach offscreen so Chromium MediaRecorder captures video frames reliably
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.position = "fixed";
  canvas.style.left = "-9999px";
  canvas.style.top = "0px";
  canvas.style.width = "1px";
  canvas.style.height = "1px";
  canvas.style.opacity = "0";
  canvas.style.pointerEvents = "none";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    canvas.remove();
    throw new Error("Contexto 2D não suportado pelo navegador.");
  }

  const offscreenA = document.createElement("canvas");
  offscreenA.width = width;
  offscreenA.height = height;
  const ctxA = offscreenA.getContext("2d", { alpha: false });

  const offscreenB = document.createElement("canvas");
  offscreenB.width = width;
  offscreenB.height = height;
  const ctxB = offscreenB.getContext("2d", { alpha: false });

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) {
    canvas.remove();
    throw new Error("Web Audio API não suportada.");
  }

  let audioContext: AudioContext | null = null;
  let canvasStream: MediaStream | null = null;
  let combinedStream: MediaStream | null = null;
  let audioDestination: MediaStreamAudioDestinationNode | null = null;
  let recorder: MediaRecorder | null = null;

  try {
    audioContext = new AudioCtx();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    audioDestination = audioContext.createMediaStreamDestination();

    // Pre-load all valid attached photos into memory and pre-render blurred portrait backdrops
    const photoImageMap = new Map<string, HTMLImageElement>();
    const portraitBgMap = new Map<string, HTMLCanvasElement>();
    for (const photo of attachedPhotos) {
      if (!photo.dataUrl) continue;
      const img = new Image();
      if (!photo.dataUrl.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      const loaded = await new Promise<boolean>((resolve) => {
        img.onload = () => resolve(img.naturalWidth > 0 && img.naturalHeight > 0);
        img.onerror = () => resolve(false);
        img.src = photo.dataUrl;
      });
      if (loaded) {
        photoImageMap.set(photo.id, img);
        if (img.naturalWidth / img.naturalHeight < 1.0) {
          portraitBgMap.set(photo.id, createPortraitBlurredBackground(img, width, height));
        }
      }
    }

    // Determine slide durations & audio buffers BEFORE starting recording
    let slideAudioBuffers: (AudioBuffer | null)[] = Array(totalSlides).fill(null);
    let unifiedVoiceBuffer: AudioBuffer | null = null;
    let slideDurationsSec: number[] = [];
    let totalVideoDurationSec = 0;
    let customAudioBuffer: AudioBuffer | null = null;
    const cleanUnifiedText = (unifiedNarrationText || "").replace(/[*_#`~]/g, "").trim();

    if (customAudioSlice && customAudioSlice.audioUrl) {
      emitProgress(
        {
          currentSlide: 1,
          totalSlides,
          phase: "audio",
          percentage: 15,
          message: "Carregando trilha de áudio selecionada para o vídeo...",
        },
        true
      );

      const audioFetch = await fetch(customAudioSlice.audioUrl);
      if (!audioFetch.ok) {
        throw new Error("Não foi possível carregar o arquivo de áudio selecionado.");
      }
      const arrayBuf = await audioFetch.arrayBuffer();
      customAudioBuffer = await audioContext.decodeAudioData(arrayBuf);

      const sliceDur = Math.max(1.0, customAudioSlice.sliceDuration || 10);
      totalVideoDurationSec = sliceDur + 2.0;
      const durPerSlide = totalVideoDurationSec / totalSlides;
      slideDurationsSec = Array(totalSlides).fill(durPerSlide);
    } else if (!voiceEnabled) {
      slideDurationsSec = presentation.slides.map((s) =>
        s.customDuration && s.customDuration > 0 ? s.customDuration : secondsPerSlide
      );
      totalVideoDurationSec = slideDurationsSec.reduce((a, b) => a + b, 0);
    } else if (cleanUnifiedText.length > 0) {
      // Unified single-text mode: 1 continuous speech synthesis spanning all photos
      const persona = getVoicePersona(voiceGender, voiceId);
      emitProgress(
        {
          currentSlide: 1,
          totalSlides,
          phase: "audio",
          percentage: 15,
          message: `Sintetizando narração única com voz ${persona.name}...`,
        },
        true
      );

      unifiedVoiceBuffer = await fetchSlideAudioBuffer(
        cleanUnifiedText,
        audioContext,
        voiceGender,
        voiceId,
        voicePitch,
        voiceMood
      );

      const baseDurations = presentation.slides.map((s) =>
        s.customDuration && s.customDuration > 0 ? s.customDuration : secondsPerSlide
      );
      const baseTotal = baseDurations.reduce((a, b) => a + b, 0);
      const requiredMinTotal = unifiedVoiceBuffer.duration + 1.0;

      if (baseTotal < requiredMinTotal && baseTotal > 0) {
        const scale = requiredMinTotal / baseTotal;
        slideDurationsSec = baseDurations.map((d) => d * scale);
      } else {
        slideDurationsSec = baseDurations;
      }
      totalVideoDurationSec = slideDurationsSec.reduce((a, b) => a + b, 0);
    } else {
      // Per-photo or presentation slides mode: synthesize exact voice/pitch/mood for every slide with narration
      emitProgress(
        {
          currentSlide: 1,
          totalSlides,
          phase: "audio",
          percentage: 10,
          message: "Preparando síntese de voz personalizada para cada cena...",
        },
        true
      );

      slideDurationsSec = [];
      slideAudioBuffers = [];

      let remoteCallsMade = 0;
      for (let s = 0; s < totalSlides; s++) {
        const slide = presentation.slides[s];
        const narrationText = (slide.narration || "").trim();
        const baseDuration =
          slide.customDuration && slide.customDuration > 0 ? slide.customDuration : secondsPerSlide;

        if (!narrationText) {
          slideAudioBuffers.push(null);
          slideDurationsSec.push(baseDuration);
          continue;
        }

        const slideVoiceGender = slide.voiceGender || voiceGender;
        const slideVoiceId = slide.voiceId || voiceId;
        const slideVoicePitch = slide.voicePitch || voicePitch;
        const slideVoiceMood = slide.voiceMood || voiceMood;
        const slidePersona = getVoicePersona(slideVoiceGender, slideVoiceId);

        const pct = 10 + Math.round(((s + 1) / totalSlides) * 20);
        emitProgress(
          {
            currentSlide: s + 1,
            totalSlides,
            phase: "audio",
            percentage: pct,
            message: `Sintetizando voz (${slidePersona.name}) da Cena ${s + 1} de ${totalSlides}...`,
          },
          true
        );

        if (remoteCallsMade > 0) {
          await new Promise((r) => setTimeout(r, 320));
        }

        const audioBuf = await fetchSlideAudioBuffer(
          narrationText,
          audioContext,
          slideVoiceGender,
          slideVoiceId,
          slideVoicePitch,
          slideVoiceMood
        );
        remoteCallsMade += 1;

        slideAudioBuffers.push(audioBuf);
        // Every narrated photo stays visible for full speech duration + 1.0s pause
        slideDurationsSec.push(audioBuf.duration + 1.0);
      }

      totalVideoDurationSec = slideDurationsSec.reduce((a, b) => a + b, 0);
    }

    // Build timeline boundaries upfront so A-V sync never drifts cumulatively
    const slideStartsSec: number[] = [];
    const slideEndsSec: number[] = [];
    let accSec = 0;
    for (let i = 0; i < totalSlides; i++) {
      slideStartsSec.push(accSec);
      accSec += slideDurationsSec[i];
      slideEndsSec.push(accSec);
    }

    // Pre-build master voice audio buffer and background music buffer BEFORE recording starts
    let masterVoiceBuffer: AudioBuffer | null = null;
    if (voiceEnabled && !customAudioBuffer) {
      const sampleRate = audioContext.sampleRate;
      const totalSamples = Math.max(1, Math.ceil((totalVideoDurationSec + 0.3) * sampleRate));

      if (unifiedVoiceBuffer) {
        masterVoiceBuffer = audioContext.createBuffer(2, totalSamples, sampleRate);
        const outL = masterVoiceBuffer.getChannelData(0);
        const outR = masterVoiceBuffer.getChannelData(1);
        const srcL = unifiedVoiceBuffer.getChannelData(0);
        const srcR = unifiedVoiceBuffer.numberOfChannels > 1 ? unifiedVoiceBuffer.getChannelData(1) : srcL;
        const copyLen = Math.min(unifiedVoiceBuffer.length, totalSamples);
        for (let i = 0; i < copyLen; i++) {
          outL[i] = srcL[i];
          outR[i] = srcR[i];
        }
      } else if (slideAudioBuffers.some(Boolean)) {
        masterVoiceBuffer = audioContext.createBuffer(2, totalSamples, sampleRate);
        const outL = masterVoiceBuffer.getChannelData(0);
        const outR = masterVoiceBuffer.getChannelData(1);

        for (let sIdx = 0; sIdx < totalSlides; sIdx++) {
          const audioBuf = slideAudioBuffers[sIdx];
          if (!audioBuf) continue;
          const startSample = Math.floor(slideStartsSec[sIdx] * sampleRate);
          const bufL = audioBuf.getChannelData(0);
          const bufR = audioBuf.numberOfChannels > 1 ? audioBuf.getChannelData(1) : bufL;
          const copyLen = Math.min(audioBuf.length, totalSamples - startSample);
          for (let i = 0; i < copyLen; i++) {
            outL[startSample + i] += bufL[i];
            outR[startSample + i] += bufR[i];
          }
        }
      }
    }

    let musicBuffer: AudioBuffer | null = null;
    if (!customAudioBuffer && backgroundMusic) {
      try {
        musicBuffer = generateBackgroundMusicBuffer(
          audioContext,
          backgroundMusicTrack,
          totalVideoDurationSec
        );
      } catch {
        musicBuffer = null;
      }
    }

    // Pre-calculate subtitle cues
    const globalSubtitleCues: SubtitleCue[] =
      subtitles?.enabled && cleanUnifiedText.length > 0 && unifiedVoiceBuffer
        ? generateSubtitleCues(cleanUnifiedText, unifiedVoiceBuffer.duration, totalVideoDurationSec)
        : [];

    const slideSubtitleCues: SubtitleCue[][] =
      cleanUnifiedText.length > 0
        ? Array(totalSlides).fill([])
        : presentation.slides.map((slide, sIdx) => {
            const text = (slide.narration || "").trim();
            if (!text || !subtitles?.enabled) return [];
            const buf = slideAudioBuffers[sIdx];
            const speechDur = buf
              ? buf.duration
              : Math.max(1.0, (slideDurationsSec[sIdx] || secondsPerSlide) - 1.0);
            const slideDur = slideDurationsSec[sIdx] || secondsPerSlide;
            return generateSubtitleCues(text, speechDur, slideDur);
          });

    // Theme styling & Custom PPT Background Color
    const themeKey = presentation.theme in THEME_PALETTES ? presentation.theme : "dark-slate";
    const basePalette = THEME_PALETTES[themeKey];
    const customBg = presentation.customBgColor?.replace(/^#/, "").toUpperCase();
    const bgHex = customBg && customBg.length === 6 ? customBg : basePalette.bg;

    const r = parseInt(bgHex.substring(0, 2), 16) || 0;
    const g = parseInt(bgHex.substring(2, 4), 16) || 0;
    const b = parseInt(bgHex.substring(4, 6), 16) || 0;
    const isLightBg = (r * 299 + g * 587 + b * 114) / 1000 > 140;

    const palette = {
      ...basePalette,
      bg: bgHex,
      primaryText: isLightBg ? "0F172A" : basePalette.primaryText,
      secondaryText: isLightBg ? "475569" : basePalette.secondaryText,
      cardBg: isLightBg ? "F8FAFC" : basePalette.cardBg,
      cardBorder: isLightBg ? "E2E8F0" : basePalette.cardBorder,
    };

    const getSlideVisual = (sIdx: number) => {
      const slide = presentation.slides[sIdx];
      const targetPhotoId = slide?.photoId || attachedPhotos[sIdx]?.id;
      const assignedPhoto = targetPhotoId ? photoImageMap.get(targetPhotoId) : undefined;
      const blurredBg = targetPhotoId ? portraitBgMap.get(targetPhotoId) : undefined;
      const fallbackAnimText = attachedPhotos[sIdx]?.animationText;
      return { slide, assignedPhoto, blurredBg, fallbackAnimText };
    };

    // Draw first frame on canvas BEFORE starting captureStream / MediaRecorder
    const firstVis = getSlideVisual(0);
    drawSlideOnCanvas(
      ctx,
      firstVis.slide,
      0,
      totalSlides,
      0,
      width,
      height,
      palette,
      firstVis.assignedPhoto,
      firstVis.blurredBg,
      firstVis.fallbackAnimText
    );

    // Setup Canvas Stream and combined MediaStream (Video + Audio)
    canvasStream = canvas.captureStream(fps);
    const videoTrack = canvasStream.getVideoTracks()[0];
    combinedStream = new MediaStream();
    canvasStream.getVideoTracks().forEach((vt) => combinedStream!.addTrack(vt));
    audioDestination.stream.getAudioTracks().forEach((at) => combinedStream!.addTrack(at));

    const preferredMimeTypes = [
      "video/mp4;codecs=avc1,opus",
      "video/mp4;codecs=avc1,mp4a.40.2",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/mp4;codecs=avc1",
      "video/mp4",
      "video/webm;codecs=h264",
      "video/webm",
    ];
    const supportedMime = preferredMimeTypes.find(
      (type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)
    );

    const recordedChunks: Blob[] = [];
    recorder = new MediaRecorder(
      combinedStream,
      supportedMime
        ? { mimeType: supportedMime, videoBitsPerSecond: 2500000 }
        : { videoBitsPerSecond: 2500000 }
    );

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    const recordingPromise = new Promise<{
      videoBlob: Blob;
      videoUrl: string;
      webmBlob: Blob;
      webmUrl: string;
    }>((resolve, reject) => {
      recorder!.onstop = () => {
        if (recordedChunks.length === 0) {
          reject(new Error("Nenhum dado de vídeo foi capturado durante a gravação."));
          return;
        }
        const finalMime = recorder?.mimeType || supportedMime || "video/webm";
        const outputBlob = new Blob(recordedChunks, { type: finalMime });
        const outputUrl = URL.createObjectURL(outputBlob);
        resolve({
          videoBlob: outputBlob,
          videoUrl: outputUrl,
          webmBlob: outputBlob,
          webmUrl: outputUrl,
        });
      };
      recorder!.onerror = () => {
        reject(new Error("Erro interno do gravador de vídeo do navegador."));
      };
    });

    // Start recording and push initial frame
    recorder.start(100);
    (videoTrack as any)?.requestFrame?.();

    // Start synchronized audio tracks using AudioContext hardware clock
    const initialCtxTime = audioContext.currentTime;
    const audioStartCtxTime = initialCtxTime + 0.04;
    const startWallMs = performance.now() + 40;

    if (masterVoiceBuffer) {
      const voiceSrc = audioContext.createBufferSource();
      voiceSrc.buffer = masterVoiceBuffer;
      voiceSrc.connect(audioDestination);
      voiceSrc.start(audioStartCtxTime);
    }

    if (musicBuffer) {
      const musicSrc = audioContext.createBufferSource();
      musicSrc.buffer = musicBuffer;
      musicSrc.connect(audioDestination);
      musicSrc.start(audioStartCtxTime);
    }

    if (customAudioBuffer && customAudioSlice) {
      const customSrc = audioContext.createBufferSource();
      customSrc.buffer = customAudioBuffer;
      customSrc.connect(audioDestination);
      customSrc.start(
        audioStartCtxTime + 1.0,
        customAudioSlice.startTime,
        customAudioSlice.sliceDuration
      );
    }

    const getGlobalElapsedSec = (): number => {
      if (audioContext && audioContext.currentTime > initialCtxTime + 0.005) {
        return Math.max(0, audioContext.currentTime - audioStartCtxTime);
      }
      return Math.max(0, (performance.now() - startWallMs) / 1000);
    };

    const transitionDurationSec = transitionType === "none" ? 0 : 0.7;

    // Phase 2: Render each slide pinned to exact non-cumulative timeline deadlines
    for (let sIdx = 0; sIdx < totalSlides; sIdx++) {
      const slideStartSec = slideStartsSec[sIdx];
      const slideEndSec = slideEndsSec[sIdx];
      const durationSec = slideDurationsSec[sIdx];
      const vis = getSlideVisual(sIdx);
      const hasNextSlide = sIdx < totalSlides - 1;
      const nextVis = hasNextSlide ? getSlideVisual(sIdx + 1) : undefined;

      const persona = getVoicePersona(
        vis.slide.voiceGender || voiceGender,
        vis.slide.voiceId || voiceId
      );

      while (true) {
        const currentGlobalSec = getGlobalElapsedSec();
        const elapsedSlideSec = Math.max(0, currentGlobalSec - slideStartSec);
        const progressRatio = Math.min(1.0, durationSec > 0 ? elapsedSlideSec / durationSec : 1.0);
        const remainingSec = slideEndSec - currentGlobalSec;

        const inTransition =
          transitionType !== "none" &&
          hasNextSlide &&
          remainingSec <= transitionDurationSec &&
          transitionDurationSec > 0;

        if (inTransition && ctxA && ctxB && nextVis) {
          const t = Math.min(1.0, Math.max(0, 1.0 - remainingSec / transitionDurationSec));

          drawSlideOnCanvas(
            ctxA,
            vis.slide,
            sIdx,
            totalSlides,
            progressRatio,
            width,
            height,
            palette,
            vis.assignedPhoto,
            vis.blurredBg,
            vis.fallbackAnimText
          );

          drawSlideOnCanvas(
            ctxB,
            nextVis.slide,
            sIdx + 1,
            totalSlides,
            0,
            width,
            height,
            palette,
            nextVis.assignedPhoto,
            nextVis.blurredBg,
            nextVis.fallbackAnimText
          );

          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, width, height);

          if (transitionType === "fade") {
            ctx.globalAlpha = 1.0 - t;
            ctx.drawImage(offscreenA, 0, 0);
            ctx.globalAlpha = t;
            ctx.drawImage(offscreenB, 0, 0);
            ctx.globalAlpha = 1.0;
          } else if (transitionType === "slide-left") {
            ctx.drawImage(offscreenA, -t * width, 0);
            ctx.drawImage(offscreenB, width - t * width, 0);
          } else if (transitionType === "slide-right") {
            ctx.drawImage(offscreenA, t * width, 0);
            ctx.drawImage(offscreenB, -width + t * width, 0);
          } else if (transitionType === "zoom") {
            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.scale(1.0 + t * 0.2, 1.0 + t * 0.2);
            ctx.globalAlpha = 1.0 - t;
            ctx.drawImage(offscreenA, -width / 2, -height / 2);
            ctx.restore();

            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.scale(0.85 + t * 0.15, 0.85 + t * 0.15);
            ctx.globalAlpha = t;
            ctx.drawImage(offscreenB, -width / 2, -height / 2);
            ctx.restore();
            ctx.globalAlpha = 1.0;
          } else if (transitionType === "wipe") {
            ctx.drawImage(offscreenA, 0, 0);
            ctx.save();
            ctx.beginPath();
            ctx.rect(width * (1.0 - t), 0, width * t, height);
            ctx.clip();
            ctx.drawImage(offscreenB, 0, 0);
            ctx.restore();
          } else {
            ctx.drawImage(offscreenA, 0, 0);
          }
        } else {
          drawSlideOnCanvas(
            ctx,
            vis.slide,
            sIdx,
            totalSlides,
            progressRatio,
            width,
            height,
            palette,
            vis.assignedPhoto,
            vis.blurredBg,
            vis.fallbackAnimText
          );
        }

        // Render active subtitle cue (global cues for unified narration or per-slide cues)
        if (subtitles?.enabled) {
          let activeCue: SubtitleCue | undefined;
          if (globalSubtitleCues.length > 0) {
            activeCue = globalSubtitleCues.find(
              (c) => currentGlobalSec >= c.startTime && currentGlobalSec < c.endTime
            );
          } else {
            const cues = slideSubtitleCues[sIdx] || [];
            activeCue = cues.find(
              (c) => elapsedSlideSec >= c.startTime && elapsedSlideSec < c.endTime
            );
          }

          if (activeCue?.text) {
            drawSubtitleOnCanvas(
              ctx,
              activeCue.text,
              width,
              height,
              subtitles.color,
              !isLightBg,
              subtitles.boxColor
            );
          }
        }

        (videoTrack as any)?.requestFrame?.();

        const overallPercent = Math.min(
          98,
          30 + Math.round((currentGlobalSec / Math.max(0.1, totalVideoDurationSec)) * 68)
        );
        emitProgress({
          currentSlide: sIdx + 1,
          totalSlides,
          phase: "slides",
          percentage: overallPercent,
          message: customAudioBuffer
            ? `Gravando Vídeo com Áudio: Cena ${sIdx + 1} de ${totalSlides}...`
            : voiceEnabled
            ? `Gravando Cena ${sIdx + 1} de ${totalSlides} (${persona.name})...`
            : `Gravando Cena ${sIdx + 1} de ${totalSlides}...`,
        });

        if (currentGlobalSec >= slideEndSec) {
          break;
        }

        const waitMs = Math.min(1000 / fps, Math.max(8, (slideEndSec - currentGlobalSec) * 1000));
        await new Promise((res) => setTimeout(res, waitMs));
      }
    }

    // Small settle buffer so final audio tail & final frame flush cleanly into MediaRecorder
    (videoTrack as any)?.requestFrame?.();
    await new Promise((res) => setTimeout(res, 350));

    emitProgress(
      {
        currentSlide: totalSlides,
        totalSlides,
        phase: "encoding",
        percentage: 100,
        message: "Finalizando arquivo de vídeo com todas as cenas e narrações...",
      },
      true
    );

    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
    const result = await recordingPromise;

    return {
      videoBlob: result.videoBlob,
      videoUrl: result.videoUrl,
      webmBlob: result.webmBlob,
      webmUrl: result.webmUrl,
      duration: totalVideoDurationSec,
    };
  } finally {
    try {
      if (recorder && recorder.state === "recording") {
        recorder.stop();
      }
    } catch {
      // ignore
    }
    try {
      canvasStream?.getTracks().forEach((t) => t.stop());
      combinedStream?.getTracks().forEach((t) => t.stop());
      audioDestination?.stream.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    if (audioContext && audioContext.state !== "closed") {
      try {
        await audioContext.close();
      } catch {
        // ignore
      }
    }
    try {
      canvas.remove();
    } catch {
      // ignore
    }
  }
}

// Draws a complete frame: full-screen photo or styled presentation slide
function drawSlideOnCanvas(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  slideIndex: number,
  totalSlides: number,
  progressRatio: number,
  width: number,
  height: number,
  palette: any,
  assignedPhoto?: HTMLImageElement,
  blurredBg?: HTMLCanvasElement,
  fallbackAnimText?: string
) {
  if (assignedPhoto && assignedPhoto.naturalWidth > 0 && assignedPhoto.naturalHeight > 0) {
    const effectiveAnimText =
      slide.animationText && slide.animationText.trim().length > 0
        ? slide.animationText
        : fallbackAnimText || "";
    drawFullScreenPhoto(
      ctx,
      assignedPhoto,
      width,
      height,
      progressRatio,
      effectiveAnimText,
      blurredBg
    );
    return;
  }

  const bgColor = `#${palette.bg}`;
  const cardColor = `#${palette.cardBg}`;
  const accentColor = `#${palette.accent}`;
  const textColor = `#${palette.primaryText}`;
  const subtextColor = `#${palette.secondaryText}`;

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, bgColor);
  grad.addColorStop(1, `#${palette.cardBorder}`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const leftX = Math.round(width * 0.07);
  const topY = Math.round(height * 0.12);
  const contentWidth = width - leftX * 2;

  if (slide.layout === "title" || slideIndex === 0) {
    ctx.fillStyle = textColor;
    ctx.font = "bold 52px sans-serif";
    wrapAndDrawText(ctx, slide.title, leftX, topY + 80, contentWidth, 65, 3);

    if (slide.subtitle) {
      ctx.fillStyle = subtextColor;
      ctx.font = "500 26px sans-serif";
      wrapAndDrawText(ctx, slide.subtitle, leftX, topY + 230, contentWidth, 38, 2);
    }

    if (slide.bullets && slide.bullets.length > 0) {
      const bStartY = topY + 340;
      slide.bullets.slice(0, 4).forEach((bullet, bIdx) => {
        const bY = bStartY + bIdx * 54;
        if (bY > height - 60) return;

        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(leftX + 8, bY - 6, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.font = "400 20px sans-serif";
        wrapAndDrawText(ctx, bullet, leftX + 30, bY - 18, contentWidth - 40, 28, 2);
      });
    }
    return;
  }

  ctx.fillStyle = textColor;
  ctx.font = "bold 42px sans-serif";
  wrapAndDrawText(ctx, slide.title, leftX, topY, contentWidth, 52, 2);

  if (slide.subtitle) {
    ctx.fillStyle = subtextColor;
    ctx.font = "500 22px sans-serif";
    wrapAndDrawText(ctx, slide.subtitle, leftX, topY + 105, contentWidth, 32, 1);
  }

  const bullets = slide.bullets || [];
  const cardCount = Math.min(bullets.length, 4);
  const cardStartY = slide.subtitle ? topY + 160 : topY + 130;
  const availableHeight = height - cardStartY - 70;

  if (cardCount > 0) {
    const cardGap = 24;
    const cardWidth = (contentWidth - (cardCount - 1) * cardGap) / cardCount;

    bullets.slice(0, cardCount).forEach((bText, cIdx) => {
      const cX = leftX + cIdx * (cardWidth + cardGap);
      const cY = cardStartY;
      const cHeight = Math.min(380, availableHeight);

      ctx.fillStyle = cardColor;
      ctx.beginPath();
      drawRoundedRectPath(ctx, cX, cY, cardWidth, cHeight, 16);
      ctx.fill();
      ctx.strokeStyle = `#${palette.cardBorder}`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = accentColor;
      ctx.fillRect(cX + 24, cY + 24, 32, 5);

      ctx.fillStyle = textColor;
      ctx.font = "400 18px sans-serif";
      wrapAndDrawText(ctx, bText, cX + 24, cY + 60, cardWidth - 48, 28, 8);
    });
  }
}

// Draws full screen photo executing motion analyzed from animationText
function drawFullScreenPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  progressRatio: number,
  animationText?: string,
  blurredBg?: HTMLCanvasElement
) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;
  if (natW <= 0 || natH <= 0) return;

  const motionConfig = parseAnimationInstructions(animationText);
  const motion = calculateMotionTransform(motionConfig, progressRatio);

  const imgRatio = natW / natH;
  const targetRatio = w / h;

  // 1. Static photo (no animation configured)
  if (!motion.hasMotion) {
    if (imgRatio < 1.0 && targetRatio > 1.05) {
      // Portrait inside landscape frame: pre-rendered blur backdrop + centered crisp photo
      if (blurredBg) {
        ctx.drawImage(blurredBg, 0, 0, w, h);
      } else {
        const bgScale = Math.max(w / natW, h / natH);
        const bgW = natW * bgScale;
        const bgH = natH * bgScale;
        ctx.drawImage(img, (w - bgW) / 2, (h - bgH) / 2, bgW, bgH);
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.fillRect(0, 0, w, h);
      }
      const drawH = h;
      const drawW = drawH * imgRatio;
      ctx.drawImage(img, (w - drawW) / 2, 0, drawW, drawH);
    } else {
      let sWidth = natW;
      let sHeight = natH;
      let sX = 0;
      let sY = 0;

      if (imgRatio > targetRatio) {
        sWidth = natH * targetRatio;
        sX = (natW - sWidth) / 2;
      } else {
        sHeight = natW / targetRatio;
        sY = (natH - sHeight) / 2;
      }

      ctx.drawImage(img, sX, sY, sWidth, sHeight, 0, 0, w, h);
    }
    return;
  }

  // 2. With motion
  const safetyCoverScale = 1.15;
  const finalScale = motion.scale * safetyCoverScale;

  if (imgRatio < 1.0 && targetRatio > 1.05) {
    if (blurredBg) {
      const bgScale = 1.25 * motion.scale;
      const bgW = w * bgScale;
      const bgH = h * bgScale;
      ctx.drawImage(
        blurredBg,
        (w - bgW) / 2 + motion.panX * w * 0.4,
        (h - bgH) / 2 + motion.panY * h * 0.4,
        bgW,
        bgH
      );
    } else {
      const bgScale = Math.max(w / natW, h / natH) * 1.25 * motion.scale;
      const bgW = natW * bgScale;
      const bgH = natH * bgScale;
      ctx.drawImage(
        img,
        (w - bgW) / 2 + motion.panX * w * 0.4,
        (h - bgH) / 2 + motion.panY * h * 0.4,
        bgW,
        bgH
      );
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(0, 0, w, h);
    }

    ctx.save();
    ctx.translate(w / 2 + motion.panX * w, h / 2 + motion.panY * h);
    if (motion.rotation !== 0) {
      ctx.rotate(motion.rotation);
    }
    const drawH = h * finalScale;
    const drawW = drawH * imgRatio;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  } else {
    let sWidth = natW;
    let sHeight = natH;
    let sX = 0;
    let sY = 0;

    if (imgRatio > targetRatio) {
      sWidth = natH * targetRatio;
      sX = (natW - sWidth) / 2;
    } else {
      sHeight = natW / targetRatio;
      sY = (natH - sHeight) / 2;
    }

    ctx.save();
    ctx.translate(w / 2 + motion.panX * w, h / 2 + motion.panY * h);
    if (motion.rotation !== 0) {
      ctx.rotate(motion.rotation);
    }

    const targetW = w * finalScale;
    const targetH = h * finalScale;
    ctx.drawImage(img, sX, sY, sWidth, sHeight, -targetW / 2, -targetH / 2, targetW, targetH);
    ctx.restore();
  }
}

function wrapAndDrawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 3
) {
  if (!text) return;
  const words = text.split(" ");
  let line = "";
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y + lineCount * lineHeight);
      line = words[n] + " ";
      lineCount++;
      if (lineCount >= maxLines - 1 && n < words.length - 1) {
        line += "...";
        break;
      }
    } else {
      line = testLine;
    }
  }
  if (lineCount < maxLines) {
    ctx.fillText(line, x, y + lineCount * lineHeight);
  }
}

export interface SubtitleCue {
  text: string;
  startTime: number;
  endTime: number;
}

export function generateSubtitleCues(
  text: string,
  speechDurationSec: number,
  slideDurationSec: number
): SubtitleCue[] {
  const clean = (text || "").replace(/[*_#`~]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const words = clean.split(" ").filter((w) => w.length > 0);
  if (words.length === 0) return [];

  if (words.length <= 7) {
    return [
      {
        text: clean,
        startTime: 0,
        endTime: Math.min(slideDurationSec - 0.2, Math.max(1.5, speechDurationSec + 0.8)),
      },
    ];
  }

  const chunks: string[] = [];
  let currentGroup: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentGroup.push(word);

    const hasStrongPunctuation = /[.!?;\n]$/.test(word);
    const hasCommaPunctuation = /[,:]$/.test(word);
    const remainingWords = words.length - (i + 1);

    const isAtPreferredSize = currentGroup.length >= 5;
    const isMaxSize = currentGroup.length >= 8;

    let shouldBreak = false;

    if (isMaxSize) {
      if (remainingWords > 2 || remainingWords === 0) {
        shouldBreak = true;
      }
    } else if (isAtPreferredSize) {
      if (hasStrongPunctuation || hasCommaPunctuation) {
        if (remainingWords > 2 || remainingWords === 0) {
          shouldBreak = true;
        }
      }
    } else if (hasStrongPunctuation && currentGroup.length >= 4) {
      if (remainingWords > 2 || remainingWords === 0) {
        shouldBreak = true;
      }
    }

    if (shouldBreak) {
      chunks.push(currentGroup.join(" "));
      currentGroup = [];
    }
  }

  if (currentGroup.length > 0) {
    if (currentGroup.length <= 2 && chunks.length > 0) {
      const prev = chunks.pop()!;
      chunks.push(`${prev} ${currentGroup.join(" ")}`);
    } else {
      chunks.push(currentGroup.join(" "));
    }
  }

  if (chunks.length === 0) return [];

  const totalWords = chunks.reduce((acc, c) => acc + c.split(/\s+/).length, 0);
  const speechDur = Math.max(1.0, speechDurationSec);

  const cues: SubtitleCue[] = [];
  let currentStart = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkWords = chunk.split(/\s+/).length;
    const fraction = chunkWords / totalWords;
    const chunkDur = fraction * speechDur;

    const isLast = i === chunks.length - 1;
    let end = currentStart + chunkDur;

    if (isLast) {
      end = Math.min(slideDurationSec - 0.2, Math.max(end, speechDur + 0.8));
    }

    cues.push({
      text: chunk,
      startTime: currentStart,
      endTime: end,
    });

    currentStart = end;
  }

  return cues;
}

function drawSubtitleOnCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  colorOption: SubtitleColorOption = "ai-auto",
  isDarkBg: boolean = true,
  boxColorOption?: string
) {
  if (!text || text.trim().length === 0) return;
  const clean = text.replace(/[*_#`~]/g, "").trim();

  let textColor = "#FFFFFF";
  if (colorOption === "ai-auto") {
    textColor = isDarkBg ? "#FACC15" : "#38BDF8";
  } else {
    textColor = colorOption;
  }

  let boxFill = "rgba(0, 0, 0, 0.78)";
  if (boxColorOption) {
    if (boxColorOption === "transparent") {
      boxFill = "transparent";
    } else if (boxColorOption.startsWith("#")) {
      const hex = boxColorOption.replace("#", "");
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16) || 0;
        const g = parseInt(hex.substring(2, 4), 16) || 0;
        const b = parseInt(hex.substring(4, 6), 16) || 0;
        boxFill = `rgba(${r}, ${g}, ${b}, 0.88)`;
      } else {
        boxFill = boxColorOption;
      }
    } else {
      boxFill = boxColorOption;
    }
  }

  ctx.save();
  ctx.font = "bold 23px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxWidth = Math.max(200, width - 160);
  const words = clean.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
      if (lines.length >= 3) break;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine && lines.length < 3) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    ctx.restore();
    return;
  }

  const lineHeight = 32;
  const totalBoxHeight = lines.length * lineHeight + 18;
  const boxY = height - totalBoxHeight - 28;

  if (boxFill !== "transparent") {
    ctx.fillStyle = boxFill;
    const maxLineWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const boxWidth = Math.min(width - 80, maxLineWidth + 44);
    const boxX = (width - boxWidth) / 2;

    ctx.beginPath();
    drawRoundedRectPath(ctx, boxX, boxY, boxWidth, totalBoxHeight, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.fillStyle = textColor;
  ctx.shadowColor = "rgba(0, 0, 0, 0.98)";
  ctx.shadowBlur = boxFill === "transparent" ? 6 : 3;

  lines.forEach((line, idx) => {
    const textY = boxY + 14 + idx * lineHeight + lineHeight / 2;
    ctx.fillText(line, width / 2, textY);
  });

  ctx.restore();
}
