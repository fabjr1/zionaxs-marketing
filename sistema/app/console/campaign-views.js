// campaign-views.js — telas do fluxo de campanhas (§11.1, §11.2).
// Mesma régua das telas de peça: HTML no servidor, sem framework, sem estado
// no cliente. As classes CSS vêm de views.js — o console é um só.
//
// Os seis estados de experiência do §11.2 são explícitos aqui: sem contexto,
// brief incompleto, campanha bloqueada, ativo em revisão, leitura insuficiente
// e aprendizado pendente. Cada um diz o que falta e para onde ir.
import { esc } from '../lib/util.js';
import { CAMPAIGN_STATUS, nextAction } from '../lib/campaigns.js';
import { FIELDS, CONDITIONAL_FIELDS, PURPOSES, pendingFields, isApproved, BRIEF_STATUS } from '../lib/brief.js';
import { FRONTS, FRONT_STATUS, executionOrder, gateForAsset } from '../lib/plan.js';
import { CLASSIFICATIONS, FEEDBACK_OUTCOME } from '../lib/feedback.js';
import { PROPOSAL_STATUS } from '../lib/learning.js';
import { READING_LABEL, primaryMetricStatus } from '../lib/measure.js';

export const CAMPAIGN_CSS = `
.cstat{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 14px}
.frentes{display:flex;flex-direction:column;gap:10px}
.frente{background:var(--panel);border:1px solid var(--rule);border-radius:8px;padding:14px 16px}
.frente h4{margin:0 0 6px;font-size:15px}
.frente .meta{font:600 11px/1.6 "JetBrains Mono",monospace;color:var(--ink3);text-transform:uppercase;letter-spacing:.08em}
.dep{font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--ink2)}
.skills{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
.skills span{font:600 11px "JetBrains Mono",monospace;background:var(--panel2);border:1px solid var(--rule2);border-radius:4px;padding:2px 7px;color:var(--ink2)}
.gapl{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.gapl li{border-left:3px solid var(--stop);background:var(--stopw);border-radius:0 6px 6px 0;padding:10px 14px;font-size:14px}
.gapl li.warn{border-left-color:var(--wait);background:var(--waitw)}
.srcrow td{font-size:13px}
.ask{color:var(--human);font-size:13px;display:block;margin-top:4px}
`;

export function campaignPill(status) {
  const map = {
    [CAMPAIGN_STATUS.DRAFT]: 's-wait', [CAMPAIGN_STATUS.CONTEXT]: 's-wait',
    [CAMPAIGN_STATUS.BRIEFING]: 's-hum', [CAMPAIGN_STATUS.PLANNING]: 's-hum',
    [CAMPAIGN_STATUS.PRODUCTION]: 's-wait', [CAMPAIGN_STATUS.REVIEW]: 's-hum',
    [CAMPAIGN_STATUS.APPROVED]: 's-ok', [CAMPAIGN_STATUS.PUBLISHED]: 's-ok',
    [CAMPAIGN_STATUS.MEASURING]: 's-wait', [CAMPAIGN_STATUS.CLOSED]: 's-ok',
    [CAMPAIGN_STATUS.BLOCKED]: 's-stop',
  };
  return `<span class="pill ${map[status] || 's-wait'}">${esc(status)}</span>`;
}

