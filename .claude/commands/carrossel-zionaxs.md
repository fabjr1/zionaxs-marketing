---
description: Cria e PUBLICA um carrossel da Zionaxs, do tema ao post no ar, dentro dos padrões aprovados
argument-hint: "[tema opcional; sem argumento, pesquise e escolha o tema]"
---

Crie **e publique** um carrossel da Zionaxs seguindo o processo abaixo, sem pular etapa.

Tema pedido: **$ARGUMENTS**
Se vier vazio, escolha você o tema na etapa 2.

> **Convenção de nome.** Este comando é da marca Zionaxs. Cada marca nova ganha o seu (`/carrossel-<marca>`), com os padrões e a conta daquela marca. As marcas vivem em `sistema/workspace/brands/<id>/manifest.json`. Nunca use este comando para outra marca.

> **Autonomia e seu limite.** O Fabiano autorizou em 29/08/2026 que este comando publique sem aprovação peça a peça. A autorização vale para o fluxo inteiro descrito aqui, **incluindo as travas**. Trava que reprova não se contorna: ou se corrige a peça, ou se para e se avisa.

## 1. Carregue os padrões antes de escrever qualquer coisa

Leia e trate como lei:

- `AGENTS.md`, seções "Regra zero" e "Operação de marketing da Zionaxs"
- `campanhas/zionaxs/direcao-visual/README.md` — estilo pôster editorial
- `campanhas/zionaxs/padrao-de-copy.md` — padrão de texto da marca

Estilo e tom já foram decididos e aprovados. Não invente.

## 2. Escolha o tema

Consulte a inteligência de público na Zionaxs Memory (`../zionaxs-memory/Marketing/Marcas/Zionaxs/Público/`) e confira `sistema/workspace/library.json` mais as peças em `sistema/workspace/pieces/` para **não repetir** assunto já publicado.

Critério: **desejo primeiro**. Uma dica prática que melhore o fluxo de trabalho, a organização ou a rotina de quem toca um negócio. Dado e notícia entram como tempero dentro da dica, nunca como o post inteiro.

Pesquise se precisar de repertório. Toda afirmação factual precisa de fonte verificável, classificada como E, I, H ou NC. Afirmação E sem fonte é proibida e o contrato recusa.

## 3. Escreva o contrato

`sistema/workspace/pieces/<id>/contract.json`, com id `zx-NN-slug` no próximo número livre. Peça avulsa usa `"campaign": "Avulso"`.

- Só layouts da família `poster-*`. O gate G14 recusa o resto.
- Copy didática: explique, não apenas afirme; apresente quem for citado; jargão de nicho vira cena universal; CTA com o passo.
- Números em algarismo. Sem travessão e sem "num/numa": o gate G13 recusa.
- `approved_visible_copy` com cada string que vira pixel, incluindo kicker, paginação e chrome (`year`, `temas`, `micro`).
- `alt` de cada slide abre com "Slide N de T".
- Legenda na mesma pegada: simples, explicativa, não muito grande.
- **`trilha_sugerida` é obrigatória** (faixa, artista, versao, porque, evitar). Instrumental, de música famosa cujo riff já seja o gancho. O porteiro da publicação reprova a peça sem trilha.

## 4. Escolha as fotos como parte do gancho

A imagem encena a **mesma cena concreta** que a manchete descreve. Nada de metáfora decorativa, e nunca contradiga a copy. Rosto só em silhueta, contraluz ou dissolvido na luz. Compare candidatas em folha de contato antes de decidir, salve em `assets/` e credite o autor na microlinha.

## 5. Gere até fechar os gates

```bash
cd sistema/app && node bin/gen.js <id> --root ../workspace
```

São 14 gates. Vermelho significa **corrigir o contrato**, nunca o pixel.

O número acima vem do código, em `lib/gates.js`. Se divergir, o código manda.

> **Ideia ainda não implementada:** medir a tinta contra os pixels reais da foto, e não contra o fundo declarado no CSS. Está proposta na Inbox da Zionaxs Memory (`2026-08-29-contraste-medido-no-pixel-da-foto.md`) e **não existe como gate**. Enquanto não existir, contraste sobre foto é julgamento humano na etapa de olhar os slides: se a tinta sumir na imagem, mexa em `photo.pos`, `photo.scale` e `photo.origin`, ou troque a foto. Nunca clareie o texto para escapar do problema.

## 6. Olhe os slides

Abra os PNGs de `out/`. Gate não mede sobreposição, geometria invadindo texto nem foto que contradiz a copy. Corrija o que estiver feio antes de publicar, porque daqui em diante vira público.

## 7. Passe pelo porteiro

```bash
cd sistema/app && node bin/pode-publicar.js <id> --root ../workspace
```

Ele confere gates, status, padrão de copy e estilo, presença de trilha, e a **cadência declarada na política da marca**. Se reprovar, **pare e avise o Fabiano** com o motivo. Só use `--excecao "<motivo>"` com autorização explícita dele naquele momento; autorização antiga não serve.

## 8. Publique

Registre a aprovação e a autorização permanente em `decisions/`, depois publique pela rota Composio:

1. **Verifique a identidade da conta ao vivo** com `INSTAGRAM_GET_USER_INFO`. Há duas contas conectadas e só `zionaxs_` (id `37965311306447572`, account `instagram_ascent-utick`) é a certa. Conta divergente aborta tudo.
2. Converta os PNG em JPEG, commite e empurre, e **confirme que a URL pública responde 200** antes de entregá-la à Meta.
3. Crie um contêiner filho por slide com `is_carousel_item` e `alt_text`.
4. Crie o carrossel pai com a legenda, **sem `share_to_feed`** (inválido para carrossel).
5. Publique e, se der erro de transporte, **reconcilie antes de repetir**: verifique se o post saiu, para não duplicar.
6. **Reconcilie sempre**: `INSTAGRAM_GET_IG_MEDIA` e `INSTAGRAM_GET_IG_MEDIA_CHILDREN` confirmando conta, permalink, tipo e número de slides.
7. Grave `publication/published.json` com postId, permalink, digest, contêineres, URLs e a reconciliação.

## 9. Entregue o resultado com a música em destaque

Informe o permalink e, **em destaque**, a trilha sugerida com o motivo da escolha. A música é adicionada à mão pelo Fabiano, editando o post no app depois de publicado: a API não escolhe faixa. Sem isso na entrega, ele não tem como completar o post.

## 10. Feche a rotina

```bash
cd sistema/app && npm run auditoria
```

Commite e empurre os dois repositórios. Nada pode ficar só no contexto da sessão.
