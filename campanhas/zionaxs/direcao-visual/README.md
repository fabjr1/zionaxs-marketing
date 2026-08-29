# Estilo visual oficial: pôster editorial Zionaxs

> O par deste documento é [`../padrao-de-copy.md`](../padrao-de-copy.md), o padrão de texto da marca. Design e copy foram aprovados juntos em 29/08/2026 e valem para tudo que a Zionaxs publica.

Aprovado por Fabiano em 29/08/2026: "É exatamente esse estilo que eu quero. Vamos manter esse design sempre."
Este diretório é a referência permanente. `estilo-poster-editorial.html` é o protótipo fiel; os PNGs são a prova renderizada em 1080×1350.

## A receita

**Base**: sistema de 3 campos por peça — foto escura (emoção: capa/virada/fechamento), papel claro com foto P&B + geometria laranja (utilidade: cena/dica), laranja chapado #F54502 (a virada, uma por peça). A troca de campo marca a batida narrativa.

**Sobre todos os campos — o chrome de prova de impressão:**
- Grão de filme: SVG `feTurbulence` (baseFrequency .8, 2 octaves, dessaturado), `opacity:.20`, `mix-blend-mode:overlay`.
- Ano (`2026`, Poppins 600 46px) à esquerda e nº da peça em caixa quadrada 84×84, borda 3px, à direita (~47% da altura).
- Bloco `PEÇA:` em JetBrains Mono: label 17px tracking .22em + valor 21px bold tracking .14em.
- Rodapé com fio de 1px: `TEMAS: A / B / C` à esquerda, `ZIONAXS — CONCEITO` à direita (mono 17px, caps).
- Régua de calibração: chips 44×20 na ordem `#14171B  #F54502  #FF8A3C  #27454E  #EFE7D7`.
- Microlinha: `@zionaxs_ · digest <digest real da peça> · foto: <crédito>` (mono 14px). O digest impresso na arte é assinatura de autenticidade.

**Fotos escuras:**
- Gradê de cor: quente no topo → banda fria no meio → tinta embaixo. `linear-gradient(180deg, rgba(255,122,26,.30), rgba(255,122,26,.08) 24%, rgba(39,69,78,.34) 52%, rgba(39,69,78,.10) 66%, transparent 74%)` em `soft-light`, + scrim inferior normal para a manchete.
- Texto nesses slides em **creme quente `#EFE7D7`**, não no branco frio da paleta.
- Pessoas são permitidas, inclusive de frente, desde que o rosto se dissolva na luz (sol/contraluz atrás da cabeça, glow radial em `screen` blur 8px) ou fique em silhueta. A regra "sem rosto visível" continua valendo — inclusive rostos em quadros/pôsteres ao fundo.

**Manchete:**
- Caps, tracking -.02em, line-height .98, 112–118px na largura útil de 936px (padding 72px).
- Assinatura tipográfica: o **O final vira anel vazado** (border .088em, diâmetro .7em, sem miolo).
- Lead acima em mono 22px tracking .24em; apoio abaixo em Archivo 500 30px quando precisar.
- Fonte do título: **Poppins 700** — confirmada pelo Fabiano em 29/08/2026, após teste contra Archivo 800, Space Grotesk e Anton.

**Crédito das fotos deste diretório** (Unsplash): `foto-por-do-sol.jpg` — Rafael Garcin; `foto-papeis.jpg` — David Yao.

## O que ainda passa pelo fluxo normal

Peças de produção continuam nascendo por contrato no marketing-os (gates G1–G12, aprovação por digest). Este estilo entra como extensão dos layouts do renderer; nada aqui dispensa a aprovação humana de cada peça.

## Escolha de foto: a imagem é parte do gancho

Aprovado por Fabiano em 29/08/2026: foto e headline se escolhem no mesmo movimento. A imagem tem de encenar a MESMA cena que a frase descreve — a cena do leitor, não a metáfora decorativa.

