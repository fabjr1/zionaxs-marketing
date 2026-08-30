# Ferramentas de vídeo: levantamento e escolha

Pesquisa feita em 29/08/2026, a pedido do Fabiano. Este documento existe para que a comparação não morra na sessão de chat.

**Decisão tomada em 29/08/2026:** começar pela camada de motion, com Remotion, sem nenhum modelo generativo. As outras camadas ficam registradas aqui como mapa, não como compra.

## Por que a pergunta "qual a melhor ferramenta" não tem resposta única

"Ferramenta de vídeo" hoje são 4 camadas diferentes, e a melhor de cada uma é de uma empresa diferente. Quem trata como uma coisa só compra editor esperando resolver identidade visual.

| Camada | O que resolve | Melhor opção hoje |
|---|---|---|
| 1. Motion com a marca | Tipografia, layout, timing, legenda queimada | **Remotion** |
| 2. Modelos generativos | B-roll, cena, plano de apoio | **Seedance 2.5**, com Kling v3 para gente em cena |
| 3. Voz e corte | Narração, legenda automática, recorte | ElevenLabs; Opus Clip só se houver vídeo longo |
| 4. Distribuição | Publicar e reconciliar | O que já existe neste repositório |

## Camada 1: motion com a marca

| Ferramenta | Licença | Leitura |
|---|---|---|
| **Remotion** | Grátis para pessoa física e empresa com até 3 funcionários. Acima disso: 25 dólares por assento/mês na trilha Creators, ou 0,01 dólar por render com mínimo de 100 dólares/mês na trilha Automators. Enterprise a partir de 500 dólares/mês | Padrão de fato. React, ecossistema maduro, timeline e áudio de verdade |
| Motion Canvas | MIT | TypeScript, animação por generator, editor ao vivo para sincronizar com áudio |
| Revideo | Aberto | O alternativo mais próximo em espírito código-primeiro |
| MotionForge | Aberto | React, efeitos prontos, export por WebCodecs |
| JSON2Video | SaaS | Contrato JSON com TTS e legenda inclusos, integra n8n e Make |
| Playwright mais ffmpeg | Já instalado aqui | Zero dependência nova, e os 14 gates continuam medindo quadro a quadro |

**Escolhido: Remotion.** O corte da licença é 4 funcionários ou mais, então no tamanho atual da Zionaxs o custo é zero. Ficaria em Playwright mais ffmpeg se o objetivo fosse só dar movimento lento ao pôster; como o objetivo inclui timing, easing e áudio, escrever isso à mão em laço de Playwright fica pior a cada peça.

## Camada 2: modelos generativos

Os rankings discordam entre si, e essa discordância é o dado mais honesto do levantamento.

| Arena | Líder na data consultada |
|---|---|
| Artificial Analysis, sem áudio | Gemini Omni Flash (Elo 1324), MiniMax H3 (1301), HappyHorse 1.0 (1283), Seedance 2.0 (1267) |
| Artificial Analysis, com áudio | Wan 3.0 (1241), Gemini Omni Flash (1237) |
| LLM Stats, agosto de 2026 | Kling v3 (1934), Happy Horse 1.0, Seedance 2.0 Fast |
| Lumenfall, julho de 2026 | Seedance 2.0 (Elo 1242, 80,6% de vitórias) |

Consenso prático: Kling entrega movimento humano melhor, Veo entrega movimento de câmera melhor, Runway obedece melhor ao prompt, Seedance é o mais confiável quando o mesmo produto precisa aparecer igual em várias tomadas.

Preço de referência: Kling 3.0 em torno de 0,10 dólar por segundo, Veo 3.1 a partir de 0,15 em modo rápido. Um vídeo de 20 segundos com 4 planos gerados custa entre 2 e 4 dólares.

**Alerta:** as fontes indicam que o Sora 2 foi descontinuado em 26/04/2026, com a API desligando em 24/09/2026. A informação veio de blog agregador, não da OpenAI, e precisa de confirmação na fonte antes de qualquer uso. O recado prático já vale: não construir pipeline sobre o Sora.

## Camada 3: voz e corte

ElevenLabs segue na frente em qualidade bruta. PlayHT 3.0 encostou e cobra menos (900 vozes, 142 idiomas). Murf tem variante regional de português do Brasil. Chatterbox é a melhor opção aberta.

Em corte e legenda dominam Opus Clip (recorte de vídeo longo com nota de viralidade), Descript (editar vídeo editando a transcrição), Submagic (legenda animada), Captions (avatar e restyle) e DaVinci Resolve 20.

**Decisão contrária à moda:** legenda da Zionaxs não sai de Submagic nem de Opus Clip. Essas ferramentas trazem tipografia genérica de TikTok, e a marca tem Poppins 700 e o pôster editorial aprovado. Legenda queimada pelo próprio renderer preserva a identidade e pode virar gate de contraste, coisa que hoje nenhum gate faz sobre pixel de foto.

## Camada 4: avatar

HeyGen ganha para marketing e social (175 idiomas, 600 avatares, Avatar IV, português do Brasil com lipsync). Synthesia ganha para treinamento corporativo.

**Fora do escopo por decisão editorial.** Avatar sintético falando contradiz uma marca que vende critério de engenharia.

## O que já está ligado nesta máquina

Existe um MCP da Higgsfield conectado, com Seedance 2.0, 2.5 e Mini, Kling v3 e Turbo, Veo 3.1, Gemini Omni Flash 1.1, Wan 3.0, MiniMax H3, além de um Marketing Studio que monta anúncio em formato Reels de 12 a 15 segundos e um clipador de YouTube com legenda.

A conta está em plano free com 2 créditos, ou seja, desligada na prática. Ligar isso é decisão de dinheiro, e ela vem depois de a camada 1 provar valor.

## O que não fazer

1. Não construir sobre o Sora.
2. Não terceirizar legenda para ferramenta de tipografia genérica.
3. Não pagar plano de modelo generativo antes de decidir se b-roll entra na linha editorial.

## Fontes

- Remotion, licença e preço: https://www.remotion.dev/docs/license/pricing e https://www.remotion.dev/docs/license/faq
- Alternativas ao Remotion: https://www.wireflow.ai/blog/best-remotion-alternatives-in-2026 e https://autoae.online/blog/revideo-vs-remotion-2026
- Rankings de modelos: https://artificialanalysis.ai/video/leaderboard/text-to-video, https://llm-stats.com/leaderboards/best-ai-for-video-generation, https://lumenfall.ai/arena/text-to-video
- Comparativos de modelos: https://tech-insider.org/best-ai-video-generator-2026/ e https://opencreator.io/blog/ai-video-models-comparison-2026
- Edição e legenda: https://www.forasoft.com/learn/ai-for-video-engineering/articles-ai/opus-clip-descript-submagic-captions-ai-video-editor-tools-2026
- Avatar: https://wavespeed.ai/blog/posts/heygen-vs-synthesia-comparison-2026/
- Voz: https://murf.ai/alternative/elevenlabs

## Implementação

O teste da camada 1 vive em `sistema/video/`. Ver o README de lá para o que já está provado e o que falta.
