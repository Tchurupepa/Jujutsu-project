// Serviço do combate: carrega/grava a sessão (JSON por canal) e paga a recompensa. Síncrono: sem await entre ler e gravar.
import { derivados } from '../rpg/progressao.js';
import { ErroDeFicha, concederXp, getFicha, transacao } from '../rpg/ficha-service.js';
import { MALDICAO_GRAU4, SESSION_VERSION } from './balance.js';
import { ErroDeCombate, aplicar, criarCombate } from './motor.js';
import { habilidadesDe } from './tecnicas.js';

export { ErroDeCombate };

const ler = (row) => {
  if (!row) return null;
  const estado = JSON.parse(row.state);
  return estado.v === SESSION_VERSION ? { ...row, estado } : null;
};

export const getCombate = (db, canal) => ler(db.prepare('SELECT * FROM combats WHERE channel_id = ?').get(canal));
export const getCombateDoJogador = (db, dono) => ler(db.prepare('SELECT * FROM combats WHERE owner_id = ?').get(dono));

function gravar(db, canal, dono, estado) {
  db.prepare(`INSERT INTO combats (channel_id, owner_id, state, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT (channel_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`)
    .run(canal, dono, JSON.stringify(estado), Date.now());
}

/** Abre um treino contra uma Maldição de Grau 4. A ficha é "congelada" na montagem; sem ficha, usa atributos zerados. */
export function iniciarTreino(db, canal, dono, { nomeDiscord, modoTeste = false } = {}) {
  return transacao(db, () => {
    if (getCombate(db, canal)) throw new ErroDeCombate('Já existe uma luta neste canal.');
    if (getCombateDoJogador(db, dono)) throw new ErroDeCombate('Você já está em outra luta. Termine ou fuja dela primeiro.');
    const ficha = getFicha(db, dono);
    const atributos = ficha?.atributos ?? {};
    const habilidades = new Set(habilidadesDe(ficha?.tecnica));
    if (modoTeste) for (const id of ['azul', 'vermelho']) habilidades.add(id);
    const estado = criarCombate({
      jogador: {
        id: dono, nome: ficha?.name ?? nomeDiscord ?? 'Feiticeiro', emoji: '🔷',
        vidaMax: ficha ? derivados(ficha).vidaMax : 100, atributos, habilidades: [...habilidades],
      },
      inimigo: { ...MALDICAO_GRAU4, ataque: MALDICAO_GRAU4.ataque },
    });
    gravar(db, canal, dono, estado);
    return estado;
  });
}

/** Quem paga é a mesma função que decide a vitória: o fim da sessão. Idempotente por (fonte, ref = id da sessão). */
function finalizar(db, canal, estado) {
  let recompensa = null;
  if (estado.fim.vencedor === 'jogador') {
    const dono = estado.participantes.find((p) => p.lado === 'jogador').id;
    try { recompensa = concederXp(db, dono, MALDICAO_GRAU4.xp, 'combate', estado.id); } catch (e) { if (!(e instanceof ErroDeFicha)) throw e; }
  }
  db.prepare('DELETE FROM combats WHERE channel_id = ?').run(canal);
  return recompensa;
}

/**
 * Aplica uma ação. `seq` é o do cartão clicado: botão de cartão velho não executa nada (devolve a tela atual).
 * @returns {{ estado, desatualizado: boolean, recompensa: object|null }}
 */
export function agir(db, canal, dono, acao, seq) {
  const row = getCombate(db, canal);
  if (!row) throw new ErroDeCombate('Não há luta neste canal.');
  if (row.owner_id !== dono) throw new ErroDeCombate('Esta não é a sua luta.');
  // Luta que um restart deixou gravada já terminada: termina o pagamento (idempotente) e fecha.
  if (row.estado.fim) return { estado: row.estado, desatualizado: false, recompensa: finalizar(db, canal, row.estado) };
  if (seq !== row.estado.seq) return { estado: row.estado, desatualizado: true, recompensa: null };
  const estado = aplicar(row.estado, acao);
  gravar(db, canal, dono, estado);
  const recompensa = estado.fim ? finalizar(db, canal, estado) : null;
  return { estado, desatualizado: false, recompensa };
}

/** Foge: encerra a luta sem recompensa. */
export function fugir(db, canal, dono) {
  const row = getCombate(db, canal);
  if (!row || row.owner_id !== dono) throw new ErroDeCombate('Não há luta sua neste canal.');
  db.prepare('DELETE FROM combats WHERE channel_id = ?').run(canal);
  return row.estado;
}
