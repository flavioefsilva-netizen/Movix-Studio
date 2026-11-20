/**
 * Photo Motion & Animation Engine
 * Parses user-described animation instructions (in Portuguese and English)
 * and calculates exact transform parameters (scale, panX, panY, rotation) for Canvas 2D rendering.
 *
 * CRITICAL RULE: If no text is provided, hasMotion is FALSE and the photo remains 100% static.
 */

export interface MotionTransform {
  hasMotion: boolean;
  scale: number;
  panX: number; // Normalized -1 to +1 relative to canvas width
  panY: number; // Normalized -1 to +1 relative to canvas height
  rotation: number; // In radians
  description: string;
}

export interface ParsedMotionConfig {
  hasMotion: boolean;
  zoomStart: number;
  zoomEnd: number;
  panXStart: number;
  panXEnd: number;
  panYStart: number;
  panYEnd: number;
  rotationStart: number;
  rotationEnd: number;
  motionType: string;
}

function smoothEaseInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Analyzes natural language animation instructions and returns motion trajectory parameters.
 * If text is empty or explicitly static, returns hasMotion: false (completely still photo).
 */
export function parseAnimationInstructions(rawText?: string): ParsedMotionConfig {
  if (!rawText || rawText.trim().length === 0) {
    // Explicitly NO animation: photo stays completely static as requested by the user
    return {
      hasMotion: false,
      zoomStart: 1.0,
      zoomEnd: 1.0,
      panXStart: 0,
      panXEnd: 0,
      panYStart: 0,
      panYEnd: 0,
      rotationStart: 0,
      rotationEnd: 0,
      motionType: "none",
    };
  }

  const text = rawText.toLowerCase().trim();

  // If user explicitly asks for no movement / static photo
  if (
    text === "estático" ||
    text === "estatico" ||
    text === "sem movimento" ||
    text === "parado" ||
    text === "fixo" ||
    text === "nenhum" ||
    text === "nenhuma"
  ) {
    return {
      hasMotion: false,
      zoomStart: 1.0,
      zoomEnd: 1.0,
      panXStart: 0,
      panXEnd: 0,
      panYStart: 0,
      panYEnd: 0,
      rotationStart: 0,
      rotationEnd: 0,
      motionType: "none",
    };
  }

  // Speed & intensity modifiers
  const isIntense =
    text.includes("rápido") ||
    text.includes("rapido") ||
    text.includes("intenso") ||
    text.includes("forte") ||
    text.includes("dramático") ||
    text.includes("dramatico") ||
    text.includes("grande") ||
    text.includes("muito");

  const isSlow =
    text.includes("lento") ||
    text.includes("suave") ||
    text.includes("sutil") ||
    text.includes("calmo") ||
    text.includes("pouco") ||
    text.includes("leve");

  // Factors adjusted to be clearly visible on screen without distortion
  const zoomFactor = isIntense ? 0.36 : isSlow ? 0.18 : 0.26;
  const panFactor = isIntense ? 0.16 : isSlow ? 0.08 : 0.12;
  const rotFactor = isIntense ? 0.05 : isSlow ? 0.02 : 0.035;

  let zoomStart = 1.0;
  let zoomEnd = 1.0;
  let panXStart = 0;
  let panXEnd = 0;
  let panYStart = 0;
  let panYEnd = 0;
  let rotationStart = 0;
  let rotationEnd = 0;
  let motionType = "custom";

  // Check Zoom direction
  const hasZoomIn =
    text.includes("zoom in") ||
    text.includes("aproxim") ||
    text.includes("focar") ||
    text.includes("foco") ||
    text.includes("fechar") ||
    text.includes("perto") ||
    text.includes("in");

  const hasZoomOut =
    text.includes("zoom out") ||
    text.includes("afast") ||
    text.includes("distanci") ||
    text.includes("abrir") ||
    text.includes("revelar") ||
    text.includes("longe") ||
    text.includes("out");

  if (hasZoomOut && !hasZoomIn) {
    zoomStart = 1.0 + zoomFactor;
    zoomEnd = 1.0;
    motionType = "zoom-out";
  } else if (hasZoomIn) {
    zoomStart = 1.0;
    zoomEnd = 1.0 + zoomFactor;
    motionType = "zoom-in";
  }

  // Check Horizontal Pan direction
  const hasPanRight =
    text.includes("direita") ||
    text.includes("right") ||
    text.includes("para direita") ||
    text.includes("esquerda para a direita") ||
    text.includes("esquerda para direita");

  const hasPanLeft =
    text.includes("esquerda") ||
    text.includes("left") ||
    text.includes("para esquerda") ||
    text.includes("direita para a esquerda") ||
    text.includes("direita para esquerda");

  if (hasPanRight && !hasPanLeft) {
    panXStart = -panFactor;
    panXEnd = +panFactor;
    motionType = motionType === "custom" ? "pan-right" : `${motionType}+pan-right`;
  } else if (hasPanLeft) {
    panXStart = +panFactor;
    panXEnd = -panFactor;
    motionType = motionType === "custom" ? "pan-left" : `${motionType}+pan-left`;
  }

  // Check Vertical Pan direction
  const hasPanUp =
    text.includes("baixo para cima") ||
    text.includes("subir") ||
    text.includes("para cima") ||
    text.includes("tilt up") ||
    text.includes("elevar") ||
    text.includes("subindo");

  const hasPanDown =
    text.includes("cima para baixo") ||
    text.includes("descer") ||
    text.includes("para baixo") ||
    text.includes("tilt down") ||
    text.includes("rebaixar") ||
    text.includes("descendo");

  if (hasPanUp && !hasPanDown) {
    panYStart = +panFactor * 0.85;
    panYEnd = -panFactor * 0.85;
    motionType = motionType === "custom" ? "pan-up" : `${motionType}+pan-up`;
  } else if (hasPanDown) {
    panYStart = -panFactor * 0.85;
    panYEnd = +panFactor * 0.85;
    motionType = motionType === "custom" ? "pan-down" : `${motionType}+pan-down`;
  }

  // Ken Burns cinematográfico or diagonal drift
  if (
    text.includes("ken burns") ||
    text.includes("cinematogr") ||
    text.includes("diagonal") ||
    (hasZoomIn && (hasPanRight || hasPanLeft))
  ) {
    zoomStart = 1.05;
    zoomEnd = 1.05 + zoomFactor;
    if (panXStart === 0 && panXEnd === 0) {
      panXStart = -panFactor * 0.75;
      panXEnd = +panFactor * 0.75;
    }
    if (panYStart === 0 && panYEnd === 0) {
      panYStart = -panFactor * 0.55;
      panYEnd = +panFactor * 0.55;
    }
    motionType = "ken-burns";
  }

  // Rotation / Tilt
  const hasRotation =
    text.includes("gir") ||
    text.includes("rot") ||
    text.includes("balan") ||
    text.includes("inclin") ||
    text.includes("tilt") ||
    text.includes("giro");

  if (hasRotation) {
    rotationStart = -rotFactor;
    rotationEnd = +rotFactor;
    motionType = motionType === "custom" ? "rotation" : `${motionType}+rotation`;
  }

  // If user typed words that didn't match specific direction (e.g. "movimento dinâmico"),
  // apply a visible Ken Burns zoom-pan
  if (
    motionType === "custom" &&
    zoomStart === 1.0 &&
    zoomEnd === 1.0 &&
    panXStart === 0 &&
    panXEnd === 0 &&
    panYStart === 0 &&
    panYEnd === 0
  ) {
    zoomStart = 1.0;
    zoomEnd = 1.0 + zoomFactor;
    panXStart = -panFactor * 0.6;
    panXEnd = +panFactor * 0.6;
    motionType = "subtle-move";
  }

  return {
    hasMotion: true,
    zoomStart,
    zoomEnd,
    panXStart,
    panXEnd,
    panYStart,
    panYEnd,
    rotationStart,
    rotationEnd,
    motionType,
  };
}

/**
 * Calculates the current frame transform (scale, panX, panY, rotation)
 * given the progressRatio (0.0 to 1.0) and the parsed animation config.
 */
export function calculateMotionTransform(
  config: ParsedMotionConfig,
  progressRatio: number
): MotionTransform {
  if (!config.hasMotion) {
    return {
      hasMotion: false,
      scale: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0,
      description: "none",
    };
  }

  const t = smoothEaseInOut(Math.max(0, Math.min(1, progressRatio)));

  const scale = config.zoomStart + (config.zoomEnd - config.zoomStart) * t;
  const panX = config.panXStart + (config.panXEnd - config.panXStart) * t;
  const panY = config.panYStart + (config.panYEnd - config.panYStart) * t;
  const rotation = config.rotationStart + (config.rotationEnd - config.rotationStart) * t;

  return {
    hasMotion: true,
    scale,
    panX,
    panY,
    rotation,
    description: config.motionType,
  };
}