// ---------- fila de campanhas (§11.1) ----------
export function campaignQueueView({ campaigns, brands, token, csrf }) {
  const t = token ? `?t=${encodeURIComponent(token)}` : '';
  const tk = (token ? `<input type="hidden" name="t" value="${esc(token)}">` : '')
    + `<input type="hidden" name="ct" value="${esc(csrf)}">`;

  const rows = campaigns.map((c) => {
    const na = nextAction(c);
    return `<tr>
      <td class="mono"><a href="/campaign/${esc(c.id)}${t}">${esc(c.id)}</a></td>
      <td>${esc(c.campaign.nome)}<br><span class="mono" style="color:var(--ink3)">${esc(c.campaign.marca)}</span></td>
      <td>${campaignPill(c.status)}</td>
      <td>${esc(na.what)}</td>
      <td>${c.blockers.length ? `<span class="pill s-stop">${c.blockers.length}</span>` : '—'}</td>
    </tr>`;
  }).join('');

  const brandOpts = brands.map((b) =>
    `<option value="${esc(b.id)}"${b.valid ? '' : ' disabled'}>${esc(b.id)}${b.valid ? '' : ' (manifesto inválido)'}</option>`).join('');

  const invalid = brands.filter((b) => !b.valid);
  const warn = invalid.length
    ? `<div class="note err">${invalid.length} marca(s) com manifesto inválido: ${invalid.map((b) =>
        `<strong>${esc(b.id)}</strong> — ${esc(b.errors.map((e) => e.msg).join('; '))}`).join(' · ')}</div>`
    : '';

  return `${warn}
<h2>Campanhas</h2>
${campaigns.length ? `<table><thead><tr><th>Campanha</th><th>Nome / marca</th><th>Estado</th><th>Próxima ação</th><th>Bloqueios</th></tr></thead><tbody>${rows}</tbody></table>`
  : '<p><em>nenhuma campanha ainda</em></p>'}

<h3>Abrir campanha</h3>
${brands.length ? `<form class="dec" method="post" action="/campaigns/new">
  ${tk}
  <label for="cb">Marca</label>
  <select id="cb" name="brand" required>${brandOpts}</select>
  <label for="cn">Nome da campanha</label>
  <input id="cn" name="nome" required placeholder="o que esta campanha é, em poucas palavras">
  <div><button class="act plain" type="submit">Abrir — só cria; contexto e Brief vêm depois</button></div>
</form>`
  : '<div class="note err">nenhuma marca declarada — crie <span class="mono">brands/&lt;marca&gt;/manifest.json</span> antes de abrir campanha</div>'}`;
}

// ---------- contexto (§11.1, RF-01) ----------
function contextSection({ c, token, csrf }) {
  const tk = (token ? `<input type="hidden" name="t" value="${esc(token)}">` : '')
    + `<input type="hidden" name="ct" value="${esc(csrf)}">`;
  const refresh = `<form class="dec" method="post" action="/campaign/${esc(c.id)}/context">${tk}
    <div><button class="act plain" type="submit">Consultar a Memory agora</button></div></form>`;

  if (!c.context) {
    // §11.2 "Sem contexto suficiente": explica e encaminha, não mostra plano pronto.
    return `<h2>Contexto</h2>
<div class="note">Nenhuma consulta à Zionaxs Memory ainda. O contexto é o insumo do Brief — sem ele, as respostas do Brief seriam presumidas.</div>
${refresh}`;
  }

  const p = c.context;
  const mem = p.memory || {};
  // §12: o console distingue disponível, verificada, suja, bloqueada e
  // indisponível — "existe no disco" não é a mesma coisa que "confiável".
  const memLine = !mem.available
    ? `<span class="pill s-stop">Memory indisponível</span> ${esc(mem.why || '')}`
    : mem.verified
      ? `<span class="pill s-ok">Memory sincronizada e verificada</span>
         <span class="mono">${esc(mem.head || '')}${mem.branch ? ' · ' + esc(mem.branch) : ''}</span>
         ${mem.integrated ? '<span class="pill s-wait">remoto integrado nesta leitura</span>' : ''}
         ${mem.unpushed ? `<span class="pill s-wait">${mem.unpushed} commit(s) não enviados</span>` : ''}`
      : `<span class="pill s-stop">Memory ${esc(mem.state)}</span>
         <span class="mono">${esc(mem.head || '')}${mem.branch ? ' · ' + esc(mem.branch) : ''}</span>
         <br><span style="font-size:13px;color:var(--ink2)">${esc(mem.why || '')}</span>
         <br><span style="font-size:13px;color:var(--human)">Contexto não confiável: o Brief não pode ser aprovado e a Inbox não recebe proposta até sincronizar.</span>`;

  const src = (p.sources || []).map((s) => `<tr class="srcrow">
    <td class="mono">${esc(s.role)}</td>
    <td>${esc(s.title)}<br><span class="mono" style="color:var(--ink3)">${esc(s.path)}</span></td>
    <td class="mono">${esc(s.version?.value || '—')}<br><span style="color:var(--ink3)">${esc(s.updatedAt || 'sem data')}</span></td>
    <td>${s.digest ? esc(s.digest) : '<em>sem resumo</em>'}</td>
  </tr>`).join('');

  const gaps = (p.gaps || []).map((g) => `<li${g.severity === 'atencao' ? ' class="warn"' : ''}>
    <strong>${esc(g.what)}</strong><span class="ask">${esc(g.ask)}</span></li>`).join('');
  const conf = (p.conflicts || []).map((x) => `<li>
    <strong>${esc(x.what)}</strong><br><span class="mono">${esc((x.refs || []).join(' · '))}</span>
    <span class="ask">${esc(x.ask)}</span></li>`).join('');
  const lim = (p.limitations || []).map((l) => `<li>${esc(l)}</li>`).join('');

  return `<h2>Contexto</h2>
<div class="card">${memLine}<br><span class="mono" style="color:var(--ink3)">consultado em ${esc(p.consultedAt)}</span></div>
${gaps ? `<h3>Lacunas</h3><ul class="gapl">${gaps}</ul>` : ''}
${conf ? `<h3>Conflitos — decisão humana (RB-08)</h3><ul class="gapl">${conf}</ul>` : ''}
${src ? `<h3>Fontes consultadas</h3><table><thead><tr><th>Papel</th><th>Nota</th><th>Versão</th><th>Resumo referencial</th></tr></thead><tbody>${src}</tbody></table>`
  : '<p><em>nenhuma fonte carregada</em></p>'}
${lim ? `<h3>Limitações</h3><ul>${lim}</ul>` : ''}
${refresh}`;
}

