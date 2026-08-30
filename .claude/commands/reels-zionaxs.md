---
description: Cria e PUBLICA um Reels da Zionaxs, do tema ao post no ar
argument-hint: "[tema opcional; sem argumento, pesquise e escolha o tema]"
---

Crie **e publique** um Reels da Zionaxs seguindo o processo abaixo, sem pular etapa.

Tema pedido: **$ARGUMENTS**
Se vier vazio, escolha você o tema na etapa 2.

> **Convenção de nome.** Este comando é da marca Zionaxs, irmão do `/carrossel-zionaxs`. Cada marca nova ganha o seu, com os padrões e a conta daquela marca.

> **Autonomia e seu limite.** O Fabiano autorizou em 30/08/2026 que este comando publique sem aprovação peça a peça, como já acontece com o carrossel. A autorização vale para o fluxo inteiro descrito aqui, **incluindo as travas**. Trava que reprova não se contorna: ou se corrige a peça, ou se para e se avisa.
>
> A promoção veio junto de uma condição, e ela não é negociável: **o contraste da tinta sobre o pixel da foto deixou de ser revisão humana e virou medida**, em `bin/medir-contraste.mjs`, ligada ao porteiro. Sem humano no meio, trava que dependia de olho vira medida ou desaparece. Se alguém desligar essa medida, a autorização de publicar sozinho cai junto.

## 1. Carregue os padrões antes de escrever qualquer coisa

Leia e trate como lei:

- `AGENTS.md`, seções "Regra zero" e "Operação de marketing da Zionaxs"
- `campanhas/zionaxs/direcao-visual/README.md` — estilo pôster editorial
- `campanhas/zionaxs/padrao-de-copy.md` — padrão de texto da marca
- `sistema/video/README.md` — **as 6 regras de movimento**, o diagnóstico do bloqueio de render e a armadilha de cor

Estilo, tom e regras de movimento já foram decididos. Não invente.

## 2. Escolha o tema

Consulte a inteligência de público na Zionaxs Memory (`../zionaxs-memory/Marketing/Marcas/Zionaxs/Público/`) e confira as peças já publicadas em `sistema/workspace/pieces/` **e** em `sistema/video/pecas/` para não repetir assunto.

Critério: **desejo primeiro**. Uma dica prática que melhore o fluxo de trabalho, a organização ou a rotina de quem toca um negócio. Dado e notícia entram como tempero dentro da dica.

Toda afirmação factual precisa de fonte verificável, classificada como E, I, H ou NC. A fonte entra no contrato e, quando for o eixo da peça, **impressa na própria batida**.

## 3. Escreva o contrato

`sistema/video/pecas/<id>/contract.json`, id `zxv-NN-slug` no próximo número livre. Use a `zxv-01` como modelo de forma.

- `format: "story-9x16"`, `fps: 30`.
- Uma entrada em `batidas` por batida, com `duracao` em quadros, `cena`, `copy`, `approved_visible_copy` e `alt` começando com "Batida N de T".
- **`cena` só aceita o que existe** em `src/cenas.jsx`: `poster-cover`, `portas-chegando`, `fila-vazia`, `contador`, `corte-e-volta`, `colapso`, `fila-aparece`, `poster-close`, `assinatura`. Cena nova é código novo, e o porteiro recusa contrato que peça cena inexistente.
- **Feche sempre com a batida `assinatura`**, que é a marca sozinha no centro.
- Copy didática: explique, não apenas afirme; apresente quem for citado; jargão de nicho vira cena universal; CTA com o passo. Números em algarismo. Sem travessão e sem "num/numa".
- **Tempo de leitura**: dimensione `duracao` por corpo de texto a 3,5 palavras por segundo, somado ao tempo que a entrada leva para terminar. Peça apertada foi o erro da primeira montagem da `zxv-01`.
- **`trilha_sugerida` é obrigatória** (faixa, artista, versao, porque, evitar). Instrumental, de música famosa cujo riff já seja o gancho. O porteiro recusa a peça sem trilha.
- `caption` e `caption_sources` na mesma pegada da legenda de carrossel.

