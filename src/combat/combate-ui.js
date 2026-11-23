// Telas do combate (Components V2). customId: combate:<ação>:<idDoDono>:<seq>[:<arg>]
// O `seq` amarra o botão ao cartão: clique em cartão velho só redesenha o atual.
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { COR } from '../ui/cores.js';
import { item, lista, panel, progresso } from '../ui/panel.js';
import { ATAQUE_BASICO, RECUPERAR_EA, RECUPERAR_STAMINA } from './balance.js';
import { distancia, eObstaculo } from './grid.js';
import { alvoDe, ativoDe, porId } from './motor.js';
import { HABILIDADES, regrasDe } from './tecnicas.js';

const NOME_STATUS = { atraido: '🌀 Atraído', foco: '⚡ Foco' };

/** O mapa em emojis: jogador, inimigo, obstáculo e chão. */
export function desenharMapa(e) {
  const linhas = [];
  for (let y = 0; y < e.grid.h; y += 1) {
    let linha = '';
    for (let x = 0; x < e.grid.w; x += 1) {
      const p = e.participantes.find((q) => q.hp > 0 && q.pos.x === x && q.pos.y === y);
      linha += p ? p.emoji : eObstaculo(e.grid, { x, y }) ? '🟫' : '⬛';
    }
    linhas.push(linha);
  }
  return linhas.join('\n');
}

const statusDe = (p) => (p.status.length ? ` · ${p.status.map((s) => NOME_STATUS[s.id] ?? s.id).join(' ')}` : '');

function blocoEstado(e) {
  return lista(e.participantes.map((p) => item(
    `${p.emoji} **${p.nome}**${p.hp <= 0 ? ' ☠️' : ''}`,
    `❤️ ${progresso(p.hp, p.hpMax)}${p.lado === 'jogador' ? ` · 🔷 EA ${p.ea}/${p.eaMax} · 💨 Stamina ${p.stamina}/${p.staminaMax}` : ''}${statusDe(p)}`,
  )));
}

const botao = (id, rotulo, emoji, estilo = ButtonStyle.Secondary, desativado = false) => {
  const b = new ButtonBuilder().setCustomId(id).setEmoji(emoji).setStyle(estilo).setDisabled(desativado);
  return rotulo ? b.setLabel(rotulo) : b;
};

/** Cartão do turno do jogador: mapa, estado, últimos lances e botões (D-pad 3x3 + ações). */
export function telaCombate(e, { note = null } = {}) {
  const dono = e.participantes.find((p) => p.lado === 'jogador');
  const ator = ativoDe(e);
  const alvo = alvoDe(e, dono);
  const id = (acao, arg) => `combate:${acao}:${dono.id}:${e.seq}${arg ? `:${arg}` : ''}`;
  const dist = alvo ? distancia(dono.pos, alvo.pos) : 99;

  const setas = [['↖️', -1, -1], ['⬆️', 0, -1], ['↗️', 1, -1], ['⬅️', -1, 0], null, ['➡️', 1, 0], ['↙️', -1, 1], ['⬇️', 0, 1], ['↘️', 1, 1]];
  const dpad = setas.map((s) => (s
    ? botao(id('mover', `${s[1]},${s[2]}`), null, s[0], ButtonStyle.Secondary, dono.mov < (s[1] && s[2] ? 1.5 : 1))
    : botao(id('passar'), null, '⏭️', ButtonStyle.Primary)));
  const extras = [
    botao(id('atacar'), 'Atacar', '⚔️', ButtonStyle.Danger,
      dono.usouComum || dist > ATAQUE_BASICO.alcance || dono.stamina < ATAQUE_BASICO.custoStamina),
    ...dono.habilidades.map((h) => {
      const hab = HABILIDADES[h];
      const rec = dono.recargas[h] ?? 0;
      return botao(id('hab', h), rec > 0 ? `${hab.nome} (${rec})` : hab.nome, hab.emoji, ButtonStyle.Primary,
        dono.usouComum || rec > 0 || dono.ea < hab.custo || dist > hab.alcance);
    }),
    botao(id('recuperar'), 'Recuperar EA', '🔋', ButtonStyle.Secondary, dono.usouComum || dono.ea >= dono.eaMax),
    botao(id('stamina'), 'Recuperar Stamina', '💨', ButtonStyle.Secondary, dono.usouComum || dono.stamina >= dono.staminaMax),
    botao(id('fugir'), 'Fugir', '🏳️', ButtonStyle.Secondary),
  ];
  const linhas = Math.max(3, Math.ceil(extras.length / 2));
  const rows = [];
  for (let r = 0; r < linhas; r += 1) {
    const comps = [...(dpad.slice(r * 3, r * 3 + 3)), ...extras.slice(r * 2, r * 2 + 2)];
    if (comps.length) rows.push(new ActionRowBuilder().addComponents(comps));
  }

  const hab = dono.habilidades.map((h) => `${HABILIDADES[h].emoji} **${HABILIDADES[h].nome}** · ${regrasDe(h)}`).join('\n');
  return panel({
    color: COR.combate,
    title: `⚔️ Combate · Rodada ${e.rodada}`,
    sub: `Vez de ${ator.nome} · movimento ${dono.mov}/${dono.movMax} · ação comum ${dono.usouComum ? 'usada' : 'livre'}`,
    note,
    blocks: [
      `### 🗺️ Mapa\n${desenharMapa(e)}`,
      `### ❤️ Estado\n${blocoEstado(e)}`,
      `### 📜 Últimos lances\n${e.log.slice(-6).join('\n')}`,
      `### 🔵🔴 Habilidades\n${hab || '-# Nenhuma habilidade ainda.'}\n-# Atacar gasta ${ATAQUE_BASICO.custoStamina} de Stamina. Recuperar EA devolve ${RECUPERAR_EA} e Recuperar Stamina devolve ${RECUPERAR_STAMINA} (ação comum). Mover antes de atacar pode ativar o Black Flash.`,
    ],
    foot: `⏭️ encerra o turno · ${porId(e, dono.id).nome} contra ${alvo?.nome ?? '—'}`,
    rows,
  });
}

/** Tela final: sem botões. `recompensa` é o que foi PAGO (recibo = pago). */
export function telaFim(e, { recompensa = null, fugiu = false } = {}) {
  const venceu = e.fim?.vencedor === 'jogador';
  const titulo = fugiu ? '🏳️ Você fugiu' : venceu ? '🏆 Vitória!' : '💀 Derrota';
  const xp = recompensa && !recompensa.duplicate
    ? `\n✨ **+${recompensa.pago} XP**${recompensa.subiu ? ` · subiu ${recompensa.subiu} nível(is)` : ''}`
    : '';
  return panel({
    color: fugiu ? COR.neutro : venceu ? COR.sucesso : COR.erro,
    title: titulo,
    sub: `Combate encerrado na rodada ${e.rodada}.`,
    blocks: [`### 📜 Últimos lances\n${e.log.slice(-8).join('\n')}${xp}`],
    foot: 'Use /combate para treinar de novo.',
  });
}