// ---------- brief (§11.1, RF-02) ----------
function briefSection({ c, token, csrf }) {
  const tk = (token ? `<input type="hidden" name="t" value="${esc(token)}">` : '')
    + `<input type="hidden" name="ct" value="${esc(csrf)}">`;
  const b = c.brief;
  const pending = pendingFields(b || {});
  const purposeOpts = Object.entries(PURPOSES).map(([k, v]) =>
    `<option value="${esc(k)}"${b?.proposito === k ? ' selected' : ''}>${esc(v.label)}</option>`).join('');

  if (!b) {
    return `<h2>Brief</h2>
<div class="note">Sem Brief. A produção não começa antes dele — é o que impede tratar objetivo, público e ação como decididos quando não estão (RB-01).</div>
<form class="dec" method="post" action="/campaign/${esc(c.id)}/brief/start">${tk}
  <div><button class="act plain" type="submit">Iniciar Brief</button></div></form>`;
  }

  const val = (k) => esc(b[k] ?? '');
  // §11.2 "Brief incompleto": mostra somente os campos pendentes.
  const pendingHtml = pending.length
    ? `<div class="note err"><strong>${pending.length} campo(s) pendente(s).</strong> O agente pergunta só o que a Memory e o pedido não resolveram.</div>
<ul class="gapl">${pending.map((f) => `<li class="warn"><strong>${esc(f.label)}</strong><span class="ask">${esc(f.ask)}</span></li>`).join('')}</ul>`
    : '<div class="note ok">Todos os campos mínimos preenchidos.</div>';

  const approveForm = isApproved(b)
    ? `<div class="note ok">Brief aprovado em ${esc(b.aprovadoEm)} por ${esc(b.aprovadoPor)}. Alterar propósito, objetivo, público, oferta, ação ou métrica devolve a rascunho e invalida o plano.</div>`
    : `<form class="dec" method="post" action="/campaign/${esc(c.id)}/brief/approve">${tk}
        <div><button class="act approve" type="submit"${pending.length ? ' disabled' : ''}>Aprovar Brief${pending.length ? ' — faltam campos' : ''}</button></div>
      </form>`;

  return `<h2>Brief <span class="pill ${isApproved(b) ? 's-ok' : 's-wait'}">${esc(b.estado)}</span></h2>
${pendingHtml}
<form class="dec" method="post" action="/campaign/${esc(c.id)}/brief/save">
  ${tk}
  <label for="bp">Propósito — determina as frentes e a métrica (RB-03)</label>
  <select id="bp" name="proposito"><option value="">—</option>${purposeOpts}</select>
  <label for="bo">Objetivo</label><input id="bo" name="objetivo" value="${val('objetivo')}">
  <label for="bu">Público</label><input id="bu" name="publico" value="${val('publico')}">
  <label for="bf">Oferta ${PURPOSES[b.proposito]?.requiresOffer ? '(obrigatória para este propósito)' : '(opcional para este propósito)'}</label>
  <input id="bf" name="oferta" value="${val('oferta')}">
  <label for="ba">Ação desejada</label><input id="ba" name="acaoDesejada" value="${val('acaoDesejada')}">
  <label for="bm">Métrica primária</label><input id="bm" name="metricaPrimaria" value="${val('metricaPrimaria')}">
  <label for="bc">Canais e formatos (separados por vírgula)</label>
  <input id="bc" name="canais" value="${esc((b.canais || []).join(', '))}">
  <label for="bpz">Prazo</label><input id="bpz" name="prazo" value="${val('prazo')}">
  <label for="bor">Orçamento</label><input id="bor" name="orcamento" value="${val('orcamento')}">
  <label for="bl">Limites de alegação (um por linha)</label>
  <textarea id="bl" name="limitesDeAlegacao">${esc((b.limitesDeAlegacao || []).join('\n'))}</textarea>
  <label for="bk">Critério de aprovação e encerramento</label>
  <textarea id="bk" name="criterioAprovacao">${val('criterioAprovacao')}</textarea>
  <div><button class="act plain" type="submit">Salvar rascunho</button></div>
</form>
${approveForm}`;
}

