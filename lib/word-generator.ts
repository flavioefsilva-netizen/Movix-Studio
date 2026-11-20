import JSZip from "jszip";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { PhotoNarrationMode, PhotoStoryItem } from "@/types/presentation";

export interface GeneratedWordResult {
  url: string;
  fileName: string;
  blob: Blob;
}

export interface ParsedWordNarrationResult {
  success: boolean;
  entries: Map<number, string>;
  error?: string;
}

export async function generateNarrationWordDocument(
  photoItems: PhotoStoryItem[],
  options?: {
    mode?: PhotoNarrationMode | null;
    unifiedText?: string;
    projectTitle?: string;
  }
): Promise<GeneratedWordResult> {
  const mode = options?.mode || "per-photo";
  const unifiedText = (options?.unifiedText || "").trim();
  const projectTitle = (options?.projectTitle || "Roteiro de Narração das Fotos").trim();

  const entries: Array<{ label: string; text: string }> = [];

  if (mode === "single-text" && unifiedText.length > 0 && photoItems.length > 0) {
    const allWords = unifiedText.split(/\s+/).filter(Boolean);
    const wordsPerPhoto = Math.max(1, Math.ceil(allWords.length / photoItems.length));

    photoItems.forEach((item, idx) => {
      const startW = idx * wordsPerPhoto;
      const endW = Math.min(allWords.length, (idx + 1) * wordsPerPhoto);
      const segmentText = allWords.slice(startW, endW).join(" ");
      if (segmentText) {
        entries.push({
          label: `Foto ${item.order || idx + 1}`,
          text: segmentText,
        });
      }
    });
  } else {
    photoItems.forEach((item, idx) => {
      const text = (item.narration || "").trim();
      if (text.length > 0) {
        entries.push({
          label: `Foto ${item.order || idx + 1}`,
          text,
        });
      }
    });
  }

  const children: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: projectTitle,
          bold: true,
          size: 32,
          font: "Calibri",
          color: "0C4A6E",
        }),
      ],
      spacing: { after: 280 },
    }),
  ];

  if (entries.length === 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Nenhum texto de narração foi preenchido nas fotos.",
            italics: true,
            size: 24,
            font: "Calibri",
            color: "475569",
          }),
        ],
        spacing: { after: 240 },
      })
    );
  } else {
    entries.forEach((entry, index) => {
      // Descrição antes de cada texto: Foto 1, Foto 2, Foto 3...
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: entry.label,
              bold: true,
              size: 26,
              font: "Calibri",
              color: "0369A1",
            }),
          ],
          spacing: {
            before: index === 0 ? 120 : 200,
            after: 100,
          },
        })
      );

      // Texto de narração da foto (preservando eventuais quebras de linha)
      const lines = entry.text.split(/\r?\n/);
      lines.forEach((line, lineIdx) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 24,
                font: "Calibri",
                color: "0F172A",
              }),
            ],
            spacing: {
              line: 320,
              after: lineIdx === lines.length - 1 ? 160 : 80,
            },
          })
        );
      });

      // Linhas espaçadas separando texto por texto
      if (index < entries.length - 1) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "" })],
            spacing: { before: 120, after: 120 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "" })],
            spacing: { before: 120, after: 120 },
          })
        );
      }
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const rawBlob = await Packer.toBlob(doc);
  const wordBlob = new Blob([rawBlob], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(wordBlob);
  const safeBase = projectTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return {
    url,
    fileName: `${safeBase || "roteiro_narracao_fotos"}.docx`,
    blob: wordBlob,
  };
}

/**
 * Gera o modelo Word (.docx) com FOTO 1 + texto modelo na linha de baixo,
 * e FOTO 2 + texto modelo na linha de baixo.
 */
export async function generateNarrationTemplateWordDocument(): Promise<GeneratedWordResult> {
  const children: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: "FOTO 1",
          bold: true,
          size: 26,
          font: "Calibri",
          color: "0369A1",
        }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Escreva aqui o texto modelo de narração que será exibido e falado na Foto 1 do seu vídeo.",
          size: 24,
          font: "Calibri",
          color: "0F172A",
        }),
      ],
      spacing: { after: 220 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "FOTO 2",
          bold: true,
          size: 26,
          font: "Calibri",
          color: "0369A1",
        }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Escreva aqui o texto modelo de narração para a Foto 2. Você pode repetir o mesmo padrão com FOTO 3, FOTO 4 e assim por diante.",
          size: 24,
          font: "Calibri",
          color: "0F172A",
        }),
      ],
      spacing: { after: 160 },
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const rawBlob = await Packer.toBlob(doc);
  const wordBlob = new Blob([rawBlob], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(wordBlob);

  return {
    url,
    fileName: "modelo_texto_fotos.docx",
    blob: wordBlob,
  };
}

