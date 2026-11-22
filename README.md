# Jujutsu Project

Bot de RP de Jujutsu Kaisen para Discord (discord.js v14, Components V2, SQLite).

## Rodar
1. Node.js 22.13 ou mais novo.
2. `npm install`
3. Copie `.env.example` para `.env` e preencha `DISCORD_TOKEN`.
4. `npm run deploy` (registra os slash commands) e `npm start`.
5. `npm test`

## Comandos
- `/ping` — confere se o bot está vivo
- `/ficha` — cria a ficha (nome, idade, história → sorteio de origem, clã e técnica inata, com giros e pity) ou mostra a existente
- `/perfil [usuario]` — mostra a ficha de alguém

## Estrutura
- `src/ui/` — kit de mensagens (panel, cores, limites, fala de NPC)
- `src/rpg/` — dados do universo, balance, sorteio, progressão, serviço e telas da ficha
- `src/db/` — migrações versionadas
- `src/commands/` — slash commands (um arquivo por comando)
- `test/` — testes, incluindo guardiões do padrão de mensagens e de cores
- `docs/universo.md` — bíblia do universo
