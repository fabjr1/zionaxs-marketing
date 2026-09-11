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

### Enquadramento: o que nenhum gate enxerga (aprendido na zx-23, 29/08/2026)

Escolher a foto certa não basta: o **enquadramento** decide se a peça é publicável. Três coisas que os gates deixam passar e que a revisão humana do passo 6 precisa cobrar:

1. **Objeto claro na banda de texto.** Nos layouts `poster-cover` e `poster-close` o texto ocupa de ~46% a ~93% da altura. Qualquer coisa clara aí (uma ficha, uma folha, um monitor) sobrevive ao scrim como cinza-médio e engole a manchete em creme. **O G5 não pega**: ele mede contraste contra o fundo declarado no CSS, nunca contra os pixels da foto. Regra prática: escolher foto cujo interesse visual esteja no **terço superior** e cuja metade de baixo seja escura e quieta.
2. **Texto legível dentro da foto.** Data, idioma ou marca que apareçam impressos na imagem entram na peça como afirmação. Na zx-23 a pilha de relatórios trazia "Ausgabe 59 · 2021" nas lombadas: um 2021 legível ao lado do `2026` do chrome contradiz a peça, exatamente o que a regra de não contradizer a copy proíbe. Corrigido deslocando o crop para `pos: "100% 40%"`.
3. **Como corrigir o crop, e o que funciona em cada caso.** O contrato aceita `photo: { src, pos, scale, origin }`.
   - Foto **paisagem** em campo 4x5: a altura já preenche exatamente, então **o Y de `pos` não faz nada**. Só o X move o quadro.
   - Foto **retrato** mais alta que 0.8: aí sim o Y de `pos` desliza o corte na vertical.
   - Para **empurrar o assunto para fora da banda de texto** funciona `scale` com `origin: "50% 0%"`: ancora no topo e joga o que está embaixo para baixo. Na zx-23 o fechamento usa `scale: 1.45` com origem no topo, o que levou as mãos e a ficha para a faixa mais escura do scrim e liberou a manchete.

Método barato para decidir antes de gerar: montar uma folha de contato que reproduza a **banda de texto real** (46% a 93%) por cima de cada candidata, já com gradê e scrim aplicados. Comparar 5 crops em uma imagem custa menos que 5 gerações completas.

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
- **O realce (`hl`) vai na PRIMEIRA linha do bloco, nunca na segunda.** Aprendido na zx-29, 01/09/2026. A caixa do realce é
  `display:inline` com padding vertical, e a altura de linha do display é `.98`: numa segunda linha ela sobe e come a base
  da linha de cima. Aconteceu no `accent` do `poster-turn` (a caixa cortou "CUSTO ESTÁ") e no `title` do `poster-close` (a
  caixa cortou "ABRA 1 PLANILHA"). Na primeira linha a caixa só encosta na margem que separa o bloco do anterior, e nada é
  cortado. **Nenhum gate mede isso**, é regra de construção. E não adianta transformar o bloco em 1 linha só para escapar:
  no display de 78px o limite prático é cerca de 20 caracteres, e "Custo está na semana." quebrou sozinha, com o G7
  reprovando 2 vezes, inclusive dentro do próprio span do realce.
- **Pendência no `poster-statement`: o anel laranja encosta em linha cheia.** O anel decorativo fica em `right:-240px`,
  `top:40%`, 420px de diâmetro, então ocupa de 900px a 1080px na horizontal e de 540px a 960px na vertical. O corpo do
  texto vai até 940px. Qualquer linha cheia nessa faixa vertical encosta no anel: a zx-28 saiu com a linha mais larga
  tocando a borda, e a zx-29 com 2 linhas cruzando o traço. Encurtar o texto **não** resolve, porque a quebra é gulosa e
  qualquer linha cheia chega perto de 940px. A correção de verdade é de template, estreitar o corpo do `poster-statement`
  para cerca de 820px, e por isso é decisão de direção visual, não de contrato: nenhuma sessão deve fazê-la sozinha.
