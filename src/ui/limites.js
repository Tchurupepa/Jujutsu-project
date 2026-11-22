// Limites do Components V2 que FALHAM EM SILÊNCIO (a mensagem não sai, ou a interação "falha" sem dizer o porquê):
//   • 4000 caracteres de texto SOMANDO todos os TextDisplay da mensagem (não é por bloco);
//   • 40 componentes na mensagem, contando o próprio container e tudo que está aninhado (seção, texto, miniatura, divisória,
//     galeria, linha de botões e CADA botão);
//   • por linha de ação: até 5 botões OU 1 menu; rótulo de botão até 80 caracteres; customId até 100 (regra da casa: até 5 linhas);
//   • o flag IsComponentsV2 não pode ser tirado depois de enviado, e com ele `content`/`embeds` não são aceitos.
// Aqui ficam a régua (medir) e as ferramentas para caber: cortar blocos num orçamento e paginar listas que crescem.
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const MAX_TEXTO = 4000;
export const MAX_COMPONENTES = 40;
/** Folga padrão: título, subtítulo, rodapé e a linha de página cabem nela. */
export const ORCAMENTO_PADRAO = 3500;

const TIPO_TEXTO = 10;
const json = (c) => (typeof c?.toJSON === 'function' ? c.toJSON() : c);

/** Conta componentes como o Discord: todo objeto com `type`, descendo em `components` e `accessory` (itens de galeria não contam). */
export function contarComponentes(lista) {
  let n = 0;
  const andar = (c) => {
    if (!c || typeof c !== 'object' || typeof c.type !== 'number') return;
    n += 1;
    (c.components ?? []).forEach(andar);
    if (c.accessory) andar(c.accessory);
  };
  (lista ?? []).map(json).forEach(andar);
  return n;
}

/** Soma o texto de todos os TextDisplay (inclusive dentro de seções). */
export function contarTexto(lista) {
  let n = 0;
  const andar = (c) => {
    if (!c || typeof c !== 'object') return;
    if (c.type === TIPO_TEXTO && typeof c.content === 'string') n += c.content.length;
    (c.components ?? []).forEach(andar);
  };
  (lista ?? []).map(json).forEach(andar);
  return n;
}

/** A régua de um payload: `{ texto, componentes, cabe }`. Use nos testes de toda tela que cresce com o conteúdo. */
export function medir(payload) {
  const texto = contarTexto(payload?.components);
  const componentes = contarComponentes(payload?.components);
  return { texto, componentes, cabe: texto <= MAX_TEXTO && componentes <= MAX_COMPONENTES };
}

/** Corta `s` em `n` caracteres com reticências. */
export const cortar = (s, n) => (String(s).length > n ? `${String(s).slice(0, Math.max(0, n - 1))}…` : String(s));

/**
 * Faz os blocos caberem JUNTOS num orçamento de texto: os primeiros entram inteiros, o que estoura é cortado com "…" e o que não cabe
 * some. Bom para telas com texto livre (narração, fala, história). Para listas, prefira paginar().
 */
export function caber(blocos, total = ORCAMENTO_PADRAO) {
  let resto = total;
  return blocos.filter(Boolean).map((b) => {
    const t = b.length > resto ? cortar(b, resto) : b;
    resto -= t.length;
    return t;
  }).filter((t) => t.length > 1);
}

/**
 * Pagina por ORÇAMENTO DE TEXTO (não por quantidade fixa): enche cada página com itens até o orçamento, nunca parte um item no meio
 * (um item maior que a página inteira é cortado). `juntar` entra entre itens. Devolve um array de páginas, cada uma um array de itens.
 * `porPagina` (opcional) limita também a quantidade, útil quando cada item tem um botão/menu próprio (teto de componentes).
 */
export function paginar(itens, { orcamento = ORCAMENTO_PADRAO, juntar = '\n\n', porPagina = Infinity } = {}) {
  const paginas = [];
  let atual = []; let usado = 0;
  for (const bruto of itens.filter(Boolean)) {
    const it = bruto.length > orcamento ? cortar(bruto, orcamento) : bruto;
    const custo = it.length + (atual.length ? juntar.length : 0);
    if (atual.length && (usado + custo > orcamento || atual.length >= porPagina)) { paginas.push(atual); atual = []; usado = 0; }
    usado += it.length + (atual.length ? juntar.length : 0);
    atual.push(it);
  }
  if (atual.length || !paginas.length) paginas.push(atual);
  return paginas;
}

/** Página pedida presa nos limites (botão velho com página que não existe mais cai na última). */
export const prender = (pagina, total) => Math.min(Math.max(0, Number(pagina) || 0), Math.max(0, total - 1));

/**
 * Linha ◀ n/N ▶ para navegar. customId = `${prefixo}:${pagina}`; quem trata o clique lê o número do fim.
 * O botão do meio só mostra a página (desativado). Some (null) quando há uma página só.
 */
export function navPaginas(prefixo, pagina, total) {
  if (total <= 1) return null;
  const b = (id, label, desligado, emoji) => {
    const x = new ButtonBuilder().setCustomId(id).setStyle(ButtonStyle.Secondary).setDisabled(desligado);
    return emoji ? x.setEmoji(emoji) : x.setLabel(label);
  };
  return new ActionRowBuilder().addComponents(
    b(`${prefixo}:${pagina - 1}`, null, pagina <= 0, '◀️'),
    b(`${prefixo}:pagina`, `${pagina + 1}/${total}`, true),
    b(`${prefixo}:${pagina + 1}`, null, pagina >= total - 1, '▶️'),
  );
}
