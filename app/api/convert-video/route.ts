import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const execFileAsync = promisify(execFile);

export const maxDuration = 120;

const MAX_DIRECT_RESPONSE_BYTES = 16 * 1024 * 1024; // 16 MB (safely under 32 MB proxy limits)
const TEMP_FILE_TTL_MS = 15 * 60 * 1000;

export type VideoConvertTargetFormat =
  | "webm"
  | "mp4"
  | "mov"
  | "avi"
  | "mkv"
  | "gif"
  | "mp3"
  | "wav";

const ALLOWED_FORMATS = new Set<VideoConvertTargetFormat>([
  "webm",
  "mp4",
  "mov",
  "avi",
  "mkv",
  "gif",
  "mp3",
  "wav",
]);

const MIME_MAP: Record<VideoConvertTargetFormat, string> = {
  webm: "video/webm",
  mp4: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  gif: "image/gif",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

interface ProbeStreamInfo {
  index: number;
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  nb_read_packets?: string;
  disposition?: {
    attached_pic?: number;
  };
}

interface ProbeResult {
  streams: ProbeStreamInfo[];
  format?: {
    duration?: string;
    size?: string;
  };
}

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}

async function cleanupExpiredTempFiles() {
  try {
    const tmpDir = os.tmpdir();
    const entries = await fs.readdir(tmpDir);
    const now = Date.now();
    await Promise.all(
      entries
        .filter((name) => name.startsWith("movix-"))
        .map(async (name) => {
          const full = path.join(tmpDir, name);
          const st = await fs.stat(full).catch(() => null);
          if (st && now - st.mtimeMs > TEMP_FILE_TTL_MS) {
            await fs.unlink(full).catch(() => {});
          }
        })
    );
  } catch {
    // ignore cleanup errors
  }
}

function parseFrameRate(rateStr?: string): number {
  if (!rateStr || !rateStr.includes("/")) return Number(rateStr || 0) || 0;
  const [num, den] = rateStr.split("/").map(Number);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return 0;
  return num / den;
}

async function probeMedia(filePath: string, countPackets = false): Promise<ProbeResult | null> {
  try {
    const args = ["-v", "error"];
    if (countPackets) {
      args.push("-count_packets");
    }
    args.push(
      "-show_entries",
      countPackets
        ? "format=duration,size:stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,nb_read_packets,disposition"
        : "format=duration,size:stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,disposition",
      "-of",
      "json",
      filePath
    );
    const { stdout } = await execFileAsync("ffprobe", args, { timeout: 15000 });
    return JSON.parse(stdout) as ProbeResult;
  } catch {
    return null;
  }
}