- Perguntar "qual é a cena concreta desta frase?" e buscar essa cena, não a palavra-chave abstrata do tema.
- Nunca contradizer a copy: foto de celular marcando outro dia e hora sob "Segunda, 8h" queima a credibilidade.
- Comparar candidatas em folha de contato, já com o tratamento aplicado (P&B, escurecimento), antes de decidir.
- Regra do rosto continua: silhueta, contraluz ou rosto dissolvido na luz.

Exemplo desta peça: a capa trocou papéis voando numa biblioteca (bonita, genérica) por uma silhueta à mesa contra a janela ao amanhecer — é a segunda-feira do leitor; e "catorze mensagens, três urgências" virou uma parede inteira coberta de recados.

## Logo oficial

Wordmark `zionaxs_` — caixa baixa, grotesca pesada, laranja #F54502, underscore final. Entregue pelo Fabiano em 29/08/2026 em PNG 2000×554 com alpha e instalada em `sistema/workspace/brand/logo/` (variantes preta, branca, laranja e cinza).

O renderer escolhe a variante pelo campo — preta sobre papel, branca sobre foto e sobre laranja — via a chave `logo` do brand pack. Com logo instalada, a wordmark em texto sai da `approved_visible_copy`: o rodapé passa a ser imagem, e exigir o texto quebraria o G10. Isso resolve o `logoPending` que bloqueava publicação; o SVG vetorial segue pendente no Design System.

## Implementação no renderer (29/08/2026)

O estilo está implementado como família de layouts `poster-*` em `sistema/app/lib/templates/carousel-4x5.js` (cover, scene, lines, turn, fields, statement, close), com tokens novos no brand pack (`posterCream`, `posterGlow`, `posterTeal`). Notas de produção que diferem do mock, exigidas pelos gates:

- Realce de caixa (`hl`) é `display:inline` com `box-decoration-break`, sem rotação — inline-block criava linha fantasma na medição do G7.
- Foto com zoom vive dentro de `.pbgwrap` (clip), senão o transform vaza no scrollWidth (G3).
- O número fantasma da virada é SVG (`aria-hidden`), fora dos gates de texto — como as setas do layout `flow`.
- No campo laranja, texto pequeno é tinta (4.9:1) e texto grande é papel (3.4:1); creme sobre laranja reprova o G5 por 0.02.
- A microlinha imprime `ref` (sha256 do id da peça, 8 hex) — o digest real da geração inclui os próprios PNGs e não pode se auto-referenciar na arte.
- Todo texto do chrome (ano, temas, microlinha) entra como slot de copy aprovada no contrato; etiquetas internas (`ZX-…`, `S1`) nunca aparecem na arte (G11).
- O bloco de meta (ano + série + nº) e o corpo vivem na MESMA pilha ancorada embaixo (`.pstack`). Com o meta fixo em `top:40%` o corpo crescia por baixo e colidia quando a copy ficava mais longa — **nenhum gate mede sobreposição**, então isso é regra de construção, não de verificação.
- Caixa alta só no tipo de display (`.pt1`/`.pt2`). Texto explicativo em caixa normal: parágrafo longo em caixa alta derruba a legibilidade e contraria a regra de copy didática.
- Parágrafos explicativos aceitam quebra autoral (`
`): é como se equilibra a última linha quando o G6 acusa órfã.

## Como o padrão se sustenta sozinho

Três camadas, da mais fraca para a mais forte:

1. **AGENTS.md** abre com a seção da operação Zionaxs e aponta para este documento e para o padrão de copy. É o que uma sessão nova lê automaticamente ao trabalhar no repositório.
2. **Documentos de padrão** (este e `../padrao-de-copy.md`) guardam a receita e o porquê.
3. **Gates** cobram o que é binário, e essa é a única camada que não depende de alguém lembrar: **G13** recusa travessão e contração informal; **G14** recusa layout fora da família `poster-*`. Peça antiga só gera declarando `estilo_legado.justificativa`, o que obriga a registrar por escrito a exceção.
