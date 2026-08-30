// render.mjs — render em duas etapas, e a razão de não ser uma só está aqui.
//
// O `remotion render` normal escreve o mp4 pelo compositor próprio do Remotion
// (um binário Rust com ffmpeg embutido). Nesta máquina ele morre com 0xC0E90002,
// e o log de Code Integrity diz o motivo exato: o processo sobe e é barrado ao
// carregar a avfilter-10.dll que vem ao lado dele. O Smart App Control está
// ligado (HKLM\SYSTEM\CurrentControlSet\Control\CI\Policy →
// VerifiedAndReputablePolicyState = 1). Não é só falta de assinatura: o
// chrome-headless-shell.exe também está sem assinar e roda; o que falta às DLLs
// de FFmpeg do pacote npm é reputação. O README tem o diagnóstico completo.
//
// A saída é render por sequência de PNG, que sai do próprio Chromium via CDP e
// não toca no compositor, seguida do ffmpeg do sistema (9.0, já instalado e
// liberado) para fechar o mp4. Efeito colateral bom: o quadro fica em disco
// como PNG, que é exatamente o formato que os gates do marketing-os medem.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { derivar } from '../src/tempo.js';
import { pecaAtual, contratoDa } from './peca-atual.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const comp = process.argv[2] || pecaAtual();
const contrato = contratoDa(comp);
const linha = derivar(contrato);
const frames = path.join(root, 'out', comp);
const mp4 = path.join(root, 'out', `${comp}.mp4`);
const provasDir = path.join(root, 'out', `${comp}-provas`);

// Sem shell em nenhum dos dois: o ffmpeg o Windows resolve sozinho pelo PATH, e
// o CLI do Remotion é chamado pelo arquivo .js, não pelo npx. O npx é um .cmd,
// e o Node se recusa a executar .cmd sem shell desde a correção do CVE-2024-27980.
const REMOTION_CLI = path.join(root, 'node_modules/@remotion/cli/remotion-cli.js');

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
}

fs.rmSync(frames, { recursive: true, force: true });
fs.rmSync(provasDir, { recursive: true, force: true });
run(process.execPath, [REMOTION_CLI, 'render', 'src/index.jsx', comp, path.relative(root, frames), '--sequence', '--image-format=png']);

// Quantos dígitos o Remotion usou no nome do quadro. Ele ajusta a largura ao
// total de quadros, então uma peça mais longa passa de element-000 para
// element-0000 e um padrão fixo quebra sem aviso.
const PAD = (fs.readdirSync(frames).find((f) => f.endsWith('.png')) || '').replace(/\D/g, '').length || 3;

// O quadro entra em PNG, sem perda nenhuma até aqui. Quem decide a qualidade
// final é só esta chamada, e ela tem uma armadilha medida em 29/08/2026.
//
// O h264 não guarda RGB: guarda luma e croma, e o arquivo precisa DIZER com
// qual matriz essa conversão foi feita. Sem dizer, o ffmpeg convertia usando
// BT.601, o padrão dele quando ninguém especifica, e gravava sem marca nenhuma.
// Todo player de HD lê arquivo sem marca como BT.709. Resultado medido no
// laranja da marca, no quadro 180:
//
//   fonte PNG           R=245 G=73 B=3
//   sem marca, lido 709 R=255 G=84 B=0   (estourado e mais amarelo)
//   com esta linha      R=245 G=71 B=2
//
// SSIM do quadro inteiro contra a fonte, lido como player lê: 0.67 sem marca,
// 0.91 com. Cuidado ao reconferir: medir com o próprio ffmpeg SEM forçar 709
// dá 0.96 para o arquivo sem marca, porque aí ele decodifica com a mesma
// suposição errada com que codificou, e o erro se cancela sozinho.
//
// Por isso a conversão é explícita no filtro, e não só declarada nas marcas:
// filtro e marca precisam contar a mesma história.
//
// -crf 18 com preset slow: o Instagram recomprime por cima, então folga de
//   bitrate custa pouco e evita banding no laranja chapado.
// full_chroma_int + accurate_rnd: o 4:2:0 joga fora 3/4 da informação de cor,
//   e é onde texto branco sobre laranja saturado ganha franja.
// Áudio. Dois caminhos, e o contrato escolhe:
//
//   sem `trilha_embutida`  → faixa muda. Reels sem nenhuma faixa dá
//     processamento imprevisível e o post fica sem "áudio original", que é o
//     campo onde a música entra depois, pelo app.
//
//   com `trilha_embutida`  → o arquivo declarado entra no mp4, normalizado em
//     EBU R128 e com fade no fim. É o ÚNICO jeito de um Reels publicado por
//     API sair com música: a Graph API não tem parâmetro para a biblioteca do
//     Instagram, nem com faixa nem sem faixa.
//
// O que o contrato NÃO decide é a licença. Música comercial embutida no
// arquivo é silenciada pelo Rights Manager do Instagram, porque a licença da
// biblioteca do app não acompanha o mp4. Por isso `trilha_embutida.licenca` é
// obrigatória e o porteiro recusa sem ela.
const trilha = contrato.trilha_embutida;
const arquivoTrilha = trilha ? path.resolve(root, 'pecas', comp, trilha.arquivo) : null;
if (trilha && !fs.existsSync(arquivoTrilha)) {
  console.error(`contrato pede trilha embutida que não existe: ${arquivoTrilha}`);
  process.exit(1);
}

const entradaAudio = trilha
  ? ['-i', path.relative(root, arquivoTrilha)]
  : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'];

const filtroAudio = trilha
  ? [
      '-af', [
        `volume=${trilha.ganho_db ?? 0}dB`,
        'loudnorm=I=-14:TP=-1.5:LRA=11',
        `afade=t=out:st=${(linha.total / linha.fps - (trilha.fade_out_s ?? 1.5)).toFixed(2)}:d=${trilha.fade_out_s ?? 1.5}`,
      ].join(','),
    ]
  : [];

run('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-framerate', String(linha.fps), '-start_number', '0',
  '-i', path.join(path.relative(root, frames), `element-%0${PAD}d.png`),
  ...entradaAudio,
  ...filtroAudio,
  '-c:a', 'aac', '-b:a', trilha ? '192k' : '128k', '-shortest',
  // O setparams carimba as 4 marcas no quadro. Sem ele, as opções de saída
  // gravavam só a matriz, e primaries e transfer saíam como "unknown".
  '-vf', [
    'scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=full_chroma_int+accurate_rnd',
    'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv',
  ].join(','),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  path.relative(root, mp4),
]);

// A sequência inteira custa centenas de MB e já cumpriu o papel dela: o mp4
// está fechado. Ficam só os quadros de prova, que é o que uma revisão ou um
// gate precisa olhar. Render é determinístico, então o resto se refaz.
fs.mkdirSync(provasDir, { recursive: true });
for (const n of linha.provas) {
  const nome = `element-${String(n).padStart(PAD, '0')}.png`;
  fs.copyFileSync(path.join(frames, nome), path.join(provasDir, `batida-${n}.png`));
}
const antes = fs.readdirSync(frames).reduce((t, f) => t + fs.statSync(path.join(frames, f)).size, 0);
fs.rmSync(frames, { recursive: true, force: true });

const { size } = fs.statSync(mp4);
const mb = (n) => (n / 1024 / 1024).toFixed(2);
console.log(`${path.relative(root, mp4)} pronto (${mb(size)} MB)`);
console.log(`provas: ${linha.provas.length} quadros em ${path.relative(root, provasDir)}`);
console.log(`sequência apagada: ${mb(antes)} MB liberados`);