async function checkFfmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync("ffmpeg", ["-version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function buildFfmpegArgs(params: {
  inputPath: string;
  outputPath: string;
  targetFormat: VideoConvertTargetFormat;
  resolution: string;
  quality: string;
  fps: string;
  removeAudio: boolean;
  trimStart: number;
  trimEnd: number;
  videoStreamIndex: number | null;
  hasAudio: boolean;
  detectedFps: number;
  safeMode?: boolean;
}): string[] {
  const {
    inputPath,
    outputPath,
    targetFormat,
    resolution,
    quality,
    fps,
    removeAudio,
    trimStart,
    trimEnd,
    videoStreamIndex,
    hasAudio,
    detectedFps,
    safeMode = false,
  } = params;

  const args: string[] = [
    "-y",
    "-fflags",
    safeMode ? "+genpts+igndts+discardcorrupt" : "+genpts",
    "-avoid_negative_ts",
    "make_zero",
  ];

  if (safeMode) {
    args.push("-err_detect", "ignore_err");
  }

  args.push("-i", inputPath);

  if (Number.isFinite(trimStart) && trimStart > 0) {
    args.push("-ss", String(trimStart));
  }

  if (
    Number.isFinite(trimEnd) &&
    trimEnd > 0 &&
    trimEnd > (Number.isFinite(trimStart) && trimStart > 0 ? trimStart : 0)
  ) {
    const duration =
      trimEnd - (Number.isFinite(trimStart) && trimStart > 0 ? trimStart : 0);
    args.push("-t", String(duration));
  }

  const crfH264 = quality === "high" ? "18" : quality === "compact" ? "28" : "23";
  const crfVp8 = quality === "high" ? "10" : quality === "compact" ? "28" : "18";
  const vp8Bitrate = quality === "high" ? "4M" : quality === "compact" ? "900k" : "2M";
  const aviQ = quality === "high" ? "2" : quality === "compact" ? "8" : "5";

  const maxHeight =
    resolution === "1080p"
      ? 1080
      : resolution === "720p"
      ? 720
      : resolution === "480p"
      ? 480
      : resolution === "360p"
      ? 360
      : null;

  const explicitFps =
    fps !== "original" && Number.isFinite(Number(fps)) && Number(fps) > 0
      ? Number(fps)
      : null;

  if (targetFormat === "mp3") {
    args.push(
      "-vn",
      "-c:a",
      "libmp3lame",
      "-b:a",
      quality === "high" ? "320k" : quality === "compact" ? "128k" : "192k"
    );
  } else if (targetFormat === "wav") {
    args.push("-vn", "-c:a", "pcm_s16le");
  } else if (targetFormat === "gif") {
    if (videoStreamIndex !== null) {
      args.push("-map", `0:${videoStreamIndex}`);
    }
    const gifFps = explicitFps ? Math.min(explicitFps, 24) : 12;
    const gifWidth =
      maxHeight === 1080 ? 720 : maxHeight === 720 ? 640 : maxHeight === 360 ? 360 : 480;
    args.push(
      "-vf",
      `fps=${gifFps},scale=${gifWidth}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
      "-loop",
      "0"
    );
  } else {
    if (videoStreamIndex !== null) {
      args.push("-map", `0:${videoStreamIndex}`);
    } else {
      args.push("-map", "0:v:0");
    }
    if (hasAudio && !removeAudio) {
      args.push("-map", "0:a:0?");
    } else {
      args.push("-an");
    }

    const filters: string[] = [];
    if (maxHeight) {
      filters.push(`scale=-2:'min(${maxHeight},ih)'`);
    } else {
      filters.push("scale=trunc(iw/2)*2:trunc(ih/2)*2");
    }
    args.push("-vf", filters.join(","));

    const needsNormalizedCfr = safeMode || detectedFps <= 0 || detectedFps > 90;
    const outputFps = explicitFps || (needsNormalizedCfr ? 30 : null);
    if (outputFps) {
      args.push("-vsync", "cfr", "-r", String(outputFps));
    }

    args.push("-pix_fmt", "yuv420p");

    if (targetFormat === "webm") {
      args.push(
        "-c:v",
        "libvpx",
        "-b:v",
        vp8Bitrate,
        "-crf",
        crfVp8,
        "-deadline",
        "good",
        "-cpu-used",
        "2",
        "-auto-alt-ref",
        "0"
      );
      if (hasAudio && !removeAudio) {
        args.push("-c:a", "libopus", "-b:a", "128k");
      }
    } else if (targetFormat === "avi") {
      args.push("-c:v", "mpeg4", "-q:v", aviQ);
      if (hasAudio && !removeAudio) {
        args.push("-c:a", "libmp3lame", "-b:a", "192k");
      }
    } else {
      args.push("-c:v", "libx264", "-preset", "fast", "-crf", crfH264);
      if (targetFormat === "mp4" || targetFormat === "mov") {
        args.push("-movflags", "+faststart");
      }
      if (hasAudio && !removeAudio) {
        args.push("-c:a", "aac", "-b:a", "192k");
      }
    }
  }

  args.push(outputPath);
  return args;
}

async function isConvertedFileValid(
  outputPath: string,
  targetFormat: VideoConvertTargetFormat
): Promise<boolean> {
  const stat = await fs.stat(outputPath).catch(() => null);
  if (!stat || stat.size < 256) return false;

  const probe = await probeMedia(outputPath, true);
  if (!probe) return false;

  if (targetFormat === "mp3" || targetFormat === "wav") {
    const audioStream = probe.streams.find((s) => s.codec_type === "audio");
    const packets = Number(audioStream?.nb_read_packets || 0);
    const dur = Number(probe.format?.duration || 0);
    return Boolean(audioStream && (packets > 0 || dur > 0));
  }

  const videoStream = probe.streams.find((s) => s.codec_type === "video");
  if (!videoStream || !videoStream.width || !videoStream.height) {
    return false;
  }

  const packets = Number(videoStream.nb_read_packets || 0);
  const dur = Number(probe.format?.duration || 0);
  return packets > 0 && (dur > 0 || targetFormat === "gif");
}

async function runTranscodeAndBuildResponse(params: {
  inputPath: string;
  outputPath: string;
  originalFileName: string;
  originalSize: number;
  targetFormat: VideoConvertTargetFormat;
  resolution: string;
  quality: string;
  fps: string;
  removeAudio: boolean;
  trimStart: number;
  trimEnd: number;
}): Promise<NextResponse> {
  const {
    inputPath,
    outputPath,
    originalFileName,
    originalSize,
    targetFormat,
    resolution,
    quality,
    fps,
    removeAudio,
    trimStart,
    trimEnd,
  } = params;

  const inputProbe = await probeMedia(inputPath, false);
  const videoStream =
    inputProbe?.streams.find(
      (s) => s.codec_type === "video" && !s.disposition?.attached_pic
    ) || inputProbe?.streams.find((s) => s.codec_type === "video");
  const hasAudio = Boolean(
    inputProbe?.streams.some((s) => s.codec_type === "audio")
  );

  if (
    targetFormat !== "mp3" &&
    targetFormat !== "wav" &&
    inputProbe &&
    !videoStream
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "O arquivo enviado não contém nenhuma faixa de vídeo válida.",
      },
      { status: 400 }
    );
  }

  const avgFps = parseFrameRate(videoStream?.avg_frame_rate);
  const rFps = parseFrameRate(videoStream?.r_frame_rate);
  const detectedFps = avgFps > 0 && avgFps <= 120 ? avgFps : rFps;

  const primaryArgs = buildFfmpegArgs({
    inputPath,
    outputPath,
    targetFormat,
    resolution,
    quality,
    fps,
    removeAudio,
    trimStart,
    trimEnd,
    videoStreamIndex: videoStream ? videoStream.index : null,
    hasAudio,
    detectedFps,
    safeMode: false,
  });

  await execFileAsync("ffmpeg", primaryArgs, {
    timeout: 115000,
    maxBuffer: 10 * 1024 * 1024,
  });

  let valid = await isConvertedFileValid(outputPath, targetFormat);
  if (!valid) {
    const retryArgs = buildFfmpegArgs({
      inputPath,
      outputPath,
      targetFormat,
      resolution,
      quality,
      fps,
      removeAudio,
      trimStart,
      trimEnd,
      videoStreamIndex: videoStream ? videoStream.index : null,
      hasAudio,
      detectedFps: 30,
      safeMode: true,
    });

    await execFileAsync("ffmpeg", retryArgs, {
      timeout: 115000,
      maxBuffer: 10 * 1024 * 1024,
    });

    valid = await isConvertedFileValid(outputPath, targetFormat);
  }

  if (!valid) {
    return NextResponse.json(
      {
        success: false,
        error:
          "A conversão não produziu quadros de vídeo válidos. Verifique se o arquivo original não está corrompido ou se o recorte de tempo não excede a duração.",
      },
      { status: 422 }
    );
  }

  const outStat = await fs.stat(outputPath);
  const baseName =
    path
      .basename(originalFileName, path.extname(originalFileName))
      .replace(/[^a-zA-Z0-9._-]/g, "_") || "video_convertido";
  const finalFileName = `${baseName}.${targetFormat}`;

  // If output exceeds safe Cloud Run / proxy response limit, serve via chunked download ID
  if (outStat.size > MAX_DIRECT_RESPONSE_BYTES) {
    const downloadId = `${crypto.randomUUID()}`;
    const readyPath = path.join(os.tmpdir(), `movix-ready-${downloadId}.${targetFormat}`);
    await fs.rename(outputPath, readyPath);
    return NextResponse.json({
      chunkedDownload: true,
      downloadId,
      totalSize: outStat.size,
      originalSize,
      mimeType: MIME_MAP[targetFormat],
      fileName: finalFileName,
      format: targetFormat,
    });
  }

  const outBuffer = await fs.readFile(outputPath);
  return new NextResponse(new Uint8Array(outBuffer), {
    status: 200,
    headers: {
      "Content-Type": MIME_MAP[targetFormat],
      "Content-Disposition": `attachment; filename="${finalFileName}"`,
      "X-Original-Size": String(originalSize),
      "X-Converted-Size": String(outBuffer.length),
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const downloadId = searchParams.get("downloadId");

  if (downloadId) {
    const safeId = sanitizeId(downloadId);
    const offset = Math.max(0, Number(searchParams.get("offset") || 0));
    const length = Math.min(
      8 * 1024 * 1024,
      Math.max(1, Number(searchParams.get("length") || 4 * 1024 * 1024))
    );

    const tmpDir = os.tmpdir();
    const entries = await fs.readdir(tmpDir).catch(() => []);
    const matched = entries.find((e) => e.startsWith(`movix-ready-${safeId}.`));
    if (!matched) {
      return NextResponse.json(
        { success: false, error: "Arquivo convertido expirado ou não encontrado." },
        { status: 404 }
      );
    }
    const filePath = path.join(tmpDir, matched);
    const st = await fs.stat(filePath);
    const bytesToRead = Math.max(0, Math.min(length, st.size - offset));
    const handle = await fs.open(filePath, "r");
    try {
      const buf = Buffer.alloc(bytesToRead);
      await handle.read(buf, 0, bytesToRead, offset);
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Total-Size": String(st.size),
        },
      });
    } finally {
      await handle.close();
    }
  }

  const available = await checkFfmpegAvailable();
  return NextResponse.json({
    available,
    formats: Array.from(ALLOWED_FORMATS),
  });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const downloadId = searchParams.get("downloadId");
  if (downloadId) {
    const safeId = sanitizeId(downloadId);
    const tmpDir = os.tmpdir();
    const entries = await fs.readdir(tmpDir).catch(() => []);
    await Promise.all(
      entries
        .filter((e) => e.startsWith(`movix-ready-${safeId}.`))
        .map((e) => fs.unlink(path.join(tmpDir, e)).catch(() => {}))
    );
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  let inputPath: string | null = null;
  let outputPath: string | null = null;
  const chunkPathsToClean: string[] = [];

  try {
    cleanupExpiredTempFiles().catch(() => {});

    const ffmpegAvailable = await checkFfmpegAvailable();
    if (!ffmpegAvailable) {
      return NextResponse.json(
        {
          success: false,
          ffmpegMissing: true,
          error: "FFmpeg não está disponível neste servidor.",
        },
        { status: 501 }
      );
    }

    const formData = await req.formData();
    const action = String(formData.get("action") || "direct").trim();
    const tmpDir = os.tmpdir();

    // 1. Chunked Upload Step: save 4MB slice cleanly to stay well below Cloud Run 32MB limit (HTTP 413)
    if (action === "upload-chunk") {
      const uploadId = sanitizeId(String(formData.get("uploadId") || ""));
      const chunkIndex = Number(formData.get("chunkIndex"));
      const chunk = formData.get("chunk");

      if (!uploadId || !Number.isInteger(chunkIndex) || chunkIndex < 0 || !(chunk instanceof Blob)) {
        return NextResponse.json(
          { success: false, error: "Dados do fragmento inválidos." },
          { status: 400 }
        );
      }

      const chunkPath = path.join(tmpDir, `movix-chunk-${uploadId}-${chunkIndex}`);
      const buf = Buffer.from(await chunk.arrayBuffer());
      await fs.writeFile(chunkPath, buf);

      return NextResponse.json({ ok: true, chunkIndex, size: buf.length });
    }

    // Parse conversion parameters (used by both "finalize" and "direct")
    const rawFormat = String(formData.get("targetFormat") || "webm")
      .toLowerCase()
      .trim();
    if (!ALLOWED_FORMATS.has(rawFormat as VideoConvertTargetFormat)) {
      return NextResponse.json(
        { success: false, error: `Formato de destino não suportado: ${rawFormat}` },
        { status: 400 }
      );
    }
    const targetFormat = rawFormat as VideoConvertTargetFormat;

    const resolution = String(formData.get("resolution") || "original").trim();
    const quality = String(formData.get("quality") || "balanced").trim();
    const fps = String(formData.get("fps") || "original").trim();
    const removeAudio = String(formData.get("removeAudio") || "false") === "true";
    const trimStart = Number(formData.get("trimStart") || 0);
    const trimEnd = Number(formData.get("trimEnd") || 0);

    // 2. Finalize Chunked Upload: assemble chunks into inputPath and convert
    if (action === "finalize") {
      const uploadId = sanitizeId(String(formData.get("uploadId") || ""));
      const totalChunks = Number(formData.get("totalChunks"));
      const fileName = String(formData.get("fileName") || "video.mp4");

      if (!uploadId || !Number.isInteger(totalChunks) || totalChunks <= 0) {
        return NextResponse.json(
          { success: false, error: "Parâmetros de finalização do envio inválidos." },
          { status: 400 }
        );
      }

      const safeExt =
        (path.extname(fileName) || ".mp4")
          .replace(/[^a-zA-Z0-9.]/g, "")
          .slice(0, 10) || ".mp4";

      inputPath = path.join(tmpDir, `movix-in-${uploadId}${safeExt}`);
      outputPath = path.join(tmpDir, `movix-out-${uploadId}.${targetFormat}`);

      const writeHandle = await fs.open(inputPath, "w");
      let totalSize = 0;
      try {
        for (let i = 0; i < totalChunks; i++) {
          const chunkPath = path.join(tmpDir, `movix-chunk-${uploadId}-${i}`);
          chunkPathsToClean.push(chunkPath);
          const chunkBuf = await fs.readFile(chunkPath).catch(() => null);
          if (!chunkBuf) {
            return NextResponse.json(
              {
                success: false,
                error: `Parte ${i + 1} de ${totalChunks} não encontrada no servidor. Tente enviar novamente.`,
              },
              { status: 400 }
            );
          }
          await writeHandle.write(chunkBuf);
          totalSize += chunkBuf.length;
          await fs.unlink(chunkPath).catch(() => {});
        }
      } finally {
        await writeHandle.close();
      }

      return await runTranscodeAndBuildResponse({
        inputPath,
        outputPath,
        originalFileName: fileName,
        originalSize: totalSize,
        targetFormat,
        resolution,
        quality,
        fps,
        removeAudio,
        trimStart,
        trimEnd,
      });
    }

    // 3. Direct Single-Request Upload (<= 4 MB)
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Nenhum arquivo de vídeo enviado." },
        { status: 400 }
      );
    }

    const safeExt =
      (path.extname(file.name) || ".mp4")
        .replace(/[^a-zA-Z0-9.]/g, "")
        .slice(0, 10) || ".mp4";
    const id = crypto.randomUUID();
    inputPath = path.join(tmpDir, `movix-in-${id}${safeExt}`);
    outputPath = path.join(tmpDir, `movix-out-${id}.${targetFormat}`);

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    if (inputBuffer.length === 0) {
      return NextResponse.json(
        { success: false, error: "O arquivo enviado está vazio." },
        { status: 400 }
      );
    }
    await fs.writeFile(inputPath, inputBuffer);

    return await runTranscodeAndBuildResponse({
      inputPath,
      outputPath,
      originalFileName: file.name,
      originalSize: inputBuffer.length,
      targetFormat,
      resolution,
      quality,
      fps,
      removeAudio,
      trimStart,
      trimEnd,
    });
  } catch (err: any) {
    console.error("Erro na conversão de vídeo via FFmpeg:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.stderr
          ? `Falha ao converter vídeo: ${String(err.stderr).slice(-300)}`
          : err?.message || "Erro ao converter vídeo no servidor.",
      },
      { status: 500 }
    );
  } finally {
    if (inputPath) {
      fs.unlink(inputPath).catch(() => {});
    }
    if (outputPath) {
      fs.unlink(outputPath).catch(() => {});
    }
    for (const p of chunkPathsToClean) {
      fs.unlink(p).catch(() => {});
    }
  }
}
