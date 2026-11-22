// Toda mensagem do bot é UM container do Components V2 (ContainerBuilder + MessageFlags.IsComponentsV2), na hierarquia:
//   1. título `# emoji Título` + subtítulo `-# para que serve`  ·  2. blocos `### emoji Subtítulo`, separados por divisória
//   3. conteúdo em texto normal  ·  4. detalhe/rodapé em `-#`  ·  fechamento `-#` depois de um separador SEM linha  ·  botões no fim.
// Ninguém monta container à mão: panel() para telas, notice() para respostas curtas, asEdit() ao editar.
// Só depende de discord.js (v14.19+, que trouxe os builders do Components V2).
import {
  ActionRowBuilder, ContainerBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags, SectionBuilder, SeparatorBuilder,
  TextDisplayBuilder, ThumbnailBuilder,
} from 'discord.js';
import { COR } from './cores.js';

const V2 = MessageFlags.IsComponentsV2;
/** Um TextDisplay nunca passa de 4000 (o teto da mensagem inteira também é 4000: veja src/ui/limites.js). */
const text = (s) => new TextDisplayBuilder().setContent(String(s).slice(0, 4000));
const flagsDe = (ephemeral) => (ephemeral ? V2 | MessageFlags.Ephemeral : V2);
const comMiniatura = (corpo, url) => new SectionBuilder().addTextDisplayComponents(corpo).setThumbnailAccessory(new ThumbnailBuilder().setURL(url));

/**
 * Tela inteira de um sistema.
 * @param {{
 *   color?: number, title: string, sub?: string|null, note?: string|null,
 *   blocks?: Array<string|{text: string, thumb?: string|null}|null|false>, foot?: string|null,
 *   image?: string|null, thumb?: string|null, rows?: Array<ActionRowBuilder|import('discord.js').ButtonBuilder>, ephemeral?: boolean,
 *   mentions?: object,
 * }} o
 * - `color`: COR.<sistema> (painel) ou cor de identidade. Padrão: institucional.
 * - `note`: recibo da última ação (`✅ Item equipado.`), sempre no MESMO lugar: logo abaixo do subtítulo, sem divisória.
 * - `blocks`: cada string abre com `### emoji Subtítulo`; null/false somem (bloco condicional). `{ text, thumb }` põe arte à direita DESSE bloco.
 * - `thumb`: miniatura à direita do 1º bloco (string). `image`: imagem em destaque logo depois do título (`attachment://x.png` ou https).
 * - `rows`: botões/menus, sempre no FIM do container. Um botão solto vira uma linha.
 * - `mentions`: allowedMentions. Padrão `{ parse: [] }` (ninguém é pingado); passe outro só quando a menção é o objetivo.
 * Os anexos (`attachment://`) vão no `files` de quem envia.
 */
export function panel({
  color = COR.servidor, title, sub = null, note = null, blocks = [], foot = null, image = null, thumb = null, rows = [], ephemeral = false,
  mentions = { parse: [] },
}) {
  const c = new ContainerBuilder().setAccentColor(color)
    .addTextDisplayComponents(text(`# ${title}${sub ? `\n-# ${sub}` : ''}${note ? `\n${note}` : ''}`));
  if (image) c.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(image)));
  blocks.filter(Boolean).forEach((b, n) => {
    c.addSeparatorComponents(new SeparatorBuilder());
    const corpo = typeof b === 'string' ? b : b.text;
    const mini = typeof b === 'string' ? (n === 0 ? thumb : null) : b.thumb;
    if (mini) c.addSectionComponents(comMiniatura(text(corpo), mini));
    else c.addTextDisplayComponents(text(corpo));
  });
  if (foot) c.addSeparatorComponents(new SeparatorBuilder().setDivider(false)).addTextDisplayComponents(text(`-# ${foot}`));
  for (const r of rows) c.addActionRowComponents(r instanceof ActionRowBuilder ? r : new ActionRowBuilder().addComponents(r));
  return { components: [c], flags: flagsDe(ephemeral), allowedMentions: mentions };
}

/**
 * Resposta curta a uma ação (sucesso, erro, aviso, aguarde): título `###` e texto no MESMO bloco, sem divisória e sem banner.
 * Cor = resultado (COR.sucesso/erro/aviso/neutro). Efêmera por padrão: só quem clicou vê.
 * `thumb`: retrato de quem fala à direita (fala de NPC curta, src/ui/fala-npc.js).
 */
export function notice(color, title, body = null, { foot = null, ephemeral = true, thumb = null, mentions = { parse: [] } } = {}) {
  const corpo = text(`### ${title}${body ? `\n${body}` : ''}`);
  const c = new ContainerBuilder().setAccentColor(color);
  if (thumb) c.addSectionComponents(comMiniatura(corpo, thumb));
  else c.addTextDisplayComponents(corpo);
  if (foot) c.addSeparatorComponents(new SeparatorBuilder().setDivider(false)).addTextDisplayComponents(text(`-# ${foot}`));
  return { components: [c], flags: flagsDe(ephemeral), allowedMentions: mentions };
}

/**
 * Para EDITAR (interaction.update, editReply, message.edit): tira o efêmero (só vale ao criar) e limpa o texto/embeds de uma versão
 * antiga, o que converte uma mensagem antiga (texto ou embed) em container editando no lugar. `attachments: []` tira o anexo antigo
 * (banner, ícone); mande os `files` novos junto.
 */
export const asEdit = ({ flags, ...p }) => ({ attachments: [], ...p, flags: V2, content: null, embeds: [] });

/** Linha de item: NOME na 1ª linha (ponha o negrito nele) e o detalhe pequeno (`-#`) embaixo. Separe itens com linha em branco. */
export const item = (name, detail = null) => (detail ? `${name}\n-# ${detail}` : name);

/** Lista de itens já separada por linha em branco: `lista(missoes.map((m) => item(...)))`. */
export const lista = (itens) => itens.filter(Boolean).join('\n\n');

/**
 * Barra de progresso em texto (10 casas): `▰▰▰▱▱▱▱▱▱▱`. Use o par ▰▱ (mesma altura no Discord; ■□ sai torto).
 * Fração presa em [0, 1]; total 0 = vazia. Nunca mostra cheia antes de acabar nem vazia depois de começar.
 */
export function bar(current, total, size = 10) {
  if (!(total > 0)) return '▱'.repeat(size);
  const f = Math.min(1, Math.max(0, current / total));
  let filled = Math.round(f * size);
  if (f > 0 && filled === 0) filled = 1;
  if (f < 1 && filled === size) filled = size - 1;
  return '▰'.repeat(filled) + '▱'.repeat(size - filled);
}

/** Barra com o número ao lado, do jeito que as telas mostram: `▰▰▰▱▱▱▱▱▱▱ 3/10`. */
export const progresso = (current, total, size = 10) => `${bar(current, total, size)} ${current}/${total}`;