Aponte `src/peca.js` para a peça nova.

## 4. Escolha a foto do gancho

A imagem encena a **mesma cena concreta** que a manchete descreve. Rosto só em silhueta, contraluz ou dissolvido na luz. Reaproveite o acervo já creditado em `sistema/workspace/pieces/*/assets/` antes de buscar foto nova, e **nunca invente crédito**: o autor vem do contrato da peça que usou a foto primeiro. Registre a cópia em `scripts/sync-brand.mjs`.

## 5. Renderize

```bash
cd sistema/video && npm run render
```

Sai o mp4, mais 1 quadro de prova por batida, tirado a 72% dela.

## 6. Olhe os quadros de prova

Abra **todos** os PNGs de `out/<id>-provas/`, um por batida. O contraste sobre foto já é medido pelo porteiro; o que sobra aqui **nenhuma máquina mede**, e publicando sozinho não há segunda chance:

- Sobreposição de blocos e geometria invadindo texto.
- Foto que contradiz a copy, inclusive texto legível dentro da imagem (data, idioma, marca).
- Se o texto de apoio cabe na batida: conte as palavras e divida por 3,5 por segundo.
- Se a batida de assinatura fecha limpa, sem o chrome ligado por engano.

Reprovou? Corrija o **contrato**, nunca o pixel, e renderize de novo. Se não souber corrigir, **pare e avise**.

## 7. Passe pelo porteiro

```bash
cd sistema/video && npm run pode-publicar
```

Ele confere forma do contrato, padrão de copy pelo mesmo código que cobra o carrossel, trilha, presença do render e dos quadros de prova, faixa de áudio, marca de cor BT.709, dimensão, duração batendo com o contrato, **contraste da tinta sobre o pixel da foto** e a **cadência da marca contando carrossel e vídeo juntos**.

Se reprovar, **pare e avise o Fabiano** com o motivo. Só use `--excecao "<motivo>"` com autorização explícita dele naquele momento; autorização antiga não serve, e a de 30/08/2026 é para publicar, não para furar cadência.

## 8. Publique

```bash
cd sistema/video && npm run preparar
```

Ele copia o mp4 e gera a capa do quadro assentado do gancho, e imprime os parâmetros exatos do contêiner.

1. Commite e empurre a mídia, e **confirme 200 nas duas URLs** antes de entregá-las à Meta.
2. **Verifique a identidade da conta ao vivo** com `INSTAGRAM_GET_USER_INFO`. Há duas contas conectadas e só `zionaxs_` (id `37965311306447572`, conta `instagram_ascent-utick`) é a certa. Conta divergente aborta tudo.
3. Crie o contêiner com `INSTAGRAM_POST_IG_USER_MEDIA`, `media_type: REELS`. Diferente de carrossel, aqui **`share_to_feed` é válido**.
4. Confira o processamento com `INSTAGRAM_GET_POST_STATUS` antes de publicar.
5. Publique com `INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH`, `max_wait_seconds` de pelo menos 120.
6. Se der erro de transporte, **reconcilie antes de repetir**: veja se o post saiu, para não duplicar.
7. Reconcilie com `INSTAGRAM_GET_IG_MEDIA`. Não peça `media_audio_type`: este toolkit não suporta o campo e a chamada inteira falha.

Depois:

```bash
cd sistema/video && npm run registrar -- --reconciliacao <arquivo.json>
```

Ele recusa gravar se a conta, o tipo ou a legenda divergirem do contrato.

## 9. Entregue o resultado com a música em destaque

Informe o permalink e, **em destaque**, a trilha sugerida com o motivo. A música é adicionada à mão pelo Fabiano, editando o post no app: a API não escolhe faixa, e sem isso o Reels fica com o silêncio da faixa muda.

## 10. Feche a rotina

Registre a decisão em `decisions/`, rode a auditoria e empurre os dois repositórios.

```bash
cd sistema/app && npm run auditoria
```
