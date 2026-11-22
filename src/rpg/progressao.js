// Progressão: curva de XP, nível, pontos, vida/EA e graus. Regra pura.
import {
  EA_BASE, EA_POR_PRODUCAO, NIVEL_MAX, PONTOS_POR_NIVEL, VIDA_BASE, VIDA_POR_NIVEL, VIDA_POR_RESISTENCIA,
} from './balance.js';
import { GRAUS } from './dados.js';

/** XP para sair do nível `n` para o seguinte. */
export const xpParaSubir = (n) => (n >= 20 ? 200 + 100 * n : 200 + 70 * n);

/**
 * Aplica XP a uma ficha { nivel, xp }: sobe quantos níveis couberem e para no máximo.
 * @returns {{ nivel: number, xp: number, subiu: number, pontos: number }}
 */
export function aplicarXp({ nivel, xp }, quantidade) {
  let n = nivel;
  let resto = xp + Math.max(0, Math.floor(quantidade));
  while (n < NIVEL_MAX && resto >= xpParaSubir(n)) {
    resto -= xpParaSubir(n);
    n += 1;
  }
  if (n >= NIVEL_MAX) resto = 0;
  const subiu = n - nivel;
  return { nivel: n, xp: resto, subiu, pontos: subiu * PONTOS_POR_NIVEL };
}

/** Maior grau que o nível libera SOZINHO (graus com aprovação da staff não entram). */
export function grauAutomatico(nivel) {
  return [...GRAUS].reverse().find((g) => g.auto && nivel >= g.nivelMin)?.id ?? GRAUS[0].id;
}

const ordemGrau = (id) => GRAUS.findIndex((g) => g.id === id);

/** Promove sem nunca rebaixar: devolve o grau novo ou o atual. */
export function promover(grauAtual, nivel) {
  const alvo = grauAutomatico(nivel);
  return ordemGrau(alvo) > ordemGrau(grauAtual) ? alvo : grauAtual;
}

/** Tetos derivados de nível e atributos (uma função só: perfil e combate leem o mesmo número). */
export function derivados({ nivel, atributos = {} }) {
  return {
    vidaMax: VIDA_BASE + (nivel - 1) * VIDA_POR_NIVEL + (atributos.resistencia ?? 0) * VIDA_POR_RESISTENCIA,
    eaMax: EA_BASE + (atributos.producao ?? 0) * EA_POR_PRODUCAO,
  };
}
