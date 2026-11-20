import { NextRequest, NextResponse } from "next/server";
import pptxgen from "pptxgenjs";
import { PresentationData, AttachedPhoto } from "@/types/presentation";
import { THEME_PALETTES } from "@/lib/pptx-generator";

export async function POST(req: NextRequest) {
  try {
    const { presentation, photos }: { presentation: PresentationData; photos: AttachedPhoto[] } =
      await req.json();

    if (!presentation || !presentation.slides) {
      return NextResponse.json({ error: "Dados de apresentação inválidos" }, { status: 400 });
    }

    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_16x9";
    pptx.author = "MOVIX Studio";
    pptx.company = "MOVIX";
    pptx.title = presentation.title || "Apresentação MOVIX";

    const themeKey = presentation.theme in THEME_PALETTES ? presentation.theme : "dark-slate";
    const basePalette = THEME_PALETTES[themeKey];

    // Determine custom background color if specified
    const customBg = presentation.customBgColor?.replace(/^#/, "").toUpperCase();
    const bgHex = customBg && customBg.length === 6 ? customBg : basePalette.bg;

    // Check luminance to ensure high contrast text on light or dark PPT backgrounds
    const r = parseInt(bgHex.substring(0, 2), 16) || 0;
    const g = parseInt(bgHex.substring(2, 4), 16) || 0;
    const b = parseInt(bgHex.substring(4, 6), 16) || 0;
    const isLightBg = (r * 299 + g * 587 + b * 114) / 1000 > 140;

    const palette = {
      ...basePalette,
      bg: bgHex,
      primaryText: isLightBg ? "0F172A" : basePalette.primaryText,
      secondaryText: isLightBg ? "475569" : basePalette.secondaryText,
      cardBg: isLightBg ? "F1F5F9" : basePalette.cardBg,
      cardBorder: isLightBg ? "CBD5E1" : basePalette.cardBorder,
    };

    const photoMap = new Map<string, AttachedPhoto>();
    (photos || []).forEach((p) => photoMap.set(p.id, p));

    presentation.slides.forEach((slideData, index) => {
      const slide = pptx.addSlide();
      slide.background = { color: palette.bg };

      // Slide footer with brand & numbering
      slide.addText(`MOVIX • Slide ${index + 1} de ${presentation.slides.length}`, {
        x: 0.8,
        y: 7.0,
        w: 8.0,
        h: 0.3,
        fontSize: 10,
        color: palette.secondaryText,
        fontFace: "Arial",
      });

      // Add speaker notes (used for narration in PowerPoint)
      if (slideData.narration) {
        slide.addNotes(`[Roteiro de Narração / Áudio]:\n${slideData.narration}`);
      }

      const assignedPhoto = slideData.photoId ? photoMap.get(slideData.photoId) : undefined;

      if (slideData.layout === "title" || index === 0) {
        // Title slide layout
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.8,
          y: 1.2,
          w: 1.8,
          h: 0.35,
          fill: { color: palette.cardBg },
          line: { color: palette.accent, width: 1.5 },
        });

        slide.addText(slideData.highlightTag || "APRESENTAÇÃO EXECUTIVA", {
          x: 0.9,
          y: 1.22,
          w: 4.0,
          h: 0.3,
          fontSize: 10,
          bold: true,
          color: palette.accent,
          fontFace: "Arial",
        });

        slide.addText(slideData.title, {
          x: 0.8,
          y: 1.8,
          w: assignedPhoto ? 6.5 : 11.5,
          h: 1.8,
          fontSize: 36,
          bold: true,
          color: palette.primaryText,
          fontFace: "Arial",
          breakLine: true,
        });

        if (slideData.subtitle || presentation.subtitle) {
          slide.addText(slideData.subtitle || presentation.subtitle || "", {
            x: 0.8,
            y: 3.7,
            w: assignedPhoto ? 6.5 : 11.5,
            h: 0.9,
            fontSize: 18,
            color: palette.secondaryText,
            fontFace: "Arial",
          });
        }

        if (slideData.bullets && slideData.bullets.length > 0) {
          const bulletItems = slideData.bullets.map((b) => ({
            text: b,
            options: {
              fontSize: 14,
              color: palette.primaryText,
              bullet: { code: "25BA", color: palette.accent },
              breakLine: true,
            },
          }));

          slide.addText(bulletItems, {
            x: 0.8,
            y: 4.8,
            w: assignedPhoto ? 6.5 : 11.5,
            h: 1.8,
          });
        }

        if (assignedPhoto && assignedPhoto.dataUrl) {
          try {
            slide.addImage({
              data: assignedPhoto.dataUrl,
              x: 7.7,
              y: 1.6,
              w: 4.8,
              h: 4.8,
              rounding: true,
            });
          } catch (e) {
            console.warn("Could not insert image in PPTX slide", e);
          }
        }
      } else if (assignedPhoto && assignedPhoto.dataUrl) {
        // Split layout with Image
        const isRight = slideData.layout !== "split-left-image";
        const textX = isRight ? 0.8 : 6.8;
        const imgX = isRight ? 7.2 : 0.8;

        if (slideData.highlightTag) {
          slide.addText(slideData.highlightTag.toUpperCase(), {
            x: textX,
            y: 0.7,
            w: 5.5,
            h: 0.3,
            fontSize: 11,
            bold: true,
            color: palette.accent,
            fontFace: "Arial",
          });
        }

        slide.addText(slideData.title, {
          x: textX,
          y: 1.1,
          w: 5.8,
          h: 1.2,
          fontSize: 26,
          bold: true,
          color: palette.primaryText,
          fontFace: "Arial",
        });

        if (slideData.bullets && slideData.bullets.length > 0) {
          const bulletItems = slideData.bullets.map((b) => ({
            text: b,
            options: {
              fontSize: 15,
              color: palette.primaryText,
              bullet: { code: "2022", color: palette.accent },
              breakLine: true,
              paraSpaceAfter: 8,
            },
          }));

          slide.addText(bulletItems, {
            x: textX,
            y: 2.5,
            w: 5.8,
            h: 4.0,
          });
        }

        try {
          slide.addImage({
            data: assignedPhoto.dataUrl,
            x: imgX,
            y: 1.1,
            w: 5.3,
            h: 5.2,
            rounding: true,
          });
        } catch (e) {
          console.warn("Could not insert image in PPTX slide", e);
        }
      } else {
        // Full text / Cards layout
        if (slideData.highlightTag) {
          slide.addText(slideData.highlightTag.toUpperCase(), {
            x: 0.8,
            y: 0.7,
            w: 11.5,
            h: 0.3,
            fontSize: 11,
            bold: true,
            color: palette.accent,
            fontFace: "Arial",
          });
        }

        slide.addText(slideData.title, {
          x: 0.8,
          y: 1.1,
          w: 11.5,
          h: 1.0,
          fontSize: 28,
          bold: true,
          color: palette.primaryText,
          fontFace: "Arial",
        });

        if (slideData.subtitle) {
          slide.addText(slideData.subtitle, {
            x: 0.8,
            y: 2.1,
            w: 11.5,
            h: 0.6,
            fontSize: 16,
            color: palette.secondaryText,
            fontFace: "Arial",
          });
        }

        if (slideData.bullets && slideData.bullets.length > 0) {
          const bulletItems = slideData.bullets.map((b) => ({
            text: b,
            options: {
              fontSize: 16,
              color: palette.primaryText,
              bullet: { code: "2022", color: palette.accent },
              breakLine: true,
              paraSpaceAfter: 12,
            },
          }));

          slide.addText(bulletItems, {
            x: 0.8,
            y: slideData.subtitle ? 2.8 : 2.3,
            w: 11.5,
            h: 4.2,
          });
        }
      }
    });

    const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
    const cleanFileName = `${(presentation.title || "Apresentacao_MOVIX").replace(/[^a-zA-Z0-9_-]/g, "_")}.pptx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${cleanFileName}"`,
      },
    });
  } catch (err: any) {
    console.warn("Erro ao gerar PPTX no servidor:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao gerar arquivo PowerPoint" },
      { status: 500 }
    );
  }
}
