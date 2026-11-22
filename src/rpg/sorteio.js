// Sorteio de origem, clã e técnica. Regra pura: sem banco, sem Discord. O `rng(min, max)` é injetável (como node:crypto.randomInt: [min, max)).
import { randomInt } from 'node:crypto';
import { CHANCE_TECNICA_DO_CLA, PESO_TECNICA, PITY } from './balance.js';
import { CLAS, ORIGENS, RARIDADES, TECNICAS } from './dados.js';

/** Sorteia uma chave de `{ chave: peso }`. */
export function sortearPorPeso(pesos, rng = randomInt) {
  const entradas = Object.entries(pesos).filter(([, p]) => p > 0);
  const total = entradas.reduce((s, [, p]) => s + p, 0);
  let alvo = rng(0, total);
  for (const [chave, peso] of entradas) {
    if (alvo < peso) return chave;
    alvo -= peso;
  }
  return entradas.at(-1)[0];
}

const pesosDe = (tabela) => Object.fromEntries(Object.entries(tabela).map(([k, v]) => [k, v.peso]));

export const sortearOrigem = (rng = randomInt) => sortearPorPeso(pesosDe(ORIGENS), rng);
export const sortearCla = (rng = randomInt) => sortearPorPeso(pesosDe(CLAS), rng);

const ordem = (r) => RARIDADES.indexOf(r);

/** Raridade mínima garantida pelo pity, ou null. O piso só SOBE a raridade, nunca baixa. */
export function pisoDoPity(pity = {}) {
  if ((pity.semLendaria ?? 0) + 1 >= PITY.lendaria) return 'lendaria';
  if ((pity.semEpica ?? 0) + 1 >= PITY.epica) return 'epica';
  return null;
}

/** Contadores depois de um giro de técnica que saiu com `raridade`. */
export function atualizarPity(pity = {}, raridade) {
  const epicaOuMais = ordem(raridade) >= ordem('epica');
  const lendariaOuMais = ordem(raridade) >= ordem('lendaria');
  return {
    semEpica: epicaOuMais ? 0 : (pity.semEpica ?? 0) + 1,
    semLendaria: lendariaOuMais ? 0 : (pity.semLendaria ?? 0) + 1,
  };
}

/**
 * Sorteia a técnica inata: raridade primeiro (pesos + piso do pity), depois a técnica (chance igual dentro da raridade).
 * A técnica do clã pesa o sorteio (CHANCE_TECNICA_DO_CLA %) quando a raridade dela é compatível, mas nunca é garantida.
 * Técnica hereditária de outro clã nunca entra no sorteio comum.
 * @returns {{ tecnica: string, raridade: string, pity: {semEpica:number, semLendaria:number} }}
 */
export function sortearTecnica({ cla = 'sem_cla', pity = {}, rng = randomInt } = {}) {
  const piso = pisoDoPity(pity);
  let raridade = sortearPorPeso(PESO_TECNICA, rng);
  if (piso && ordem(raridade) < ordem(piso)) raridade = piso;

  const doCla = CLAS[cla]?.tecnica;
  let escolhida = null;
  if (doCla && ordem(TECNICAS[doCla].raridade) >= ordem(piso ?? 'comum') && rng(0, 100) < CHANCE_TECNICA_DO_CLA) {
    escolhida = doCla;
    raridade = TECNICAS[doCla].raridade;
  }
  if (!escolhida) {
    const candidatas = Object.entries(TECNICAS).filter(([, t]) => t.raridade === raridade && !t.hereditaria).map(([id]) => id);
    escolhida = candidatas[rng(0, candidatas.length)];
  }
  return { tecnica: escolhida, raridade, pity: atualizarPity(pity, raridade) };
}
