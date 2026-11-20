import { useState, useEffect, useSyncExternalStore } from "react";
import { SavedProject } from "@/types/project";

const STORAGE_KEY = "movix_recent_projects_v2";
const COUNTER_KEY = "movix_project_counter_v2";
const MAX_PROJECTS = 5;

let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

let cachedProjects: SavedProject[] = [];
let cachedRaw: string | null = null;
const EMPTY_ARRAY: SavedProject[] = [];
const liveSessionBlobUrls = new Set<string>();

export function registerLiveBlobUrl(url?: string | null): void {
  if (url && url.startsWith("blob:")) {
    liveSessionBlobUrls.add(url);
  }
}

export function isPlayableVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  if (!url.startsWith("blob:")) return true;
  return liveSessionBlobUrls.has(url);
}

/**
 * Retrieves the current counter for project numbering (starts at 1).
 */
export function getNextProjectNumber(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = localStorage.getItem(COUNTER_KEY);
    if (!raw) {
      // Check existing projects to find highest number if counter wasn't stored
      const projects = getRecentProjects();
      const maxNum = projects.reduce((max, p) => Math.max(max, p.projectNumber || 0), 0);
      const next = maxNum > 0 ? maxNum + 1 : 1;
      localStorage.setItem(COUNTER_KEY, String(next));
      return next;
    }
    const val = parseInt(raw, 10);
    return isNaN(val) || val < 1 ? 1 : val;
  } catch (e) {
    console.warn("Erro ao ler contador de projetos:", e);
    return 1;
  }
}

/**
 * Increments the project counter.
 */
export function incrementProjectCounter(): void {
  if (typeof window === "undefined") return;
  try {
    const current = getNextProjectNumber();
    localStorage.setItem(COUNTER_KEY, String(current + 1));
  } catch (e) {
    console.warn("Erro ao incrementar contador de projetos:", e);
  }
}

/**
 * Loads recent projects from localStorage (max 5) with memoized snapshot.
 */
export function getRecentProjects(): SavedProject[] {
  if (typeof window === "undefined") return EMPTY_ARRAY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedRaw = null;
      cachedProjects = EMPTY_ARRAY;
      return cachedProjects;
    }
    if (raw === cachedRaw) {
      return cachedProjects;
    }
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) {
      cachedRaw = null;
      cachedProjects = EMPTY_ARRAY;
      return cachedProjects;
    }
    cachedRaw = raw;
    cachedProjects = list.slice(0, MAX_PROJECTS);
    return cachedProjects;
  } catch (e) {
    console.warn("Erro ao carregar projetos recentes:", e);
    return EMPTY_ARRAY;
  }
}

const emptySubscribe = () => () => {};

export function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/**
 * React hook that subscribes to recent projects safely without SSR hydration mismatches.
 */
export function useRecentProjects(): SavedProject[] {
  const isMounted = useIsMounted();
  const storeProjects = useSyncExternalStore(
    (onStoreChange) => {
      listeners.push(onStoreChange);
      const onStorage = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY) {
          onStoreChange();
        }
      };
      if (typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
      }
      return () => {
        listeners = listeners.filter((l) => l !== onStoreChange);
        if (typeof window !== "undefined") {
          window.removeEventListener("storage", onStorage);
        }
      };
    },
    getRecentProjects,
    () => EMPTY_ARRAY
  );

  return isMounted ? storeProjects : EMPTY_ARRAY;
}

export interface SaveProjectPayload {
  id?: string; // If provided, edits an existing project
  name?: string; // If editing, preserve original name e.g. "Projeto 1"
  projectNumber?: number;
  subtitle: string;
  mode: "photos-text" | "text-presentation";
  videoUrl: string;
  webmUrl?: string;
  duration: number;
  thumbnailUrl?: string;
  subtitles?: SavedProject["subtitles"];
  backgroundMusicTrack?: SavedProject["backgroundMusicTrack"];
  presentationData?: SavedProject["presentationData"];
  photoStoryData?: SavedProject["photoStoryData"];
}

/**
 * Saves a new project or updates an existing one.
 * - If updating an existing project: keeps the same original name and number.
 * - If saving a new project: assigns "Projeto X" using incrementing counter.
 * - Caps total saved projects to 5 (removes the oldest if 6th is created).
 */
