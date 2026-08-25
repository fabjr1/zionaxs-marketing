# zx-19 · A hora que sai de graça

Carrossel 1 de 12 da campanha **Capacidade antes de oferta**. Peça C1, semana 1, terça.
Público primário V2 / C1. Matriz M08. Categoria educacional. Estágio AARRR: acquisition.

**Não publicado.** Oito PNG em 1080×1350, legenda e alt text prontos para o fluxo de publicação quando ele existir.

---

## Legenda

Um terço dos escritórios da amostra do Sescon-SP declarou não cobrar por retrabalho. O número costuma ser lido como problema de precificação. Provavelmente não é.

Quando a correção não tem causa registrada, ela não tem nome dentro do escritório. Sem nome, não entra em contrato, não entra em preço e não entra em relatório nenhum. Só aparece como cansaço no fim do mês.

A taxonomia do slide 6 é a parte aplicável: cliente, escritório, sistema, regra. Cada causa tem um dono e uma ação diferente, e é isso que impede a conversa de virar cobrança pessoal. A ideia de Deming, aqui em paráfrase, é que antes de responsabilizar alguém por um indicador vale mapear entrada, dependência, variação normal, incentivo e restrição.

Meça uma semana antes de mudar qualquer contrato. E meça fora da semana de fechamento, ou o dado descreve o pico e não a rotina.

Fonte: Pesquisa de Preços e Serviços Contábeis do Estado de São Paulo, Sescon-SP e Vox Populi, 2024. 255 associados, margem de erro 5,9%. Recorte estadual e associativo: não descreve o Brasil. Referência de gestão: W. E. Deming, System of Profound Knowledge, Deming Institute.

---

## Alt text por slide

**01/08** · Slide 1 de 8. O retrabalho não é falha de contrato. É falha de contagem. Tipografia sobre papel pautado claro, a última frase em laranja. A capa inverte a leitura habitual do problema, que costuma ser tratada como questão de preço.

**02/08** · Slide 2 de 8. 33% dos escritórios declararam não cobrar por retrabalho. O número aparece em grande, e logo abaixo, no mesmo bloco de leitura, o recorte da amostra: 255 associados do estado de São Paulo, 2024, margem de erro de 5,9%. O denominador tem peso visual equivalente ao do número porque o recorte faz parte da afirmação.

**03/08** · Slide 3 de 8. O documento chega errado. Alguém corrige. Ninguém anota de quem foi a causa. No mês seguinte, a mesma hora sai de novo. Quatro frases curtas em escala decrescente, sem imagem. A cena mostra que o custo se repete porque a causa nunca é registrada.

**04/08** · Slide 4 de 8. Correção sem causa registrada vira atendimento. Um diagrama liga três eventos distintos, documento devolvido, lançamento corrigido e dúvida respondida, a uma única caixa de saída chamada atendimento, destacada em laranja. E atendimento é o que o escritório dá de graça. O diagrama mostra que causas diferentes colapsam numa classificação só, e é essa perda de informação que impede a cobrança.

**05/08** · Slide 5 de 8. A pergunta não é quanto cobrar. É de quem é a causa. Único slide de fundo grafite escuro da sequência, com a segunda frase em laranja. A ruptura de campo marca a mudança do problema de precificação para o problema de atribuição.

**06/08** · Slide 6 de 8. Quatro causas, quatro donos diferentes. Uma tabela de quatro linhas liga cada causa à sua ação: cliente, renegociar escopo; escritório, corrigir processo; sistema, revisar integração; regra, atualizar procedimento. Cada causa tem uma ação distinta, e é isso que impede a conversa de virar cobrança pessoal.

**07/08** · Slide 7 de 8. Registre a causa na hora da correção. Um mês dividido em cinco semanas: as três primeiras marcadas em laranja como janela de medição, as duas últimas hachuradas como período de fechamento e excluídas. Fechamento não descreve o mês. A exclusão do pico é a condição de validade da medição.

