// Grid do combate: distância, ocupação, passo, empurrar e puxar. Regra pura sobre o estado do combate.
import { CUSTO_PASSO } from './balance.js';

export const dentro = (grid, p) => p.x >= 0 && p.y >= 0 && p.x < grid.w && p.y < grid.h;
export const eObstaculo = (grid, p) => grid.obstaculos.some((o) => o.x === p.x && o.y === p.y);

/** Distância de Chebyshev: a diagonal conta 1 casa (alcance de golpe e de técnica). */
export const distancia = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export const ocupada = (estado, p, ignorarId = null) =>
  estado.participantes.some((q) => q.id !== ignorarId && q.hp > 0 && q.pos.x === p.x && q.pos.y === p.y);

/** Vetor unitário (8 direções) de `de` para `para`. */
export const direcao = (de, para) => ({ dx: Math.sign(para.x - de.x), dy: Math.sign(para.y - de.y) });

/** Casa dentro do mapa, sem obstáculo e sem ninguém vivo. */
export const livre = (estado, p, ignorarId) => dentro(estado.grid, p) && !eObstaculo(estado.grid, p) && !ocupada(estado, p, ignorarId);

/** Custo de um passo (reto 1, diagonal 1,5). */
export const custoDoPasso = (dx, dy) => (dx !== 0 && dy !== 0 ? CUSTO_PASSO.diagonal : CUSTO_PASSO.reto);

/** Empurra `alvo` para longe de `origem`, até `casas`. `bateu`: parou em obstáculo/borda/criatura antes de completar. */
export function empurrar(estado, alvo, origem, casas) {
  const { dx, dy } = direcao(origem.pos, alvo.pos);
  if (dx === 0 && dy === 0) return { movidas: 0, bateu: true };
  let movidas = 0;
  for (let k = 0; k < casas; k += 1) {
    const prox = { x: alvo.pos.x + dx, y: alvo.pos.y + dy };
    if (!livre(estado, prox, alvo.id)) return { movidas, bateu: true };
    alvo.pos = prox;
    movidas += 1;
  }
  return { movidas, bateu: false };
}

/** Puxa `alvo` em direção a `destino`, até `casas`, parando colado nele (distância 1). */
export function puxar(estado, alvo, destino, casas) {
  const { dx, dy } = direcao(alvo.pos, destino.pos);
  let movidas = 0;
  for (let k = 0; k < casas && distancia(alvo.pos, destino.pos) > 1; k += 1) {
    const prox = { x: alvo.pos.x + dx, y: alvo.pos.y + dy };
    if (!livre(estado, prox, alvo.id)) break;
    alvo.pos = prox;
    movidas += 1;
  }
  return { movidas };
}
