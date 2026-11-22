// FALA DE NPC: quem fala aparece pelo TOKEN dele (retrato redondo com borda, o mesmo do mapa/ficha), como miniatura À DIREITA do
// bloco da fala; nunca por emoji genérico de pessoa (o test/fala-npc.test.js reprova). O retrato do token sempre tem paisagem ao fundo.
// A miniatura precisa de uma URL que o DISCORD consiga baixar (CDN/Blob/bucket público ou `attachment://`): pelo endereço do site do
// bot ela costuma sair quebrada. Sem token publicado, o bloco sai só com o texto (nunca imagem quebrada).
// Custo: a fala vira uma seção (seção + texto + miniatura = 3 componentes em vez de 1) e ocupa o acessório do bloco: botão ali não cabe,
// os botões ficam no fim do container como sempre.
import { notice, panel } from './panel.js';
import { caber } from './limites.js';

let resolver = () => null;
/**
 * Diz onde mora o token de cada NPC: `definirResolvedorDeToken((id) => manifesto[`npcs/tokens/${id}.png`] ?? null)`.
 * Chame uma vez no boot. A função recebe o id do NPC e devolve a URL pública (https://... ou attachment://...) ou null.
 */
export function definirResolvedorDeToken(fn) { resolver = typeof fn === 'function' ? fn : () => null; }

/** URL do token que o Discord baixa, ou null (sem token publicado, ou endereço que não é https/attachment). */
export function tokenUrl(npcId) {
  if (!npcId) return null;
  let u = null;
  try { u = resolver(npcId); } catch { u = null; }
  return typeof u === 'string' && /^(https:\/\/|attachment:\/\/)/.test(u) ? u : null;
}

/** A fala em si: itálico entre aspas curvas. */
export const falaTexto = (texto) => `*“${texto}”*`;

/**
 * Bloco de fala para o `blocks` do panel(): `### Nome` (opcional), a fala e um detalhe `-#` (opcional), com o token à direita.
 * @param {{ nome?: string|null, texto: string, npc?: string|null, detalhe?: string|null }} f  npc: id do NPC.
 * @returns {string|{text: string, thumb: string}}
 */
export function falaNpc({ nome = null, texto, npc = null, detalhe = null }) {
  const text = [nome ? `### ${nome}` : null, falaTexto(texto), detalhe ? `-# ${detalhe}` : null].filter(Boolean).join('\n');
  const thumb = tokenUrl(npc);
  return thumb ? { text, thumb } : text;
}

/** Fala curta como resposta (notice) com o token à direita: `falaCurta(COR.historia, npc, 'Volte amanhã.')`. */
export const falaCurta = (cor, npc, texto, opts = {}) => notice(cor, npc.nome, falaTexto(texto), { ...opts, thumb: tokenUrl(npc.id) });

/**
 * Tela de diálogo com um NPC: `# Nome`, `-# estado · 📍 local`, a fala (1º bloco, token à direita) e os blocos da conversa/missão;
 * botões no fim. Com token, o título perde o emoji (o rosto já identifica); sem token, o emoji do NPC volta para o título.
 * Tudo cabe no orçamento de texto (4000 somando a mensagem).
 * @param {{ id: string, nome: string, emoji?: string, local?: string|null }} npc
 */
export function dialogoNpc(npc, { fala = null, estado = null, cor, blocks = [], foot = null, rows = [], ephemeral = true } = {}) {
  const thumb = tokenUrl(npc.id);
  const title = thumb || !npc.emoji ? npc.nome : `${npc.emoji} ${npc.nome}`;
  const sub = [estado, npc.local ? `📍 ${npc.local}` : null].filter(Boolean).join(' · ') || null;
  const usado = title.length + (sub?.length ?? 0) + (foot?.length ?? 0) + 40;
  const corpo = caber([fala ? falaTexto(fala) : null, ...blocks], 3950 - usado);
  return panel({ color: cor, title, sub, blocks: corpo, thumb: fala ? thumb : null, foot, rows, ephemeral });
}