- Parágrafos explicativos aceitam quebra autoral (`\n`), mas com uma condição que o texto anterior omitia e que custou uma
  geração na zx-28: o G7 reprova quando o número de linhas renderizadas passa de `brs + 1`, **em qualquer tamanho de texto,
  não só no display**. Ou seja, enfiar 1 quebra em um parágrafo longo para consertar uma órfã do G6 troca um gate vermelho
  por outro. A quebra autoral só resolve quando **todas** as linhas do bloco são declaradas, o que na prática limita o
  recurso a blocos curtos (manchete, apoio, `accent`). Em parágrafo de corpo que quebra sozinho em muitas linhas, a saída
  para a órfã é **reescrever a frase final**, não quebrá-la.
- **A linha seguinte à do realce não começa com maiúscula acentuada.** Aprendido na zx-31, 03/09/2026, e é o par que
  faltava da regra da zx-29. Pôr o `hl` na primeira linha resolve o corte da linha DE CIMA, e não o da linha DE BAIXO: a
  caixa do realce tem padding vertical e a altura de linha do display é `.98`, então a borda inferior da caixa cobre a
  faixa onde vive o acento da linha seguinte. No `poster-turn` da zx-31 o accent "E receber não / é sobrar." teve o
  acento do "É" escondido atrás da caixa; virou "E receber não / quer dizer sobrar." e o problema sumiu. **Nenhum gate
  mede isso.**
- **A regra do realce é mais larga do que "não começar com maiúscula acentuada".** Aprendido na zx-32, 03/09/2026, e
  corrige a formulação da zx-31. A caixa do realce cobre uma faixa horizontal definida pela LARGURA dela, não pelo
  começo da linha, então qualquer maiúscula acentuada da linha seguinte que caia sob essa largura tem o acento
  escondido. No `poster-turn` da zx-32 o accent "Cada uma pede / outra correção." tinha o realce na primeira linha,
  como manda a regra da zx-29, e a segunda linha não começava com acento, como manda a regra da zx-31: mesmo assim o
  "Ã" de CORREÇÃO ficava embaixo da caixa, que vai de x 80 a 745. Virou "outra resposta.", sem acento nenhum. **Regra
  final: a linha seguinte à do realce não deve ter maiúscula acentuada em NENHUMA posição sob a largura da caixa.** Na
  prática, para bloco de display de 2 linhas, o mais barato é escrever a segunda linha inteira sem maiúscula acentuada.
  Nenhum gate mede isso.
- **No `poster-turn` com `big: true`, realce em bloco de 2 linhas corta a linha de baixo inteira, não só o acento.**
  Aprendido na zx-33, 04/09/2026, e é o terceiro degrau da regra que começou na zx-29. A zx-31 e a zx-32 descreveram o
  dano como "o acento da linha seguinte some". No display grande do `poster-turn` o dano é maior: a caixa do realce na
  primeira linha do `accent` cobriu o topo das MAIÚSCULAS de "DEPOIS.", que não tem acento nenhum, porque a altura de
  linha de `.98` no corpo maior aproxima as linhas mais do que o padding da caixa permite. **Regra prática: em `accent`
  de `poster-turn` com `big`, o realce só é seguro quando o bloco tem 1 linha só.** Se a frase não couber em 1 linha,
  a saída é encurtá-la ou publicar o bloco sem `hl`, nunca deixar a caixa na primeira de 2 linhas. O limite medido é
  de cerca de 20 caracteres: "O preço vem depois." tem 19 e coube com folga, ocupando de x 80 a 940. **Nenhum gate mede
  isso**, e os 14 passaram verdes na geração que saiu com o corte.
- **O corpo do `poster-turn` cabe em cerca de 340 caracteres, e quem reprova é o G4, no chrome.** Aprendido na zx-32.
  O bloco de meta e o corpo dividem a `.pstack` ancorada embaixo, então corpo longo empurra ano, kicker e paginação
  para fora do quadro: com 553 caracteres o G4 reprovou 3 elementos do chrome do slide 4, um deles em `top -11`. A
  zx-31 usou 336 e passou. A armadilha é de diagnóstico, não de medida: **a mensagem de erro aponta o chrome, e a causa
  é o texto que cresceu embaixo dele**, então a leitura instintiva ("o chrome está errado") manda a sessão mexer no
  lugar errado. Ao ver G4 reprovando `year`, `kicker` ou paginação em layout de foto ou laranja, encurte o corpo.
