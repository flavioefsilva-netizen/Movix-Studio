import {
  PresentationData,
  AttachedPhoto,
  PhotoStoryItem,
  TransitionType,
  VoiceGender,
  VoicePitch,
  VoiceMood,
  SubtitleSettings,
  BackgroundMusicTrackId,
  PhotoNarrationMode,
  CustomAudioSlice,
  VoiceSlotId,
  VoiceSlotConfig,
} from "./presentation";

export interface SavedProject {
  id: string;
  projectNumber: number;
  name: string; // "Projeto 1", "Projeto 2", etc.
  subtitle: string; // Subtítulo do projeto
  mode: "photos-text" | "text-presentation";
  createdAt: number;
  updatedAt: number;
  videoUrl: string;
  webmUrl?: string;
  duration: number;
  thumbnailUrl?: string;
  subtitles?: SubtitleSettings;
  backgroundMusicTrack?: BackgroundMusicTrackId;

  // Data for editing and repopulating presentation mode
  presentationData?: {
    presentation: PresentationData;
    photos: AttachedPhoto[];
    inputText?: string;
    selectedTheme?: string;
    customBgColor?: string;
    slideCountTarget?: number;
    voiceGender?: VoiceGender;
    voiceId?: string;
    voicePitch?: VoicePitch;
    voiceMood?: VoiceMood;
    subtitles?: SubtitleSettings;
    backgroundMusicTrack?: BackgroundMusicTrackId;
    transitionType?: TransitionType;
  };

  // Data for editing and repopulating photos mode
  photoStoryData?: {
    photoItems: PhotoStoryItem[];
    secondsPerPhoto?: number;
    enableVoice?: boolean;
    enableBackgroundMusic?: boolean;
    backgroundMusicTrack?: BackgroundMusicTrackId;
    aspectRatio?: "16:9" | "9:16" | "1:1";
    voiceGender?: VoiceGender;
    voiceId?: string;
    voicePitch?: VoicePitch;
    voiceMood?: VoiceMood;
    voiceSlots?: Record<VoiceSlotId, VoiceSlotConfig>;
    subtitles?: SubtitleSettings;
    transitionType?: TransitionType;
    photoNarrationMode?: PhotoNarrationMode;
    unifiedText?: string;
    customAudioSlice?: CustomAudioSlice;
  };
}

