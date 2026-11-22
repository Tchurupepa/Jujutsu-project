// Telas da ficha (Components V2). Toda tela é um panel(); respostas curtas são notice().
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { COR, corDeGrau } from '../ui/cores.js';
import { cortar } from '../ui/limites.js';
import { item, lista, panel, progresso } from '../ui/panel.js';
import { HISTORIA, IDADE, NOME } from './balance.js';
import { ATRIBUTOS, CLAS, NOME_RARIDADE, ORIGENS, TECNICAS, nomeDoGrau } from './dados.js';
import { derivados, xpParaSubir } from './progressao.js';

const botao = (id, rotulo, emoji, estilo = ButtonStyle.Secondary, desativado = false) =>
  new ButtonBuilder().setCustomId(id).setLabel(rotulo).setEmoji(emoji).setStyle(estilo).setDisabled(desativado);

const blocoTecnica = (tecnicaId, raridade, origemId) => {
  if (ORIGENS[origemId].semTecnica) return '### ⚔️ Técnica inata\nSem energia amaldiçoada: o corpo é a arma.\n-# Restrição Celestial troca a técnica por físico absurdo.';
  const t = TECNICAS[tecnicaId];
  return `### ⚔️ Técnica inata\n${item(`**${t.nome}** · ${NOME_RARIDADE[raridade]}`, t.resumo)}`;
};

export function telaIntro(id) {
  return panel({
    color: COR.personagem,
    title: '🧾 Criar ficha',
    sub: 'Seu feiticeiro nasce de três sorteios: origem, clã e técnica inata.',
    blocks: [
      `### 🎲 Como funciona\n**1.** Você escolhe nome, idade e história.\n**2.** O destino sorteia origem, clã e técnica.\n**3.** Se não gostar, gasta um giro (3 por eixo) e sorteia de novo.\n-# O pity vale para a sua conta: giros ruins seguidos garantem uma técnica melhor.`,
    ],
    rows: [new ActionRowBuilder().addComponents(botao(`ficha:criar:${id}`, 'Criar ficha', '🧾', ButtonStyle.Primary))],
    ephemeral: true,
  });
}

export function modalCriar(id) {
  const campo = (customId, rotulo, estilo, min, max, placeholder) =>
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId(customId).setLabel(rotulo).setStyle(estilo).setMinLength(min).setMaxLength(max)
        .setPlaceholder(placeholder).setRequired(true),
    );
  return new ModalBuilder().setCustomId(`ficha:modal:${id}`).setTitle('Criar ficha').addComponents(
    campo('nome', 'Nome do personagem', TextInputStyle.Short, NOME.min, NOME.max, 'Ex.: Haruki Mizuno'),
    campo('idade', `Idade (${IDADE.min} a ${IDADE.max})`, TextInputStyle.Short, 2, 2, 'Ex.: 17'),
    campo('historia', 'História', TextInputStyle.Paragraph, HISTORIA.min, HISTORIA.max, 'Quem é você antes de ver a primeira maldição?'),
  );
}

/** Resumo do sorteio atual com os botões de giro e de confirmação. */
export function telaRascunho(r, { note = null } = {}) {
  const o = ORIGENS[r.origem];
  const c = CLAS[r.cla];
  const semTec = o.semTecnica;
  return panel({
    color: COR.personagem,
    title: `🎲 ${r.name}`,
    sub: 'Rascunho da ficha: confira o sorteio e confirme quando estiver bom.',
    note,
    blocks: [
      `### ${o.emoji} Origem\n${item(`**${o.nome}** · ${NOME_RARIDADE[o.raridade]}`, o.semTecnica ? 'Sem energia amaldiçoada, com físico acima do normal.' : null)}`,
      `### ${c.emoji} Clã\n${item(`**${c.nome}** · ${NOME_RARIDADE[c.raridade]}`, c.tecnica ? `Pode herdar a técnica ${TECNICAS[c.tecnica].nome}.` : null)}`,
      blocoTecnica(r.tecnica, r.tecnica_raridade, r.origem),
    ],
    foot: `Giros restantes: origem ${r.giros_origem} · clã ${r.giros_cla} · técnica ${semTec ? '—' : r.giros_tecnica}`,
    rows: [
      new ActionRowBuilder().addComponents(
        botao(`ficha:girar:${r.discord_id}:origem`, `Origem (${r.giros_origem})`, '🎲', ButtonStyle.Secondary, r.giros_origem < 1),
        botao(`ficha:girar:${r.discord_id}:cla`, `Clã (${r.giros_cla})`, '🎲', ButtonStyle.Secondary, r.giros_cla < 1),
        botao(`ficha:girar:${r.discord_id}:tecnica`, `Técnica (${r.giros_tecnica})`, '🎲', ButtonStyle.Secondary, semTec || r.giros_tecnica < 1),
        botao(`ficha:ok:${r.discord_id}`, 'Confirmar', '✅', ButtonStyle.Success),
        botao(`ficha:cancelar:${r.discord_id}`, 'Cancelar', '✖️', ButtonStyle.Danger),
      ),
    ],
    ephemeral: true,
  });
}

/** Ficha pronta (/ficha e /perfil). */
export function telaFicha(f, { note = null, ephemeral = false } = {}) {
  const o = ORIGENS[f.origem];
  const c = CLAS[f.cla];
  const d = derivados(f);
  const atributos = Object.entries(ATRIBUTOS).map(([k, nome]) => `**${nome}** ${f.atributos[k] ?? 0}`).join(' · ');
  return panel({
    color: corDeGrau(f.grau, COR.personagem),
    title: `🧙 ${f.name}`,
    sub: `${o.nome} · ${c.nome} · ${nomeDoGrau(f.grau)}`,
    note,
    blocks: [
      blocoTecnica(f.tecnica, f.tecnica_raridade, f.origem),
      `### 📈 Progressão\n${lista([
        item(`**Nível ${f.nivel}**`, `XP ${progresso(f.xp, xpParaSubir(f.nivel))}`),
        item(`**${nomeDoGrau(f.grau)}**`, `${f.pontos} ponto(s) de atributo para gastar`),
      ])}`,
      `### 📊 Atributos\n${atributos}\n-# Vida máx. ${d.vidaMax} · EA máx. ${d.eaMax}`,
      `### 📖 História\n${cortar(f.story, 1200)}\n-# ${f.age} anos`,
    ],
    ephemeral,
  });
}
