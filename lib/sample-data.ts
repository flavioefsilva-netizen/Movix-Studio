import { AttachedPhoto, PresentationData } from "@/types/presentation";

function createSvgDataUrl(title: string, color1: string, color2: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}" />
        <stop offset="100%" stop-color="${color2}" />
      </linearGradient>
      <linearGradient id="glow" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.2" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#grad)" rx="24"/>
    <circle cx="650" cy="150" r="120" fill="url(#glow)"/>
    <circle cx="150" cy="450" r="180" fill="url(#glow)"/>
    <rect x="80" y="80" width="640" height="440" rx="16" fill="#000000" fill-opacity="0.3" stroke="#ffffff" stroke-opacity="0.2" stroke-width="2"/>
    <circle cx="160" cy="180" r="40" fill="#ffffff" fill-opacity="0.9"/>
    <path d="M148 180 L158 190 L176 170" stroke="${color1}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M120 400 L240 330 L360 360 L480 260 L600 200 L680 160" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
    <circle cx="680" cy="160" r="8" fill="#34D399"/>
    <text x="240" y="175" fill="#ffffff" font-family="Arial, sans-serif" font-size="32" font-weight="bold">${title}</text>
    <text x="240" y="210" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="18">MOVIX Studio Asset • Qualidade HD</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

let photoCounter = 0;

export function generateSamplePhoto(title: string, color1: string, color2: string, fixedId?: string): AttachedPhoto {
  photoCounter++;
  const id = fixedId || `sample-photo-${photoCounter}`;
  return {
    id,
    name: `${title.toLowerCase().replace(/\s+/g, "_")}.svg`,
    dataUrl: createSvgDataUrl(title, color1, color2),
    type: "image/svg+xml",
    size: 24000,
    caption: title,
  };
}

export const DEFAULT_SAMPLE_PHOTOS: AttachedPhoto[] = [
  generateSamplePhoto("Crescimento & Inovação", "#38BDF8", "#1E40AF", "sample-photo-1"),
  generateSamplePhoto("Tecnologia e IA", "#818CF8", "#4C1D95", "sample-photo-2"),
  generateSamplePhoto("Resultados de Sucesso", "#34D399", "#065F46", "sample-photo-3"),
];

export const SAMPLE_PRESETS = [
  {
    name: "🚀 Lançamento de Produto Inovador",
    prompt: `Crie uma apresentação estratégica de lançamento para a nossa nova plataforma SaaS de Automação Inteligente MOVIX 2026.
Pontos principais:
- O desafio: empresas gastam 40% do tempo em processos manuais repetitivos de comunicação e relatórios.
- A solução MOVIX: Inteligência artificial que converte dados e roteiros em apresentações visuais e vídeos narrados em minutos.
- Funcionalidades chave: exportação nativa em PowerPoint (.pptx), sincronização de narração vocal humanizada, e distribuição automática via Telegram.
- Resultados esperados: 85% de redução no tempo de produção e aumento de 3x no engajamento dos clientes.
- Chamada para ação: Inicie o teste piloto com a equipe executiva hoje mesmo.`,
    theme: "dark-slate" as const,
  },
  {
    name: "📊 Apresentação de Resultados & Metas",
    prompt: `Relatório Executivo de Desempenho e Metas Estratégicas:
- Visão geral do trimestre: crescimento de 142% na receita e superação de todas as metas operacionais.
- Indicadores chave: retenção de clientes acima de 96%, expansão de canais digitais e otimização de custos em 24%.
- Destaques de equipe: novos produtos entregues antes do prazo com nota máxima de satisfação dos usuários.
- Plano de expansão para o próximo semestre: abertura de novos mercados internacionais e investimento em automação de mídia.
- Conclusão: agradecimento ao time e alinhamento das próximas prioridades.`,
    theme: "corporate-navy" as const,
  },
  {
    name: "🎓 Treinamento & Boas Práticas",
    prompt: `Treinamento Corporativo: Excelência Operacional e Produtividade com IA:
- Objetivo do treinamento: capacitar colaboradores no uso diário de ferramentas inteligentes para geração de conteúdo e apresentações.
- Módulo 1: Como estruturar prompts e comandos claros para síntese executiva.
- Módulo 2: Curadoria de imagens, branding visual e formatação de slides de alto padrão.
- Módulo 3: Narração de roteiros e transformação em vídeo para treinamentos assíncronos.
- Próximos passos: realização do exercício prático e certificação interna da equipe.`,
    theme: "emerald-tech" as const,
  },
];

export const INITIAL_PRESENTATION: PresentationData = {
  title: "Apresentação Estratégica MOVIX",
  subtitle: "Transformação de Textos em PowerPoint e Vídeos com Narração de Voz",
  theme: "dark-slate",
  customBgColor: "#0F172A",
  slides: [
    {
      id: "slide-1",
      slideNumber: 1,
      layout: "title",
      title: "MOVIX: Do Texto ao Vídeo Narrado",
      subtitle: "Automação Completa de Apresentações PowerPoint e Conteúdo Audiovisual",
      bullets: [
        "Criação instantânea de slides estruturados a partir de comandos de texto",
        "Integração nativa com fotos e imagens anexadas",
        "Conversão direta em vídeo com narração vocal sincronizada",
      ],
      narration:
        "Bem-vindos ao MOVIX Studio. Esta é uma demonstração prática de como transformar textos e ideias em apresentações completas de PowerPoint e vídeos narrados em alta definição.",
      highlightTag: "VISÃO GERAL",
      recommendedImageDescription: "Slide de capa institucional",
      photoId: "sample-photo-1",
    },
    {
      id: "slide-2",
      slideNumber: 2,
      layout: "split-right-image",
      title: "Como Funciona o Processo",
      subtitle: "Três etapas simples e poderosas",
      bullets: [
        "1. Insira ou cole seus comandos e tópicos no campo de texto",
        "2. Anexe fotos para ilustrar e personalizar cada slide",
        "3. Valide os slides e converta em vídeo narrado com um clique",
      ],
      narration:
        "O processo foi desenhado para máxima agilidade: você insere os textos, adiciona suas fotos preferidas e com apenas um clique valida e gera o vídeo final com narração.",
      highlightTag: "ETAPAS",
      recommendedImageDescription: "Fluxograma ou gráfico de processo",
      photoId: "sample-photo-2",
    },
    {
      id: "slide-3",
      slideNumber: 3,
      layout: "cards",
      title: "Recursos e Benefícios Exclusivos",
      subtitle: "Produtividade exponencial para suas apresentações",
      bullets: [
        "Exportação de arquivos .PPTX compatíveis com PowerPoint e Google Slides",
        "Sincronização de legendas e narração de voz em tempo real",
        "Download imediato do vídeo em alta qualidade",
        "Notificações automáticas integradas diretamente ao Telegram",
      ],
      narration:
        "Tenha em mãos apresentações editáveis em formato PowerPoint, vídeos prontos para envio a clientes e integração nativa para notificações instantâneas no Telegram.",
      highlightTag: "RECURSOS",
      recommendedImageDescription: "Painel de recursos e métricas",
      photoId: "sample-photo-3",
    },
  ],
};
