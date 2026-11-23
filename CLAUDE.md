# Jujutsu Project — bot de RP de Jujutsu Kaisen (Discord)

Stack: Node ESM (JS puro, sem build), discord.js v14 Components V2, `node:sqlite` com migrações, testes `node:test`.
Universo e sistemas: `docs/universo.md`. Rode `npm test` antes de todo commit.

## Regras de mensagem (valem para todo comando novo)
- Toda mensagem é UM container do Components V2, montado por `panel()` / `notice()` de `src/ui/panel.js`. Nada de `EmbedBuilder`,
  `{ content: '...' }` ou string solta em `reply/send` (o teste `padrao-mensagens` reprova).
- Editar mensagem: `asEdit(payload)`. Cor só de `src/ui/cores.js` (`COR.*`, `corDeRaridade`, `corDeGrau`); hex solto reprova.
- Hierarquia: `# título` + `-# sub` no topo, `### emoji Bloco` em cada assunto, `-#` para detalhe, botões no fim do container.
- Limites que falham em silêncio: 4000 caracteres no total e 40 componentes. Lista que cresce usa `paginar()` e tem teste de pior caso.
- `customId` = `<comando>:<ação>:<idDoDono>[:<dado>]`; o prefixo é o nome do slash command (o roteador do `src/index.js` depende disso).

## Regras de código
- Regra pura em `src/rpg/*.js` (sorteio, progressão), banco em `*-service.js`, Discord em `*-ui.js` e `src/commands/`.
- Todo número de balanceamento em `src/rpg/balance.js`; conteúdo (clãs, técnicas, graus) em `src/rpg/dados.js`. Teste trava os números.
- Dinheiro/XP/giro: ledger com chave única e transação (`BEGIN IMMEDIATE`); nunca ler-e-sobrescrever.
- Migração nova = entrada nova em `src/db/migrations.js` com `version` maior; nunca apague dado.
- Segredos só no `.env` (fora do git). Nunca escreva token ou id real no código.

## Regras de combate (rp-tactical-combat / rp-power-authoring)
- Motor puro em `src/combat/motor.js` (`aplicar` clona o estado); sessão em JSON versionado por canal (`combats`), sem `await` entre ler e gravar.
- **Atributo não escala dano**: dano vem de `baseDamage` da habilidade (balance.js); atributo dá vida, movimento e iniciativa.
- Pool de EA fixo em 100, sem regen; "Recuperar EA" (+20) é ação comum. Toda recusa acontece ANTES de cobrar.
- Stamina: pool fixo em 100, sem regen; "Recuperar Stamina" (+30) é ação comum. O ataque básico gasta 15 de Stamina (só jogador); habilidades gastam EA (o dono do jogo vai definir quais gastam o quê).
- Todo dano passa por `causarDano` (funil único, grava a fonte). Crítico só por GATILHO declarado (Black Flash), nunca chance solta.
- Habilidade nova = objeto em `src/combat/tecnicas.js` com números em `src/combat/balance.js`; o texto de regras é gerado (`regrasDe`).
- customId do combate: `combate:<ação>:<dono>:<seq>[:<arg>]`; `seq` velho só redesenha o cartão atual.

## Próximos passos (ordem do rp-server-blueprint)
Fase 2 servidor (canais/cargos/portaria) → aprovação da ficha pela staff → árvores de técnica e site → reação (esquiva/bloqueio), linha de visão, imagem do mapa, chefes com fases, Expansão de Domínio → missões → economia.
