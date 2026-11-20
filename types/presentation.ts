export type TransitionType = "none" | "fade" | "slide-left" | "slide-right" | "zoom" | "wipe";

export type VoiceGender = "female" | "male";

export type VoicePitch = "grave" | "natural" | "agudo" | "suave";

export type VoiceMood = "corporativo" | "entusiasta" | "calmo" | "firme" | "empatico";

export type VoiceSlotId = "voz1" | "voz2" | "voz3" | "voz4";

export interface VoiceSlotConfig {
  slotId: VoiceSlotId;
  label: string;
  gender: VoiceGender;
  voiceId: string;
  pitch: VoicePitch;
  mood: VoiceMood;
  isSaved?: boolean;
}

export type SubtitleColorOption =
  | "ai-auto"
  | "#ffffff"
  | "#000000"
  | "#facc15"
  | "#38bdf8"
  | "#a3e635"
  | "#ef4444"
  | "#fb923c"
  | "#a855f7"
  | "#eab308"
  | string;

export const SUBTITLE_9_COLORS = [
  { name: "Branco", hex: "#ffffff" },
  { name: "Preto", hex: "#000000" },
  { name: "Amarelo", hex: "#facc15" },
  { name: "Azul Claro", hex: "#38bdf8" },
  { name: "Verde Limão", hex: "#a3e635" },
  { name: "Vermelho", hex: "#ef4444" },
  { name: "Laranja", hex: "#fb923c" },
  { name: "Roxo", hex: "#a855f7" },
  { name: "Amarelo Ouro", hex: "#eab308" },
] as const;

export interface SubtitleSettings {
  enabled: boolean;
  color: SubtitleColorOption;
  boxColor?: string;
}

export type BackgroundMusicTrackId =
  | "acustica-suave"
  | "corporativa-inspiradora"
  | "lofi-calmo"
  | "eletronica-suave"
  | "cinematografica";

export type PhotoNarrationMode = "per-photo" | "single-text" | "custom-audio";

export interface CustomAudioSlice {
  audioUrl: string;
  fileName: string;
  fileSize: number;
  totalDuration: number;
  startTime: number;
  endTime: number;
  sliceDuration: number;
}

export interface AttachedPhoto {
  id: string;
  name: string;
  dataUrl: string;
  type: string;
  size: number;
  caption?: string;
  animationText?: string;
}

export interface PhotoStoryItem {
  id: string;
  photo: AttachedPhoto;
  order: number;
  title: string;
  narration: string;
  bullets?: string[];
  customDuration?: number;
  animationText?: string;
  voiceSlotId?: VoiceSlotId;
}

export interface SlideData {
  id: string;
  slideNumber: number;
  layout: "title" | "split-left-image" | "split-right-image" | "cards" | "quote" | "conclusion" | "photo-focus" | string;
  title: string;
  subtitle?: string;
  bullets: string[];
  narration: string;
  recommendedImageDescription?: string;
  highlightTag?: string;
  photoId?: string; // id of the attached photo mapped to this slide
  customDuration?: number;
  animationText?: string;
  voiceGender?: VoiceGender;
  voiceId?: string;
  voicePitch?: VoicePitch;
  voiceMood?: VoiceMood;
}

export interface PresentationData {
  title: string;
  subtitle?: string;
  theme: "azul-celeste" | "dark-slate" | "corporate-navy" | "emerald-tech" | "sunset-warm" | "cyber-purple";
  customBgColor?: string; // Hex color code (e.g. #0F172A, #FFFFFF, etc.)
  slides: SlideData[];
}

export interface ValidationResult {
  isValid: boolean;
  slideCountValid: boolean;
  photosMappedCount: number;
  totalPhotosCount: number;
  allHaveNarration: boolean;
  warnings: string[];
  messages: string[];
}


