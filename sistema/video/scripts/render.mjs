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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const comp = process.argv[2] || 'zx-teste';
const frames = path.join(root, 'out', comp);
const mp4 = path.join(root, 'out', `${comp}.mp4`);

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
run(process.execPath, [REMOTION_CLI, 'render', 'src/index.jsx', comp, path.relative(root, frames), '--sequence', '--image-format=png']);

// -crf 18 e preset slow: o Instagram recomprime, então entregar folga de bitrate
// custa pouco e evita banding no campo laranja chapado.
run('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-framerate', '30', '-start_number', '0',
  '-i', path.join(path.relative(root, frames), 'element-%03d.png'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  path.relative(root, mp4),
]);

const { size } = fs.statSync(mp4);
console.log(`${path.relative(root, mp4)} pronto (${(size / 1024 / 1024).toFixed(2)} MB)`);
