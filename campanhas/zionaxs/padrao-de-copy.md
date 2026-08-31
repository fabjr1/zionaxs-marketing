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

### O que vai para o post, e o teto de 2.200 (registrado em 31/08/2026)

**A legenda publicada é o corpo do campo `caption`, e só ele.** O `caption_sources` é registro de rastreabilidade e fica no contrato; ele **não** entra no post. Isso foi conferido ao vivo na `zx-26` antes de publicar a `zx-27`, lendo a legenda que de fato está no ar.

Isso importa por dois motivos:

1. **O Instagram corta em 2.200 caracteres.** Na `zx-27` o corpo tinha 1.729 e a soma com as fontes daria 3.132: a legenda seria recusada. O porteiro passou a medir o corpo e a reprovar acima do teto, então a regra não depende mais de alguém lembrar.
2. **O arquivo `out/legenda-alt.md` imprime corpo e fontes um embaixo do outro.** Quem copiar de lá para o app monta uma legenda que estoura. Ele é documento de trabalho, não o texto do post.

Consequência para a escrita: **a fonte de toda afirmação E precisa estar dentro do corpo da legenda ou na própria peça**, com autor, obra, ano e recorte, porque o `caption_sources` não chega ao leitor. Encurtar a legenda empurrando fonte para lá é falsificar a rastreabilidade, e a nota 19c §14 proíbe.

## Como isso é verificado

As regras 4 e 5 têm gate automático: **G13, padrão de copy da marca**, implementado em `sistema/app/lib/copy-rules.js`. Ele varre os slots de copy do contrato, o alt text, a legenda e o texto renderizado de cada slide. A validação do contrato aplica as mesmas regras antes do render, então uma peça com travessão é recusada sem gastar geração.

As regras 1, 2, 3 e 6 continuam de julgamento humano: máquina não mede clareza. Entraram no gate apenas as que têm resposta binária, que são justamente as que escapam da revisão humana por serem pequenas.

Acrescentar uma regra nova é editar a tabela `COPY_RULES`: ela alimenta o gate e a validação ao mesmo tempo.

## Peças anteriores ao padrão

A **zx-21 já foi publicada** com 7 ocorrências que hoje o G13 reprovaria. O contrato dela não foi reescrito de propósito: é o registro do que foi ao ar, e falsificá-lo apagaria a história. Consequência prática: ela não pode ser regerada sem antes ser trazida ao padrão. A **zx-20**, que nunca saiu, foi corrigida e está em 13/13.

## Trilha

**Corrigido em 30/08/2026.** A versão anterior deste padrão mandava escolher "música famosa cujo instrumental já é o gancho". Estava errado, e o erro tem consequência jurídica, não estética.

### Por que mudou

A licença que a Meta tem para o catálogo popular de música é explicitamente de **uso pessoal e não comercial**. No momento em que o conteúdo promove uma marca, ela deixa de valer. Conta de negócio fica restrita à **Meta Sound Collection**, cerca de 14 mil faixas liberadas para uso comercial; conta de criador tem acesso mais amplo, mas o problema comercial é o mesmo.

Ou seja: pegar uma faixa famosa da biblioteca do app para um post da Zionaxs é usar música sem a licença que aquele uso exige. O risco vai de silenciamento automático a reclamação de direito autoral na conta.

### De onde a trilha pode vir

| Origem | Custo | Onde vale |
|---|---|---|
| **Meta Sound Collection** | Grátis | Só Instagram e Facebook. Baixa no desktop, pelo Meta Business Suite |
| Banco licenciado (Epidemic Sound, Artlist, Musicbed) | Assinatura | Onde a licença disser, normalmente todas as redes |
| Música original ou encomendada | Varia | Onde o contrato disser |

**Fora de cogitação:** faixa do catálogo popular do app, mesmo que ela apareça disponível na hora de postar. Disponível não é o mesmo que licenciado para marca.

### Como a trilha entra na peça

Depende do formato, porque a mecânica da plataforma é diferente:

- **Carrossel:** a música entra pelo app, editando o post depois de publicado, e a faixa vem da Meta Sound Collection. O campo `trilha_sugerida` do contrato existe para a escolha estar pronta na hora.
- **Vídeo publicado por API:** a música **tem de estar embutida no arquivo antes do upload**. Reels publicado por API não aceita adicionar áudio depois: a opção não existe no menu de editar, porque permitir isso quebraria os acordos de licenciamento da Meta. O caminho é o campo `trilha_embutida` do contrato de vídeo, com `licenca` declarada, que o porteiro cobra.

### Critério de escolha, que continua valendo

1. **Instrumental.** A peça se lê, e letra compete com o texto. Letra em português é o pior caso.
2. **Reconhecível pelo andamento, não pela fama.** Sem acesso ao catálogo popular, o que segura a atenção é groove constante e textura limpa, não familiaridade emprestada.
3. **Andamento constante, sem virada dramática.** Cada leitor passa no próprio ritmo; ninguém está sincronizado com a música.
4. **Nada de trilha épica de superação.** Empurra a marca para o tom de coach motivacional e briga com o posicionamento de engenharia.

### Peças publicadas sob o padrão antigo

As peças já no ar não se reescrevem, porque contrato publicado é registro histórico. Mas a **música que foi adicionada à mão nelas** não é contrato: se alguma recebeu faixa do catálogo popular, vale trocar pela Meta Sound Collection pelo app. Isso é revisão humana, e a lista está em `sistema/workspace/pieces/*/publication/published.json`.