// ---------- plano e frentes (§11.1, RF-03) ----------
function planSection({ c, token, csrf }) {
  const tk = (token ? `<input type="hidden" name="t" value="${esc(token)}">` : '')
    + `<input type="hidden" name="ct" value="${esc(csrf)}">`;

  if (!isApproved(c.brief)) {
    return `<h2>Plano</h2><div class="note">O plano abre depois do Brief aprovado — plano sem Brief é funil por hábito (RB-01, RB-03).</div>`;
  }

  const suggested = PURPOSES[c.brief.proposito]?.suggestedFronts || [];
  const chosen = new Set((c.plan?.frentes || []).map((f) => f.tipo));
  const order = c.plan ? executionOrder(c.plan) : null;

  const frentes = (c.plan?.frentes || []).map((f) => {
    const def = FRONTS[f.tipo] || {};
    const assets = (f.ativos || []).map((a) => {
      const g = gateForAsset(a.tipo);
      return `<li class="mono">${esc(a.id)} <span class="pill ${g ? 's-ok' : 's-wait'}">${esc(a.tipo)}${g ? '' : ' · sem gate próprio'}</span></li>`;
    }).join('');
    return `<div class="frente">
      <div class="meta">${esc(f.tipo)} · ${esc(f.estado)}${f.dependeDe?.length ? ` · depende de ${esc(f.dependeDe.join(', '))}` : ''}</div>
      <h4>${esc(def.label || f.tipo)}</h4>
      <p style="margin:0 0 6px;font-size:14px">${esc(f.objetivo || '')}</p>
      <div class="dep">métrica: ${esc(f.metrica || '—')}</div>
      ${f.decisaoPendente ? `<div class="note err" style="margin:8px 0 0">decisão pendente: ${esc(f.decisaoPendente)}</div>` : ''}
      <div class="skills">${(f.skills || []).map((s) => `<span>${esc(s)}</span>`).join('')}</div>
      ${assets ? `<ul style="margin:8px 0 0;padding-left:18px;font-size:13px">${assets}</ul>` : '<p style="font-size:13px;color:var(--ink3);margin:8px 0 0"><em>nenhum ativo declarado</em></p>'}
    </div>`;
  }).join('');

  const excl = (c.plan?.frentesExcluidas || []).map((x) =>
    `<li><strong>${esc(x.tipo)}</strong> — ${esc(x.motivo)}</li>`).join('');

  const frontOpts = Object.entries(FRONTS).map(([k, v]) =>
    `<option value="${esc(k)}">${esc(v.label)}${suggested.includes(k) ? ' · sugerida' : ''}${chosen.has(k) ? ' (já no plano)' : ''}</option>`).join('');

  return `<h2>Plano</h2>
<div class="card">Propósito <strong>${esc(PURPOSES[c.brief.proposito]?.label || c.brief.proposito)}</strong> sugere:
 ${suggested.map((s) => `<span class="pill s-wait">${esc(s)}</span>`).join(' ')}
 <br><span style="font-size:13px;color:var(--ink2)">Sugestão não é obrigação — o menor conjunto que atende ao objetivo é preferível a um funil criado por hábito.</span></div>
${order ? `<div class="card">Ordem de execução: <span class="mono">${esc(order.join(' → '))}</span></div>`
  : c.plan ? '<div class="note err">dependência circular no plano — corrija antes de produzir</div>' : ''}
${frentes ? `<div class="frentes">${frentes}</div>` : '<p><em>nenhuma frente no plano</em></p>'}
${excl ? `<h3>Fora de escopo, por decisão</h3><ul>${excl}</ul>` : ''}

<h3>Acrescentar frente</h3>
<form class="dec" method="post" action="/campaign/${esc(c.id)}/plan/front">
  ${tk}
  <label for="ft">Frente</label><select id="ft" name="tipo" required>${frontOpts}</select>
  <label for="fo">Objetivo desta frente</label><input id="fo" name="objetivo" required>
  <label for="fm">Métrica desta frente</label><input id="fm" name="metrica" required>
  <label for="fd">Depende de (tipos separados por vírgula)</label><input id="fd" name="dependeDe">
  <div><button class="act plain" type="submit">Acrescentar</button></div>
</form>

<h3>Registrar frente fora de escopo</h3>
<form class="dec" method="post" action="/campaign/${esc(c.id)}/plan/exclude">
  ${tk}
  <label for="xt">Frente</label><select id="xt" name="tipo" required>${frontOpts}</select>
  <label for="xm">Por que fica de fora</label><input id="xm" name="motivo" required>
  <div><button class="act plain" type="submit">Registrar exclusão</button></div>
</form>

<h3>Declarar ativo em uma frente</h3>
<form class="dec" method="post" action="/campaign/${esc(c.id)}/plan/asset">
  ${tk}
  <label for="at">Frente</label>
  <select id="at" name="frente" required>${[...chosen].map((k) => `<option value="${esc(k)}">${esc(k)}</option>`).join('')}</select>
  <label for="ak">Tipo de ativo</label><input id="ak" name="tipo" required placeholder="carrossel, stories, landing-page…">
  <label for="ai">Identificador do ativo</label><input id="ai" name="id" required placeholder="id da peça, quando houver pipeline">
  <div><button class="act plain" type="submit">Declarar ativo</button></div>
</form>`;
}