**08/08** · Slide 8 de 8. Uma semana de registro custa menos que um reajuste errado. Meça antes de mexer no contrato. Cinco linhas de registro numeradas e em branco, prontas para preenchimento, retomando o motivo da capa. O fechamento resolve a promessa de abertura e pede uma única ação.

---

## Relatório de render, medido

| Gate | Resultado |
|---|---|
| canvas | 1080×1350, 8 unidades, passa |
| fallback de fonte | nenhum. 6 de 6 faces carregadas |
| dimensões | passa |
| overflow | passa |
| área segura (80/88px) | passa |
| contraste WCAG 2.2 | passa |
| runt lines | passa |
| quebra não autoral | passa |
| máx. 3 níveis por unidade | passa |
| strings não aprovadas | passa |
| strings faltando | passa |
| rótulo interno vazado | passa |

### Contraste mínimo por unidade

| Slide | Mínimo medido | Níveis de conteúdo |
|---|---|---|
| s1 | 3.38:1 | 80 / 34 |
| s2 | 3.38:1 | 232 / 46 / 26 |
| s3 | 5.68:1 | 64 / 46 |
| s4 | 5.68:1 | 64 / 46 / 34 |
| s5 | 4.91:1 | 80 |
| s6 | 5.68:1 | 64 / 38 |
| s7 | 5.68:1 | 64 / 46 / 30 |
| s8 | 5.68:1 | 64 / 46 / 32 |

Piso WCAG 2.2: 4,5:1 para texto normal e 3:1 para texto grande. Tudo aqui é ≥26px, portanto texto grande. O laranja de marca `#F54502` mede **3,38:1** sobre o papel: passa para display, reprova para corpo. Por isso o corpo usa `#B23100`, que mede 5,68:1.

---

## Correções aplicadas durante o QA

**1. runt** — slides undefined

- esperado: nenhuma ultima linha com fragmento curto isolado
- observado: 'o mes.' sozinho em 16% da largura
- correção: encurtar a copy para 'Fechamento nao descreve o mes.' (passo 1 da ordem de correcao do metodo, antes de nbsp ou quebra manual)

**2. quebra nao autoral** — slides 1, 4, 7, 8

- esperado: linhas renderizadas = quebras autorais
- observado: display quebrava 5x onde 3 foram escritas; orfao 'cobrado' na linha 2 da capa
- correção: reescrita da copy de display para caber na medida, d1 de 88 para 80px. Nao reduzir corpo nem apertar tracking (proibido pelo metodo).

**3. direcao de arte** — slides todos

- esperado: detalhe visual sustenta a ideia
- observado: pautado de fundo global era decorativo e nao alinhava com a baseline
- correção: removido. Pauta permanece apenas onde carrega significado: linhas de registro (s8), tabela de causas (s6), calendario (s7).

**4. revisao visual dos pixels** — slides 4, 7, 8

- esperado: distribuicao vertical sem vazio morto e respiro entre blocos concorrentes
- observado: conteudo alinhado ao topo deixava ~330px mortos no rodape; titulo colado ao diagrama; 'de graca' sozinho na segunda linha
- correção: centro optico nas unidades densas, respiro de 52px antes do diagrama, quebra autoral equilibrada no fecho do slide 4

---

## Bloqueios antes de publicar

1. **A wordmark está composta em Poppins, não é a logo oficial.** O design system exige logo vetorial oficial sem redesenho. Compor o nome em tipo É um redesenho. Trocar pelo SVG de `assets/logo/zionaxs-lockup.svg` antes de qualquer publicação.
2. **Rota de publicação para `@zionaxs_` continua quebrada.** Composio devolve `base3br` e não há webhook de Make descobrível.
3. **Revisão em aparelho real ainda não foi feita.** A régua de 26px para nota de fonte só é liberada após teste em telefone, no tamanho de exibição do feed.
4. **Dark-first no design system segue indefinido.** Se for declarado invariante, esta direção clara cai inteira.