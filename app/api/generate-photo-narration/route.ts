import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { photoTitle, photoName, orderIndex = 1, totalPhotos = 1, storyTheme = "" } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;

    const basePrompt = `Você é um roteirista e locutor profissional de vídeos.
Crie um texto de narração falada em português do Brasil para a foto número ${orderIndex} de um total de ${totalPhotos} fotos.
Detalhes da foto:
- Título/Tema: "${photoTitle || photoName || "Imagem " + orderIndex}"
- Tema geral da história: "${storyTheme || "Vídeo Narrado Dinâmico"}"

Diretrizes:
1. Escreva um texto de narração natural, envolvente e profissional para ser lido em voz alta (cerca de 25 a 45 palavras).
2. Sem marcações markdown (sem asteriscos, sem hashtags, sem aspas desnecessárias).
3. Texto fluido, com pontuação correta para boa entonação de fala.
4. Retorne APENAS um objeto JSON com os campos: "title" (título curto e chamativo de até 5 palavras) e "narration" (texto completo da fala da foto).`;

    const CANDIDATE_MODELS = [
      "gemini-4-hydrogen",
      "gemini-3.1-flash-lite",
    ];

    if (apiKey) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      for (const modelName of CANDIDATE_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [{ role: "user", parts: [{ text: basePrompt }] }],
            config: {
              responseMimeType: "application/json",
            },
          });

          const raw = response.text || "";
          if (raw.trim().startsWith("{")) {
            const parsed = JSON.parse(raw);
            if (parsed.narration) {
              return NextResponse.json({
                success: true,
                title: parsed.title || photoTitle || `Foto ${orderIndex}`,
                narration: parsed.narration,
              });
            }
          }
        } catch {
          continue;
        }
      }
    }

    // High quality contextual fallback in Brazilian Portuguese
    const title = photoTitle || photoName?.replace(/\.[^/.]+$/, "") || `Destaque ${orderIndex}`;
    const fallbacks = [
      `Apresentamos ${title}. Esta imagem reflete a essência do nosso projeto, destacando a precisão, inovação e o cuidado em cada detalhe estratégico.`,
      `Observamos agora ${title}. Um momento fundamental que evidencia o crescimento sustentável e a evolução contínua das nossas iniciativas.`,
      `Aqui temos ${title}. Com tecnologia e dedicação, transformamos desafios em conquistas reais e resultados comprovados para todos os envolvidos.`,
      `Finalizamos com ${title}. Consolidando uma trajetória de excelência e compromisso com o futuro da nossa visão.`,
    ];

    const selectedNarration = fallbacks[(orderIndex - 1) % fallbacks.length];

    return NextResponse.json({
      success: true,
      title: title,
      narration: selectedNarration,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Erro ao gerar narração da foto",
      },
      { status: 500 }
    );
  }
}
