# Camada de motion da Zionaxs (Remotion)

A camada 1 do levantamento em [`campanhas/zionaxs/ferramentas-de-video.md`](../../campanhas/zionaxs/ferramentas-de-video.md), implementada. Pergunta que este pacote responde: **o pôster editorial aprovado sobrevive em movimento, com a tipografia e o chrome da marca, sem virar vídeo genérico de rede social?** Resposta: sim.

```bash
cd sistema/video && npm install && npm run render
```

Saída em `out/<id-da-peça>.mp4`, formato `story-9x16` (1080×1920), 30 fps.
Para mexer na peça com preview ao vivo: `npm run studio`.

## A peça nasce de contrato

Aqui não existe copy escrita à mão em componente. A peça é um `contract.json` em `pecas/<id>/`, no mesmo espírito do contrato de carrossel: tese, brief de pesquisa com evidência classificada, batidas com duração e copy, `approved_visible_copy`, `alt`, legenda com fontes e `trilha_sugerida`. Trocar de peça é trocar o import em `src/peca.js`.

A peça vive aqui, e não em `sistema/workspace/pieces/`, porque o renderer do marketing-os ainda não conhece o formato e a auditoria varre aquela pasta esperando carrossel. Quando o `gen.js` aprender vídeo, a peça muda de endereço.

| Arquivo | Papel |
|---|---|
| `pecas/<id>/contract.json` | A peça: o que ela diz, em quantos quadros, com que evidência |
| `src/tempo.js` | Deriva a linha do tempo do contrato. Composição e render leem daqui, para não terem duas cópias do mesmo número |
| `src/cenas.jsx` | Uma cena por tipo de batida. O contrato escolhe qual pelo campo `cena` |
| `src/ui.jsx` | Chrome de prova de impressão, grão, régua de progresso e os primitivos de movimento |
| `src/fonts.js` | Carrega Poppins 700, Archivo e JetBrains Mono do brand pack e segura o render até a face estar pronta |
| `scripts/sync-brand.mjs` | Copia fontes, logo e fotos do brand pack para `public/`, e extrai os tokens de cor de `brand.json` |
| `scripts/render.mjs` | Render em sequência de PNG mais ffmpeg do sistema. O porquê está abaixo |

O brand pack em `sistema/workspace/brand/` continua sendo fonte única. Nada de cor, fonte ou logo é redigitado aqui: `public/` e `src/brand-tokens.json` são artefatos gerados, e por isso ficam fora do git.

## As regras de movimento

Vieram da pesquisa registrada em `skills/video/references/edit-anatomy.md`, `skills/social/references/short-form-video.md` e `skills/ad-creative/references/motion-video-ads.md`, mais o levantamento de motion para social. São 5, e valem para qualquer peça nova:

1. **O movimento pertence ao que a frase diz.** As etiquetas chegam voando porque o pedido chega voando; elas colapsam em uma só porque a decisão é colapsar em uma só; o contador sobe porque o custo sobe. Movimento sem significado é ruído em velocidade de feed.
2. **Um movimento dominante por batida.** Dois lêem como bagunça.
3. **O gancho fecha antes de 1,2 segundo.** É o tempo que a plataforma dá para alguém parar de rolar.
4. **A peça é legível sem som.** Nada da mensagem depende de áudio.
5. **Texto entra por máscara, não por fade.** A linha sobe de dentro de um corte, como tipo saindo da prensa. Fade é o movimento genérico de apresentação de slides, e é o que faz a peça parecer template.

A batida de assinatura segue as mesmas regras: as marcas de registro convergem como quem alinha a chapa, a wordmark é revelada por máscara da esquerda para a direita, como tinta saindo da prensa, e o fio laranja assenta embaixo. Nada de brilho, giro ou salto, porque a marca vende critério de engenharia e logo que dá cambalhota diz o contrário. O chrome sai de cena por fade nessa batida: wordmark no centro com wordmark no topo é a marca duas vezes na mesma tela.

Uma sexta regra saiu de erro próprio: **todo texto de apoio precisa estar inteiro na tela antes de 60% da batida**, senão não sobra tempo de leitura. A primeira montagem colocava a explicação em 65% da batida e ela chegava tarde em 4 das 8.

## O achado que custou a primeira hora

`remotion render` normal escreve o mp4 pelo compositor próprio do Remotion, um binário Rust com ffmpeg embutido. **Nesta máquina esse binário é morto pelo Windows antes de abrir**, com saída `0xC0E90002` e o erro `write EOF` do lado do Node.

Causa, com a linha exata do log de Code Integrity:

> Code Integrity determined that a process (`...\compositor-win32-x64-msvc\remotion.exe`) attempted to load `...\compositor-win32-x64-msvc\avfilter-10.dll` that did not meet the Enterprise signing level requirements.

Ou seja, o executável **começa** a rodar. Quem é barrado é a **DLL do FFmpeg ao lado dele**, `avfilter-10.dll`. Sem a dependência, o processo morre antes de fazer qualquer coisa, e o Node, que estava despejando quadros na entrada dele, só enxerga o cano fechar: daí o `write EOF`, que aponta para o lugar errado.

O **Smart App Control está ligado** nesta máquina (`HKLM\SYSTEM\CurrentControlSet\Control\CI\Policy` → `VerifiedAndReputablePolicyState = 1`).