- **Corredor de texto do `poster-scene` e do `poster-lines`.** Aprendido na zx-31. Nos 2 layouts a geometria laranja e a
  foto invadem a coluna de texto, e nenhum gate mede sobreposição. No `poster-scene` o anel ocupa aproximadamente x 495 a
  705 e y 560 a 770, e a foto começa em x 620: as linhas de display precisam terminar antes de x 495 na faixa do anel e
  antes de x 620 acima dela, o que dá cerca de 8 caracteres no display de 80px e cerca de 12 acima do anel. No
  `poster-lines` o anel grande entra até cerca de x 760 na altura da primeira linha, o que dá cerca de 17 caracteres no
  display de 64px. E há uma armadilha: **a posição vertical do bloco depende do número de linhas do `closing`**, porque a
  pilha é ancorada embaixo. Mudar o texto de apoio move a manchete. Por isso a regra robusta é encurtar as LINHAS até
  caberem no corredor mais estreito, e não calcular onde o bloco vai cair.
  **E há um segundo corredor que a zx-31 não viu: o do CORPO.** Aprendido na zx-32, 03/09/2026. No `poster-scene`,
  closing longo empurra o bloco inteiro para cima, e aí quem cruza o anel não é o display, são as primeiras linhas do
  parágrafo, que correm até a margem direita e não têm como ser encurtadas uma a uma. Com 365 caracteres o corpo
  começava por volta de y 690, dentro da faixa do anel (y 560 a 770); com 251 ele começa abaixo de y 800 e fica livre.
  **Limite prático: o closing do `poster-scene` cabe em cerca de 260 caracteres, ou 7 linhas renderizadas.** Passar
  disso não reprova gate nenhum, só entrega a peça com o anel riscando o texto.
- **`origin: "50% 100%"` é o par que faltava do ajuste de crop.** Aprendido na zx-34, 04/09/2026. O texto da zx-23
  ensina `scale` com `origin: "50% 0%"` para **empurrar o assunto para baixo**, para fora da manchete, e essa é a
  metade do problema. A outra metade é a foto cujo trecho claro cai bem no meio, na banda de texto: aí a correção é
  ancorar no rodapé, `origin: "50% 100%"`, que joga o trecho claro **para cima**, para o terço superior, que é
  justamente onde o README já pede que o interesse visual fique. Na capa da zx-34 a foto de arquivo tinha as pastas
  creme atravessando a faixa de 40% a 60%: com `pos: "70% 50%"` sozinho o kicker "A ENTRADA" ficava ilegível sobre o
  papel claro e a primeira linha da manchete pegava a mesma faixa. `scale: 1.6` com `origin: "50% 100%"` levou o creme
  todo para cima de 30% e deixou a banda de texto inteira sobre a caixa verde escura. Regra prática: **assunto claro
  abaixo do texto pede origem no topo; assunto claro dentro do texto pede origem no rodapé.** Os 14 gates passaram
  verdes nas 2 gerações, então quem mede isto é o passo 6.
- **A regra de rosto é de enquadramento, não só de escolha de foto, e o custo dela é alto.** Aprendido na zx-37,
  06/09/2026. As 2 fotos de campo escuro da peça foram escolhidas na folha de contato como seguras, com as pessoas
  aparentemente em silhueta nas miniaturas: no render de 1080x1350, com gradê e scrim, os rostos apareceram lit e
  reconhecíveis nas 2. **Os 14 gates ficaram verdes em todas as gerações**, inclusive nas que saíram com rosto
  legível, porque nenhum gate mede rosto. Quem pega isso é o passo 6, olhando os PNG.
  A correção é a mesma alavanca do crop, usada com outro alvo: `scale` alto com `origin: "50% 100%"` empurra o
  assunto para cima até **sair de quadro pelo topo**, e não só para fora da banda de texto. Na capa da zx-37 foram 3
  rodadas: `scale: 1.3` deixava a mesa iluminada na banda de texto, `1.6` resolveu a tinta mas manteve 2 rostos
  visíveis, e `2.6` levou os rostos para fora do quadro, deixando costas e mãos, com a banda de texto inteira
  escura. No fechamento, `pos: "0% 50%"` com `scale: 1.7` cortou o lado do quadro onde estava o rosto lit e deixou
  só a silhueta de perfil. Regra prática: **zoom que tira o rosto costuma ser maior do que o zoom que salva a
  tinta**, então em foto com pessoas de frente conte com scale acima de 2 e baixe o arquivo em resolução alta antes
  de tentar, porque a 1080 de largura o upscale aparece.