export function saveOrUpdateProject(payload: SaveProjectPayload): SavedProject {
  registerLiveBlobUrl(payload.videoUrl);
  registerLiveBlobUrl(payload.webmUrl);
  const existingList = getRecentProjects();
  const now = Date.now();

  let targetProject: SavedProject;

  // Check if we are updating an existing project by ID
  const existingIndex = payload.id
    ? existingList.findIndex((p) => p.id === payload.id)
    : -1;

  if (existingIndex >= 0) {
    // Update project using chosen name if provided
    const existing = existingList[existingIndex];
    const resolvedName = (payload.name || payload.subtitle || existing.name || "Meu Vídeo").trim();
    targetProject = {
      ...existing,
      name: resolvedName,
      subtitle: payload.subtitle || resolvedName,
      mode: payload.mode,
      updatedAt: now,
      videoUrl: payload.videoUrl,
      webmUrl: payload.webmUrl,
      duration: payload.duration,
      thumbnailUrl: payload.thumbnailUrl || existing.thumbnailUrl,
      subtitles: payload.subtitles || existing.subtitles,
      backgroundMusicTrack: payload.backgroundMusicTrack || existing.backgroundMusicTrack,
      presentationData: payload.presentationData || existing.presentationData,
      photoStoryData: payload.photoStoryData || existing.photoStoryData,
    };

    const updatedList = [...existingList];
    updatedList[existingIndex] = targetProject;
    persistProjects(updatedList.slice(0, MAX_PROJECTS));
    return targetProject;
  }

  // Create a NEW project with the name chosen by the user
  const chosenName = (payload.name || payload.subtitle || "Meu Vídeo").trim();

  targetProject = {
    id: `project-${now}-${Math.random().toString(36).substring(2, 7)}`,
    projectNumber: payload.projectNumber || 0,
    name: chosenName,
    subtitle: payload.subtitle || chosenName,
    mode: payload.mode,
    createdAt: now,
    updatedAt: now,
    videoUrl: payload.videoUrl,
    webmUrl: payload.webmUrl,
    duration: payload.duration,
    thumbnailUrl: payload.thumbnailUrl,
    subtitles: payload.subtitles,
    backgroundMusicTrack: payload.backgroundMusicTrack,
    presentationData: payload.presentationData,
    photoStoryData: payload.photoStoryData,
  };

  // Prepend new project and enforce max 5 (FIFO: drops the 6th/oldest)
  const updatedList = [targetProject, ...existingList].slice(0, MAX_PROJECTS);
  persistProjects(updatedList);

  return targetProject;
}

/**
 * Deletes a project by ID.
 */
export function deleteProject(id: string): SavedProject[] {
  const current = getRecentProjects();
  const filtered = current.filter((p) => p.id !== id);
  persistProjects(filtered);
  return filtered;
}

/**
 * Safely persists projects to localStorage with quota overflow handling.
 */
function persistProjects(projects: SavedProject[]): void {
  if (typeof window === "undefined") return;

  // Always keep in-memory cache synchronized with full data for the active session
  cachedProjects = projects;
  emitChange();

  // Helper to strip large base64 dataUrls (>30KB) before saving to localStorage to respect browser 5MB quota
  const sanitizeForStorage = (list: SavedProject[], keepThumbnails: boolean = true) => {
    return list.map((p) => ({
      ...p,
      presentationData: p.presentationData
        ? {
            ...p.presentationData,
            photos: p.presentationData.photos.map((ph) => ({
              ...ph,
              dataUrl: keepThumbnails && ph.dataUrl && ph.dataUrl.length < 30000 ? ph.dataUrl : "",
            })),
          }
        : undefined,
      photoStoryData: p.photoStoryData
        ? {
            ...p.photoStoryData,
            photoItems: p.photoStoryData.photoItems.map((item) => ({
              ...item,
              photo: {
                ...item.photo,
                dataUrl: keepThumbnails && item.photo.dataUrl && item.photo.dataUrl.length < 30000 ? item.photo.dataUrl : "",
              },
            })),
          }
        : undefined,
    }));
  };

  try {
    const sanitized = sanitizeForStorage(projects, true);
    const raw = JSON.stringify(sanitized);
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
  } catch (err) {
    // If quota exceeded, strip all dataUrls completely
    try {
      const minimal = sanitizeForStorage(projects, false);
      const rawMinimal = JSON.stringify(minimal);
      localStorage.setItem(STORAGE_KEY, rawMinimal);
      cachedRaw = rawMinimal;
    } catch {
      // If even minimal fails, store only lightweight project metadata
      try {
        const metadataOnly = projects.map((p) => ({
          id: p.id,
          projectNumber: p.projectNumber,
          name: p.name,
          subtitle: p.subtitle,
          mode: p.mode,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          duration: p.duration,
          videoUrl: p.videoUrl,
          webmUrl: p.webmUrl,
          subtitles: p.subtitles,
          backgroundMusicTrack: p.backgroundMusicTrack,
        }));
        const rawMeta = JSON.stringify(metadataOnly);
        localStorage.setItem(STORAGE_KEY, rawMeta);
        cachedRaw = rawMeta;
      } catch (e3) {
        // Silently preserve in-memory state without crashing or triggering console.error Next.js overlay
        console.warn("Aviso de armazenamento: projetos mantidos em memória temporária da sessão:", e3);
      }
    }
  }
}

