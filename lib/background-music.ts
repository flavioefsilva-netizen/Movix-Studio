import { BackgroundMusicTrackId } from "@/types/presentation";

export interface BackgroundMusicTrack {
  id: BackgroundMusicTrackId;
  name: string;
  genre: string;
  description: string;
  chords: number[][]; // chord frequencies
}

export const BACKGROUND_MUSIC_TRACKS: BackgroundMusicTrack[] = [
  {
    id: "acustica-suave",
    name: "Acústica Suave",
    genre: "Violão & Harmonia",
    description: "",
    chords: [
      [261.63, 329.63, 392.0], // C
      [220.0, 261.63, 329.63], // Am
      [174.61, 220.0, 261.63], // F
      [196.0, 246.94, 293.66], // G
    ],
  },
  {
    id: "corporativa-inspiradora",
    name: "Corporativa Inspiradora",
    genre: "Piano & Cordas",
    description: "Progressão executiva inspiradora que transmite sucesso, clareza e inovação.",
    chords: [
      [293.66, 369.99, 440.0], // D
      [246.94, 293.66, 369.99], // Bm
      [196.0, 246.94, 293.66], // G
      [220.0, 277.18, 329.63], // A
    ],
  },
  {
    id: "lofi-calmo",
    name: "Lo-Fi Calmo",
    genre: "Chill & Relax",
    description: "Acordes quentes de 7ª maior com textura suave para conteúdos modernos e leves.",
    chords: [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0], // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 349.23], // G7
    ],
  },
  {
    id: "eletronica-suave",
    name: "Eletrônica Suave",
    genre: "Moderna & Tech",
    description: "Sons sintetizados futuristas e elegantes para projetos corporativos e digitais.",
    chords: [
      [220.0, 261.63, 329.63], // Am
      [174.61, 220.0, 261.63], // F
      [261.63, 329.63, 392.0], // C
      [196.0, 246.94, 293.66], // G
    ],
  },
  {
    id: "cinematografica",
    name: "Cinematográfica",
    genre: "Profunda & Emocionante",
    description: "Harmonia orquestral envolvente para narrativas de alto impacto emocional.",
    chords: [
      [164.81, 196.0, 246.94], // Em
      [261.63, 329.63, 392.0], // C
      [196.0, 246.94, 293.66], // G
      [146.83, 185.0, 220.0], // D
    ],
  },
];

let previewAudioCtx: AudioContext | null = null;
let previewOscillators: OscillatorNode[] = [];
let previewTimer: NodeJS.Timeout | null = null;
let currentPreviewTrackId: BackgroundMusicTrackId | null = null;

export function stopMusicPreview() {
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }
  previewOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // ignore
    }
  });
  previewOscillators = [];
  if (previewAudioCtx && previewAudioCtx.state !== "closed") {
    try {
      previewAudioCtx.close();
    } catch {
      // ignore
    }
    previewAudioCtx = null;
  }
  currentPreviewTrackId = null;
}

export function getCurrentPreviewTrackId(): BackgroundMusicTrackId | null {
  return currentPreviewTrackId;
}

export async function playMusicPreview(
  trackId: BackgroundMusicTrackId,
  onEnd?: () => void
): Promise<void> {
  // If already playing this track, toggle stop
  if (currentPreviewTrackId === trackId) {
    stopMusicPreview();
    onEnd?.();
    return;
  }

  stopMusicPreview();
  currentPreviewTrackId = trackId;

  const track = BACKGROUND_MUSIC_TRACKS.find((t) => t.id === trackId) || BACKGROUND_MUSIC_TRACKS[0];

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    previewAudioCtx = new AudioContextClass();
    const now = previewAudioCtx.currentTime;
    const duration = 12.0; // 12 seconds preview

    // Play chord progression
    const chordDuration = 3.0;
    track.chords.forEach((chord, chordIdx) => {
      const chordStart = now + chordIdx * chordDuration;
      chord.forEach((freq, noteIdx) => {
        if (!previewAudioCtx) return;
        const osc = previewAudioCtx.createOscillator();
        const gain = previewAudioCtx.createGain();

        // Waveform based on genre
        if (track.id === "lofi-calmo") {
          osc.type = "sine";
        } else if (track.id === "eletronica-suave") {
          osc.type = "triangle";
        } else {
          osc.type = noteIdx === 0 ? "triangle" : "sine";
        }

        osc.frequency.setValueAtTime(freq, chordStart);

        // Gentle envelope
        gain.gain.setValueAtTime(0.0001, chordStart);
        gain.gain.exponentialRampToValueAtTime(0.05 / (noteIdx + 1), chordStart + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.0001, chordStart + chordDuration - 0.05);

        osc.connect(gain);
        gain.connect(previewAudioCtx.destination);

        osc.start(chordStart);
        osc.stop(chordStart + chordDuration);
        previewOscillators.push(osc);
      });
    });

    previewTimer = setTimeout(() => {
      stopMusicPreview();
      onEnd?.();
    }, duration * 1000);
  } catch (err) {
    console.warn("Erro ao reproduzir prévia de música:", err);
    stopMusicPreview();
    onEnd?.();
  }
}

// Generate multi-second background music buffer to mix into video
export function generateBackgroundMusicBuffer(
  audioCtx: AudioContext,
  trackId: BackgroundMusicTrackId = "acustica-suave",
  durationSec: number
): AudioBuffer {
  const track = BACKGROUND_MUSIC_TRACKS.find((t) => t.id === trackId) || BACKGROUND_MUSIC_TRACKS[0];
  const sampleRate = audioCtx.sampleRate;
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);

  const chords = track.chords;
  const chordDur = 3.2; // seconds per chord

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const chordIndex = Math.floor(t / chordDur) % chords.length;
    const chord = chords[chordIndex];
    const tInChord = t % chordDur;

    let sample = 0;
    chord.forEach((f, idx) => {
      // Gentle decay envelope
      const env = Math.exp(-tInChord * 0.7) * (0.04 / (idx + 1));
      sample += Math.sin(2 * Math.PI * f * t) * env;
    });

    // Fade in at start and fade out at end
    const fadeIn = Math.min(1.0, t / 1.0);
    const fadeOut = t > durationSec - 1.0 ? Math.max(0, (durationSec - t) / 1.0) : 1.0;

    data[i] = sample * fadeIn * fadeOut;
  }

  return buffer;
}