- **Encurtar o corpo do `poster-statement` às vezes livra o anel, ao contrário do que a pendência acima sugere.**
  Aprendido na zx-38, 06/09/2026. O texto da pendência diz que encurtar "não resolve, porque a quebra é gulosa e
  qualquer linha cheia chega perto de 940px". Isso descreve o pior caso, não todos: a quebra gulosa **muda de lugar**
  quando o texto muda, e por isso vale medir em vez de desistir. Na zx-38 o corpo de 262 caracteres tinha a segunda
  linha terminando em x 933, encostada no anel; com 236 caracteres, e trocando "e o cliente vai cobrar do mesmo jeito,
  com razão" por "e o cliente cobra do mesmo jeito", a linha mais larga dentro da faixa do anel (y 540 a 960) passou a
  terminar em x 884, livre do traço. A regra prática é: **tentar 1 reescrita curta e olhar o PNG antes de aceitar o
  encosto**, lembrando que isso não é garantia e que a correção definitiva continua sendo estreitar o corpo do
  `poster-statement` no template, decisão de direção visual que nenhuma sessão deve tomar sozinha. **Nenhum gate mede
  isso**, e os 14 ficaram verdes nas 2 gerações, com anel encostado e sem.
- **`photo.pos`, `photo.scale` e `photo.origin` só valem nos campos escuros. O `poster-scene` ignora os 3.**
  Aprendido na zx-44, 09/09/2026. Todo o texto acima sobre crop descreve os layouts `poster-cover` e
  `poster-close`, onde a foto vive em `.pbgwrap` com `.pbg` e o renderer aplica os 3 campos. No `poster-scene` a
  foto é montada por `posterBleed` em `<div class="pblock"><img></div>`, e o CSS de `.pblock img` é
  `width:100%;height:100%;object-fit:cover` **sem `object-position` e sem transform**: o recorte é sempre o
  centro do arquivo, e mudar `pos`, `scale` ou `origin` no contrato não move 1 pixel. A armadilha é silenciosa,
  porque o contrato aceita os campos, os 14 gates ficam verdes e a geração roda inteira sem reclamar; na zx-44
  custou 2 gerações antes de a causa aparecer. **Enquanto o template não mudar, a correção de enquadramento no
  `poster-scene` é recortar o arquivo da foto**, na proporção do quadro, que é 380x440, ou seja 0,864, e deixar o
  contrato com `pos` neutro. Consequência para a escolha de foto: no `poster-scene` a foto tem de funcionar no
  recorte central, então assunto encostado em uma borda do arquivo é descarte na folha de contato, e não problema
  a resolver depois no contrato. Dar `object-position` ao `.pblock img` é decisão de direção visual, e nenhuma
  sessão deve tomá-la sozinha.