// ---------- ativos (RF-05) ----------
function assetsSection({ c, token }) {
  const t = token ? `?t=${encodeURIComponent(token)}` : '';
  if (!c.assets.length) return '';
  const rows = c.assets.map((a) => `<tr>
    <td class="mono">${esc(a.frente)}</td>
    <td class="mono">${a.piece ? `<a href="/piece/${esc(a.id)}${t}">${esc(a.id)}</a>` : esc(a.id)}</td>
    <td>${esc(a.tipo)}</td>
    <td>${a.verificado
      ? `<span class="pill ${a.estadoPeca === 'aprovada' || a.estadoPeca === 'publicada' ? 's-ok' : a.estadoPeca === 'gates vermelhos' ? 's-stop' : 's-hum'}">${esc(a.estadoPeca)}</span>`
      : '<span class="pill s-wait">declarado — sem pipeline de verificação</span>'}</td>
    <td class="mono">${esc(a.piece?.report?.digest?.slice(0, 10) || '—')}</td>
  </tr>`).join('');
  const unverified = c.assets.filter((a) => !a.verificado).length;
  return `<h2>Ativos</h2>
${unverified ? `<div class="note">${unverified} ativo(s) sem pipeline determinístico — declarados, não verificados. Formatos novos só publicam depois de terem gates próprios (RF-05.2).</div>` : ''}
<table><thead><tr><th>Frente</th><th>Ativo</th><th>Tipo</th><th>Estado</th><th>Digest</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ---------- medição (§11.1, RF-07) ----------
function measurementSection({ c, token, csrf }) {
  const tk = (token ? `<input type="hidden" name="t" value="${esc(token)}">` : '')
    + `<input type="hidden" name="ct" value="${esc(csrf)}">`;
  const pm = primaryMetricStatus(c.brief, c.readings);
  const readings = (c.readings.readings || []).map((r) => `<tr>
    <td>${esc(r.metric)}${r.primary ? ' <span class="pill s-hum">primária</span>' : ''}</td>
    <td class="mono">${esc(r.formula)}</td>
    <td class="mono">${esc(r.denominator ?? '—')}</td>
    <td class="mono">${r.value === null ? '<em>sem dado</em>' : esc(r.value)}</td>
    <td><span class="pill ${r.label === READING_LABEL.SIGNIFICANT ? 's-ok' : r.label === READING_LABEL.INSUFFICIENT ? 's-stop' : 's-wait'}">${esc(r.label)}</span>
      ${r.avisoCausal ? `<br><span style="font-size:12px;color:var(--ink3)">${esc(r.avisoCausal)}</span>` : ''}
      ${r.limitacoes ? `<br><span style="font-size:12px;color:var(--ink3)">${esc(r.limitacoes)}</span>` : ''}</td>
    <td class="mono">${esc(r.source)}<br><span style="color:var(--ink3)">${esc(r.responsavel)} · ${esc(r.frequencia)}</span></td>
  </tr>`).join('');

  const pmLine = !pm.declared
    ? `<div class="note err">${esc(pm.why)} — sem métrica primária a campanha não tem como ser julgada (RF-07.1).</div>`
    : !pm.measured
      ? `<div class="note">Métrica primária <strong>${esc(pm.metric)}</strong> declarada, ainda sem leitura.</div>`
      : `<div class="note ${pm.label === READING_LABEL.SIGNIFICANT ? 'ok' : ''}">Métrica primária <strong>${esc(pm.metric)}</strong> — ${esc(pm.label)} (${pm.count} leitura(s)).</div>`;

  return `<h2>Medição</h2>
${pmLine}
${readings ? `<table><thead><tr><th>Métrica</th><th>Fórmula</th><th>Denominador</th><th>Valor</th><th>Rótulo</th><th>Fonte / dono</th></tr></thead><tbody>${readings}</tbody></table>`
  : '<p><em>sem leituras</em></p>'}
<h3>Registrar leitura</h3>
<form class="dec" method="post" action="/campaign/${esc(c.id)}/reading">
  ${tk}
  <label for="rm">Métrica</label><input id="rm" name="metric" required>
  <label for="rf">Fórmula</label><input id="rf" name="formula" required>
  <label for="rd">Denominador — sem ele a leitura é insuficiente</label><input id="rd" name="denominator">
  <label for="rv">Valor — deixe vazio se não há dado</label><input id="rv" name="value">
  <label for="rs">Fonte</label><input id="rs" name="source" required>
  <label for="rr">Responsável</label><input id="rr" name="responsavel" required>
  <label for="rq">Frequência de revisão</label><input id="rq" name="frequencia" required>
  <label for="rl">Limitações</label><input id="rl" name="limitacoes">
  <label for="rp"><input type="checkbox" id="rp" name="primary" value="1"> é a métrica primária do Brief</label>
  <div><button class="act plain" type="submit">Registrar leitura</button></div>
</form>`;
}

// ---------- feedback e aprendizado (§11.1, RF-08) ----------
function feedbackSection({ c, token, csrf, contradictions = [] }) {
  const tk = (token ? `<input type="hidden" name="t" value="${esc(token)}">` : '')
    + `<input type="hidden" name="ct" value="${esc(csrf)}">`;

  const fb = c.feedback.map((f) => `<tr>
    <td class="mono">${esc(f.id)}</td>
    <td>${esc(f.alvoTipo)}${f.alvoId ? ` · <span class="mono">${esc(f.alvoId)}</span>` : ''}</td>
    <td>${esc(f.observacao)}</td>
    <td>${f.classificacoes.map((k) => `<span class="pill ${k === 'resultado-medido' ? 's-ok' : k === 'falha-execucao' ? 's-stop' : 's-wait'}">${esc(CLASSIFICATIONS[k]?.label || k)}</span>`).join(' ')}</td>
    <td>${f.desdobramento === FEEDBACK_OUTCOME.PENDING
      ? `<form class="dec" method="post" action="/campaign/${esc(c.id)}/learning/draft" style="gap:5px">${tk}
           <input type="hidden" name="feedbackId" value="${esc(f.id)}">
           <button class="act plain" type="submit">Propor aprendizado</button></form>`
      : esc(f.desdobramento)}</td>
  </tr>`).join('');

  const props = c.proposals.map((p) => {
    const st = p.estado === PROPOSAL_STATUS.PROMOTED ? 's-ok'
      : p.estado === PROPOSAL_STATUS.REFUSED ? 's-stop' : 's-hum';
    return `<div class="card">
      <div><span class="pill ${st}">${esc(p.estado)}</span> <strong>${esc(p.titulo)}</strong></div>
      <p style="margin:8px 0 4px;font-size:14px"><strong>Regra proposta:</strong> ${esc(p.regraProposta || '—')}</p>
      <p style="margin:0;font-size:13px;color:var(--ink2)">Escopo: marca ${esc(p.escopo?.marca || '—')}
        · público ${esc(p.escopo?.publico || 'qualquer')}
        · formato ${esc(p.escopo?.formato || 'qualquer')}
        · situação ${esc(p.escopo?.situacao || 'qualquer')}</p>
      <p style="margin:6px 0 0;font-size:13px;color:var(--ink2)">Invalida quando: ${esc(p.condicaoRevisao || '—')}</p>
      ${p.inboxPath ? `<p class="mono" style="margin:6px 0 0;font-size:12px">Inbox: ${esc(p.inboxPath)}</p>` : ''}
      ${p.entregaBloqueada ? `<div class="note err" style="margin:8px 0 0">${esc(p.entregaBloqueada)}</div>` : ''}
      ${p.estado === PROPOSAL_STATUS.IN_INBOX ? `
      <div class="note" style="margin:10px 0 0">Proposta <strong>não canônica</strong> aguardando revisão humana na Memory. Ela não é reutilizada como padrão enquanto estiver aqui (RB-06).</div>
      <form class="dec" method="post" action="/campaign/${esc(c.id)}/learning/resolve">
        ${tk}<input type="hidden" name="proposalId" value="${esc(p.id)}">
        <label for="pd-${esc(p.id)}">Destino canônico (obrigatório ao promover)</label>
        <input id="pd-${esc(p.id)}" name="destino" placeholder="nota da Memory onde o conhecimento foi integrado">
        <label for="pm-${esc(p.id)}">Motivo</label><input id="pm-${esc(p.id)}" name="motivo">
        <div style="display:flex;gap:8px">
          <button class="act approve" name="decision" value="${esc(PROPOSAL_STATUS.PROMOTED)}" type="submit">Promovi na Memory</button>
          <button class="act rejectb" name="decision" value="${esc(PROPOSAL_STATUS.REFUSED)}" type="submit">Recusar</button>
        </div>
      </form>` : ''}
      ${p.promocao ? `<p style="margin:8px 0 0;font-size:13px;color:var(--ink2)">${esc(p.promocao.decision)} por ${esc(p.promocao.por)} em ${esc(p.promocao.em)}${p.promocao.destino ? ` → ${esc(p.promocao.destino)}` : ''}${p.promocao.motivo ? ` · ${esc(p.promocao.motivo)}` : ''}</p>` : ''}
    </div>`;
  }).join('');

  const contra = contradictions.map((x) =>
    `<li><strong>${esc(x.alvo)}</strong> — ${esc(x.why)}<br><span class="mono">${esc(x.entries.join(' · '))}</span></li>`).join('');

  const targetOpts = [
    '<option value="campanha">campanha</option>',
    ...(c.plan?.frentes || []).map((f) => `<option value="frente:${esc(f.tipo)}">frente · ${esc(f.tipo)}</option>`),
    ...c.assets.map((a) => `<option value="ativo:${esc(a.id)}">ativo · ${esc(a.id)}</option>`),
  ].join('');

  return `<h2>Devolutivas</h2>
${contra ? `<div class="note err"><strong>Devolutivas contraditórias.</strong> As duas ficam preservadas; a decisão é sua.</div><ul class="gapl">${contra}</ul>` : ''}
${fb ? `<table><thead><tr><th>ID</th><th>Alvo</th><th>Observação</th><th>Classificação</th><th>Desdobramento</th></tr></thead><tbody>${fb}</tbody></table>`
  : '<p><em>nenhuma devolutiva</em></p>'}

<h3>Registrar devolutiva</h3>
<form class="dec" method="post" action="/campaign/${esc(c.id)}/feedback">
  ${tk}
  <label for="fa">Alvo</label><select id="fa" name="alvo" required>${targetOpts}</select>
  <label for="fo2">Observação — o que você observou, nas suas palavras</label>
  <textarea id="fo2" name="observacao" required></textarea>
  <label for="fc">Causa ou interpretação (opcional)</label><input id="fc" name="causa">
  <label>Classificação — tipos distintos não se misturam (RB-07)</label>
  <div style="display:flex;gap:14px;flex-wrap:wrap">
    ${Object.entries(CLASSIFICATIONS).map(([k, v]) =>
      `<label style="font:400 13px Archivo,sans-serif;text-transform:none;letter-spacing:0;color:var(--ink)">
        <input type="checkbox" name="classificacoes" value="${esc(k)}"> ${esc(v.label)}
        <span style="color:var(--ink3)"> — ${esc(v.describe)}</span></label>`).join('')}
  </div>
  <div><button class="act plain" type="submit">Registrar devolutiva</button></div>
</form>

<h2>Aprendizados</h2>
${props || '<p><em>nenhuma proposta de aprendizado</em></p>'}`;
}

// ---------- rascunho de proposta ----------
export function learningDraftView({ c, feedback, draft, token, csrf }) {
  const tk = (token ? `<input type="hidden" name="t" value="${esc(token)}">` : '')
    + `<input type="hidden" name="ct" value="${esc(csrf)}">`;
  return `<div class="note">Proposta de aprendizado a partir da devolutiva <span class="mono">${esc(feedback.id)}</span>.
Ela nasce <strong>não canônica</strong> na Inbox da Memory. Promover é ato humano, depois (RB-06).</div>
<div class="card"><strong>Observação de origem:</strong> ${esc(feedback.observacao)}<br>
<span style="font-size:13px;color:var(--ink2)">Classificação: ${esc(feedback.classificacoes.map((k) => CLASSIFICATIONS[k]?.label || k).join(', '))}</span></div>
<form class="dec" method="post" action="/campaign/${esc(c.id)}/learning/create">
  ${tk}<input type="hidden" name="feedbackId" value="${esc(feedback.id)}">
  <label for="lt">Título</label><input id="lt" name="titulo" required>
  <label for="lr">Regra proposta — o que passa a valer</label><textarea id="lr" name="regraProposta" required></textarea>
  <label for="li">Interpretação / causa</label><textarea id="li" name="interpretacao" required>${esc(draft.interpretacao || '')}</textarea>
  <label for="lc">Condição de revisão ou invalidação — o que faria esta regra deixar de valer</label>
  <textarea id="lc" name="condicaoRevisao" required></textarea>
  <label for="ld">Destino canônico sugerido na Memory</label><input id="ld" name="destinoSugerido" required>
  <label for="lp">Escopo · público</label><input id="lp" name="escopoPublico" value="${esc(draft.escopo?.publico || '')}">
  <label for="lf">Escopo · formato</label><input id="lf" name="escopoFormato">
  <label for="ls">Escopo · situação${draft.evidencia?.forcaMaxima <= 1 ? ' — obrigatório: origem é preferência ou hipótese' : ''}</label>
  <input id="ls" name="escopoSituacao">
  <div><button class="act plain" type="submit">Criar proposta na Inbox</button></div>
</form>`;
}

// ---------- página da campanha ----------
export function campaignView({ c, token, csrf, contradictions }) {
  const tk = (token ? `<input type="hidden" name="t" value="${esc(token)}">` : '')
    + `<input type="hidden" name="ct" value="${esc(csrf)}">`;
  const na = nextAction(c);

  // §11.2 "Campanha bloqueada": mostra o que bloqueia, o impacto e o próximo passo.
  const blocked = c.blockers.length
    ? `<div class="note err"><strong>Campanha bloqueada.</strong> ${c.blockers.length} item(ns) impedem o próximo passo.</div>
<ul class="gapl">${c.blockers.map((b) => `<li><strong>[${esc(b.kind)}]</strong> ${esc(b.what)}${b.ask ? `<span class="ask">${esc(b.ask)}</span>` : ''}</li>`).join('')}</ul>`
    : '';

  const close = c.campaign.encerrada
    ? `<div class="note ok">Encerrada em ${esc(c.campaign.encerrada.em)} — ${esc(c.campaign.encerrada.motivo)}</div>`
    : `<h3>Encerrar campanha</h3>
<form class="dec" method="post" action="/campaign/${esc(c.id)}/close">${tk}
  <label for="cm">Motivo do encerramento</label><input id="cm" name="motivo" required>
  <div><button class="act plain" type="submit">Encerrar</button></div></form>`;

  return `<div class="cstat">${campaignPill(c.status)}
  <span class="mono">${esc(c.campaign.marca)}</span>
  <span style="color:var(--ink2)">próxima ação: <strong>${esc(na.what)}</strong></span></div>
${blocked}
${contextSection({ c, token, csrf })}
${briefSection({ c, token, csrf })}
${planSection({ c, token, csrf })}
${assetsSection({ c, token })}
${measurementSection({ c, token, csrf })}
${feedbackSection({ c, token, csrf, contradictions })}
${close}`;
}
