import { PresentationData, AttachedPhoto } from "@/types/presentation";

export const THEME_PALETTES: Record<
  string,
  {
    bg: string;
    cardBg: string;
    primaryText: string;
    secondaryText: string;
    accent: string;
    accentSecondary: string;
    cardBorder: string;
  }
> = {
  "azul-celeste": {
    bg: "071A2E",
    cardBg: "0B2545",
    primaryText: "F0F9FF",
    secondaryText: "7DD3FC",
    accent: "38BDF8",
    accentSecondary: "0284C7",
    cardBorder: "0369A1",
  },
  "dark-slate": {
    bg: "0F172A",
    cardBg: "1E293B",
    primaryText: "F8FAFC",
    secondaryText: "94A3B8",
    accent: "38BDF8",
    accentSecondary: "818CF8",
    cardBorder: "334155",
  },
  "corporate-navy": {
    bg: "0A192F",
    cardBg: "172A45",
    primaryText: "FFFFFF",
    secondaryText: "8892B0",
    accent: "64FFDA",
    accentSecondary: "00B4D8",
    cardBorder: "233554",
  },
  "emerald-tech": {
    bg: "064E3B",
    cardBg: "065F46",
    primaryText: "ECFDF5",
    secondaryText: "A7F3D0",
    accent: "34D399",
    accentSecondary: "FBBF24",
    cardBorder: "047857",
  },
  "sunset-warm": {
    bg: "1C1917",
    cardBg: "292524",
    primaryText: "FAFAF9",
    secondaryText: "D6D3D1",
    accent: "F97316",
    accentSecondary: "FB7185",
    cardBorder: "44403C",
  },
  "cyber-purple": {
    bg: "18092B",
    cardBg: "29104A",
    primaryText: "FAF5FF",
    secondaryText: "D8B4FE",
    accent: "C084FC",
    accentSecondary: "F43F5E",
    cardBorder: "4C1D95",
  },
};

export async function exportToPowerPoint(
  presentation: PresentationData,
  attachedPhotos: AttachedPhoto[],
  fileName?: string
): Promise<Blob> {
  const response = await fetch("/api/export-pptx", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      presentation,
      photos: attachedPhotos,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Falha ao gerar PowerPoint no servidor.");
  }

  const blob = await response.blob();
  const cleanFileName =
    fileName ||
    `${(presentation.title || "Apresentacao_MOVIX").replace(/[^a-zA-Z0-9_-]/g, "_")}.pptx`;

  // Trigger download in browser
  const link = document.createElement("a");
  const url = window.URL.createObjectURL(blob);
  link.href = url;
  link.download = cleanFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return blob;
}
