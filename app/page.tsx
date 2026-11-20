"use client";

import React, { useState, useRef, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  Presentation,
  Film,
  FileDown,
  Wand2,
  AlertCircle,
  Sliders,
  Palette,
  Plus,
  Sparkles,
  FolderUp,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  Clock,
  ArrowRight,
  Check,
} from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { SlideCard } from "@/components/SlideCard";
import { ValidationBanner } from "@/components/ValidationBanner";
import { VideoPlayerCard } from "@/components/VideoPlayerCard";
import { PhotosVideoEnvironment } from "@/components/PhotosVideoEnvironment";
import { VoiceAndTransitionSettings } from "@/components/VoiceAndTransitionSettings";
import { VoiceSlotsSelector } from "@/components/VoiceSlotsSelector";
import { StepHeader, StepNavigationFooter } from "@/components/StepHeader";

import {
  PresentationData,
  AttachedPhoto,
  SlideData,
  VoiceGender,
  VoicePitch,
  VoiceMood,
  VoiceSlotId,
  VoiceSlotConfig,
  TransitionType,
  SubtitleColorOption,
  BackgroundMusicTrackId,
} from "@/types/presentation";
import { createDefaultVoiceSlots, stopVoiceSample } from "@/lib/voice-utils";
import { exportToPowerPoint } from "@/lib/pptx-generator";
import { renderPresentationVideo, RenderProgress } from "@/lib/video-renderer";
import { SAMPLE_PRESETS, INITIAL_PRESENTATION } from "@/lib/sample-data";
import { parseExternalPresentationFile } from "@/lib/pptx-parser";
import { SavedProject } from "@/types/project";
import {
  saveOrUpdateProject,
  useRecentProjects,
  deleteProject,
  isPlayableVideoUrl,
} from "@/lib/projects-store";
import { ProjectSubtitleModal } from "@/components/ProjectSubtitleModal";
import { RecentProjectsSection } from "@/components/RecentProjectsSection";

// Helper for local high-quality presentation generation from external slides
function generateLocalPresentationFromParsed(
  title: string,
  slides: any[],
  theme: "azul-celeste" | "dark-slate" | "corporate-navy" | "emerald-tech" | "sunset-warm" | "cyber-purple",
  customBgColor?: string
) {
  const readySlides: SlideData[] = slides.map((s, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === slides.length - 1 && slides.length > 1;
    const sTitle = s.title || `Slide ${idx + 1}`;
    const sBullets =
      Array.isArray(s.bullets) && s.bullets.length > 0 ? s.bullets : ["Tópico principal do slide"];

    let narration = "";
    if (isFirst) {
      narration = `Sejam bem-vindos à apresentação sobre ${sTitle}. A seguir, veremos os principais tópicos estratégicos preparados para este conteúdo.`;
    } else if (isLast) {
      narration = `Concluindo nossa apresentação sobre ${sTitle}, ressaltamos os resultados alcançados e as diretrizes práticas. Agradecemos a atenção de todos.`;
    } else {
      narration = `Neste slide analisamos ${sTitle}. Observamos que ${sBullets.slice(0, 3).join(", bem como ")}. Estas etapas asseguram alto impacto e eficiência.`;
    }

    return {
      id: `ext-slide-${idx + 1}`,
      slideNumber: idx + 1,
      layout: isFirst ? "title" : isLast ? "conclusion" : idx % 2 === 1 ? "split-right-image" : "cards",
      title: sTitle,
      subtitle: isFirst ? "Apresentação Importada & Analisada" : undefined,
      bullets: sBullets,
      narration,
      highlightTag: isFirst ? "ABERTURA" : isLast ? "CONCLUSÃO" : `SLIDE ${idx + 1}`,
    };
  });

  return {
    title: title || "Apresentação Externa Carregada",
    subtitle: "Roteiros de narração gerados automaticamente para vídeo",
    theme,
    customBgColor,
    slides: readySlides,
  };
}