- **Assunto claro que ENCOSTA na borda de baixo do arquivo não tem recorte bom em campo escuro.** Aprendido na zx-45,
  10/09/2026, e é o limite das alavancas que a zx-23 e a zx-34 ensinaram. `scale` com `origin: "50% 0%"` empurra o
  assunto para baixo e `origin: "50% 100%"` empurra para cima, mas as 2 só funcionam porque trazem **outra região do
  arquivo** para a banda de texto. Quando o assunto claro vai do meio do quadro até a borda inferior, essa outra
  região não existe: na zx-45 a foto de uma mão com caneta gastou 3 gerações e nenhuma resolveu. `scale: 1.5` deixou
  os dedos na banda; `pos: "18% 50%"` limpou a tinta e cortou a mão fora, deixando a peça sem a cena que a manchete
  descrevia; `scale: 1.9` com origem no rodapé apenas trocou os dedos pelo punho, igualmente claro. A saída foi
  **trocar a foto**, e a lição é que a troca deveria ter vindo na primeira tentativa.
  **Teste barato, antes de escrever o contrato:** olhar a metade de baixo do arquivo. Se ela não for escura e quieta
  em pelo menos metade da largura, a candidata é descarte para `poster-cover` e `poster-close`, e não problema a
  resolver depois no contrato. Isso completa a regra do terço superior: não basta o interesse visual estar em cima,
  **precisa haver escuro embaixo para ocupar a banda de texto**. Os 14 gates ficaram verdes nas 4 gerações, inclusive
  nas que saíram com a tinta sobre a pele, porque o G5 mede contraste contra o fundo declarado no CSS, e não contra os
  pixels da foto.
- **A folha de contato aprova a tinta, não a cena. O que ela não mede é se o assunto continua reconhecível dentro do
  quadro.** Aprendido na zx-46, 10/09/2026, e é o par que faltava ao teste da zx-45. O teste da zx-45 olha a metade de
  baixo do arquivo e diz se a manchete vai sobreviver; ele é sobre luminância, e passa fotos que depois não se leem. Na
  zx-46 o fechamento usou um relógio de parede fotografado na penumbra: a banda de texto mediu luminância 17,7 com
  desvio 20,5, das melhores da folha de contato, e mesmo assim a peça saiu errada, porque o recorte de 4x5 deixou do
  relógio apenas um aro claro contra um corte vertical duro. O leitor não via um relógio, via uma forma. O `alt` ainda
  descrevia um relógio de parede, o que é falso para quem depende dele. **Os 14 gates ficaram verdes**, porque nenhum
  gate mede se a foto encena a cena da manchete. Regra prática: depois de escolher pela banda, olhar o quadro de
  1080x1350 e perguntar que objeto a foto mostra; se o objeto que dá sentido à imagem não aparece inteiro o bastante
  para ser nomeado sem ajuda da legenda, a candidata é descarte, por mais escura e quieta que a banda esteja. A troca
  saiu barata: 1 geração, contra as 3 que a zx-45 gastou insistindo no recorte.
- **A alavanca de crop também serve para tirar assunto claro de baixo do CHROME, e não só de baixo da manchete.**
  Aprendido na zx-47, 11/09/2026. A zx-23 e a zx-34 descrevem o problema sempre em relação ao texto: objeto claro na
  banda engole a manchete. Há um alvo menor e mais frágil que o texto dessas notas não nomeia, e que é o **primeiro** a
  ser engolido: a **caixa de paginação** do chrome, 84x84 com borda de 3px, que vive a cerca de 47% da altura, ou seja
  exatamente na borda de cima da banda. Ela é fina, é só contorno e não tem scrim próprio, então basta um trecho claro
  pequeno atrás dela para sumir, muito antes de a manchete correr risco. Na capa da zx-47 a sala de reunião tinha a
  janela ocupando de y 170 a 620 e a caixa caía sobre o vidro claro: creme sobre vidro, ilegível, com a manchete logo
  abaixo ainda perfeitamente legível sobre o carpete escuro. A correção é a mesma da zx-34, `scale: 1.35` com
  `origin: "50% 100%"`, que levou a janela inteira para o terço superior. **Os 14 gates ficaram verdes nas 2 gerações**,
  porque o G5 mede contraste contra o fundo declarado no CSS. Consequência para o passo 6: ao olhar a capa e o
  fechamento, conferir a caixa de paginação ANTES da manchete, porque ela reprova primeiro.