Cuidado com a explicação fácil: **não é só falta de assinatura**. Conferido com `Get-AuthenticodeSignature`, os quatro binários envolvidos estão sem assinatura, inclusive o `chrome-headless-shell.exe` e o `esbuild.exe`, e esses dois rodam sem problema. O que separa um do outro é reputação: o Smart App Control libera o que é assinado **ou** o que o modelo de reputação da Microsoft reconhece, e as DLLs de FFmpeg que vêm dentro de um pacote npm não são nenhum dos dois. Isso é inferência sobre o critério; o que está provado pelo log é qual arquivo foi barrado.

Como reproduzir o diagnóstico:

```powershell
Get-WinEvent -LogName "Microsoft-Windows-CodeIntegrity/Operational" -MaxEvents 400 | Where-Object { $_.Id -eq 3033 }
```

Saída adotada, sem desligar nada da segurança da máquina:

1. `remotion render ... --sequence --image-format=png` gera os quadros pelo próprio Chromium, via CDP, sem tocar no compositor.
2. O **ffmpeg do sistema** (versão 9.0, já instalado e liberado) fecha o mp4.

Efeito colateral bom: o quadro fica em disco como PNG, que é exatamente o formato que os gates do marketing-os já sabem medir.

## A cor: a armadilha que quase passou

O primeiro mp4 saiu **sem nenhuma marca de espaço de cor**, e isso não é detalhe. O h264 não guarda RGB, guarda luma e croma, e o arquivo precisa dizer com qual matriz a conversão foi feita. Sem dizer, o ffmpeg usa BT.601, que é o padrão dele quando ninguém especifica, e grava sem marca. Todo player de HD lê arquivo sem marca como BT.709. As duas pontas discordam, e a cor anda.

Medido no laranja da marca, quadro 180, lido do jeito que um player lê:

| | R | G | B |
|---|---|---|---|
| Fonte PNG | 245 | 73 | 3 |
| mp4 sem marca | **255** | **84** | **0** |
| mp4 com marca | 245 | 71 | 2 |

O laranja estourava no vermelho e puxava para amarelo. SSIM do quadro inteiro contra a fonte: **0,67 sem marca contra 0,91 com marca**.

**Cuidado ao reconferir isso.** Medir com o próprio ffmpeg, sem forçar BT.709 na leitura, dá 0,96 para o arquivo **sem** marca e 0,91 para o arquivo **com** marca, ou seja, o resultado se inverte e sugere que marcar piora. É miragem: sem marca, o ffmpeg decodifica com a mesma suposição errada com que codificou, e o erro se cancela dentro dele. A conta só fica honesta forçando a leitura em BT.709, que é o que o mundo lá fora faz:

```bash
ffmpeg -i out/zxv-01-uma-porta-so.mp4 -vf "select=eq(n\,180),scale=in_color_matrix=bt709:in_range=tv:out_range=full" -frames:v 1 quadro.png
```

Por isso o `render.mjs` converte no filtro **e** carimba as marcas com `setparams`: filtro e marca precisam contar a mesma história.

## O que está provado

- As faces do brand pack carregam e desenham antes do primeiro frame, sem cair para fallback.
- A assinatura do O vazado foi testada e funciona em movimento, mas não aparece na zxv-01: nenhuma palavra da copy termina em O. Ela entra quando a manchete pedir, nunca forçada.
- O grão de filme, a régua de calibração e a microlinha sobrevivem à compressão do h264.
- A regra de cor do brand pack vale por campo: wordmark branca sobre foto e sobre laranja, preta sobre papel; texto pequeno sobre laranja é tinta, texto grande é papel.
- O render é determinístico e roda por um comando só.
- O laranja #F54502 chega ao arquivo dentro de 2 níveis, com as 4 marcas de cor carimbadas.
- A sequência de PNG é apagada depois do mp4 fechar: ficam o vídeo e 1 quadro de prova por batida, tirado a 72% dela, que é onde tudo já entrou e nada está em movimento. Cerca de 1,4 GB de quadros voltam para o disco a cada render.
- O gate de copy da marca roda sobre o contrato de vídeo: `scanCopy` de `sistema/app/lib/copy-rules.js` varreu os 47 textos da `zxv-01` sem violação. É o mesmo código que cobra o carrossel.

## Medição de contraste sobre foto

Nenhum gate mede tinta contra o pixel real da foto, então a batida de gancho é medida à mão antes de entregar. Amostrando o fundo em 3 pontos da banda de texto da `zxv-01` e comparando com o creme `#EFE7D7`:

| Ponto | Razão |
|---|---|
| À direita do título | 13,98:1 |
| Entre título e apoio | 13,95:1 |
| Atrás do apoio | 14,17:1 |

Piso praticado pela marca: 4,5:1 para qualquer tamanho. Referência: a `zx-22`, publicada e aceita, dá 5,02:1 no pior trecho.

## O que ainda não existe

1. **Gates automáticos.** Nenhum dos 14 gates roda sobre os quadros. Como a saída já é PNG e o contrato já traz `approved_visible_copy`, dá para apontar os gates de contraste e tipografia para os quadros de prova.
2. **Áudio.** O arquivo sai sem faixa nenhuma, e Reels sem faixa dá processamento imprevisível. O mínimo é uma faixa silenciosa; a trilha vem do campo `trilha_sugerida` e entra pelo app do Instagram, igual ao carrossel.
3. **Publicação.** Reels tem fluxo próprio de upload e capa, diferente do carrossel que já está no ar.
4. **Porteiro.** O `pode-publicar.js` não conhece o formato, então cadência e trilha ainda não são cobradas por máquina em vídeo.
5. **Licença.** Remotion é gratuito para empresa com até 3 funcionários. Passando disso, revisar antes de continuar.