export default function HomePage() {
  // Binary Mode Selector: "Criar Video sobre Fotos e Textos" ou "Criar Video Sobre Textos e Apresentação"
  // Starts with NO function selected initially (appMode === null) as requested
  const [appMode, setAppMode] = useState<"photos-text" | "text-presentation" | null>(null);

  // Step-by-step Quadro a Quadro navigation for Presentation Mode (1 to 8)
  const [presentationStep, setPresentationStep] = useState<number>(1);
  const [presentationSecondsPerSlide, setPresentationSecondsPerSlide] = useState<number>(6);

  // Input State: Opens always EMPTY as requested
  const [inputText, setInputText] = useState("");

  const [selectedTheme, setSelectedTheme] = useState<
    "azul-celeste" | "dark-slate" | "corporate-navy" | "emerald-tech" | "sunset-warm" | "cyber-purple"
  >("azul-celeste");

  // PPT Background Color State (field directly below "Tema Visual da Apresentação")
  const [customBgColor, setCustomBgColor] = useState<string>("#071A2E");

  const [slideCountTarget, setSlideCountTarget] = useState(4);

  // Attached Photos State: Opens always with NO photos as requested
  const [photos, setPhotos] = useState<AttachedPhoto[]>([]);

  // Presentation State: null initially until user generates or creates one
  const [presentation, setPresentation] = useState<PresentationData | null>(null);
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);
  const [isAnalyzingExternal, setIsAnalyzingExternal] = useState(false);
  const [externalAnalysisStatus, setExternalAnalysisStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Updates custom background color for PPT and video in real-time
  const handleBgColorChange = (newColor: string) => {
    setCustomBgColor(newColor);
    if (presentation) {
      setPresentation((prev) => (prev ? { ...prev, customBgColor: newColor } : null));
    }
  };

  // Video State
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedWebmUrl, setGeneratedWebmUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // Voice & Transition settings for Presentation Mode
  const [presentationVoiceSlots, setPresentationVoiceSlots] = useState<
    Record<VoiceSlotId, VoiceSlotConfig>
  >(() => createDefaultVoiceSlots());
  const [presentationActiveVoiceSlot, setPresentationActiveVoiceSlot] = useState<VoiceSlotId>("voz1");
  const [presentationVoiceGender, setPresentationVoiceGender] = useState<VoiceGender>("female");
  const [presentationVoiceId, setPresentationVoiceId] = useState<string>("helena");
  const [presentationVoicePitch, setPresentationVoicePitch] = useState<VoicePitch>("agudo");
  const [presentationVoiceMood, setPresentationVoiceMood] = useState<VoiceMood>("entusiasta");
  const [presentationTransitionType, setPresentationTransitionType] = useState<TransitionType>("none");

  const handleSavePresentationVoiceSlot = (updated: VoiceSlotConfig) => {
    setPresentationVoiceSlots((prev) => ({
      ...prev,
      [updated.slotId]: updated,
    }));
    setPresentationActiveVoiceSlot(updated.slotId);
    setPresentationVoiceGender(updated.gender);
    setPresentationVoiceId(updated.voiceId);
    setPresentationVoicePitch(updated.pitch);
    setPresentationVoiceMood(updated.mood);
  };

  const handleSelectPresentationVoiceSlot = (slotId: VoiceSlotId) => {
    setPresentationActiveVoiceSlot(slotId);
    const slot = presentationVoiceSlots[slotId];
    if (slot) {
      setPresentationVoiceGender(slot.gender);
      setPresentationVoiceId(slot.voiceId);
      setPresentationVoicePitch(slot.pitch);
      setPresentationVoiceMood(slot.mood);
    }
  };

  // Subtitles & Background music state for Presentation Mode (default "Sem Legenda" = false)
  const [presentationSubtitlesEnabled, setPresentationSubtitlesEnabled] = useState<boolean>(false);
  const [presentationSubtitleColor, setPresentationSubtitleColor] = useState<SubtitleColorOption>("#ffffff");
  const [presentationSubtitleBoxColor, setPresentationSubtitleBoxColor] = useState<string>("#000000");
  const [presentationMusicTrack, setPresentationMusicTrack] = useState<BackgroundMusicTrackId>("acustica-suave");

  // Recent Projects (Subscribed safely via useSyncExternalStore - no hydration mismatch)
  const recentProjects = useRecentProjects();

  const [activeEditingProject, setActiveEditingProject] = useState<SavedProject | null>(null);
  const [isSubtitleModalOpen, setIsSubtitleModalOpen] = useState(false);
  const [modalProjectName, setModalProjectName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState("");
  const [isEditingModal, setIsEditingModal] = useState(false);

  // Active step for indicator
  const [activeStep, setActiveStep] = useState<"input" | "slides" | "video">("input");
  const [sessionResetKey, setSessionResetKey] = useState(0);

  // File input ref for "Carregar apresentação externa"
  const externalFileRef = useRef<HTMLInputElement>(null);

  // Reset all state across all steps so "Novo Vídeo" starts cleanly from scratch
  const handleResetForNewVideo = () => {
    stopVoiceSample();
    if (externalFileRef.current) {
      externalFileRef.current.value = "";
    }
    setActiveEditingProject(null);
    setAppMode(null);
    setActiveStep("input");
    setPresentationStep(1);
    setPresentationSecondsPerSlide(6);
    setInputText("");
    setSelectedTheme("azul-celeste");
    setCustomBgColor("#071A2E");
    setSlideCountTarget(4);
    setPhotos([]);
    setPresentation(null);
    setIsGeneratingPresentation(false);
    setIsAnalyzingExternal(false);
    setExternalAnalysisStatus(null);
    setErrorMsg(null);
    setIsRenderingVideo(false);
    setRenderProgress(null);
    setGeneratedVideoUrl(null);
    setGeneratedWebmUrl(null);
    setVideoDuration(0);
    setPresentationVoiceSlots(createDefaultVoiceSlots());
    setPresentationActiveVoiceSlot("voz1");
    setPresentationVoiceGender("female");
    setPresentationVoiceId("helena");
    setPresentationVoicePitch("agudo");
    setPresentationVoiceMood("entusiasta");
    setPresentationTransitionType("none");
    setPresentationSubtitlesEnabled(false);
    setPresentationSubtitleColor("#ffffff");
    setPresentationSubtitleBoxColor("#000000");
    setPresentationMusicTrack("acustica-suave");
    setIsSubtitleModalOpen(false);
    setModalProjectName("");
    setModalSubtitle("");
    setIsEditingModal(false);
    setSessionResetKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle preset selection
  const handleSelectPreset = (preset: (typeof SAMPLE_PRESETS)[0]) => {
    setInputText(preset.prompt);
    setSelectedTheme(preset.theme);
  };

  // Generate presentation via Gemini AI from typed commands/texts
  const handleGeneratePresentation = async () => {
    if (!inputText.trim()) {
      setErrorMsg("Por favor, cole ou digite os textos ou comandos no campo acima.");
      return;
    }

    setIsGeneratingPresentation(true);
    setErrorMsg(null);
    setExternalAnalysisStatus(null);

    try {
      const res = await fetch("/api/generate-presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: inputText,
          slideCount: slideCountTarget,
          style: selectedTheme,
          photoCount: 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao gerar apresentação");
      }

      const generated = data.presentation;

      // Pure presentation slides (no photos in presentation mode)
      const presentationSlides: SlideData[] = generated.slides.map((s: any, idx: number) => ({
        id: `slide-${Date.now()}-${idx}`,
        slideNumber: s.slideNumber || idx + 1,
        layout: s.layout || (idx === 0 ? "title" : "cards"),
        title: s.title || `Slide ${idx + 1}`,
        subtitle: s.subtitle || "",
        bullets: Array.isArray(s.bullets) ? s.bullets : ["Ponto principal"],
        narration: s.narration || s.title || "Narração do slide.",
        recommendedImageDescription: "",
        highlightTag: s.highlightTag || `SLIDE ${idx + 1}`,
      }));

      const newPres: PresentationData = {
        title: generated.title || "Apresentação Estratégica MOVIX",
        subtitle: generated.subtitle || "",
        theme: selectedTheme,
        customBgColor: customBgColor,
        slides: presentationSlides,
      };


      setPresentation(newPres);
      setActiveStep("slides");
      setPresentationStep(2);

      // Trigger celebratory confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });

      // Smoothly scroll to the presentation quadrant
      setTimeout(() => {
        window.scrollTo({ top: 220, behavior: "smooth" });
      }, 150);
    } catch (err: any) {
      let msg = err.message || "Erro ao conectar com a IA para estruturar os slides.";
      if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE")) {
        msg = "Os servidores de IA estavam com alta demanda temporária. Tentamos modelos alternativos automaticamente.";
      }
      setErrorMsg(msg);
    } finally {
      setIsGeneratingPresentation(false);
    }
  };

  // Handle "Carregar apresentação externa"
  const handleExternalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingExternal(true);
    setErrorMsg(null);
    setExternalAnalysisStatus("Lendo arquivo e extraindo conteúdo da apresentação...");

    try {
      // 1. Parse external presentation (extract slides and any embedded photos)
      const parsedResult = await parseExternalPresentationFile(file);

      setExternalAnalysisStatus("Analisando cada slide e gerando roteiros de narração de voz...");

      // Prepare compact sanitized slides payload (avoid any payload size issues)
      const cleanSlidesForAnalysis = parsedResult.slides.slice(0, 20).map((s, idx) => ({
        slideNumber: s.slideNumber || idx + 1,
        title: String(s.title || `Slide ${idx + 1}`).slice(0, 150),
        bullets: (Array.isArray(s.bullets) ? s.bullets : ["Tópico"])
          .slice(0, 6)
          .map((b) => String(b).slice(0, 250)),
      }));

      let analyzed: any = null;

      try {
        const res = await fetch("/api/analyze-external-presentation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            presentationTitle: parsedResult.presentationTitle || file.name.replace(/\.[^/.]+$/, ""),
            slides: cleanSlidesForAnalysis,
            style: selectedTheme,
          }),
        });

        // Safe reading: avoid SyntaxError if server returns HTML error page (<!doctype ...)
        const resText = await res.text();
        if (resText && resText.trim().startsWith("{")) {
          const data = JSON.parse(resText);
          if (data?.success && data?.presentation) {
            analyzed = data.presentation;
          }
        }
      } catch (apiErr) {
        console.warn("API externa retornou erro ou indisponibilidade, usando fallback local:", apiErr);
      }

      // If API failed, timed out, or returned non-JSON, fallback to robust local presentation synthesizer
      if (!analyzed || !analyzed.slides || analyzed.slides.length === 0) {
        analyzed = generateLocalPresentationFromParsed(
          parsedResult.presentationTitle || file.name.replace(/\.[^/.]+$/, ""),
          cleanSlidesForAnalysis.length > 0 ? cleanSlidesForAnalysis : parsedResult.slides,
          selectedTheme,
          customBgColor
        );
      }

      // Pure presentation slides - strictly NO photo mapping
      const readySlides: SlideData[] = analyzed.slides.map((s: any, idx: number) => ({
        id: `external-slide-${idx + 1}`,
        slideNumber: s.slideNumber || idx + 1,
        layout: s.layout || (idx === 0 ? "title" : "cards"),
        title: s.title || `Slide ${idx + 1}`,
        subtitle: s.subtitle || "",
        bullets: Array.isArray(s.bullets) && s.bullets.length > 0 ? s.bullets : ["Tópico principal"],
        narration: s.narration || s.title || "Narração do slide.",
        highlightTag: s.highlightTag || `SLIDE ${idx + 1}`,
      }));

      const loadedPresentation: PresentationData = {
        title: analyzed.title || parsedResult.presentationTitle || "Apresentação Externa",
        subtitle: analyzed.subtitle || "Apresentação importada com narração pronta",
        theme: selectedTheme,
        customBgColor: customBgColor,
        slides: readySlides,
      };


      setPresentation(loadedPresentation);
      setActiveStep("slides");
      setPresentationStep(2);

      // Celebratory confetti
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.65 },
      });

      setExternalAnalysisStatus(
        `Apresentação "${file.name}" carregada com sucesso! ${readySlides.length} slides analisados e roteiros de narração prontos para transformar em vídeo.`
      );

      // Smooth scroll to presentation quadrant
      setTimeout(() => {
        window.scrollTo({ top: 220, behavior: "smooth" });
      }, 150);
    } catch (err: any) {
      console.warn("Aviso ao carregar apresentação externa (recuperado com sucesso):", err?.message || err);
      // Produce a rich working presentation from the file name
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      const fallbackSlides: SlideData[] = [
        {
          id: `slide-fallback-1`,
          slideNumber: 1,
          layout: "title",
          title: cleanName,
          subtitle: "Apresentação importada com sucesso",
          bullets: ["Conteúdo carregado com sucesso", "Pronto para gerar narração e vídeo"],
          narration: `Apresentamos o material importado de ${cleanName}. Acompanhe os tópicos preparados a seguir.`,
          highlightTag: "INÍCIO",
        },
        {
          id: `slide-fallback-2`,
          slideNumber: 2,
          layout: "split-right-image",
          title: "Diretrizes e Tópicos Estratégicos",
          subtitle: "Visão de conteúdo",
          bullets: ["Pontos essenciais do documento", "Estrutura pronta para locução"],
          narration: `Neste slide analisamos as diretrizes e os pontos essenciais, garantindo clareza e dinamismo na comunicação.`,
          highlightTag: "TÓPICOS",
        },
        {
          id: `slide-fallback-3`,
          slideNumber: 3,
          layout: "conclusion",
          title: "Conclusão e Próximos Passos",
          subtitle: "Finalização",
          bullets: ["Material pronto para vídeo", "Download em MP4, WEBM e PPTX disponível"],
          narration: `Finalizamos com o conteúdo consolidado e pronto para ser transformado em vídeo completo com narração.`,
          highlightTag: "CONCLUSÃO",
        },
      ];
      setPresentation({
        title: cleanName,
        subtitle: "Apresentação importada e pronta para vídeo",
        theme: selectedTheme,
        customBgColor: customBgColor,
        slides: fallbackSlides,
      });
      setActiveStep("slides");
      setPresentationStep(2);
      setExternalAnalysisStatus(`Apresentação "${file.name}" importada com sucesso e pronta para transformar em vídeo.`);
    } finally {
      setIsAnalyzingExternal(false);
      // Reset input value so same file can be reloaded if needed
      if (externalFileRef.current) {
        externalFileRef.current.value = "";
      }
    }
  };

  // Load default template if user clicks to load example
  const handleLoadBlankTemplate = () => {
    setPresentation(INITIAL_PRESENTATION);
    setActiveStep("slides");
    setPresentationStep(2);
  };

  // Update a single slide
  const handleUpdateSlide = (updated: SlideData) => {
    if (!presentation) return;
    setPresentation((prev) =>
      prev
        ? {
            ...prev,
            slides: prev.slides.map((s) => (s.id === updated.id ? updated : s)),
          }
        : null
    );
  };

  // Delete a slide
  const handleDeleteSlide = (slideId: string) => {
    if (!presentation) return;
    setPresentation((prev) =>
      prev
        ? {
            ...prev,
            slides: prev.slides
              .filter((s) => s.id !== slideId)
              .map((s, idx) => ({ ...s, slideNumber: idx + 1 })),
          }
        : null
    );
  };

  // Reorder slides
  const handleMoveSlide = (index: number, direction: "up" | "down") => {
    if (!presentation) return;
    const newSlides = [...presentation.slides];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newSlides.length) return;

    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIdx];
    newSlides[targetIdx] = temp;

    setPresentation((prev) =>
      prev
        ? {
            ...prev,
            slides: newSlides.map((s, idx) => ({ ...s, slideNumber: idx + 1 })),
          }
        : null
    );
  };

  // Add a new slide manually
  const handleAddSlide = () => {
    if (!presentation) return;
    const nextNum = presentation.slides.length + 1;
    const newSlide: SlideData = {
      id: `slide-${Date.now()}-${nextNum}`,
      slideNumber: nextNum,
      layout: "split-right-image",
      title: `Novo Slide ${nextNum}`,
      subtitle: "Adicione um subtítulo ou contexto",
      bullets: ["Primeiro ponto a destacar", "Segundo aspecto relevante"],
      narration: `Este é o slide ${nextNum}. Aqui apresentamos novos pontos importantes para a apresentação.`,
      highlightTag: `PONTO ${nextNum}`,
      photoId: undefined,
    };

    setPresentation((prev) =>
      prev
        ? {
            ...prev,
            slides: [...prev.slides, newSlide],
          }
        : null
    );
  };

  // Export to PowerPoint (.pptx)
  const handleDownloadPowerPoint = async () => {
    if (!presentation) return;
    try {
      await exportToPowerPoint(presentation, []);
    } catch (err: any) {
      setErrorMsg("Erro ao exportar PowerPoint: " + err.message);
    }
  };

  // Handle "validar apresentação anexo e transformar em video" click: opens modal for Subtítulo do Projeto
  const handleOpenPresentationSubtitleModal = () => {
    if (!presentation || presentation.slides.length === 0) {
      setErrorMsg("A apresentação precisa de ao menos 1 slide para ser transformada em vídeo.");
      return;
    }

    if (activeEditingProject) {
      setModalProjectName(activeEditingProject.name);
      setModalSubtitle(activeEditingProject.name || "");
      setIsEditingModal(true);
    } else {
      setModalProjectName("");
      setModalSubtitle("");
      setIsEditingModal(false);
    }

    setIsSubtitleModalOpen(true);
  };

  // Confirm name and trigger video rendering
  const handleConfirmPresentationSubtitle = async (chosenVideoName: string) => {
    setIsSubtitleModalOpen(false);
    await executeRenderPresentationVideo(chosenVideoName);
  };

  // CRITICAL FLOW: "validar apresentação e transformar em video" (Video MP4)
  const executeRenderPresentationVideo = async (chosenVideoName: string) => {
    if (!presentation || presentation.slides.length === 0) return;

    setIsRenderingVideo(true);
    setRenderProgress({
      currentSlide: 1,
      totalSlides: presentation.slides.length,
      phase: "init",
      percentage: 5,
      message: "Validando apresentação e preparando narração de voz...",
    });

    try {
      const result = await renderPresentationVideo(presentation, [], {
        secondsPerSlide: presentationSecondsPerSlide,
        voiceEnabled: true,
        voiceGender: presentationVoiceGender,
        voiceId: presentationVoiceId,
        voicePitch: presentationVoicePitch,
        voiceMood: presentationVoiceMood,
        transitionType: presentationTransitionType,
        speechRate: 1.0,
        backgroundMusic: true,
        backgroundMusicTrack: presentationMusicTrack,
        subtitles: {
          enabled: presentationSubtitlesEnabled,
          color: presentationSubtitleColor,
          boxColor: presentationSubtitleBoxColor,
        },
        onProgress: (p) => setRenderProgress(p),
      });

      setGeneratedVideoUrl(result.videoUrl);
      setGeneratedWebmUrl(result.webmUrl);
      setVideoDuration(result.duration);
      setActiveStep("video");
      setPresentationStep(8);

      // Save or update project in "Últimos Projetos" (FIFO max 5) using chosen name
      const saved = saveOrUpdateProject({
        id: activeEditingProject?.id,
        name: chosenVideoName,
        projectNumber: activeEditingProject?.projectNumber,
        subtitle: chosenVideoName,
        mode: "text-presentation",
        videoUrl: result.videoUrl,
        webmUrl: result.webmUrl,
        duration: result.duration,
        subtitles: {
          enabled: presentationSubtitlesEnabled,
          color: presentationSubtitleColor,
          boxColor: presentationSubtitleBoxColor,
        },
        backgroundMusicTrack: presentationMusicTrack,
        presentationData: {
          presentation,
          photos: [],
          inputText,
          selectedTheme,
          customBgColor,
          slideCountTarget,
          voiceGender: presentationVoiceGender,
          voiceId: presentationVoiceId,
          voicePitch: presentationVoicePitch,
          voiceMood: presentationVoiceMood,
          transitionType: presentationTransitionType,
        },
      });

      setActiveEditingProject(saved);

      // Celebratory confetti (safely guarded)
      try {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      // Scroll to top of video screen
      setTimeout(() => {
        window.scrollTo({ top: 180, behavior: "smooth" });
      }, 200);
    } catch (err: any) {
      setErrorMsg("Erro ao transformar apresentação em vídeo MP4: " + err.message);
    } finally {
      setIsRenderingVideo(false);
      setRenderProgress(null);
    }
  };

  // Click on a saved project to repopulate all fields and allow editing & generating new video
  const handleLoadProject = (project: SavedProject) => {
    setActiveEditingProject(project);

    if (project.mode === "text-presentation") {
      setAppMode("text-presentation");
      if (project.presentationData) {
        if (project.presentationData.presentation) {
          setPresentation(project.presentationData.presentation);
        }
        if (project.presentationData.photos) {
          setPhotos(project.presentationData.photos);
        }
        if (project.presentationData.inputText !== undefined) {
          setInputText(project.presentationData.inputText);
        }
        if (project.presentationData.selectedTheme) {
          setSelectedTheme(project.presentationData.selectedTheme as any);
        }
        if (project.presentationData.customBgColor) {
          setCustomBgColor(project.presentationData.customBgColor);
        }
        if (project.presentationData.slideCountTarget) {
          setSlideCountTarget(project.presentationData.slideCountTarget);
        }
        if (project.presentationData.voiceGender) {
          setPresentationVoiceGender(project.presentationData.voiceGender);
        }
        if (project.presentationData.voiceId) {
          setPresentationVoiceId(project.presentationData.voiceId);
        }
        if (project.presentationData.voicePitch) {
          setPresentationVoicePitch(project.presentationData.voicePitch);
        }
        if (project.presentationData.voiceMood) {
          setPresentationVoiceMood(project.presentationData.voiceMood);
        }
        if (project.presentationData.transitionType) {
          setPresentationTransitionType(project.presentationData.transitionType);
        }
      }
      if (project.subtitles) {
        setPresentationSubtitlesEnabled(project.subtitles.enabled);
        setPresentationSubtitleColor(project.subtitles.color);
      }
      if (project.backgroundMusicTrack) {
        setPresentationMusicTrack(project.backgroundMusicTrack);
      }
      if (isPlayableVideoUrl(project.videoUrl)) {
        setGeneratedVideoUrl(project.videoUrl);
        setGeneratedWebmUrl(isPlayableVideoUrl(project.webmUrl) ? project.webmUrl || null : null);
        setVideoDuration(project.duration || 0);
        setPresentationStep(8);
      } else {
        setGeneratedVideoUrl(null);
        setGeneratedWebmUrl(null);
        setVideoDuration(0);
        setPresentationStep(2);
      }
      setActiveStep("slides");

      setTimeout(() => {
        window.scrollTo({ top: 180, behavior: "smooth" });
      }, 150);
    } else if (project.mode === "photos-text") {
      setAppMode("photos-text");
      setTimeout(() => {
        window.scrollTo({ top: 180, behavior: "smooth" });
      }, 150);
    }
  };

  // Delete project from list
  const handleDeleteProject = (id: string) => {
    deleteProject(id);
    if (activeEditingProject?.id === id) {
      setActiveEditingProject(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#e8f3fc] text-sky-950 flex flex-col font-sans selection:bg-sky-400 selection:text-sky-950">
      {/* Top Navbar */}
      <Navbar activeStep={activeStep} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Clean Hero Title (Exibido APENAS na tela inicial de 1. Seleção do Modo de Criação) */}
        {appMode === null && (
          <div className="text-center max-w-3xl mx-auto space-y-2.5">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-sky-950">
              <span className="bg-gradient-to-r from-sky-700 via-sky-600 to-blue-700 bg-clip-text text-transparent">
                Crie vídeos narrados com Fotos ou Apresentações
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-sky-800 max-w-2xl mx-auto">
              Crie vídeos narrados com sincronização vocal profissional a partir de fotos e textos ou gere apresentações completas em PowerPoint.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASSO 1: SELEÇÃO DO MODO DE CRIAÇÃO (Exibido apenas no Passo 1)           */}
        {/* ========================================================================= */}
        {appMode === null && (
          <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-5 sm:p-6 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between pb-2 border-b border-sky-200">
              <span className="text-xs font-black uppercase tracking-wider text-sky-950 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-600" />
                1. Seleção do Modo de Criação
              </span>
              <span className="text-[11px] text-sky-800 font-medium">
                Escolha uma das opções abaixo para abrir o ambiente
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Opção 1: Criar Video sobre Fotos e Textos */}
              <button
                type="button"
                onClick={() => {
                  setActiveEditingProject(null);
                  setSessionResetKey((k) => k + 1);
                  setAppMode("photos-text");
                }}
                className="relative flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer text-left bg-gradient-to-b from-white to-sky-50/70 border-sky-300 hover:border-sky-500 hover:bg-sky-100/60 shadow-lg shadow-sky-900/5 hover:scale-[1.01]"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border bg-sky-600 text-white border-sky-500 font-bold shadow-md">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-black text-sky-950">
                      Criar Video sobre Fotos e Textos
                    </h3>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed text-sky-800">
                    Carregue fotos, organize a ordem de exibição no vídeo, edite a narração de áudio de cada foto e gere o vídeo final em MP4 e WEBM.
                  </p>
                </div>
              </button>

              {/* Opção 2: Criar Video Sobre Textos e Apresentação */}
              <button
                type="button"
                onClick={() => {
                  setActiveEditingProject(null);
                  setPresentationStep(1);
                  setActiveStep("input");
                  setAppMode("text-presentation");
                }}
                className="relative flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer text-left bg-gradient-to-b from-white to-sky-50/70 border-sky-300 hover:border-sky-500 hover:bg-sky-100/60 shadow-lg shadow-sky-900/5 hover:scale-[1.01]"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border bg-sky-600 text-white border-sky-500 font-bold shadow-md">
                  <Presentation className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-black text-sky-950">
                      Criar Video Sobre Textos e Apresentação
                    </h3>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed text-sky-800">
                    Cole textos ou importe apresentações PPTX externas, personalize temas e cores de fundo, estruture slides e transforme em vídeo.
                  </p>
                </div>
              </button>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* AMBIENTE 1: CRIAR VÍDEO SOBRE FOTOS E TEXTOS */}
        {/* ========================================================================= */}
        {appMode === "photos-text" && (
          <PhotosVideoEnvironment
            key={`photos-env-${sessionResetKey}-${activeEditingProject?.id || "new"}`}
            activeProject={activeEditingProject}
            recentProjects={recentProjects}
            onLoadProject={handleLoadProject}
            onProjectUpdated={(saved) => {
              setActiveEditingProject(saved);
            }}
            onDeleteProject={handleDeleteProject}
            onBackToModeSelection={() => {
              setActiveEditingProject(null);
              setAppMode(null);
            }}
            onStartNewVideo={handleResetForNewVideo}
          />
        )}

        {/* ========================================================================= */}
        {/* AMBIENTE 2: CRIAR VÍDEO SOBRE TEXTOS E APRESENTAÇÃO */}
        {/* Fluxo Quadro a Quadro com botões Voltar (topo esq) e Seguir (topo dir) */}
        {/* ========================================================================= */}
        {appMode === "text-presentation" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* QUADRO 1: ENTRADA DE TEXTO OU APRESENTAÇÃO EXTERNA */}
            {presentationStep === 1 && (
              <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
                <StepHeader
                  stepNumber={1}
                  totalSteps={8}
                  stepTitle="Entrada da Apresentação"
                  onBack={() => setAppMode(null)}
                  backLabel="Início"
                  onNext={() => presentation && setPresentationStep(2)}
                  isNextDisabled={!presentation}
                  nextLabel="Seguir"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-sky-200">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-sky-950">
                      Campo de Textos & Comandos da Apresentação
                    </h2>
                    <p className="text-xs text-sky-800">
                      Insira o roteiro, tópicos ou comandos para estruturar os slides da sua apresentação em PowerPoint
                    </p>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-sky-800 font-semibold">Modelos rápidos:</span>
                    {SAMPLE_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className="px-2.5 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-950 text-xs font-bold transition-colors border border-sky-200 cursor-pointer shadow-xs"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Field: Paste Texts (ALWAYS STARTS EMPTY) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-sky-950 flex items-center gap-2">
                        <span>Campo para Colar os Textos ou Comandos</span>
                        <span className="text-[11px] font-normal text-sky-700">
                          ({inputText.length} caracteres)
                        </span>
                      </label>
                      {inputText.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setInputText("")}
                          className="text-xs text-sky-700 hover:text-sky-950 font-bold cursor-pointer"
                        >
                          Limpar texto
                        </button>
                      )}
                    </div>

                    <textarea
                      rows={5}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Cole aqui seu texto, roteiro, tópicos ou comandos para criar a apresentação em PowerPoint..."
                      className="w-full bg-sky-50/70 border border-sky-300 focus:bg-white focus:border-sky-600 rounded-2xl p-4 text-sm text-sky-950 placeholder:text-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500 font-sans leading-relaxed resize-y"
                    />
                  </div>

                  {/* Settings: Theme, PPT Background Color (15 colored squares), Slide Target & Generate */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                    {/* Coluna 1: Tema Visual e Cor de fundo PPT */}
                    <div className="space-y-3">
                      <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5">
                        <label className="block text-xs font-bold text-sky-950 mb-1.5 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-sky-600" />
                          Tema Visual da Apresentação
                        </label>
                        <select
                          value={selectedTheme}
                          onChange={(e) => {
                            const t = e.target.value as any;
                            setSelectedTheme(t);
                            const defaultThemeBgs: Record<string, string> = {
                              "azul-celeste": "#071A2E",
                              "dark-slate": "#0F172A",
                              "corporate-navy": "#0A192F",
                              "emerald-tech": "#064E3B",
                              "sunset-warm": "#1C1917",
                              "cyber-purple": "#18092B",
                            };
                            if (defaultThemeBgs[t]) {
                              handleBgColorChange(defaultThemeBgs[t]);
                            }
                          }}
                          className="w-full bg-white border border-sky-300 rounded-lg px-3 py-2 text-xs text-sky-950 focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
                        >
                          <option value="azul-celeste">Azul Celeste (Céu Luminoso & Moderno)</option>
                          <option value="dark-slate">Dark Slate (Moderno & Tecnológico)</option>
                          <option value="corporate-navy">Corporate Navy (Executivo Azul)</option>
                          <option value="emerald-tech">Emerald Tech (Verde Sustentável)</option>
                          <option value="sunset-warm">Sunset Warm (Vibrante & Caloroso)</option>
                          <option value="cyber-purple">Cyber Purple (Inovador Roxo)</option>
                        </select>
                      </div>

                      {/* Campo para escolher a cor do fundo da apresentação em PPT (15 quadrados coloridos sem texto) */}
                      <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5">
                        <label className="block text-xs font-bold text-sky-950 mb-1.5 flex items-center gap-1.5">
                          <Palette className="w-3.5 h-3.5 text-sky-600" />
                          Cor do fundo da apresentação em PPT
                        </label>

                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="color"
                            value={customBgColor}
                            onChange={(e) => handleBgColorChange(e.target.value)}
                            className="w-9 h-9 rounded-lg border border-sky-300 cursor-pointer bg-white p-0.5"
                            title="Clique para escolher uma cor de fundo personalizada do PowerPoint"
                          />
                          <input
                            type="text"
                            value={customBgColor}
                            onChange={(e) => handleBgColorChange(e.target.value)}
                            placeholder="#071A2E"
                            className="flex-1 bg-white border border-sky-300 rounded-lg px-3 py-1.5 text-xs text-sky-950 uppercase font-mono tracking-wider focus:outline-none focus:border-sky-500 font-semibold"
                          />
                          <div
                            className="w-6 h-6 rounded-md border border-sky-300 shadow-inner shrink-0"
                            style={{ backgroundColor: customBgColor }}
                          />
                        </div>

                        {/* 15 quadrados coloridos de opção em Paletas Rápidas de Fundo sem texto */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-sky-800 font-semibold">Paleta rápida de fundo:</span>
                          <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                            {[
                              "#071A2E", // 1. Azul Celeste Escuro
                              "#0E2A47", // 2. Celeste Médio
                              "#0A192F", // 3. Corporate Navy
                              "#0F172A", // 4. Slate Escuro
                              "#000000", // 5. Preto
                              "#FFFFFF", // 6. Branco
                              "#064E3B", // 7. Verde Esmeralda
                              "#1C1917", // 8. Grafite Quente
                              "#18092B", // 9. Roxo Cyber
                              "#1E3A8A", // 10. Azul Royal
                              "#312E81", // 11. Indigo Profundo
                              "#831843", // 12. Vinho Nobre
                              "#701A75", // 13. Fúcsia Escuro
                              "#134E4A", // 14. Teal Petróleo
                              "#1E293B", // 15. Azul Carvão
                            ].map((hex) => (
                              <button
                                key={hex}
                                type="button"
                                onClick={() => handleBgColorChange(hex)}
                                className={`h-7 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center shadow-2xs ${
                                  customBgColor.toUpperCase() === hex.toUpperCase()
                                    ? "border-sky-500 scale-105 ring-2 ring-sky-400"
                                    : "border-sky-200/90 hover:scale-105 hover:border-sky-400"
                                }`}
                                style={{ backgroundColor: hex }}
                                title={hex}
                              >
                                {customBgColor.toUpperCase() === hex.toUpperCase() && (
                                  <Check
                                    className={`w-3.5 h-3.5 ${
                                      hex.toUpperCase() === "#FFFFFF" ? "text-sky-950" : "text-white"
                                    }`}
                                  />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Coluna 2: Meta de Slides */}
                    <div className="space-y-3">
                      <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5">
                        <label className="block text-xs font-bold text-sky-950 mb-1.5 flex items-center gap-1.5">
                          <Presentation className="w-3.5 h-3.5 text-sky-600" />
                          Meta de Slides
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={3}
                            max={7}
                            value={slideCountTarget}
                            onChange={(e) => setSlideCountTarget(Number(e.target.value))}
                            className="flex-1 accent-sky-600 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-sky-950 px-2 py-1 bg-white border border-sky-300 rounded-md">
                            {slideCountTarget} slides
                          </span>
                        </div>
                        <p className="text-[11px] text-sky-700 mt-2">
                          A IA criará a quantidade ideal de slides e roteiros com narração sincronizada.
                        </p>
                      </div>
                    </div>

                    {/* Coluna 3: Gerar com IA & Carregar Externa logo abaixo */}
                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        disabled={isGeneratingPresentation || isAnalyzingExternal}
                        onClick={handleGeneratePresentation}
                        className="w-full flex items-center justify-center gap-2 py-4 px-5 rounded-xl bg-gradient-to-r from-sky-600 via-sky-500 to-blue-600 hover:from-sky-700 hover:via-sky-600 hover:to-blue-700 text-white font-black text-xs sm:text-sm shadow-xl shadow-sky-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-sky-400"
                      >
                        {isGeneratingPresentation ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Processando Comandos com IA...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4 text-white" />
                            <span>Gerar Apresentação com IA</span>
                          </>
                        )}
                      </button>

                      <input
                        ref={externalFileRef}
                        type="file"
                        accept=".pptx,.ppt,.json,.txt,.md"
                        onChange={handleExternalFileChange}
                        className="hidden"
                      />

                      {/* Botão Carregar apresentação externa logo abaixo do botão Gerar com IA */}
                      <button
                        type="button"
                        disabled={isAnalyzingExternal || isGeneratingPresentation}
                        onClick={() => externalFileRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-sky-50 text-sky-950 hover:text-sky-900 border-2 border-sky-400 hover:border-sky-500 text-xs font-extrabold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Carregar arquivo PowerPoint (.pptx) ou texto externo para análise e geração automática de narração em vídeo"
                      >
                        {isAnalyzingExternal ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                            <span>Analisando Slides...</span>
                          </>
                        ) : (
                          <>
                            <FolderUp className="w-4 h-4 text-sky-600" />
                            <span>Carregar apresentação externa</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Status messages */}
                  {externalAnalysisStatus && (
                    <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-300 text-sky-900 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                      <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>{externalAnalysisStatus}</span>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                </div>

                <StepNavigationFooter
                  stepNumber={1}
                  totalSteps={8}
                  onBack={() => setAppMode(null)}
                  backLabel="Início"
                  onNext={() => setPresentationStep(2)}
                  isNextDisabled={!presentation || presentation.slides.length === 0}
                  nextLabel="Seguir"
                />
              </section>
            )}

            {/* QUADRO 2: SLIDES PRONTOS PARA VALIDAÇÃO & VÍDEO (ALINHADOS DE 2 EM 2) */}
            {presentationStep === 2 && presentation && (
              <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
                <StepHeader
                  stepNumber={2}
                  totalSteps={8}
                  stepTitle="Slides Prontos para Validação"
                  onBack={() => setPresentationStep(1)}
                  onNext={() => setPresentationStep(3)}
                  isNextDisabled={presentation.slides.length === 0}
                  nextLabel="Seguir"
                />

                {/* Header dos Slides */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-sky-50/80 border border-sky-200 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center border border-sky-300">
                      <Presentation className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-200">
                          PowerPoint Criado & Analisado
                        </span>
                        <span className="text-xs text-sky-800 font-semibold">
                          {presentation.slides.length} slides
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-sky-950 mt-0.5">
                        {presentation.title}
                      </h3>
                      {presentation.subtitle && (
                        <p className="text-xs text-sky-800">{presentation.subtitle}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions inside quadrant header */}
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleDownloadPowerPoint}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-950 border border-sky-300 text-xs font-bold transition-all cursor-pointer shadow-xs"
                      title="Baixar arquivo da apresentação PowerPoint"
                    >
                      <FileDown className="w-4 h-4 text-orange-600" />
                      <span>Baixar PPTX</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSlide}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-sky-600" />
                      <span>Adicionar Slide</span>
                    </button>
                  </div>
                </div>

                {/* Slides Cards List: ALINHADOS DE DOIS EM DOIS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                      Slides Prontos para Validação & Vídeo ({presentation.slides.length})
                    </span>
                    <span className="text-[11px] text-sky-700 font-medium">
                      Visualização lado a lado (2 por linha)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {presentation.slides.map((slide, idx) => (
                      <SlideCard
                        key={slide.id}
                        slide={slide}
                        index={idx}
                        totalSlides={presentation.slides.length}
                        theme={presentation.theme}
                        customBgColor={presentation.customBgColor || customBgColor}
                        voiceGender={presentationVoiceGender}
                        voiceId={presentationVoiceId}
                        voicePitch={presentationVoicePitch}
                        voiceMood={presentationVoiceMood}
                        onUpdateSlide={handleUpdateSlide}
                        onDeleteSlide={() => handleDeleteSlide(slide.id)}
                        onMoveUp={() => handleMoveSlide(idx, "up")}
                        onMoveDown={() => handleMoveSlide(idx, "down")}
                      />
                    ))}
                  </div>
                </div>

                <StepNavigationFooter
                  stepNumber={2}
                  totalSteps={8}
                  onBack={() => setPresentationStep(1)}
                  onNext={() => setPresentationStep(3)}
                  nextLabel="Seguir"
                />
              </section>
            )}

            {/* QUADRO 3: NARRAÇÃO VOCAL COM IA */}
            {presentationStep === 3 && (
              <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
                <StepHeader
                  stepNumber={3}
                  totalSteps={8}
                  stepTitle="Narração Vocal com IA"
                  onBack={() => setPresentationStep(2)}
                  onNext={() => setPresentationStep(4)}
                  nextLabel="Seguir"
                />

                <VoiceSlotsSelector
                  voiceSlots={presentationVoiceSlots}
                  onSaveSlot={handleSavePresentationVoiceSlot}
                  activeSlotId={presentationActiveVoiceSlot}
                  onSelectActiveSlot={handleSelectPresentationVoiceSlot}
                />

                <StepNavigationFooter
                  stepNumber={3}
                  totalSteps={8}
                  onBack={() => setPresentationStep(2)}
                  onNext={() => setPresentationStep(4)}
                  nextLabel="Seguir"
                />
              </section>
            )}

            {/* QUADRO 4: FUNÇÕES DE FORMATO & MÚSICA DE FUNDO */}
            {presentationStep === 4 && (
              <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
                <StepHeader
                  stepNumber={4}
                  totalSteps={8}
                  stepTitle="Formato e Configurações do Vídeo"
                  onBack={() => setPresentationStep(3)}
                  onNext={() => setPresentationStep(5)}
                  nextLabel="Seguir"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Duração por slide */}
                  <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase text-sky-950 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-sky-600" />
                        Duração Mínima por Slide
                      </label>
                      <span className="text-xs font-black text-sky-950 px-2.5 py-1 rounded-lg bg-white border border-sky-300">
                        {presentationSecondsPerSlide}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={12}
                      value={presentationSecondsPerSlide}
                      onChange={(e) => setPresentationSecondsPerSlide(Number(e.target.value))}
                      className="w-full accent-sky-600 cursor-pointer"
                    />
                    <p className="text-[11px] text-sky-800">
                      Ajuste o tempo de exibição de cada slide na tela durante a narração.
                    </p>
                  </div>

                  {/* Formato da tela */}
                  <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-5 space-y-3">
                    <label className="text-xs font-black uppercase text-sky-950 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-sky-600" />
                      Proporção de Tela do Vídeo
                    </label>
                    <div className="p-3 bg-white rounded-xl border border-sky-300 flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-950">16:9 Widescreen (Padrão PowerPoint)</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-200">
                        Full HD
                      </span>
                    </div>
                    <p className="text-[11px] text-sky-800">
                      Ideal para apresentações corporativas, reuniões e projeções de slides.
                    </p>
                  </div>
                </div>

                {/* Música de Fundo */}
                <VoiceAndTransitionSettings
                  section="music"
                  voiceGender={presentationVoiceGender}
                  onVoiceGenderChange={setPresentationVoiceGender}
                  transitionType={presentationTransitionType}
                  onTransitionTypeChange={setPresentationTransitionType}
                  backgroundMusicTrack={presentationMusicTrack}
                  onBackgroundMusicTrackChange={setPresentationMusicTrack}
                />

                <StepNavigationFooter
                  stepNumber={4}
                  totalSteps={8}
                  onBack={() => setPresentationStep(3)}
                  onNext={() => setPresentationStep(5)}
                  nextLabel="Seguir"
                />
              </section>
            )}

            {/* QUADRO 5: LEGENDAS DO VÍDEO */}
            {presentationStep === 5 && (
              <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
                <StepHeader
                  stepNumber={5}
                  totalSteps={8}
                  stepTitle="Legendas do Vídeo"
                  onBack={() => setPresentationStep(4)}
                  onNext={() => setPresentationStep(6)}
                  nextLabel="Seguir"
                />

                <VoiceAndTransitionSettings
                  section="subtitles"
                  voiceGender={presentationVoiceGender}
                  onVoiceGenderChange={setPresentationVoiceGender}
                  transitionType={presentationTransitionType}
                  onTransitionTypeChange={setPresentationTransitionType}
                  subtitlesEnabled={presentationSubtitlesEnabled}
                  onSubtitlesEnabledChange={setPresentationSubtitlesEnabled}
                  subtitleColor={presentationSubtitleColor}
                  onSubtitleColorChange={setPresentationSubtitleColor}
                  subtitleBoxColor={presentationSubtitleBoxColor}
                  onSubtitleBoxColorChange={setPresentationSubtitleBoxColor}
                />

                <StepNavigationFooter
                  stepNumber={5}
                  totalSteps={8}
                  onBack={() => setPresentationStep(4)}
                  onNext={() => setPresentationStep(6)}
                  nextLabel="Seguir"
                />
              </section>
            )}

            {/* QUADRO 6: TRANSIÇÃO ENTRE AS TELAS */}
            {presentationStep === 6 && (
              <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
                <StepHeader
                  stepNumber={6}
                  totalSteps={8}
                  stepTitle="Transição entre as Telas"
                  onBack={() => setPresentationStep(5)}
                  onNext={() => setPresentationStep(7)}
                  nextLabel="Seguir"
                />

                <VoiceAndTransitionSettings
                  section="transition"
                  voiceGender={presentationVoiceGender}
                  onVoiceGenderChange={setPresentationVoiceGender}
                  transitionType={presentationTransitionType}
                  onTransitionTypeChange={setPresentationTransitionType}
                />

                <StepNavigationFooter
                  stepNumber={6}
                  totalSteps={8}
                  onBack={() => setPresentationStep(5)}
                  onNext={() => setPresentationStep(7)}
                  nextLabel="Seguir"
                />
              </section>
            )}

            {/* QUADRO 7: VALIDAÇÃO FINAL & GRAVAÇÃO DO VÍDEO */}
            {presentationStep === 7 && presentation && (
              <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
                <StepHeader
                  stepNumber={7}
                  totalSteps={8}
                  stepTitle="Validação Final & Gravação do Vídeo"
                  onBack={() => setPresentationStep(6)}
                  onNext={() => generatedVideoUrl && setPresentationStep(8)}
                  isNextDisabled={!generatedVideoUrl}
                  nextLabel="Ver Vídeo Pronto"
                />

                {/* Resumo do projeto configurado */}
                <div className="bg-sky-50/80 border-2 border-sky-200 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wide text-sky-950">
                    Resumo da Apresentação
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-sky-200">
                      <span className="text-[10px] text-sky-700 font-bold block uppercase">Slides</span>
                      <span className="text-sm font-black text-sky-950">{presentation.slides.length} slides</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-sky-200">
                      <span className="text-[10px] text-sky-700 font-bold block uppercase">Tema</span>
                      <span className="text-sm font-black text-sky-950 capitalize">{presentation.theme}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-sky-200">
                      <span className="text-[10px] text-sky-700 font-bold block uppercase">Voz IA</span>
                      <span className="text-sm font-black text-sky-950 capitalize">
                        {presentationVoiceGender === "female" ? "Feminina" : "Masculina"} ({presentationVoiceId})
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-sky-200">
                      <span className="text-[10px] text-sky-700 font-bold block uppercase">Legendas</span>
                      <span className="text-sm font-black text-sky-950">
                        {presentationSubtitlesEnabled ? "Ativadas" : "Desativadas"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Barra de progresso de gravação */}
                {isRenderingVideo && renderProgress && (
                  <div className="bg-white border-2 border-sky-500 rounded-2xl p-6 shadow-2xl animate-pulse space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Film className="w-6 h-6 text-sky-600 animate-spin" />
                        <div>
                          <h4 className="text-sm font-bold text-sky-950">
                            Renderizando Vídeo MP4 com Narração de Voz
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

                    <div className="flex items-center justify-between text-[11px] text-sky-700">
                      <span>Slide {renderProgress.currentSlide} de {renderProgress.totalSlides}</span>
                      <span>Sincronizando narração em áudio e slides no formato MP4...</span>
                    </div>
                  </div>
                )}

                {/* Botão de gravação */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    disabled={isRenderingVideo || presentation.slides.length === 0}
                    onClick={handleOpenPresentationSubtitleModal}
                    className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-sky-600 via-sky-500 to-blue-600 hover:from-sky-700 hover:via-sky-600 hover:to-blue-700 text-white font-black text-base sm:text-lg shadow-xl shadow-sky-500/25 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 border border-sky-400 group hover:scale-[1.01]"
                  >
                    {isRenderingVideo ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                        <span>Renderizando e Sincronizando Vídeo...</span>
                      </>
                    ) : (
                      <>
                        <Film className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                        <span>Gravar Vídeo</span>
                      </>
                    )}
                  </button>
                </div>

                <StepNavigationFooter
                  stepNumber={7}
                  totalSteps={8}
                  onBack={() => setPresentationStep(6)}
                  onNext={() => generatedVideoUrl && setPresentationStep(8)}
                  isNextDisabled={!generatedVideoUrl}
                  nextLabel="Ver Vídeo Pronto"
                />
              </section>
            )}

            {/* QUADRO 8: VÍDEO PRONTO & ÚLTIMOS PROJETOS (COM OPÇÃO DE BAIXAR) */}
            {presentationStep === 8 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <section className="bg-white/95 border-2 border-sky-300 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl shadow-sky-900/5 space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-sky-200">
                    <button
                      type="button"
                      onClick={() => setPresentationStep(2)}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-sky-50 text-sky-950 font-extrabold text-xs border border-sky-300 shadow-xs cursor-pointer"
                    >
                      ← Voltar para Edição
                    </button>

                    <div className="text-center">
                      <span className="text-xs font-black uppercase text-emerald-700 block">
                        Concluído com Sucesso!
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-sky-950">
                        {activeEditingProject?.name || presentation?.title || "Vídeo da Apresentação"}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetForNewVideo}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs shadow-md cursor-pointer transition-colors"
                      title="Limpar todos os passos e iniciar um novo vídeo do zero"
                    >
                      Novo Vídeo +
                    </button>
                  </div>

                  {generatedVideoUrl && (
                    <VideoPlayerCard
                      videoUrl={generatedVideoUrl}
                      webmUrl={generatedWebmUrl || undefined}
                      videoDuration={videoDuration}
                      presentation={presentation!}
                      photos={photos}
                      onDownloadPowerPoint={handleDownloadPowerPoint}
                      onReRender={handleOpenPresentationSubtitleModal}
                    />
                  )}
                </section>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Janela Modal: Subtítulo do Projeto solicitada ao validar apresentação e criar vídeo */}
      <ProjectSubtitleModal
        isOpen={isSubtitleModalOpen}
        projectName={modalProjectName}
        initialSubtitle={modalSubtitle}
        isEditing={isEditingModal}
        onConfirm={handleConfirmPresentationSubtitle}
        onCancel={() => setIsSubtitleModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-sky-200 bg-sky-100/90 py-6 text-center text-xs text-sky-900 font-semibold mt-16">
        <p>MOVIX Studio</p>
      </footer>
    </div>
  );
}