function extractParagraphLinesFromDocxXml(xmlText: string): string[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");
  const parseError = xmlDoc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Não foi possível ler o conteúdo XML do documento Word.");
  }

  const lines: string[] = [];
  const allElements = Array.from(xmlDoc.getElementsByTagName("*"));
  const topLevelParagraphs = allElements.filter((el) => {
    if (el.localName !== "p") return false;
    let curr = el.parentElement;
    while (curr) {
      if (curr.localName === "p") return false;
      curr = curr.parentElement;
    }
    return true;
  });

  for (const p of topLevelParagraphs) {
    let buffer = "";
    const walk = (node: Node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      const name = el.localName;
      if (name === "t") {
        buffer += el.textContent || "";
        return;
      }
      if (name === "br" || name === "cr") {
        buffer += "\n";
        return;
      }
      if (name === "tab") {
        buffer += " ";
        return;
      }
      for (let i = 0; i < el.childNodes.length; i++) {
        walk(el.childNodes[i]);
      }
    };
    walk(p);

    const splitLines = buffer.split(/\r?\n/);
    for (const line of splitLines) {
      lines.push(line);
    }
  }

  return lines;
}

async function extractLinesFromWordOrTextFile(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Verifica magic bytes de arquivo ZIP (.docx padrão)
  const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;

  if (isZip) {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const documentXmlFile = zip.file("word/document.xml");
    if (!documentXmlFile) {
      throw new Error("O arquivo selecionado não parece ser um documento Word (.docx) válido.");
    }
    const xmlText = await documentXmlFile.async("text");
    return extractParagraphLinesFromDocxXml(xmlText);
  }

  // Fallback para arquivo de texto puro (.txt) ou .doc legado
  const lowerName = (file.name || "").toLowerCase();
  if (lowerName.endsWith(".doc") && !lowerName.endsWith(".docx")) {
    // Tenta extrair sequências legíveis UTF-8/Latin1 caso seja .doc binário simples
    const latinText = new TextDecoder("latin1").decode(bytes);
    const matches = latinText.match(/[A-Za-zÀ-ÿ0-9.,;:!?()'"\-\s]{4,}/g) || [];
    const joined = matches.join("\n");
    return joined.split(/\r?\n/);
  }

  const text = await file.text();
  return text.split(/\r?\n/);
}

/**
 * Lê um arquivo Word (.docx) contendo "FOTO 1" seguido do texto na linha abaixo,
 * "FOTO 2" seguido do texto na linha abaixo, e assim por diante.
 * Exige obrigatoriamente a presença de "FOTO 1".
 */
export async function parseNarrationWordFile(
  file: File
): Promise<ParsedWordNarrationResult> {
  try {
    const lines = await extractLinesFromWordOrTextFile(file);

    const entries = new Map<number, string>();
    let currentPhotoNum: number | null = null;
    let currentLines: string[] = [];

    const flushCurrent = () => {
      if (currentPhotoNum === null) return;
      // Remove linhas vazias apenas no início e no fim do bloco
      const trimmedLines = [...currentLines];
      while (trimmedLines.length > 0 && trimmedLines[0].trim() === "") {
        trimmedLines.shift();
      }
      while (trimmedLines.length > 0 && trimmedLines[trimmedLines.length - 1].trim() === "") {
        trimmedLines.pop();
      }
      const joinedText = trimmedLines.join("\n").trim();
      const existing = entries.get(currentPhotoNum);
      if (existing !== undefined && existing.length > 0 && joinedText.length > 0) {
        entries.set(currentPhotoNum, `${existing}\n${joinedText}`);
      } else if (existing === undefined || joinedText.length > 0) {
        entries.set(currentPhotoNum, joinedText);
      }
    };

    // Aceita "FOTO 1", "Foto 1", "FOTO 1:", "FOTO 1 -", "FOTO 01" (com ou sem texto após dois-pontos)
    const markerRegex = /^\s*foto\s*0*(\d+)\s*(?:[:.\-–—]\s*(.*))?$/i;

    for (const rawLine of lines) {
      const cleanLine = rawLine.replace(/\u00A0/g, " ");
      const match = cleanLine.match(markerRegex);
      if (match) {
        flushCurrent();
        currentPhotoNum = parseInt(match[1], 10);
        currentLines = [];
        const inlineRemainder = (match[2] || "").trim();
        if (inlineRemainder.length > 0) {
          currentLines.push(inlineRemainder);
        }
      } else if (currentPhotoNum !== null) {
        currentLines.push(cleanLine.trimEnd());
      }
    }

    flushCurrent();

    if (!entries.has(1)) {
      return {
        success: false,
        entries: new Map(),
        error:
          'O arquivo Word precisa conter obrigatoriamente a descrição "FOTO 1" e o texto correspondente na linha abaixo. Baixe o modelo de Word para ver o formato exato.',
      };
    }

    return {
      success: true,
      entries,
    };
  } catch (err: any) {
    return {
      success: false,
      entries: new Map(),
      error:
        err?.message ||
        "Não foi possível ler o arquivo Word. Salve o documento como .docx e tente novamente.",
    };
  }
}
