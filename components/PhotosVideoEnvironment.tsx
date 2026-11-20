"use client";

import React, { useState, useRef, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  Upload,
  Camera,
  Image as ImageIcon,
  Film,
  Download,
  Share2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Wand2,
  Volume2,
  VolumeX,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Sliders,
  Clock,
  Layers,
  Music,
  Plus,
  FileText,
  FileAudio,
  LayoutGrid,
  Check,
  Mic,
  X,
} from "lucide-react";
import {
  AttachedPhoto,
  PhotoStoryItem,
  VoiceGender,
  VoicePitch,
  VoiceMood,
  VoiceSlotId,
  VoiceSlotConfig,
  TransitionType,
  PhotoNarrationMode,
  CustomAudioSlice,
  SubtitleColorOption,
  BackgroundMusicTrackId,
} from "@/types/presentation";
import { renderPresentationVideo, RenderProgress } from "@/lib/video-renderer";
import { generateSamplePhoto } from "@/lib/sample-data";
import { SavedProject } from "@/types/project";
import {
  saveOrUpdateProject,
  deleteProject,
  useRecentProjects,
  isPlayableVideoUrl,
} from "@/lib/projects-store";
import { ProjectSubtitleModal } from "@/components/ProjectSubtitleModal";
import { RecentProjectsSection } from "@/components/RecentProjectsSection";
import { VoiceAndTransitionSettings } from "@/components/VoiceAndTransitionSettings";
import { VoiceSlotsSelector } from "@/components/VoiceSlotsSelector";
import { AudioTrimmer } from "@/components/AudioTrimmer";
import { StepHeader, StepNavigationFooter } from "@/components/StepHeader";
import {
  playVoiceSample,
  stopVoiceSample,
  createDefaultVoiceSlots,
  VOICE_SLOT_IDS,
  getVoicePersona,
} from "@/lib/voice-utils";
import { PhotoAnimationModal } from "@/components/PhotoAnimationModal";
import { PhotoZoomNarrationModal } from "@/components/PhotoZoomNarrationModal";
import { AddTextWordModal } from "@/components/AddTextWordModal";
import {
  generateNarrationWordDocument,
  generateNarrationTemplateWordDocument,
  parseNarrationWordFile,
} from "@/lib/word-generator";

interface PhotosVideoEnvironmentProps {
  onNotifyTelegram?: (message: string) => void;
  activeProject?: SavedProject | null;
  onProjectUpdated?: (saved: SavedProject) => void;
  onLoadProject?: (project: SavedProject) => void;
  recentProjects?: SavedProject[];
  onDeleteProject?: (id: string) => void;
  onBackToModeSelection?: () => void;
  onStartNewVideo?: () => void;
}

