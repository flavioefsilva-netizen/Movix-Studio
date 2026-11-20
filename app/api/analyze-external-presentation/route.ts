import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const CANDIDATE_MODELS = [
  "gemini-4-hydrogen",
  "gemini-3.1-flash-lite",
];

export async function POST(req: NextRequest) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    const fallback = fallbackSlideAnalysis("Apresentação Externa", [], "dark-slate");
    return NextResponse.json({ success: true, presentation: fallback });
  }

  try {
    const presentationTitle = body?.presentationTitle || "Apresentação Externa";
    const rawSlides = Array.isArray(body?.slides) ? body.slides : [];
    const style = body?.style || "dark-slate";

    // Clean and sanitize slides payload to prevent Gemini token/timeout errors
    const sanitizedSlides = rawSlides.slice(0, 20).map((s: any, idx: number) => ({
      slideNumber: s.slideNumber || idx + 1,
      title: String(s.title || `Slide ${idx + 1}`).slice(0, 150),
      bullets: (Array.isArray(s.bullets) ? s.bullets : ["Tópico"])
        .slice(0, 6)
        .map((b: any) => String(b).slice(0, 250)),
    }));

    if (sanitizedSlides.length === 0) {
      sanitizedSlides.push({
        slideNumber: 1,
        title: presentationTitle,
        bullets: ["Visão geral do conteúdo", "Tópicos estratégicos importados"],
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let analyzedSlides: any = null;

    if (apiKey) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemInstruction = `Você é um diretor de criação e narrador profissional do MOVIX Studio.
O usuário acabou de carregar uma apresentação externa em PowerPoint (.pptx ou texto).
Sua missão é:
1. Analisar criticamente cada slide da apresentação fornecida.
2. Criar um roteiro de NARRAÇÃO DE ÁUDIO em voz ('narration') para cada slide, garantindo que o locutor sintetizado soe natural, envolvente, didático e profissional (cerca de 2 a 4 frases por slide, em português do Brasil).
3. Atribuir um layout visual adequado para cada slide ('title', 'split-right-image', 'split-left-image', 'cards', 'conclusion').
4. Manter a fidelidade ao conteúdo original, melhorando a concisão dos tópicos visuais.`;

      const prompt = `Analise a seguinte apresentação carregada externamente e crie os roteiros de narração de áudio e layouts para transformar em vídeo:
Título da Apresentação: ${presentationTitle}
Total de Slides: ${sanitizedSlides.length}

Slides originais:
${JSON.stringify(sanitizedSlides, null, 2)}

Para CADA slide, gere a narração completa em português e aprimore os tópicos para a apresentação de vídeo.`;

      for (const modelName of CANDIDATE_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  theme: { type: Type.STRING },
                  slides: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        slideNumber: { type: Type.INTEGER },
                        layout: { type: Type.STRING },
                        title: { type: Type.STRING },
                        subtitle: { type: Type.STRING },
                        bullets: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        narration: {
                          type: Type.STRING,
                          description:
                            "Roteiro de narração completo que será falado em voz pelo sintetizador de áudio no vídeo deste slide",
                        },
                        highlightTag: { type: Type.STRING },
                      },
                      required: ["slideNumber", "layout", "title", "bullets", "narration"],
                    },
                  },
                },
                required: ["title", "slides"],
              },
            },
          });

          const text = response.text;
          if (text) {
            analyzedSlides = JSON.parse(text);
            if (analyzedSlides && analyzedSlides.slides && analyzedSlides.slides.length > 0) {
              break;
            }
          }
        } catch {
          await new Promise((r) => setTimeout(r, 350));
        }
      }
    }

    // Infallible rule-based narration generator if AI models are busy
    if (!analyzedSlides || !analyzedSlides.slides || analyzedSlides.slides.length === 0) {
      analyzedSlides = fallbackSlideAnalysis(presentationTitle, sanitizedSlides, style);
    }

    return NextResponse.json({ success: true, presentation: analyzedSlides });
  } catch (error: any) {
    console.warn("Erro interno ao analisar apresentação externa:", error?.message || error);
    const fallback = fallbackSlideAnalysis(
      body?.presentationTitle || "Apresentação Externa",
      Array.isArray(body?.slides) ? body.slides : [],
      body?.style || "dark-slate"
    );
    return NextResponse.json({ success: true, presentation: fallback });
  }
}

function fallbackSlideAnalysis(title: string, slides: any[], theme: string) {
  const formattedSlides = slides.map((s: any, idx: number) => {
    const isFirst = idx === 0;
    const isLast = idx === slides.length - 1 && slides.length > 1;
    const sTitle = s.title || `Slide ${idx + 1}`;
    const sBullets = Array.isArray(s.bullets) && s.bullets.length > 0 ? s.bullets : ["Tópico principal"];

    let narration = "";
    if (isFirst) {
      narration = `Sejam bem-vindos a esta apresentação sobre ${sTitle}. A seguir, veremos os pontos estratégicos e conteúdos essenciais preparados para este material.`;
    } else if (isLast) {
      narration = `Concluindo nossa apresentação sobre ${sTitle}, ressaltamos os resultados alcançados e os próximos passos para colocar essas diretrizes em prática. Obrigado pela atenção.`;
    } else {
      narration = `Neste slide analisamos ${sTitle}. Observamos que ${sBullets.join(", bem como ")}. Essas etapas reforçam a eficácia de toda a operação.`;
    }

    return {
      slideNumber: idx + 1,
      layout: isFirst ? "title" : isLast ? "conclusion" : idx % 2 === 1 ? "split-right-image" : "cards",
      title: sTitle,
      subtitle: isFirst ? "Apresentação Importada e Analisada" : undefined,
      bullets: sBullets,
      narration,
      highlightTag: isFirst ? "VISÃO GERAL" : isLast ? "CONCLUSÃO" : `SLIDE ${idx + 1}`,
    };
  });

  return {
    title: title || "Apresentação Externa Carregada",
    subtitle: "Roteiros de narração gerados automaticamente para vídeo",
    theme: theme || "dark-slate",
    slides: formattedSlides,
  };
}
