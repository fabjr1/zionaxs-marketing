# Camada de motion da Zionaxs (Remotion)

Teste da camada 1 do levantamento em [`campanhas/zionaxs/ferramentas-de-video.md`](../../campanhas/zionaxs/ferramentas-de-video.md). Pergunta que este pacote responde: **o pôster editorial aprovado sobrevive em movimento, com a tipografia e o chrome da marca, sem virar vídeo genérico de rede social?**

Resposta do primeiro teste: sim.

```bash
cd sistema/video && npm install && npm run render
```

Saída em `out/zx-teste.mp4`, formato `story-9x16` (1080×1920), 30 fps, 12 segundos.
Para mexer no vídeo com preview ao vivo: `npm run studio`.

## Como está montado

| Arquivo | Papel |
|---|---|
| `src/ZxTeste.jsx` | A peça: 3 batidas de 4 segundos, uma por campo (foto escura, laranja chapado, papel claro) |
| `src/fonts.js` | Carrega Poppins 700, Archivo e JetBrains Mono do brand pack e segura o render até a face estar pronta |
| `scripts/sync-brand.mjs` | Copia fontes, logo e foto do brand pack para `public/`, e extrai os tokens de cor de `brand.json` |
| `scripts/render.mjs` | Render em sequência de PNG mais ffmpeg do sistema. O porquê está abaixo |

O brand pack em `sistema/workspace/brand/` continua sendo fonte única. Nada de cor, fonte ou logo é redigitado aqui: `public/` e `src/brand-tokens.json` são artefatos gerados, e por isso ficam fora do git.

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

## O que este teste prova

- As faces do brand pack carregam e desenham antes do primeiro frame, sem cair para fallback.
- A assinatura tipográfica do O vazado funciona em movimento.
- O grão de filme, a régua de calibração e a microlinha sobrevivem à compressão do h264.
- A regra de cor do brand pack vale por campo: wordmark branca sobre foto e sobre laranja, preta sobre papel; texto pequeno sobre laranja é tinta, texto grande é papel.
- O render é determinístico e roda por um comando só.

## O que ainda não existe

1. **Contrato.** A peça está escrita à mão em JSX, o oposto do que o marketing-os faz com carrossel. O passo seguinte é o vídeo nascer de um contrato, igual às peças estáticas.
2. **Gates.** Nenhum dos 14 gates roda sobre os quadros. Como a saída já é PNG, dá para apontar os gates de contraste e tipografia para os frames de batida, e não para o vídeo inteiro.
3. **Áudio.** Nada de trilha. Vale a mesma regra do carrossel: música entra pelo app do Instagram, então o que falta aqui é o campo de trilha sugerida.
4. **Publicação.** Reels tem fluxo próprio de upload e capa, diferente do carrossel que já está no ar.
5. **Licença.** Remotion é gratuito para empresa com até 3 funcionários. Passando disso, revisar antes de continuar.