export function PhotosVideoEnvironment({
  activeProject,
  onProjectUpdated,
  onLoadProject,
  onDeleteProject,
  onBackToModeSelection,
  onStartNewVideo,
}: PhotosVideoEnvironmentProps) {
  // Step navigation (Quadro a Quadro: 1 to 9)
  // 1: Selecionar ou Capturar Fotos (Usar Câmera ou Carregar do Dispositivo)
  // 2: Modo de Narração & Trilha Sonora do Vídeo (nenhuma selecionada no início)
  // 3: Narração Vocal com IA (VOZ 1, VOZ 2, VOZ 3 e VOZ 4)
  // 4: Roteiro de Narração e Ordem das Fotos
  // 5: Formato e Configurações do Vídeo (Formato, Duração, Música de Fundo)
  // 6: Legendas do Vídeo (Cor e Estilo)
  // 7: Transição entre as Telas
  // 8: Validação Final & Gravação do Vídeo
  // 9: Vídeo Pronto
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Photos state
  const [photoItems, setPhotoItems] = useState<PhotoStoryItem[]>([]);
  const [animationModalItem, setAnimationModalItem] = useState<PhotoStoryItem | null>(null);
  const [zoomModalItem, setZoomModalItem] = useState<PhotoStoryItem | null>(null);
  const [isGeneratingNarrationId, setIsGeneratingNarrationId] = useState<string | null>(null);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isAddTextModalOpen, setIsAddTextModalOpen] = useState(false);
  const [isProcessingWordText, setIsProcessingWordText] = useState(false);
  const [wordModalError, setWordModalError] = useState<string | null>(null);
  const [wordImportAlerts, setWordImportAlerts] = useState<{
    missingPhotos: number[];
    extraTexts: number[];
    loadedCount: number;
  } | null>(null);

  // Narration Mode (starts UNSELECTED as requested: null)
  const [photoNarrationMode, setPhotoNarrationMode] = useState<PhotoNarrationMode | null>(null);
  const [unifiedVideoText, setUnifiedVideoText] = useState<string>(
    "Bem-vindos ao nosso vídeo especial. Apresentamos uma seleção exclusiva de imagens que contam a história das nossas conquistas, projetos e momentos marcantes. Cada detalhe reflete dedicação, excelência e visão de futuro."
  );
  const [isGeneratingUnifiedNarration, setIsGeneratingUnifiedNarration] = useState(false);
  const [activeUnifiedSpeech, setActiveUnifiedSpeech] = useState(false);
  const [customAudioSlice, setCustomAudioSlice] = useState<CustomAudioSlice | null>(null);
  const [triggerAudioPickerOnMount, setTriggerAudioPickerOnMount] = useState(false);
  const [galleryColumns, setGalleryColumns] = useState<1 | 2 | 3 | 4 | 5>(3);

  const getGalleryGridClass = (cols: 1 | 2 | 3 | 4 | 5) => {
    switch (cols) {
      case 1:
        return "grid grid-cols-1 gap-4";
      case 2:
        return "grid grid-cols-1 sm:grid-cols-2 gap-4";
      case 3:
        return "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4";
      case 4:
        return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3";
      case 5:
        return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5";
    }
  };

  // Video format settings
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [secondsPerPhoto, setSecondsPerPhoto] = useState<number>(6);
  const [enableBackgroundMusic, setEnableBackgroundMusic] = useState<boolean>(true);
  const [backgroundMusicTrack, setBackgroundMusicTrack] = useState<BackgroundMusicTrackId>("acustica-suave");

  // Voice settings (4 configurable voice slots VOZ 1 .. VOZ 4)
  const [enableVoice, setEnableVoice] = useState<boolean>(true);
  const [voiceSlots, setVoiceSlots] = useState<Record<VoiceSlotId, VoiceSlotConfig>>(() =>
    createDefaultVoiceSlots()
  );
  const [voiceGender, setVoiceGender] = useState<VoiceGender>("female");
  const [voiceId, setVoiceId] = useState<string>("helena");
  const [voicePitch, setVoicePitch] = useState<VoicePitch>("agudo");
  const [voiceMood, setVoiceMood] = useState<VoiceMood>("entusiasta");

  // Subtitles settings (default "Sem Legenda" = false)
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(false);
  const [subtitleColor, setSubtitleColor] = useState<SubtitleColorOption>("#ffffff");
  const [subtitleBoxColor, setSubtitleBoxColor] = useState<string>("#000000");

  // Transition settings
  const [transitionType, setTransitionType] = useState<TransitionType>("none");

  // Video rendering state
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedWebmUrl, setGeneratedWebmUrl] = useState<string | null>(null);
  const [generatedWordUrl, setGeneratedWordUrl] = useState<string | null>(null);
  const [generatedWordFileName, setGeneratedWordFileName] = useState<string>("roteiro_narracao.docx");
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // Subtitle Modal & Projects State
  const [isSubtitleModalOpen, setIsSubtitleModalOpen] = useState(false);
  const [modalProjectName, setModalProjectName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState("");
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [currentActiveProject, setCurrentActiveProject] = useState<SavedProject | null>(activeProject || null);
  const internalProjects = useRecentProjects();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const addTopFileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize when activeProject changes from external selection
  useEffect(() => {
    if (!activeProject) return;

    const timer = setTimeout(() => {
      setCurrentActiveProject(activeProject);
      if (activeProject.mode === "photos-text" && activeProject.photoStoryData) {
        if (activeProject.photoStoryData.photoItems) {
          setPhotoItems(activeProject.photoStoryData.photoItems);
        }
        if (activeProject.photoStoryData.secondsPerPhoto) {
          setSecondsPerPhoto(activeProject.photoStoryData.secondsPerPhoto);
        }
        if (activeProject.photoStoryData.enableVoice !== undefined) {
          setEnableVoice(activeProject.photoStoryData.enableVoice);
        }
        if (activeProject.photoStoryData.enableBackgroundMusic !== undefined) {
          setEnableBackgroundMusic(activeProject.photoStoryData.enableBackgroundMusic);
        }
        if (activeProject.photoStoryData.aspectRatio) {
          setAspectRatio(activeProject.photoStoryData.aspectRatio);
        }
        if (activeProject.photoStoryData.voiceSlots) {
          setVoiceSlots(activeProject.photoStoryData.voiceSlots);
        }
        if (activeProject.photoStoryData.voiceGender) {
          setVoiceGender(activeProject.photoStoryData.voiceGender);
        }
        if (activeProject.photoStoryData.voiceId) {
          setVoiceId(activeProject.photoStoryData.voiceId);
        }
        if (activeProject.photoStoryData.voicePitch) {
          setVoicePitch(activeProject.photoStoryData.voicePitch);
        }
        if (activeProject.photoStoryData.voiceMood) {
          setVoiceMood(activeProject.photoStoryData.voiceMood);
        }
        if (activeProject.photoStoryData.transitionType) {
          setTransitionType(activeProject.photoStoryData.transitionType);
        }
        if (activeProject.photoStoryData.photoNarrationMode) {
          setPhotoNarrationMode(activeProject.photoStoryData.photoNarrationMode);
        }
        if (activeProject.photoStoryData.unifiedText) {
          setUnifiedVideoText(activeProject.photoStoryData.unifiedText);
        }
        if (activeProject.photoStoryData.customAudioSlice) {
          setCustomAudioSlice(activeProject.photoStoryData.customAudioSlice);
        }
      }
      if (activeProject.subtitles) {
        setSubtitlesEnabled(activeProject.subtitles.enabled);
        setSubtitleColor(activeProject.subtitles.color);
      }
      if (activeProject.backgroundMusicTrack) {
        setBackgroundMusicTrack(activeProject.backgroundMusicTrack);
      }
      if (activeProject.videoUrl) {
        setGeneratedVideoUrl(activeProject.videoUrl);
        setGeneratedWebmUrl(activeProject.webmUrl || null);
        setVideoDuration(activeProject.duration || 0);
        setCurrentStep(9);
      } else {
        setCurrentStep(4);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [activeProject]);

  // Handle image files from camera or file picker (ordered alphabetically by file name)
  const handleFilesSelected = async (
    files: FileList | null,
    insertMode: "full-sort" | "prepend-sorted" = "full-sort"
  ) => {
    if (!files || files.length === 0) return;

    setErrorMsg(null);
    const fileArray = Array.from(files).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { numeric: true, sensitivity: "base" })
    );

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (addTopFileInputRef.current) addTopFileInputRef.current.value = "";

    const loadedItems = await Promise.all(
      fileArray.map(
        (file, idx) =>
          new Promise<PhotoStoryItem | null>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              if (!dataUrl) {
                resolve(null);
                return;
              }

              const photoId = `photo-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
              const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
              const formattedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

              resolve({
                id: photoId,
                photo: {
                  id: photoId,
                  name: file.name,
                  dataUrl,
                  type: file.type || "image/jpeg",
                  size: file.size,
                },
                order: idx + 1,
                title: formattedTitle || `Foto ${idx + 1}`,
                narration: "",
                bullets: [formattedTitle || "Destaque", "Qualidade HD"],
                customDuration: secondsPerPhoto,
                voiceSlotId: "voz1",
              });
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          })
      )
    );

    const validItems = loadedItems
      .filter((item): item is PhotoStoryItem => item !== null)
      .sort((a, b) =>
        (a.photo?.name || a.title || "").localeCompare(
          b.photo?.name || b.title || "",
          "pt-BR",
          { numeric: true, sensitivity: "base" }
        )
      );
    if (validItems.length === 0) return;

    if (insertMode === "prepend-sorted") {
      setPhotoItems((prev) =>
        [...validItems, ...prev].map((item, idx) => ({ ...item, order: idx + 1 }))
      );
      setSuccessMsg("Fotos adicionadas no topo em ordem alfabética!");
    } else {
      setPhotoItems((prev) =>
        [...prev, ...validItems]
          .sort((a, b) =>
            (a.photo?.name || a.title || "").localeCompare(
              b.photo?.name || b.title || "",
              "pt-BR",
              { numeric: true, sensitivity: "base" }
            )
          )
          .map((item, idx) => ({ ...item, order: idx + 1 }))
      );
      setSuccessMsg("Fotos carregadas com sucesso em ordem alfabética!");
    }

    setTimeout(() => {
      setSuccessMsg(null);
    }, 2500);
  };

  // Add sample photos for instant test
  const handleAddSamplePhotos = () => {
    const samples = [
      {
        title: "Inovação & Estratégia Digital",
        color1: "#0EA5E9",
        color2: "#0369A1",
      },
      {
        title: "Tecnologia e Automação",
        color1: "#38BDF8",
        color2: "#0284C7",
      },
      {
        title: "Resultados e Conquistas Reais",
        color1: "#06B6D4",
        color2: "#0E7490",
      },
    ];

    const currentCount = photoItems.length;
    const newItems: PhotoStoryItem[] = samples.map((sample, idx) => {
      const photo = generateSamplePhoto(sample.title, sample.color1, sample.color2);
      const order = currentCount + idx + 1;
      return {
        id: photo.id,
        photo,
        order,
        title: sample.title,
        narration: "",
        bullets: [sample.title, "Qualidade HD"],
        customDuration: secondsPerPhoto,
        voiceSlotId: "voz1",
      };
    });

    setPhotoItems((prev) => {
      const combined = [...newItems, ...prev];
      return combined.map((item, i) => ({ ...item, order: i + 1 }));
    });

    setSuccessMsg("3 fotos demonstrativas adicionadas com sucesso! Avançando...");
    setTimeout(() => {
      setSuccessMsg(null);
      setCurrentStep(2);
      window.scrollTo({ top: 180, behavior: "smooth" });
    }, 600);
  };

  // Reorder methods
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setPhotoItems((prev) => {
      const arr = [...prev];
      const temp = arr[index];
      arr[index] = arr[index - 1];
      arr[index - 1] = temp;
      return arr.map((item, i) => ({ ...item, order: i + 1 }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= photoItems.length - 1) return;
    setPhotoItems((prev) => {
      const arr = [...prev];
      const temp = arr[index];
      arr[index] = arr[index + 1];
      arr[index + 1] = temp;
      return arr.map((item, i) => ({ ...item, order: i + 1 }));
    });
  };

  const handleMoveToTop = (index: number) => {
    if (index <= 0) return;
    setPhotoItems((prev) => {
      const arr = [...prev];
      const [target] = arr.splice(index, 1);
      arr.unshift(target);
      return arr.map((item, i) => ({ ...item, order: i + 1 }));
    });
  };

  const handleMoveToBottom = (index: number) => {
    if (index >= photoItems.length - 1) return;
    setPhotoItems((prev) => {
      const arr = [...prev];
      const [target] = arr.splice(index, 1);
      arr.push(target);
      return arr.map((item, i) => ({ ...item, order: i + 1 }));
    });
  };

  const handleClearAllPhotos = () => {
    if (window.confirm("Deseja realmente apagar todas as fotos carregadas?")) {
      setPhotoItems([]);
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotoItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      return filtered.map((item, i) => ({ ...item, order: i + 1 }));
    });
  };

  const handleUpdateTitle = (id: string, newTitle: string) => {
    setPhotoItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: newTitle } : item))
    );
  };

  const handleUpdateNarration = (id: string, newNarration: string) => {
    setPhotoItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, narration: newNarration } : item))
    );
  };

  const handleUpdateVoiceSlot = (id: string, slotId: VoiceSlotId) => {
    if (activeSpeechId === id) {
      stopVoiceSample();
      setActiveSpeechId(null);
    }
    setPhotoItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, voiceSlotId: slotId } : item))
    );
  };

  const handleSaveVoiceSlot = (updated: VoiceSlotConfig) => {
    setVoiceSlots((prev) => ({
      ...prev,
      [updated.slotId]: updated,
    }));
    if (updated.slotId === "voz1") {
      setVoiceGender(updated.gender);
      setVoiceId(updated.voiceId);
      setVoicePitch(updated.pitch);
      setVoiceMood(updated.mood);
    }
  };

  const handleUpdateCustomDuration = (id: string, newDuration: number) => {
    const clamped = Math.max(1, Math.min(60, newDuration));
    setPhotoItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, customDuration: clamped } : item))
    );
  };

  const handleSavePhotoAnimation = (text: string) => {
    if (!animationModalItem) return;
    const targetId = animationModalItem.id;
    setPhotoItems((prev) =>
      prev.map((item) =>
        item.id === targetId
          ? {
              ...item,
              animationText: text,
              photo: { ...item.photo, animationText: text },
            }
          : item
      )
    );
    setAnimationModalItem(null);
  };

  const handleDownloadWordTemplate = async () => {
    setWordModalError(null);
    setIsProcessingWordText(true);
    try {
      const result = await generateNarrationTemplateWordDocument();
      const a = document.createElement("a");
      a.href = result.url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(result.url), 10000);
    } catch (err: any) {
      setWordModalError(err?.message || "Erro ao gerar o modelo de Word.");
    } finally {
      setIsProcessingWordText(false);
    }
  };

  const handleUploadWordTextFile = async (file: File) => {
    setWordModalError(null);
    setIsProcessingWordText(true);
    try {
      const result = await parseNarrationWordFile(file);
      if (!result.success) {
        setWordModalError(
          result.error || 'O arquivo Word precisa conter obrigatoriamente a descrição "FOTO 1".'
        );
        return;
      }

      const validOrders = new Set(photoItems.map((item, idx) => item.order || idx + 1));
      const missingPhotos: number[] = [];
      let loadedCount = 0;

      const updatedItems = photoItems.map((item, idx) => {
        const photoNumber = item.order || idx + 1;
        if (result.entries.has(photoNumber)) {
          const importedText = (result.entries.get(photoNumber) || "").trim();
          if (importedText.length > 0) {
            loadedCount += 1;
          } else {
            missingPhotos.push(photoNumber);
          }
          return {
            ...item,
            narration: importedText,
          };
        }

        if (!(item.narration || "").trim()) {
          missingPhotos.push(photoNumber);
        }
        return item;
      });

      const extraTexts = Array.from(result.entries.keys())
        .filter((num) => !validOrders.has(num))
        .sort((a, b) => a - b);

      setPhotoItems(updatedItems);
      setWordImportAlerts({
        missingPhotos,
        extraTexts,
        loadedCount,
      });
      setIsAddTextModalOpen(false);
      setWordModalError(null);

      setSuccessMsg(
        loadedCount > 0
          ? `${loadedCount} texto${loadedCount > 1 ? "s" : ""} carregado${loadedCount > 1 ? "s" : ""} do Word com sucesso!`
          : "Arquivo Word processado!"
      );
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3500);
    } finally {
      setIsProcessingWordText(false);
    }
  };

  const hasCustomPhotoDurations = photoItems.some(
    (item) => item.customDuration !== undefined && item.customDuration !== secondsPerPhoto
  );

  // AI Narration generator for a single photo
  const handleGenerateAINarration = async (item: PhotoStoryItem) => {
    setIsGeneratingNarrationId(item.id);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/generate-photo-narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          photoIndex: item.order,
          totalPhotos: photoItems.length,
          style: "corporativo",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao gerar narração para a foto");
      }

      handleUpdateNarration(item.id, data.narration);
    } catch (err: any) {
      console.warn("Fallback local para narração de foto:", err);
      const fallback = `Apresentamos com destaque ${item.title || `a imagem ${item.order}`}, ressaltando a precisão visual e os detalhes preparados para esta apresentação.`;
      handleUpdateNarration(item.id, fallback);
    } finally {
      setIsGeneratingNarrationId(null);
    }
  };

  // Generate unified narration for all photos
  const handleGenerateUnifiedNarration = async () => {
    if (photoItems.length === 0) {
      setErrorMsg("Adicione ao menos 1 foto para gerar o roteiro unificado.");
      return;
    }

    setIsGeneratingUnifiedNarration(true);
    setErrorMsg(null);

    try {
      const titles = photoItems.map((p) => p.title).join(", ");
      const res = await fetch("/api/generate-photo-narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Álbum integrado: ${titles}`,
          photoIndex: 1,
          totalPhotos: photoItems.length,
          style: "historia-completa",
        }),
      });

      const data = await res.json();
      if (data.success && data.narration) {
        setUnifiedVideoText(data.narration);
      } else {
        throw new Error(data.error || "Falha ao gerar");
      }
    } catch (e: any) {
      console.warn("Fallback de roteiro unificado:", e);
      setUnifiedVideoText(
        `Sejam bem-vindos ao nosso vídeo especial. Ao longo desta apresentação, exploramos momentos marcantes e conquistas essenciais representadas em cada imagem. Do planejamento à execução, cada etapa reflete excelência e dedicação contínua.`
      );
    } finally {
      setIsGeneratingUnifiedNarration(false);
    }
  };

  // Listen preview for per-photo narration using the selected voice slot (default VOZ 1)
  const handlePreviewSpeech = (id: string, text: string, slotId?: VoiceSlotId) => {
    if (activeSpeechId === id) {
      stopVoiceSample();
      setActiveSpeechId(null);
      return;
    }

    const slot = voiceSlots[slotId || "voz1"] || voiceSlots.voz1;

    stopVoiceSample();
    setActiveSpeechId(id);

    playVoiceSample(
      text,
      {
        gender: slot.gender,
        voiceId: slot.voiceId,
        pitch: slot.pitch,
        mood: slot.mood,
      },
      {
        onEnd: () => setActiveSpeechId(null),
        onError: () => setActiveSpeechId(null),
      }
    );
  };

  // Listen preview for unified narration using the chosen voice from Step 3
  const handleTogglePreviewUnifiedSpeech = () => {
    if (activeUnifiedSpeech) {
      stopVoiceSample();
      setActiveUnifiedSpeech(false);
      return;
    }

    const slot = voiceSlots.voz1;

    stopVoiceSample();
    setActiveUnifiedSpeech(true);

    playVoiceSample(
      unifiedVideoText,
      {
        gender: slot.gender,
        voiceId: slot.voiceId,
        pitch: slot.pitch,
        mood: slot.mood,
      },
      {
        onEnd: () => setActiveUnifiedSpeech(false),
        onError: () => setActiveUnifiedSpeech(false),
      }
    );
  };

  // Choice handler for Step 2 (Modo de Narração)
  const handleSelectNarrationMode = (mode: PhotoNarrationMode) => {
    setPhotoNarrationMode(mode);
    if (mode === "custom-audio") {
      setTriggerAudioPickerOnMount(true);
      setCurrentStep(4);
    } else {
      setTriggerAudioPickerOnMount(false);
      setCurrentStep(3);
    }
    window.scrollTo({ top: 180, behavior: "smooth" });
  };

  // Convert photos into PresentationData structure for video rendering
  const convertToPresentationData = () => {
    const photos: AttachedPhoto[] = photoItems.map((item) => ({
      ...item.photo,
      animationText: item.animationText || item.photo.animationText || "",
    }));
    let slides: any[] = [];

    if (photoNarrationMode === "single-text") {
      const slot = voiceSlots.voz1;
      slides = photoItems.map((item, idx) => ({
        id: `photo-slide-${item.id}`,
        slideNumber: idx + 1,
        layout: "photo-focus",
        title: item.title || `Foto ${idx + 1}`,
        subtitle: `Foto ${idx + 1} de ${photoItems.length}`,
        bullets: [item.title, `Foto ${idx + 1}`],
        narration: "",
        highlightTag: `FOTO ${idx + 1}`,
        photoId: item.photo.id,
        customDuration: item.customDuration ?? secondsPerPhoto,
        animationText: item.animationText || item.photo.animationText || "",
        voiceGender: slot.gender,
        voiceId: slot.voiceId,
        voicePitch: slot.pitch,
        voiceMood: slot.mood,
      }));
    } else if (photoNarrationMode === "custom-audio") {
      slides = photoItems.map((item, idx) => ({
        id: `photo-slide-${item.id}`,
        slideNumber: idx + 1,
        layout: "photo-focus",
        title: item.title || `Foto ${idx + 1}`,
        subtitle: `Foto ${idx + 1} de ${photoItems.length}`,
        bullets: [item.title, `Foto ${idx + 1}`],
        narration: `Foto ${idx + 1}`,
        highlightTag: `FOTO ${idx + 1}`,
        photoId: item.photo.id,
        customDuration: item.customDuration,
        animationText: item.animationText || item.photo.animationText || "",
      }));
    } else {
      slides = photoItems.map((item, idx) => {
        const slot = voiceSlots[item.voiceSlotId || "voz1"] || voiceSlots.voz1;
        return {
          id: `photo-slide-${item.id}`,
          slideNumber: idx + 1,
          layout: "photo-focus",
          title: item.title || `Foto ${idx + 1}`,
          subtitle: `Destaque ${idx + 1} de ${photoItems.length}`,
          bullets: [item.title, `Foto ${idx + 1}`],
          narration: item.narration || "",
          highlightTag: `FOTO ${idx + 1}`,
          photoId: item.photo.id,
          customDuration: item.customDuration ?? secondsPerPhoto,
          animationText: item.animationText || item.photo.animationText || "",
          voiceGender: slot.gender,
          voiceId: slot.voiceId,
          voicePitch: slot.pitch,
          voiceMood: slot.mood,
        };
      });
    }

    return {
      presentation: {
        title: "Vídeo Narrado sobre Fotos e Textos",
        subtitle: `${photoItems.length} fotos com locução sincronizada`,
        theme: "azul-celeste" as const,
        customBgColor: "#071A2E",
        slides,
      },
      photos,
    };
  };

  // Open Subtitle Modal before rendering
  const handleOpenSubtitleModal = () => {
    if (photoItems.length === 0) {
      setErrorMsg("Adicione ao menos 1 foto para gerar o vídeo.");
      return;
    }

    if (photoNarrationMode === "per-photo") {
      // Fotos sem texto de narração são aceitas normalmente
    } else if (photoNarrationMode === "single-text") {
      if (!unifiedVideoText || unifiedVideoText.trim().length === 0) {
        setErrorMsg("Preencha o texto que será narrado no vídeo no modo 'Um texto para o video'.");
        return;
      }
    } else if (photoNarrationMode === "custom-audio") {
      if (!customAudioSlice || !customAudioSlice.audioUrl) {
        setErrorMsg("Por favor, carregue um arquivo de áudio e selecione o trecho desejado antes de gerar o vídeo.");
        return;
      }
    }

    setErrorMsg(null);

    if (currentActiveProject) {
      setModalProjectName(currentActiveProject.name);
      setModalSubtitle(currentActiveProject.name || "");
      setIsEditingModal(true);
    } else {
      setModalProjectName("");
      setModalSubtitle("");
      setIsEditingModal(false);
    }

    setIsSubtitleModalOpen(true);
  };

  // Render video
  const handleConfirmSubtitle = async (chosenVideoName: string) => {
    setIsSubtitleModalOpen(false);
    await executeRenderVideo(chosenVideoName);
  };

  // Start new video: saves current finished project to "Últimos Projetos" and resets all steps and inputs
  const handleStartNewVideo = () => {
    stopVoiceSample();

    if (generatedVideoUrl) {
      saveOrUpdateProject({
        id: currentActiveProject?.id,
        name: currentActiveProject?.name,
        projectNumber: currentActiveProject?.projectNumber,
        subtitle: currentActiveProject?.subtitle || currentActiveProject?.name || "Vídeo Gravado",
        mode: "photos-text",
        videoUrl: generatedVideoUrl,
        webmUrl: generatedWebmUrl || undefined,
        duration: videoDuration,
        subtitles: {
          enabled: subtitlesEnabled,
          color: subtitleColor,
          boxColor: subtitleBoxColor,
        },
        backgroundMusicTrack,
        photoStoryData: {
          photoItems,
          secondsPerPhoto,
          enableVoice,
          enableBackgroundMusic,
          aspectRatio,
          voiceGender,
          voiceId,
          voicePitch,
          voiceMood,
          voiceSlots,
          transitionType,
          photoNarrationMode: photoNarrationMode || "per-photo",
          unifiedText: unifiedVideoText,
          customAudioSlice: customAudioSlice || undefined,
        },
      });
    }

    if (generatedWordUrl) {
      try {
        URL.revokeObjectURL(generatedWordUrl);
      } catch {
        // ignore
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (addTopFileInputRef.current) addTopFileInputRef.current.value = "";

    setPhotoItems([]);
    setAnimationModalItem(null);
    setZoomModalItem(null);
    setIsGeneratingNarrationId(null);
    setActiveSpeechId(null);
    setIsGeneratingUnifiedNarration(false);
    setActiveUnifiedSpeech(false);
    setIsAddTextModalOpen(false);
    setIsProcessingWordText(false);
    setWordModalError(null);
    setWordImportAlerts(null);
    setPhotoNarrationMode(null);
    setUnifiedVideoText("");
    setCustomAudioSlice(null);
    setTriggerAudioPickerOnMount(false);
    setGalleryColumns(3);
    setSecondsPerPhoto(6);
    setEnableVoice(true);
    setVoiceSlots(createDefaultVoiceSlots());
    setVoiceGender("female");
    setVoiceId("helena");
    setVoicePitch("agudo");
    setVoiceMood("entusiasta");
    setEnableBackgroundMusic(true);
    setBackgroundMusicTrack("acustica-suave");
    setSubtitlesEnabled(false);
    setSubtitleColor("#ffffff");
    setSubtitleBoxColor("#000000");
    setTransitionType("none");
    setAspectRatio("16:9");
    setIsRenderingVideo(false);
    setGeneratedVideoUrl(null);
    setGeneratedWebmUrl(null);
    setGeneratedWordUrl(null);
    setGeneratedWordFileName("roteiro_narracao.docx");
    setVideoDuration(0);
    setIsSubtitleModalOpen(false);
    setModalProjectName("");
    setModalSubtitle("");
    setIsEditingModal(false);
    setCurrentActiveProject(null);
    setRenderProgress(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    setCurrentStep(1);

    if (onStartNewVideo) {
      onStartNewVideo();
    } else if (onBackToModeSelection) {
      onBackToModeSelection();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const executeRenderVideo = async (chosenVideoName: string) => {
    setErrorMsg(null);
    setIsRenderingVideo(true);
    setRenderProgress({
      currentSlide: 1,
      totalSlides: photoItems.length,
      phase: "init",
      percentage: 5,
      message: "Validando fotos e preparando narrações de voz sincronizadas...",
    });

    try {
      const { presentation, photos } = convertToPresentationData();

      const result = await renderPresentationVideo(presentation, photos, {
        secondsPerSlide: secondsPerPhoto,
        aspectRatio,
        voiceEnabled: enableVoice && photoNarrationMode !== "custom-audio",
        voiceGender: photoNarrationMode === "single-text" ? voiceSlots.voz1.gender : voiceGender,
        voiceId: photoNarrationMode === "single-text" ? voiceSlots.voz1.voiceId : voiceId,
        voicePitch: photoNarrationMode === "single-text" ? voiceSlots.voz1.pitch : voicePitch,
        voiceMood: photoNarrationMode === "single-text" ? voiceSlots.voz1.mood : voiceMood,
        unifiedNarrationText:
          photoNarrationMode === "single-text" ? unifiedVideoText : undefined,
        transitionType,
        customAudioSlice: photoNarrationMode === "custom-audio" ? customAudioSlice : null,
        backgroundMusic: enableBackgroundMusic && photoNarrationMode !== "custom-audio",
        backgroundMusicTrack,
        subtitles: {
          enabled: subtitlesEnabled,
          color: subtitleColor,
          boxColor: subtitleBoxColor,
        },
        onProgress: (p) => setRenderProgress(p),
      });

      setGeneratedVideoUrl(result.videoUrl);
      setGeneratedWebmUrl(result.webmUrl);
      setVideoDuration(result.duration);

      // Gerar arquivo Word (.docx) com todos os textos de narração das fotos
      try {
        const wordDoc = await generateNarrationWordDocument(photoItems, {
          mode: photoNarrationMode,
          unifiedText: unifiedVideoText,
          projectTitle: chosenVideoName || currentActiveProject?.name || "Roteiro de Narração das Fotos",
        });
        setGeneratedWordUrl((prevUrl) => {
          if (prevUrl) {
            try {
              URL.revokeObjectURL(prevUrl);
            } catch {
              // ignore
            }
          }
          return wordDoc.url;
        });
        setGeneratedWordFileName(wordDoc.fileName);
      } catch (wordErr) {
        console.warn("Aviso ao gerar arquivo Word de narração:", wordErr);
      }

      // Save project to FIFO store (max 5) using the name chosen by the user
      const saved = saveOrUpdateProject({
        id: currentActiveProject?.id,
        name: chosenVideoName,
        projectNumber: currentActiveProject?.projectNumber,
        subtitle: chosenVideoName,
        mode: "photos-text",
        videoUrl: result.videoUrl,
        webmUrl: result.webmUrl,
        duration: result.duration,
        subtitles: {
          enabled: subtitlesEnabled,
          color: subtitleColor,
          boxColor: subtitleBoxColor,
        },
        backgroundMusicTrack,
        photoStoryData: {
          photoItems,
          secondsPerPhoto,
          enableVoice,
          enableBackgroundMusic,
          aspectRatio,
          voiceGender,
          voiceId,
          voicePitch,
          voiceMood,
          voiceSlots,
          transitionType,
          photoNarrationMode: photoNarrationMode || "per-photo",
          unifiedText: unifiedVideoText,
          customAudioSlice: customAudioSlice || undefined,
        },
      });

      setCurrentActiveProject(saved);
      onProjectUpdated?.(saved);

      // Confetti celebration (safely guarded)
      try {
        confetti({
          particleCount: 110,
          spread: 85,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      // Advance directly to Step 9 (Vídeo Pronto & Últimos Projetos)
      setCurrentStep(9);
      window.scrollTo({ top: 200, behavior: "smooth" });
    } catch (err: any) {
      setErrorMsg("Erro ao transformar fotos em vídeo: " + err.message);
    } finally {
      setIsRenderingVideo(false);
      setRenderProgress(null);
    }
  };

  // Load project for editing
  const handleInternalLoadProject = (project: SavedProject) => {
    if (project.mode === "photos-text") {
      setCurrentActiveProject(project);
      if (project.photoStoryData) {
        if (project.photoStoryData.photoItems && project.photoStoryData.photoItems.length > 0) {
          setPhotoItems(project.photoStoryData.photoItems);
        }
        if (project.photoStoryData.secondsPerPhoto) {
          setSecondsPerPhoto(project.photoStoryData.secondsPerPhoto);
        }
        if (project.photoStoryData.enableVoice !== undefined) {
          setEnableVoice(project.photoStoryData.enableVoice);
        }
        if (project.photoStoryData.enableBackgroundMusic !== undefined) {
          setEnableBackgroundMusic(project.photoStoryData.enableBackgroundMusic);
        }
        if (project.photoStoryData.aspectRatio) {
          setAspectRatio(project.photoStoryData.aspectRatio);
        }
        if (project.photoStoryData.voiceSlots) {
          setVoiceSlots(project.photoStoryData.voiceSlots);
        }
        if (project.photoStoryData.voiceGender) {
          setVoiceGender(project.photoStoryData.voiceGender);
        }
        if (project.photoStoryData.voiceId) {
          setVoiceId(project.photoStoryData.voiceId);
        }
        if (project.photoStoryData.voicePitch) {
          setVoicePitch(project.photoStoryData.voicePitch);
        }
        if (project.photoStoryData.voiceMood) {
          setVoiceMood(project.photoStoryData.voiceMood);
        }
        if (project.photoStoryData.transitionType) {
          setTransitionType(project.photoStoryData.transitionType);
        }
        if (project.photoStoryData.photoNarrationMode) {
          setPhotoNarrationMode(project.photoStoryData.photoNarrationMode);
        }
        if (project.photoStoryData.unifiedText) {
          setUnifiedVideoText(project.photoStoryData.unifiedText);
        }
        if (project.photoStoryData.customAudioSlice) {
          setCustomAudioSlice(project.photoStoryData.customAudioSlice);
        }
      }
      if (project.subtitles) {
        setSubtitlesEnabled(project.subtitles.enabled);
        setSubtitleColor(project.subtitles.color);
      }
      if (project.backgroundMusicTrack) {
        setBackgroundMusicTrack(project.backgroundMusicTrack);
      }
      if (isPlayableVideoUrl(project.videoUrl)) {
        setGeneratedVideoUrl(project.videoUrl);
        setGeneratedWebmUrl(isPlayableVideoUrl(project.webmUrl) ? project.webmUrl || null : null);
        setVideoDuration(project.duration || 0);
      } else {
        setGeneratedVideoUrl(null);
        setGeneratedWebmUrl(null);
        setVideoDuration(0);
      }
      setSuccessMsg(
        `Projeto "${project.name}" carregado com sucesso! Os campos foram preenchidos para você editar e gerar um novo vídeo mantendo o mesmo nome.`
      );
      // Go to script & gallery step
      setCurrentStep(4);
      window.scrollTo({ top: 180, behavior: "smooth" });
    } else {
      onLoadProject?.(project);
    }
  };

  const handleDeleteProject = (id: string) => {
    deleteProject(id);
    if (currentActiveProject?.id === id) {
      setCurrentActiveProject(null);
    }
    onDeleteProject?.(id);
  };

  const handleDownloadMp4 = () => {
    if (!generatedVideoUrl) return;
    const a = document.createElement("a");
    a.href = generatedVideoUrl;
    a.download = `${(currentActiveProject?.name || "video_fotos_e_textos").toLowerCase().replace(/\s+/g, "_")}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadWebm = () => {
    const url = generatedWebmUrl || generatedVideoUrl;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(currentActiveProject?.name || "video_fotos_e_textos").toLowerCase().replace(/\s+/g, "_")}_whatsapp.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadWord = () => {
    if (!generatedWordUrl) return;
    const a = document.createElement("a");
    a.href = generatedWordUrl;
    a.download = generatedWordFileName || "roteiro_narracao_fotos.docx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hidden Inputs for Camera and File Picker */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => handleFilesSelected(e.target.files, "full-sort")}
        className="hidden"
      />
      <input
        ref={addTopFileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => handleFilesSelected(e.target.files, "prepend-sorted")}
        className="hidden"
      />

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-sky-100 border border-sky-300 text-sky-950 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-sky-700 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUADRO 1: SELECIONAR OU CAPTURAR FOTOS                                    */}
      {/* Opções claras: "Usar Câmera" e "Carregar do Dispositivo"                 */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
          <StepHeader
            stepNumber={1}
            totalSteps={8}
            stepTitle="Selecionar ou Capturar Fotos"
            onBack={onBackToModeSelection}
            backLabel="Início"
            onNext={() => setCurrentStep(2)}
            isNextDisabled={photoItems.length === 0}
            nextLabel="Seguir"
          />

          <div className="text-center max-w-xl mx-auto space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-sky-950">
              Como deseja adicionar as fotos?
            </h3>
            <p className="text-xs sm:text-sm text-sky-800">
              Tire fotos na hora com a câmera do celular ou selecione fotos já salvas na galeria do seu dispositivo.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-5 max-w-3xl mx-auto pt-2">
            {/* Opção 1: Usar Câmera */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="group p-3.5 sm:p-6 rounded-2xl border-2 border-sky-300 hover:border-sky-500 bg-gradient-to-b from-white to-sky-50/70 hover:to-sky-100/60 shadow-lg shadow-sky-900/5 transition-all cursor-pointer text-left flex flex-col justify-between space-y-3 sm:space-y-4 hover:scale-[1.02]"
            >
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-sky-600 group-hover:bg-sky-700 text-white flex items-center justify-center shadow-md shadow-sky-600/30 transition-transform group-hover:scale-110">
                <Camera className="w-5 h-5 sm:w-7 sm:h-7" />
              </div>
              <div className="space-y-1 sm:space-y-1.5">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <h4 className="text-xs sm:text-base font-black text-sky-950">Usar Câmera</h4>
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 sm:px-2 py-0.5 rounded bg-sky-200 text-sky-950">
                    Ao Vivo
                  </span>
                </div>
                <p className="hidden sm:block text-xs text-sky-800 leading-relaxed">
                  Abre a câmera do celular ou webcam para tirar fotos e adicionar imediatamente ao seu vídeo.
                </p>
              </div>
            </button>

            {/* Opção 2: Carregar do Dispositivo */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group p-3.5 sm:p-6 rounded-2xl border-2 border-sky-300 hover:border-sky-500 bg-gradient-to-b from-white to-sky-50/70 hover:to-sky-100/60 shadow-lg shadow-sky-900/5 transition-all cursor-pointer text-left flex flex-col justify-between space-y-3 sm:space-y-4 hover:scale-[1.02]"
            >
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-sky-100 text-sky-800 group-hover:bg-sky-200 border border-sky-300 flex items-center justify-center shadow-md transition-transform group-hover:scale-110">
                <Upload className="w-5 h-5 sm:w-7 sm:h-7 text-sky-700" />
              </div>
              <div className="space-y-1 sm:space-y-1.5">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <h4 className="text-xs sm:text-base font-black text-sky-950">Carregar do Dispositivo</h4>
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 sm:px-2 py-0.5 rounded bg-sky-200 text-sky-950">
                    Galeria
                  </span>
                </div>
                <p className="hidden sm:block text-xs text-sky-800 leading-relaxed">
                  Navegue nos arquivos do seu aparelho para selecionar múltiplas fotos em JPG, PNG ou WEBP.
                </p>
              </div>
            </button>
          </div>

          {/* Preview of loaded photos */}
          {photoItems.length > 0 && (
            <div className="pt-4 border-t border-sky-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-sky-950 uppercase tracking-wide">
                  Fotos já adicionadas ({photoItems.length})
                </span>
                <span className="text-xs text-sky-700 font-medium">
                  Clique em &quot;Seguir&quot; no canto superior para o próximo quadro
                </span>
              </div>
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {photoItems.map((item) => (
                  <div
                    key={item.id}
                    className="shrink-0 w-24 h-16 rounded-xl overflow-hidden border-2 border-sky-300 relative shadow-xs bg-slate-900 flex items-center justify-center"
                  >
                    {item.photo?.dataUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.photo.dataUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-sky-400" />
                    )}
                    <span className="absolute bottom-0 inset-x-0 bg-sky-950/80 text-[9px] text-white text-center truncate px-1">
                      #{item.order}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <StepNavigationFooter
            stepNumber={1}
            totalSteps={8}
            onBack={onBackToModeSelection}
            backLabel="Início"
            onNext={() => setCurrentStep(2)}
            isNextDisabled={photoItems.length === 0}
            nextLabel="Seguir"
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* QUADRO 2: MODO DE NARRAÇÃO & TRILHA SONORA                                */}
      {/* Nenhuma opção selecionada no início. Ao clicar, avança ao próximo quadro  */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
          <StepHeader
            stepNumber={2}
            totalSteps={8}
            stepTitle="Modo de Narração & Trilha Sonora do Vídeo"
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(photoNarrationMode === "custom-audio" ? 4 : 3)}
            isNextDisabled={photoNarrationMode === null}
            nextLabel="Seguir"
          />

          <div className="text-center max-w-xl mx-auto space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-sky-950">
              Como deseja narrar o seu vídeo?
            </h3>
            <p className="text-xs sm:text-sm text-sky-800">
              Nenhuma opção está pré-selecionada. Clique na opção desejada para avançar automaticamente ao próximo passo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto pt-2">
            {/* Opção 1: Um texto para cada foto */}
            <button
              type="button"
              onClick={() => handleSelectNarrationMode("per-photo")}
              className={`p-4 sm:p-6 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 sm:space-y-4 shadow-lg shadow-sky-900/5 hover:scale-[1.02] ${
                photoNarrationMode === "per-photo"
                  ? "bg-sky-700 text-white border-sky-800 ring-4 ring-sky-400/40 shadow-xl"
                  : "bg-gradient-to-b from-white to-sky-50/70 border-sky-300 hover:border-sky-400"
              }`}
            >
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold shadow-md ${
                  photoNarrationMode === "per-photo"
                    ? "bg-white text-sky-800"
                    : "bg-sky-600 text-white shadow-sky-600/30"
                }`}
              >
                <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-sm sm:text-base font-black ${
                      photoNarrationMode === "per-photo" ? "text-white" : "text-sky-950"
                    }`}
                  >
                    Um texto para cada foto
                  </h4>
                  {photoNarrationMode === "per-photo" && (
                    <Check className="w-5 h-5 text-white" />
                  )}
                </div>
                <p
                  className={`hidden sm:block text-xs leading-relaxed ${
                    photoNarrationMode === "per-photo" ? "text-sky-100" : "text-sky-800"
                  }`}
                >
                  Cada foto exibida terá sua própria caixa de texto e uma narração vocal dedicada e personalizada.
                </p>
              </div>
              <span
                className={`hidden sm:block text-xs font-black ${
                  photoNarrationMode === "per-photo" ? "text-sky-200" : "text-sky-700"
                }`}
              >
                Selecionar & Avançar →
              </span>
            </button>

            {/* Opção 2: Um texto para o video */}
            <button
              type="button"
              onClick={() => handleSelectNarrationMode("single-text")}
              className={`p-4 sm:p-6 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 sm:space-y-4 shadow-lg shadow-sky-900/5 hover:scale-[1.02] ${
                photoNarrationMode === "single-text"
                  ? "bg-sky-700 text-white border-sky-800 ring-4 ring-sky-400/40 shadow-xl"
                  : "bg-gradient-to-b from-white to-sky-50/70 border-sky-300 hover:border-sky-400"
              }`}
            >
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold shadow-md ${
                  photoNarrationMode === "single-text"
                    ? "bg-white text-sky-800"
                    : "bg-sky-600 text-white shadow-sky-600/30"
                }`}
              >
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-sm sm:text-base font-black ${
                      photoNarrationMode === "single-text" ? "text-white" : "text-sky-950"
                    }`}
                  >
                    Um texto para o video
                  </h4>
                  {photoNarrationMode === "single-text" && (
                    <Check className="w-5 h-5 text-white" />
                  )}
                </div>
                <p
                  className={`hidden sm:block text-xs leading-relaxed ${
                    photoNarrationMode === "single-text" ? "text-sky-100" : "text-sky-800"
                  }`}
                >
                  Um único texto corrido narrado com voz IA enquanto todas as fotos são apresentadas em sequência.
                </p>
              </div>
              <span
                className={`hidden sm:block text-xs font-black ${
                  photoNarrationMode === "single-text" ? "text-sky-200" : "text-sky-700"
                }`}
              >
                Selecionar & Avançar →
              </span>
            </button>

            {/* Opção 3: Carregar um audio para o Video */}
            <button
              type="button"
              onClick={() => handleSelectNarrationMode("custom-audio")}
              className={`p-4 sm:p-6 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 sm:space-y-4 shadow-lg shadow-sky-900/5 hover:scale-[1.02] ${
                photoNarrationMode === "custom-audio"
                  ? "bg-sky-700 text-white border-sky-800 ring-4 ring-sky-400/40 shadow-xl"
                  : "bg-gradient-to-b from-white to-sky-50/70 border-sky-300 hover:border-sky-400"
              }`}
            >
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold shadow-md ${
                  photoNarrationMode === "custom-audio"
                    ? "bg-white text-sky-800"
                    : "bg-sky-600 text-white shadow-sky-600/30"
                }`}
              >
                <FileAudio className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-sm sm:text-base font-black ${
                      photoNarrationMode === "custom-audio" ? "text-white" : "text-sky-950"
                    }`}
                  >
                    Carregar um audio para o Video
                  </h4>
                  {photoNarrationMode === "custom-audio" && (
                    <Check className="w-5 h-5 text-white" />
                  )}
                </div>
                <p
                  className={`hidden sm:block text-xs leading-relaxed ${
                    photoNarrationMode === "custom-audio" ? "text-sky-100" : "text-sky-800"
                  }`}
                >
                  Suba seu arquivo de áudio (MP3/WAV), selecione o trecho e divida a duração pelas fotos automaticamente.
                </p>
              </div>
              <span
                className={`hidden sm:block text-xs font-black ${
                  photoNarrationMode === "custom-audio" ? "text-sky-200" : "text-sky-700"
                }`}
              >
                Carregar Áudio & Avançar →
              </span>
            </button>
          </div>

          <StepNavigationFooter
            stepNumber={2}
            totalSteps={8}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(photoNarrationMode === "custom-audio" ? 4 : 3)}
            isNextDisabled={photoNarrationMode === null}
            nextLabel="Seguir"
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* QUADRO 3: NARRAÇÃO VOCAL COM IA                                           */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
          <StepHeader
            stepNumber={3}
            totalSteps={8}
            stepTitle="Narração Vocal com IA"
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
            nextLabel="Seguir"
          />

          {photoNarrationMode === "custom-audio" ? (
            <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-6 text-center space-y-2">
              <p className="text-sm font-bold text-sky-950">
                Trilha de Áudio Própria Selecionada
              </p>
              <p className="text-xs text-sky-800">
                Você escolheu carregar um arquivo de áudio do seu dispositivo. Clique em &quot;Seguir&quot; para selecionar o trecho de áudio no próximo passo.
              </p>
            </div>
          ) : (
            <VoiceSlotsSelector
              voiceSlots={voiceSlots}
              onSaveSlot={handleSaveVoiceSlot}
              enableVoice={enableVoice}
              onEnableVoiceChange={setEnableVoice}
            />
          )}

          <StepNavigationFooter
            stepNumber={3}
            totalSteps={8}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
            nextLabel="Seguir"
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* QUADRO 4: ROTEIRO DE NARRAÇÃO & ORDEM DAS FOTOS                           */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
          <StepHeader
            stepNumber={4}
            totalSteps={8}
            stepTitle="Roteiro de Narração e Ordem das Fotos"
            onBack={() => setCurrentStep(photoNarrationMode === "custom-audio" ? 2 : 3)}
            onNext={() => setCurrentStep(5)}
            isNextDisabled={photoItems.length === 0}
            nextLabel="Seguir"
          />

          {/* Conditional A: Audio Trimmer when custom-audio was chosen */}
          {photoNarrationMode === "custom-audio" && (
            <div className="space-y-4">
              <AudioTrimmer
                totalPhotosCount={photoItems.length}
                audioSlice={customAudioSlice}
                onAudioSliceChange={setCustomAudioSlice}
                triggerPickerOnMount={triggerAudioPickerOnMount}
              />
            </div>
          )}

          {/* Conditional B: Single Text Box when single-text was chosen */}
          {photoNarrationMode === "single-text" && (
            <div className="bg-sky-50/70 border-2 border-sky-300 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-sky-200">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-sky-200 text-sky-800">
                    <FileText className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-extrabold text-sky-950">
                      Texto Único de Narração para o Vídeo
                    </h4>
                    <p className="text-[11px] text-sky-800">
                      Este texto será narrado pela voz com IA durante a passagem de todas as fotos
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isGeneratingUnifiedNarration}
                    onClick={handleGenerateUnifiedNarration}
                    className="px-3 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-950 border border-sky-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isGeneratingUnifiedNarration ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                        <span>Gerando...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5 text-sky-600" />
                        <span>Gerar com IA</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleTogglePreviewUnifiedSpeech}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                      activeUnifiedSpeech
                        ? "bg-sky-600 text-white border-sky-500"
                        : "bg-white hover:bg-sky-100 text-sky-950 border-sky-300"
                    }`}
                  >
                    {activeUnifiedSpeech ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Parar Áudio</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-sky-600" />
                        <span>Ouvir Locução</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <textarea
                rows={4}
                value={unifiedVideoText}
                onChange={(e) => setUnifiedVideoText(e.target.value)}
                placeholder="Digite o texto completo que será narrado no vídeo enquanto as fotos são exibidas..."
                className="w-full bg-white border border-sky-300 focus:border-sky-600 rounded-xl p-3 text-xs sm:text-sm text-sky-950 placeholder:text-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500 leading-relaxed resize-y font-sans"
              />
            </div>
          )}

          {/* Conditional C: Per-Photo Narration List (60% compact thumbnails) */}
          {photoNarrationMode === "per-photo" && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between pb-2 flex-wrap gap-2">
                <span className="text-xs font-bold text-sky-950 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-600" />
                  Fotos, Ordem e Narração Individual ({photoItems.length})
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => addTopFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white border border-sky-500 text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    title="Adicionar uma ou mais fotos no topo em ordem alfabética"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWordModalError(null);
                      setIsAddTextModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-950 border border-sky-300 text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    title="Baixar modelo de Word ou carregar textos do Word para as fotos"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-700" />
                    <span>Adicionar Texto</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllPhotos}
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-900 border border-red-300 text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    title="Excluir todas as fotos carregadas"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Excluir Fotos</span>
                  </button>
                </div>
              </div>

              {/* Avisos após carregar arquivo Word (fotos sem texto ou textos extras sem foto) */}
              {wordImportAlerts &&
                (wordImportAlerts.missingPhotos.length > 0 ||
                  wordImportAlerts.extraTexts.length > 0) && (
                  <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs space-y-2 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1 font-bold">
                          {wordImportAlerts.missingPhotos.length > 0 && (
                            <p>
                              As seguintes fotos ficaram sem texto:{" "}
                              <span className="font-black text-amber-900">
                                {wordImportAlerts.missingPhotos
                                  .map((n) => `Foto ${n}`)
                                  .join(", ")}
                              </span>
                              .
                            </p>
                          )}
                          {wordImportAlerts.extraTexts.length > 0 && (
                            <p>
                              Não foram encontradas fotos com a numeração referente aos seguintes textos do arquivo Word:{" "}
                              <span className="font-black text-amber-900">
                                {wordImportAlerts.extraTexts
                                  .map((n) => `FOTO ${n}`)
                                  .join(", ")}
                              </span>
                              .
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWordImportAlerts(null)}
                        className="p-1 rounded-lg hover:bg-amber-200/60 text-amber-800 cursor-pointer shrink-0"
                        title="Fechar aviso"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

              <div className="space-y-4">
                {photoItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-white border-2 border-sky-300 hover:border-sky-400 rounded-2xl p-4 transition-all shadow-xs flex flex-col md:flex-row gap-4 items-stretch"
                  >
                    {/* Nome da foto carregada no canto superior direito (Mobile) */}
                    <div className="flex md:hidden items-center justify-end">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-[11px] font-bold text-sky-900 max-w-full truncate"
                        title={item.photo?.name || item.title}
                      >
                        <ImageIcon className="w-3 h-3 text-sky-600 shrink-0" />
                        <span className="truncate">{item.photo?.name || item.title}</span>
                      </span>
                    </div>

                    {/* Coluna da Foto: Botões Topo, Fundo, Subir, Descer, Lixeira + Numeração ACIMA da foto */}
                    <div className="shrink-0 w-full md:w-64 self-stretch flex flex-col justify-between gap-2.5">
                      {/* Linha de botões de Ação ACIMA da foto */}
                      <div className="flex items-center justify-between gap-1.5 flex-wrap pb-1.5 border-b border-sky-200">
                        {/* Numeração da foto à frente do botão Topo: apenas o número sem '#' e sem 'Foto' */}
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-lg bg-sky-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                            {item.order}
                          </span>

                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveToTop(index)}
                            className="px-2 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-950 border border-sky-300 text-[11px] font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                            title="Mover foto para o Topo (primeira posição)"
                          >
                            Topo
                          </button>

                          <button
                            type="button"
                            disabled={index === photoItems.length - 1}
                            onClick={() => handleMoveToBottom(index)}
                            className="px-2 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-950 border border-sky-300 text-[11px] font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                            title="Mover foto para o Fundo (última posição)"
                          >
                            Fundo
                          </button>
                        </div>

                        {/* Botões Subir e Descer (apenas setas, igual na opção um texto para todas as fotos) + Lixeira */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveUp(index)}
                            className="p-1 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 disabled:opacity-30 cursor-pointer shadow-2xs"
                            title="Subir posição"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={index === photoItems.length - 1}
                            onClick={() => handleMoveDown(index)}
                            className="p-1 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 disabled:opacity-30 cursor-pointer shadow-2xs"
                            title="Descer posição"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(item.id)}
                            className="p-1 rounded-md bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-sky-200 hover:border-red-300 transition-colors cursor-pointer shadow-2xs"
                            title="Excluir foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Foto clicável em formato widescreen (abre janela ampliada 3x com campo de texto e Salvar) */}
                      <button
                        type="button"
                        onClick={() => setZoomModalItem(item)}
                        className="aspect-video w-full rounded-xl overflow-hidden border-2 border-sky-300 hover:border-sky-500 bg-slate-900 relative shadow-inner flex items-center justify-center cursor-pointer transition-all hover:ring-2 hover:ring-sky-400/50 group"
                        title="Clique para ampliar a foto e preencher o texto de narração"
                      >
                        {item.photo?.dataUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.photo.dataUrl}
                            alt={item.photo?.name || `Foto ${item.order}`}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                          />
                        ) : (
                          <ImageIcon className="w-7 h-7 text-sky-400" />
                        )}
                      </button>
                    </div>

                    {/* Lado direito: Toolbar superior com Exibir por + Animação + Ouvir + Nome da foto no canto superior direito */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch space-y-2">
                      {/* Top bar da coluna direita: Exibir por + Botão Animação ao lado direito + Ouvir Narração + Nome da foto */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-sky-200">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Campo com "Exibir por:" individual (desabilitado se houver texto preenchido) */}
                          {Boolean(item.narration && item.narration.trim().length > 0) ? (
                            <div
                              className="flex items-center gap-1.5 bg-sky-100/90 px-2.5 py-1 rounded-lg border border-sky-300 shadow-2xs opacity-80"
                              title="Desabilitado: O tempo desta foto é definido automaticamente pela duração do áudio narrado + 1s extra"
                            >
                              <label className="text-[10px] font-extrabold uppercase text-sky-800 whitespace-nowrap">
                                Exibir por:
                              </label>
                              <input
                                type="text"
                                disabled
                                value="Áudio + 1s"
                                className="w-20 bg-sky-200/60 border border-sky-300 rounded px-1.5 py-0.5 text-[11px] text-sky-900 font-black text-center cursor-not-allowed"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-300 shadow-2xs">
                              <label className="text-[10px] font-extrabold uppercase text-sky-950 whitespace-nowrap">
                                Exibir por:
                              </label>
                              <input
                                type="number"
                                min={2}
                                max={60}
                                step={0.5}
                                value={item.customDuration ?? secondsPerPhoto}
                                onChange={(e) =>
                                  handleUpdateCustomDuration(item.id, parseFloat(e.target.value) || 2)
                                }
                                className="w-14 bg-white border border-sky-300 rounded px-1.5 py-0.5 text-xs text-sky-950 font-black text-center focus:outline-none focus:border-sky-600"
                              />
                              <span className="text-[10px] font-bold text-sky-700">seg</span>
                            </div>
                          )}

                          {/* Botão Animação ao lado direito do botão Exibir por */}
                          <button
                            type="button"
                            onClick={() => setAnimationModalItem(item)}
                            className={`py-1 px-2.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                              item.animationText && item.animationText.trim().length > 0
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 shadow-emerald-600/30 ring-1 ring-emerald-400/40"
                                : "bg-white hover:bg-sky-50 text-sky-950 border border-sky-300 hover:border-sky-400"
                            }`}
                            title="Configurar animação e movimentos da foto"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Animação</span>
                            {item.animationText && item.animationText.trim().length > 0 && (
                              <span className="text-[9px] bg-emerald-700 px-1 py-0.2 rounded text-emerald-100 font-extrabold">✓</span>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 ml-auto flex-wrap">
                          {item.narration && item.narration.trim().length > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handlePreviewSpeech(item.id, item.narration, item.voiceSlotId)
                                }
                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                                  activeSpeechId === item.id
                                    ? "bg-sky-600 text-white border-sky-500"
                                    : "bg-white hover:bg-sky-100 text-sky-950 border-sky-300"
                                }`}
                              >
                                {activeSpeechId === item.id ? (
                                  <VolumeX className="w-3.5 h-3.5" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 text-sky-600" />
                                )}
                                <span>Ouvir</span>
                              </button>

                              {/* Botão para selecionar a voz (VOZ 1 pré-selecionada) que narrará esta foto no vídeo */}
                              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-950 shadow-2xs transition-colors">
                                <Mic className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                <select
                                  value={item.voiceSlotId || "voz1"}
                                  onChange={(e) =>
                                    handleUpdateVoiceSlot(item.id, e.target.value as VoiceSlotId)
                                  }
                                  aria-label={`Selecionar voz da Foto ${item.order}`}
                                  title="Selecione qual voz irá narrar esta foto no vídeo"
                                  className="bg-transparent text-[11px] font-black text-sky-950 focus:outline-none cursor-pointer"
                                >
                                  {VOICE_SLOT_IDS.map((slotId) => {
                                    const slot = voiceSlots[slotId];
                                    const persona = getVoicePersona(slot.gender, slot.voiceId);
                                    return (
                                      <option key={slotId} value={slotId}>
                                        {slot.label} ({persona.name})
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            </>
                          )}

                          {/* Nome da foto carregada no canto superior direito do quadrante (Desktop) */}
                          <span
                            className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 border border-sky-200 text-[11px] font-bold text-sky-900 max-w-[180px] lg:max-w-[240px]"
                            title={item.photo?.name || item.title}
                          >
                            <ImageIcon className="w-3 h-3 text-sky-600 shrink-0" />
                            <span className="truncate">{item.photo?.name || item.title}</span>
                          </span>
                        </div>
                      </div>

                      {/* Campo de preenchimento do texto ocupando a altura correspondente à foto */}
                      <div className="flex-1 flex flex-col min-h-0 space-y-1">
                        <label className="text-[10px] font-extrabold uppercase tracking-wide text-sky-950 shrink-0">
                          Texto de Narração da Foto (Opcional)
                        </label>
                        <textarea
                          value={item.narration}
                          onChange={(e) => handleUpdateNarration(item.id, e.target.value)}
                          placeholder="Digite o texto que será narrado no vídeo durante a exibição desta foto (opcional, pode ficar vazio)..."
                          className="w-full flex-1 min-h-[96px] bg-sky-50/50 border border-sky-300 focus:border-sky-600 rounded-xl p-2.5 text-xs text-sky-950 placeholder:text-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500 leading-relaxed resize-none font-sans shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conditional D: Photo grid when single-text or custom-audio is chosen (1, 2, 3, 4 or 5 photos per row) */}
          {photoNarrationMode !== "per-photo" && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between pb-2 flex-wrap gap-2">
                <span className="text-xs font-bold text-sky-950 uppercase tracking-wider flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-sky-600" />
                  Galeria de Fotos do Vídeo ({photoItems.length})
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Seletor de fotos por linha (1, 2, 3, 4 ou 5) ao lado esquerdo de Excluir Fotos */}
                  <div className="flex items-center gap-1 bg-sky-100/90 border border-sky-300 rounded-xl px-2 py-1 shadow-2xs">
                    <span className="text-[10px] font-black text-sky-950 pr-0.5 hidden sm:inline">Fotos por linha:</span>
                    {([1, 2, 3, 4, 5] as const).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setGalleryColumns(num)}
                        className={`w-6 h-6 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                          galleryColumns === num
                            ? "bg-sky-600 text-white shadow-xs scale-105"
                            : "bg-white hover:bg-sky-200 text-sky-900 border border-sky-200"
                        }`}
                        title={`Exibir ${num} foto${num > 1 ? "s" : ""} por linha`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addTopFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white border border-sky-500 text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    title="Adicionar uma ou mais fotos no topo em ordem alfabética"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAllPhotos}
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-900 border border-red-300 text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    title="Excluir todas as fotos carregadas"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Excluir Fotos</span>
                  </button>
                </div>
              </div>

              <div className={getGalleryGridClass(galleryColumns)}>
                {photoItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-white border-2 border-sky-200 hover:border-sky-400 rounded-2xl p-3 space-y-2.5 transition-all shadow-xs group"
                  >
                    {/* Header of Card with Topo, Fundo, Subir, Descer, Tempo individual e Lixeira */}
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-lg bg-sky-600 text-white font-black text-[11px]">
                          #{item.order}
                        </span>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveToTop(index)}
                          className="px-1.5 py-0.5 rounded bg-sky-100 hover:bg-sky-200 text-sky-950 border border-sky-300 text-[10px] font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                          title="Mover foto para o topo (primeira foto)"
                        >
                          Topo
                        </button>
                        <button
                          type="button"
                          disabled={index === photoItems.length - 1}
                          onClick={() => handleMoveToBottom(index)}
                          className="px-1.5 py-0.5 rounded bg-sky-100 hover:bg-sky-200 text-sky-950 border border-sky-300 text-[10px] font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                          title="Mover foto para o fundo (última foto)"
                        >
                          Fundo
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveUp(index)}
                          className="p-1 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 disabled:opacity-30 cursor-pointer"
                          title="Subir posição"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === photoItems.length - 1}
                          onClick={() => handleMoveDown(index)}
                          className="p-1 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 disabled:opacity-30 cursor-pointer"
                          title="Descer posição"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Campo com o tempo de exibição de cada foto ao lado do botão de lixeira */}
                        <div
                          className="flex items-center gap-0.5 bg-sky-50 border border-sky-300 rounded-lg px-1.5 py-0.5"
                          title="Tempo de exibição individual da foto"
                        >
                          <Clock className="w-3 h-3 text-sky-600 shrink-0" />
                          <input
                            type="number"
                            min={1}
                            max={60}
                            step={0.5}
                            value={item.customDuration ?? secondsPerPhoto}
                            onChange={(e) =>
                              handleUpdateCustomDuration(item.id, parseFloat(e.target.value) || 1)
                            }
                            className="w-10 bg-white border border-sky-300 rounded px-1 text-[11px] text-sky-950 font-black text-center focus:outline-none focus:border-sky-600"
                          />
                          <span className="text-[10px] font-bold text-sky-700">s</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(item.id)}
                          className="p-1 rounded-md bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-sky-200 cursor-pointer"
                          title="Excluir foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Thumbnail da foto sem nome no rodapé e sem nome abaixo */}
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-sky-200 bg-slate-900 shadow-inner flex items-center justify-center">
                      {item.photo?.dataUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.photo.dataUrl}
                          alt={`Foto ${item.order}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-sky-400" />
                      )}
                    </div>

                    {/* Botão de Animação abaixo da foto */}
                    <button
                      type="button"
                      onClick={() => setAnimationModalItem(item)}
                      className={`w-full mt-2.5 py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                        item.animationText && item.animationText.trim().length > 0
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-500 shadow-emerald-600/30 ring-2 ring-emerald-400/40"
                          : "bg-white hover:bg-sky-50 text-sky-950 border-2 border-sky-300 hover:border-sky-400"
                      }`}
                      title="Configurar animação e movimentos da foto"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Animação</span>
                      {item.animationText && item.animationText.trim().length > 0 && (
                        <span className="text-[10px] bg-emerald-700 px-1.5 py-0.5 rounded text-emerald-100 font-extrabold">✓</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <StepNavigationFooter
            stepNumber={4}
            totalSteps={8}
            onBack={() => setCurrentStep(photoNarrationMode === "custom-audio" ? 2 : 3)}
            onNext={() => setCurrentStep(5)}
            isNextDisabled={photoItems.length === 0}
            nextLabel="Seguir"
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* QUADRO 5: FUNÇÕES DE FORMATO E CONFIGURAÇÕES DO VÍDEO                     */}
      {/* ========================================================================= */}
      {currentStep === 5 && (
        <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
          <StepHeader
            stepNumber={5}
            totalSteps={8}
            stepTitle="Funções de Formato e Configurações do Vídeo"
            onBack={() => setCurrentStep(4)}
            onNext={() => setCurrentStep(6)}
            nextLabel="Seguir"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Formato de Tela */}
            <div className="bg-sky-50/70 border-2 border-sky-200 rounded-2xl p-5 space-y-3">
              <label className="text-xs font-black uppercase tracking-wide text-sky-950 block">
                Formato de Tela do Vídeo
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["16:9", "9:16", "1:1"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setAspectRatio(fmt)}
                    className={`py-3 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                      aspectRatio === fmt
                        ? "bg-sky-600 text-white border-sky-500 shadow-md"
                        : "bg-white text-sky-950 border-sky-300 hover:border-sky-400"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-sky-800">
                {aspectRatio === "16:9"
                  ? "Widescreen horizontal para YouTube, TV e computadores."
                  : aspectRatio === "9:16"
                  ? "Vertical para Stories, Reels, TikTok e Shorts."
                  : "Quadrado clássico para feed do Instagram e redes sociais."}
              </p>
            </div>

            {/* Duração por foto */}
            <div className="bg-sky-50/70 border-2 border-sky-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wide text-sky-950">
                  {photoNarrationMode === "custom-audio"
                    ? "Tempo Sincronizado ao Áudio"
                    : "Tempo Base por Foto"}
                </label>
                <span className="text-xs font-black text-sky-950 px-2.5 py-1 rounded-lg bg-white border border-sky-300">
                  {photoNarrationMode === "custom-audio"
                    ? `${(
                        ((customAudioSlice?.sliceDuration || 10) + 2.0) /
                        Math.max(1, photoItems.length)
                      ).toFixed(1)}s`
                    : hasCustomPhotoDurations
                    ? "Personalizado"
                    : `${secondsPerPhoto}s`}
                </span>
              </div>
              <input
                type="range"
                min={4}
                max={12}
                disabled={photoNarrationMode === "custom-audio" || hasCustomPhotoDurations}
                value={secondsPerPhoto}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSecondsPerPhoto(val);
                  setPhotoItems((prev) => prev.map((p) => ({ ...p, customDuration: val })));
                }}
                className="w-full accent-sky-600 cursor-pointer disabled:opacity-40"
              />
              {hasCustomPhotoDurations ? (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold flex items-center gap-2 shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Tempo de cada foto esta personalizado</span>
                </div>
              ) : (
                <p className="text-[11px] text-sky-800">
                  {photoNarrationMode === "custom-audio"
                    ? "Calculado automaticamente: (Áudio + 2s de margem) / total de fotos."
                    : "Ajuste o tempo base de permanência de cada foto na tela."}
                </p>
              )}
            </div>
          </div>

          {/* Música de Fundo */}
          <VoiceAndTransitionSettings
            section="music"
            voiceGender={voiceGender}
            onVoiceGenderChange={setVoiceGender}
            transitionType={transitionType}
            onTransitionTypeChange={setTransitionType}
            backgroundMusicTrack={backgroundMusicTrack}
            onBackgroundMusicTrackChange={setBackgroundMusicTrack}
            enableBackgroundMusic={enableBackgroundMusic && photoNarrationMode !== "custom-audio"}
            onEnableBackgroundMusicChange={setEnableBackgroundMusic}
          />

          <StepNavigationFooter
            stepNumber={5}
            totalSteps={8}
            onBack={() => setCurrentStep(4)}
            onNext={() => setCurrentStep(6)}
            nextLabel="Seguir"
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* QUADRO 6: LEGENDAS DO VÍDEO                                               */}
      {/* ========================================================================= */}
      {currentStep === 6 && (
        <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
          <StepHeader
            stepNumber={6}
            totalSteps={8}
            stepTitle="Legendas do Vídeo"
            onBack={() => setCurrentStep(5)}
            onNext={() => setCurrentStep(7)}
            nextLabel="Seguir"
          />

          <VoiceAndTransitionSettings
            section="subtitles"
            voiceGender={voiceGender}
            onVoiceGenderChange={setVoiceGender}
            transitionType={transitionType}
            onTransitionTypeChange={setTransitionType}
            subtitlesEnabled={subtitlesEnabled}
            onSubtitlesEnabledChange={setSubtitlesEnabled}
            subtitleColor={subtitleColor}
            onSubtitleColorChange={setSubtitleColor}
            subtitleBoxColor={subtitleBoxColor}
            onSubtitleBoxColorChange={setSubtitleBoxColor}
          />

          <StepNavigationFooter
            stepNumber={6}
            totalSteps={8}
            onBack={() => setCurrentStep(5)}
            onNext={() => setCurrentStep(7)}
            nextLabel="Seguir"
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* QUADRO 7: TRANSIÇÃO ENTRE AS TELAS                                        */}
      {/* ========================================================================= */}
      {currentStep === 7 && (
        <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
          <StepHeader
            stepNumber={7}
            totalSteps={8}
            stepTitle="Transição entre as Telas"
            onBack={() => setCurrentStep(6)}
            onNext={() => setCurrentStep(8)}
            nextLabel="Seguir"
          />

          <VoiceAndTransitionSettings
            section="transition"
            voiceGender={voiceGender}
            onVoiceGenderChange={setVoiceGender}
            transitionType={transitionType}
            onTransitionTypeChange={setTransitionType}
          />

          <StepNavigationFooter
            stepNumber={7}
            totalSteps={8}
            onBack={() => setCurrentStep(6)}
            onNext={() => setCurrentStep(8)}
            nextLabel="Seguir"
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* QUADRO 8: GERAR O VÍDEO (BOTÃO PARA GRAVAR O VÍDEO)                       */}
      {/* ========================================================================= */}
      {currentStep === 8 && (
        <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
          <StepHeader
            stepNumber={8}
            totalSteps={8}
            stepTitle="Validação Final & Gravação do Vídeo"
            onBack={() => setCurrentStep(7)}
            onNext={() => generatedVideoUrl && setCurrentStep(9)}
            isNextDisabled={!generatedVideoUrl}
            nextLabel="Ver Vídeo Pronto"
          />

          {/* Resumo das escolhas do usuário */}
          <div className="bg-sky-50/80 border-2 border-sky-200 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wide text-sky-950">
              Resumo do Projeto Configurado
            </h4>

            {(() => {
              // Se uma foto ou mais tiver texto e o tempo de exibição dessa foto for personalizado,
              // o campo "Tempo do Vídeo" deve ficar com o texto "Personalizado"
              const hasPhotoWithTextAndCustomDuration =
                photoItems.some(
                  (item) =>
                    Boolean(item.narration && item.narration.trim().length > 0) &&
                    item.customDuration !== undefined &&
                    item.customDuration !== secondsPerPhoto
                ) ||
                (hasCustomPhotoDurations && photoItems.some((item) => Boolean(item.narration && item.narration.trim().length > 0))) ||
                (photoNarrationMode === "single-text" && Boolean(unifiedVideoText?.trim()) && hasCustomPhotoDurations);

              const totalSec =
                photoNarrationMode === "custom-audio"
                  ? (customAudioSlice?.sliceDuration || 10) + 2.0
                  : photoItems.reduce(
                      (acc, item) => acc + (item.customDuration ?? secondsPerPhoto),
                      0
                    );
              const formattedDuration = hasPhotoWithTextAndCustomDuration
                ? "Personalizado"
                : totalSec >= 60
                ? `${Math.floor(totalSec / 60)}min ${Math.round(totalSec % 60)}s`
                : `${totalSec.toFixed(1)}s`;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-sky-200">
                    <span className="text-[10px] text-sky-700 font-bold block uppercase">Fotos</span>
                    <span className="text-sm font-black text-sky-950">{photoItems.length} imagens</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-sky-200">
                    <span className="text-[10px] text-sky-700 font-bold block uppercase">Formato</span>
                    <span className="text-sm font-black text-sky-950">{aspectRatio}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-sky-200">
                    <span className="text-[10px] text-sky-700 font-bold block uppercase">Áudio</span>
                    <span className="text-sm font-black text-sky-950 truncate block">
                      {photoNarrationMode === "custom-audio"
                        ? "Áudio do Dispositivo"
                        : photoNarrationMode === "single-text"
                        ? "Roteiro Único"
                        : "Por Foto"}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-sky-200">
                    <span className="text-[10px] text-sky-700 font-bold block uppercase">Legendas</span>
                    <span className="text-sm font-black text-sky-950">
                      {subtitlesEnabled ? "Ativadas" : "Sem Legenda"}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-sky-200">
                    <span className="text-[10px] text-sky-700 font-bold block uppercase">Tempo do Vídeo</span>
                    <span className="text-sm font-black text-sky-950">{formattedDuration}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-sky-200">
                    <span className="text-[10px] text-sky-700 font-bold block uppercase">Transição</span>
                    <span className="text-sm font-black text-sky-950 truncate block">
                      {transitionType === "none" ? "Desativada" : "Ativada"}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Render progress */}
          {isRenderingVideo && renderProgress && (
            <div className="bg-white border-2 border-sky-500 rounded-2xl p-6 shadow-2xl animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Film className="w-6 h-6 text-sky-600 animate-spin" />
                  <div>
                    <h4 className="text-sm font-bold text-sky-950">
                      Gravando Vídeo MP4 com Narração de Voz
                    </h4>
                    <p className="text-xs text-sky-800">{renderProgress.message}</p>
                  </div>
                </div>
                <span className="text-lg font-black text-sky-600">
                  {renderProgress.percentage}%
                </span>
              </div>

              <div className="w-full h-3 bg-sky-100 rounded-full overflow-hidden border border-sky-200">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${renderProgress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* BOTÃO PRINCIPAL: GERAR O VÍDEO */}
          <div className="pt-2 text-center">
            <button
              type="button"
              disabled={isRenderingVideo || photoItems.length === 0}
              onClick={handleOpenSubtitleModal}
              className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-sky-600 via-sky-500 to-blue-600 hover:from-sky-700 hover:via-sky-600 hover:to-blue-700 text-white font-black text-base sm:text-lg shadow-xl shadow-sky-500/25 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 border border-sky-400 group hover:scale-[1.01]"
            >
              {isRenderingVideo ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                  <span>Gravando e Sincronizando Vídeo...</span>
                </>
              ) : (
                <>
                  <Film className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  <span>Gravar Vídeo</span>
                </>
              )}
            </button>

            {generatedWordUrl && (
              <div className="pt-3 flex justify-center">
                <button
                  type="button"
                  onClick={handleDownloadWord}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-sky-50 text-sky-950 font-black text-xs sm:text-sm border-2 border-sky-300 flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Word (.docx)</span>
                </button>
              </div>
            )}
          </div>

          <StepNavigationFooter
            stepNumber={8}
            totalSteps={8}
            onBack={() => setCurrentStep(7)}
            onNext={() => generatedVideoUrl && setCurrentStep(9)}
            isNextDisabled={!generatedVideoUrl}
            nextLabel="Ver Vídeo Pronto"
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* QUADRO 9: VÍDEO PRONTO & ÚLTIMOS PROJETOS (COM OPÇÃO DE BAIXAR)           */}
      {/* ========================================================================= */}
      {currentStep === 9 && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-sky-200">
              <button
                type="button"
                onClick={() => setCurrentStep(8)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-sky-50 text-sky-950 font-extrabold text-xs border border-sky-300 shadow-xs cursor-pointer"
              >
                ← Voltar para Edição
              </button>

              <div className="text-center">
                <span className="text-xs font-black uppercase text-emerald-700 block">
                  Concluído com Sucesso!
                </span>
                <h3 className="text-base sm:text-lg font-black text-sky-950">
                  {currentActiveProject?.name || "Vídeo Gravado"}
                </h3>
              </div>

              <button
                type="button"
                onClick={handleStartNewVideo}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs shadow-md cursor-pointer transition-colors"
                title="Salvar projeto atual e iniciar um novo vídeo do zero"
              >
                Novo Vídeo +
              </button>
            </div>

            {/* Video Player */}
            {generatedVideoUrl && (
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden bg-black aspect-video border-2 border-sky-400 shadow-xl max-w-4xl mx-auto">
                  <video
                    src={generatedVideoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadMp4}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>MP4</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadWebm}
                    className="px-6 py-3 rounded-xl bg-white hover:bg-sky-50 text-sky-950 font-black text-sm border-2 border-sky-300 flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>WEBM</span>
                  </button>

                  {generatedWordUrl && (
                    <button
                      type="button"
                      onClick={handleDownloadWord}
                      className="px-6 py-3 rounded-xl bg-white hover:bg-sky-50 text-sky-950 font-black text-sm border-2 border-sky-300 flex items-center gap-2 shadow-xs cursor-pointer"
                      title="Baixar roteiro de narração das fotos em Word (.docx)"
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                      <span>Word (.docx)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modal for project subtitle */}
      <ProjectSubtitleModal
        isOpen={isSubtitleModalOpen}
        projectName={modalProjectName}
        initialSubtitle={modalSubtitle}
        isEditing={isEditingModal}
        onConfirm={handleConfirmSubtitle}
        onCancel={() => setIsSubtitleModalOpen(false)}
      />

      {/* Modal de Animação e Movimentos da Foto */}
      <PhotoAnimationModal
        isOpen={Boolean(animationModalItem)}
        photoOrder={animationModalItem?.order || 1}
        photoThumbnail={animationModalItem?.photo?.dataUrl}
        initialText={animationModalItem?.animationText || ""}
        onConfirm={handleSavePhotoAnimation}
        onCancel={() => setAnimationModalItem(null)}
      />

      {/* Modal de Foto Ampliada com Navegação Lateral, Salvar e Confirmar */}
      <PhotoZoomNarrationModal
        key={zoomModalItem ? "zoom-open" : "zoom-closed"}
        isOpen={Boolean(zoomModalItem)}
        items={photoItems}
        initialItemId={zoomModalItem?.id}
        onSavePhoto={(id, text) => {
          handleUpdateNarration(id, text);
        }}
        onConfirmAll={(textsById) => {
          setPhotoItems((prev) =>
            prev.map((item) =>
              Object.prototype.hasOwnProperty.call(textsById, item.id)
                ? { ...item, narration: textsById[item.id] }
                : item
            )
          );
          setZoomModalItem(null);
        }}
        onClose={() => setZoomModalItem(null)}
      />

      {/* Modal de Adicionar Texto via Word (Baixar Modelo / Carregar Texto) */}
      <AddTextWordModal
        isOpen={isAddTextModalOpen}
        isProcessing={isProcessingWordText}
        errorMessage={wordModalError}
        onDownloadTemplate={handleDownloadWordTemplate}
        onUploadWordFile={handleUploadWordTextFile}
        onClose={() => {
          setIsAddTextModalOpen(false);
          setWordModalError(null);
        }}
      />
    </div>
  );
}
