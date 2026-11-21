export interface ClientConvertOptions {
  targetFormat: "webm" | "mp4";
  resolution: "original" | "1080p" | "720p" | "480p" | "360p";
  quality: "high" | "balanced" | "compact";
  fps: string;
  removeAudio: boolean;
  trimStart?: number;
  trimEnd?: number;
  onProgress?: (percentage: number, message: string) => void;
}

export async function convertVideoInBrowser(
  file: File,
  options: ClientConvertOptions
): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  const {
    targetFormat,
    resolution,
    quality,
    fps,
    removeAudio,
    trimStart = 0,
    trimEnd = 0,
    onProgress,
  } = options;

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = objectUrl;
  video.muted = removeAudio;
  video.playsInline = true;
  video.preload = "auto";
  video.style.position = "fixed";
  video.style.left = "-9999px";
  video.style.top = "-9999px";
  video.style.width = "16px";
  video.style.height = "16px";
  video.style.opacity = "0";
  document.body.appendChild(video);

  let canvas: HTMLCanvasElement | null = null;
  let audioCtx: AudioContext | null = null;
  let rafId = 0;

  try {
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        if (video.readyState >= 2) {
          cleanup();
          resolve();
        }
      };
      const onErr = () => {
        cleanup();
        reject(new Error("Não foi possível carregar este vídeo no navegador."));
      };
      const cleanup = () => {
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("canplay", onReady);
        video.removeEventListener("error", onErr);
      };
      video.addEventListener("loadeddata", onReady);
      video.addEventListener("canplay", onReady);
      video.addEventListener("error", onErr);
      if (video.readyState >= 2) {
        cleanup();
        resolve();
      }
    });

    const srcWidth = video.videoWidth || 1280;
    const srcHeight = video.videoHeight || 720;
    if (video.videoWidth <= 0 || video.videoHeight <= 0) {
      throw new Error("Este formato de vídeo não possui imagem decodificável pelo navegador.");
    }

    const maxHeight =
      resolution === "1080p"
        ? 1080
        : resolution === "720p"
        ? 720
        : resolution === "480p"
        ? 480
        : resolution === "360p"
        ? 360
        : srcHeight;

    const scale = srcHeight > maxHeight ? maxHeight / srcHeight : 1;
    const targetW = Math.max(2, Math.floor((srcWidth * scale) / 2) * 2);
    const targetH = Math.max(2, Math.floor((srcHeight * scale) / 2) * 2);

    canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.style.position = "fixed";
    canvas.style.left = "-9999px";
    canvas.style.top = "-9999px";
    canvas.style.width = "2px";
    canvas.style.height = "2px";
    canvas.style.opacity = "0";
    canvas.style.pointerEvents = "none";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new Error("Contexto gráfico 2D indisponível.");
    }

    const rawDuration = video.duration;
    const hasFiniteDuration = Number.isFinite(rawDuration) && rawDuration > 0;
    const safeStart =
      Number.isFinite(trimStart) && trimStart > 0
        ? hasFiniteDuration
          ? Math.min(trimStart, Math.max(0, rawDuration - 0.1))
          : trimStart
        : 0;
    const hasCustomEnd =
      Number.isFinite(trimEnd) &&
      trimEnd > safeStart &&
      (!hasFiniteDuration || trimEnd <= rawDuration);
    const endTime = hasCustomEnd
      ? trimEnd
      : hasFiniteDuration
      ? rawDuration
      : Number.POSITIVE_INFINITY;
    const totalSpan = Number.isFinite(endTime)
      ? Math.max(0.1, endTime - safeStart)
      : 0;

    if (safeStart > 0) {
      video.currentTime = safeStart;
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          resolve();
        };
        video.addEventListener("seeked", onSeeked);
        setTimeout(() => {
          video.removeEventListener("seeked", onSeeked);
          resolve();
        }, 1500);
      });
    }

    // Draw initial frame BEFORE starting captureStream & MediaRecorder
    ctx.drawImage(video, 0, 0, targetW, targetH);

    const targetFps = fps !== "original" && Number(fps) > 0 ? Number(fps) : 30;
    const stream = canvas.captureStream(targetFps);

    if (!removeAudio) {
      try {
        const videoStream =
          (video as any).captureStream?.() || (video as any).mozCaptureStream?.();
        if (videoStream) {
          const audioTracks = videoStream.getAudioTracks();
          if (audioTracks.length > 0) {
            audioCtx = new AudioContext();
            const dest = audioCtx.createMediaStreamDestination();
            const source = audioCtx.createMediaStreamSource(
              new MediaStream(audioTracks)
            );
            source.connect(dest);
            dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
          }
        }
      } catch {
        // Ignore if audio capture is unavailable
      }
    }

    const mimeCandidates =
      targetFormat === "mp4"
        ? [
            "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
            "video/mp4;codecs=h264",
            "video/mp4",
            "video/webm;codecs=vp8,opus",
            "video/webm",
          ]
        : ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm"];

    const selectedMime =
      mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";
    const extension = selectedMime.includes("mp4") ? "mp4" : "webm";

    const videoBitsPerSecond =
      quality === "high" ? 5_000_000 : quality === "compact" ? 1_200_000 : 2_500_000;

    const recorder = new MediaRecorder(stream, {
      mimeType: selectedMime,
      videoBitsPerSecond,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const donePromise = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: selectedMime }));
      };
      recorder.onerror = () =>
        reject(new Error("Falha ao gravar stream de conversão no navegador."));
    });

    recorder.start(250);

    try {
      await video.play();
    } catch {
      video.muted = true;
      await video.play();
    }

    const startedAt = performance.now();

    const drawFrame = () => {
      if (video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, targetW, targetH);
      }
      const elapsed = Math.max(0, video.currentTime - safeStart);
      if (totalSpan > 0) {
        const pct = Math.min(99, Math.round((elapsed / totalSpan) * 100));
        onProgress?.(pct, `Convertendo vídeo no navegador...`);
      } else {
        const pseudoPct = Math.min(
          95,
          Math.round(15 + (performance.now() - startedAt) / 200)
        );
        onProgress?.(pseudoPct, `Convertendo vídeo no navegador...`);
      }

      const reachedEnd =
        video.ended ||
        (Number.isFinite(endTime) && endTime > safeStart && video.currentTime >= endTime);

      if (reachedEnd) {
        video.pause();
        setTimeout(() => {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        }, 120);
        return;
      }
      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);

    const blob = await donePromise;
    if (blob.size < 1024) {
      throw new Error(
        "A conversão no navegador não conseguiu capturar quadros válidos deste arquivo."
      );
    }
    onProgress?.(100, "Conversão concluída!");
    return {
      blob,
      mimeType: selectedMime,
      extension,
    };
  } finally {
    cancelAnimationFrame(rafId);
    video.pause();
    video.src = "";
    video.remove();
    if (canvas) canvas.remove();
    if (audioCtx && audioCtx.state !== "closed") {
      audioCtx.close().catch(() => {});
    }
    URL.revokeObjectURL(objectUrl);
  }
}