- **Foto de agenda, planner e calendário quase sempre traz ano legível, e o descarte é quase certo.** Aprendido na
  zx-47, em que 3 candidatas de campo de papel caíram na mesma regra em sequência: 2 agendas abertas com "July 2016" e
  "June 2016" impressos na página, e uma terceira com "FEBRUARY 2019" mais "MONTHLY PLANNER" em inglês. É a regra da
  zx-23 sobre texto legível na foto, e confirma o custo que a zx-34 previu, de 3 a 4 descartes por vaga. O agravante
  desta família é que o ano é o **conteúdo** do objeto, não um rótulo de fundo: agenda existe para marcar data, então
  procurar agenda sem data é procurar a exceção. Regra prática: para o campo de papel, quando a cena pede papel de
  anotação, buscar **caderno fechado ou página em branco** em vez de agenda datada; foi o que resolveu a zx-47.
- **Alt text não é medido contra o texto renderizado, então reescrita de copy exige reescrita do alt.** Aprendido na
  zx-46. Os 2 blocos reescritos para resolver o G6 deixaram o `alt` dos slides 3 e 5 com a redação anterior, e a peça
  passou nos 14 gates assim: o **G12 cobra presença** de alt por unidade, e o G9 e o G10 comparam a
  `approved_visible_copy` com o pixel, sem tocar no alt. O erro só apareceu na conferência manual, na hora de montar os
  contêineres filhos. Regra prática: toda mudança em slot de copy pede a mesma mudança em 3 lugares, o `copy`, a
  `approved_visible_copy` e o `alt`, e o terceiro é o único que nenhuma trava cobra.
- **A regra do realce se confere na escrita da manchete, não depois do render, e o teste é de 10 segundos.**
  Aprendido na zx-48, 11/09/2026, e é o custo de tratar a regra da zx-32 como conhecimento passivo. O fechamento saiu
  com "Liste o que / está aberto.", o realce na primeira linha como manda a zx-29, e o acento do "Á" de ESTÁ, que cai
  sob a largura da caixa, apareceu cortado no PNG. Os 14 gates ficaram verdes nas 2 gerações, com o acento cortado e
  sem. O que faltou não foi a regra, que já estava escrita 3 vezes acima, foi aplicá-la antes de gastar geração.
  **Teste prático, antes de gerar:** escrever a segunda linha do bloco em caixa alta e procurar qualquer maiúscula
  acentuada nela; se houver, reescrever a linha. Na zx-48 a correção foi trocar a manchete por "Abra a lista / dos
  projetos.", que não tem acento nenhum na segunda linha. Vale para os 3 blocos que aceitam `hl`: `title` do
  `poster-close`, `accentLine` do `poster-cover` e `accent` do `poster-turn`.
- **Foto de arquivo, biblioteca e mesa de trabalho quase sempre traz texto legível, e a maioria é descartável por
  isso.** Aprendido na zx-34, em que 4 candidatas caíram na mesma regra: prateleira de pastas com rótulos manuscritos
  e a data 1360 nas lombadas, mesa com uma placa "DESIGNER OF THE YEAR 2020 2022" em primeiro plano, estante de
  biblioteca com títulos e datas do século 18, e monitor com uma lista de vídeos legível. A regra da zx-23 já proibia
  texto legível na foto; o que a zx-34 acrescenta é o **custo**: em busca de acervo, contar com 3 ou 4 descartes por
  vaga de foto e olhar a imagem antes de escrever o contrato, não depois. Rótulo pequeno de catálogo, sem data e sem
  frase, passa; qualquer ano legível ao lado do `2026` do chrome não passa.

## Como o padrão se sustenta sozinho

Três camadas, da mais fraca para a mais forte:

1. **AGENTS.md** abre com a seção da operação Zionaxs e aponta para este documento e para o padrão de copy. É o que uma sessão nova lê automaticamente ao trabalhar no repositório.
2. **Documentos de padrão** (este e `../padrao-de-copy.md`) guardam a receita e o porquê.
3. **Gates** cobram o que é binário, e essa é a única camada que não depende de alguém lembrar: **G13** recusa travessão e contração informal; **G14** recusa layout fora da família `poster-*`. Peça antiga só gera declarando `estilo_legado.justificativa`, o que obriga a registrar por escrito a exceção.
