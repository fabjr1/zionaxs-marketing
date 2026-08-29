# Padrão de copy da Zionaxs

Aprovado por Fabiano em 29/08/2026, com a peça zx-22 como modelo: "essa copy é para qualquer coisa que você for fazer... está fácil de entender, bem explicativa e interessante."

Este padrão vale para **todo texto da marca**: slide de carrossel, legenda, roteiro de vídeo, site, proposta e e-mail. Não é padrão de uma campanha.

## Por que

O objetivo da conta é ganhar público novo. Quem precisa entender é quem ainda não é do ramo. Copy aforística soa inteligente e não converte. Copy que explica ensina, e ensinar prende.

## As 6 regras

1. **Explicar, não apenas afirmar.** Toda frase de efeito vem seguida do porquê. Quem for citado é apresentado ao leitor ("Henry Mintzberg, professor de gestão"), nunca um nome solto esperando reconhecimento.
2. **Números em algarismo.** "14 mensagens, 3 urgências", "3 blocos de 10", "1 melhoria". Nunca por extenso.
3. **Jargão de nicho vira cena universal.** "conferência de lançamento" virou "conferir planilha, cobrar cliente, apagar incêndio".
4. **Proibido o travessão e o traço.** Têm cara de texto de máquina. Use ponto, vírgula, dois-pontos ou ponto e vírgula.
5. **Proibido "num", "numa", "nuns", "numas"** e contrações informais equivalentes. Escreva "em um", "em uma".
6. **CTA com o passo, não com o conceito.** "Abra a agenda agora e crie o evento repetindo toda semana", não "priorize sua gestão".

## Legenda

Mesma pegada da copy: simples, explicativa, fácil de entender e **não muito grande**. Mesmas 6 regras.

Fonte citada entra como paráfrase fiel com autor, obra e ano. Sem citação literal em inglês: afasta o leitor leigo e não acrescenta credibilidade que a referência completa já não dê. A referência completa fica em `caption_sources`.

## Como isso é verificado

As regras 4 e 5 têm gate automático: **G13, padrão de copy da marca**, implementado em `sistema/app/lib/copy-rules.js`. Ele varre os slots de copy do contrato, o alt text, a legenda e o texto renderizado de cada slide. A validação do contrato aplica as mesmas regras antes do render, então uma peça com travessão é recusada sem gastar geração.

As regras 1, 2, 3 e 6 continuam de julgamento humano: máquina não mede clareza. Entraram no gate apenas as que têm resposta binária, que são justamente as que escapam da revisão humana por serem pequenas.

Acrescentar uma regra nova é editar a tabela `COPY_RULES`: ela alimenta o gate e a validação ao mesmo tempo.

## Peças anteriores ao padrão

A **zx-21 já foi publicada** com 7 ocorrências que hoje o G13 reprovaria. O contrato dela não foi reescrito de propósito: é o registro do que foi ao ar, e falsificá-lo apagaria a história. Consequência prática: ela não pode ser regerada sem antes ser trazida ao padrão. A **zx-20**, que nunca saiu, foi corrigida e está em 13/13.

## Trilha sugerida

Música no Instagram entra pelo app, editando o post depois de publicado. A API não escolhe faixa. Por isso toda peça sai com uma **trilha sugerida** no campo `trilha_sugerida` do contrato, impressa no topo de `legenda-alt.md` para estar à mão na hora de postar.

Critério, na ordem:

1. **Instrumental.** Carrossel se lê, e letra compete com o texto. Letra em português é o pior caso.
2. **Música famosa cujo instrumental já é o gancho.** Quando o riff é o que se reconhece, e não a voz, a peça ganha a familiaridade sem o atrito da leitura.
3. **Andamento constante, sem virada dramática.** Cada leitor passa os slides no próprio ritmo; ninguém está sincronizado com a música.
4. **Nada de trilha épica de superação.** Empurra a marca para o tom de coach motivacional e briga com o posicionamento de engenharia.
