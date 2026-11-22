// Serviço da ficha: regras + banco, sem Discord. Toda mudança é uma transação; o que "paga uma vez" tem ledger.
import { randomInt } from 'node:crypto';
import { GIROS_INICIAIS, HISTORIA, IDADE, NOME } from './balance.js';
import { ATRIBUTOS, CLAS, GRAUS, ORIGENS } from './dados.js';
import { aplicarXp, promover } from './progressao.js';
import { sortearCla, sortearOrigem, sortearTecnica } from './sorteio.js';

/** Erro com mensagem boa para mostrar ao jogador. */
export class ErroDeFicha extends Error {}

export function transacao(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

const lerFicha = (row) => (row ? { ...row, atributos: JSON.parse(row.atributos) } : null);
export const getFicha = (db, id) => lerFicha(db.prepare('SELECT * FROM characters WHERE discord_id = ?').get(id));
export const getRascunho = (db, id) => db.prepare('SELECT * FROM sheet_sessions WHERE discord_id = ?').get(id) ?? null;

function lerPity(db, id) {
  const linhas = db.prepare("SELECT key, count FROM roll_pity WHERE discord_id = ? AND kind = 'tecnica'").all(id);
  const mapa = Object.fromEntries(linhas.map((l) => [l.key, l.count]));
  return { semEpica: mapa.sem_epica ?? 0, semLendaria: mapa.sem_lendaria ?? 0 };
}

function gravarPity(db, id, pity) {
  const up = db.prepare(`INSERT INTO roll_pity (discord_id, kind, key, count) VALUES (?, 'tecnica', ?, ?)
    ON CONFLICT (discord_id, kind, key) DO UPDATE SET count = excluded.count`);
  up.run(id, 'sem_epica', pity.semEpica);
  up.run(id, 'sem_lendaria', pity.semLendaria);
}

/** Valida e normaliza o que o jogador digitou. */
export function validarDados({ nome, idade, historia }) {
  const n = String(nome ?? '').trim().replace(/\s+/g, ' ');
  if (n.length < NOME.min || n.length > NOME.max || !/^[\p{L}][\p{L}' -]*$/u.test(n)) {
    throw new ErroDeFicha(`O nome precisa ter de ${NOME.min} a ${NOME.max} caracteres, só letras, espaço, hífen ou apóstrofo.`);
  }
  const i = Number(String(idade ?? '').trim());
  if (!Number.isInteger(i) || i < IDADE.min || i > IDADE.max) throw new ErroDeFicha(`A idade precisa ser um número de ${IDADE.min} a ${IDADE.max}.`);
  const h = String(historia ?? '').trim();
  if (h.length < HISTORIA.min || h.length > HISTORIA.max) throw new ErroDeFicha(`A história precisa ter de ${HISTORIA.min} a ${HISTORIA.max} caracteres.`);
  return { nome: n, idade: i, historia: h };
}

/** Abre o rascunho já com o primeiro sorteio dos três eixos. Quem já tem ficha ou rascunho não sorteia de novo. */
export function iniciarRascunho(db, id, dados, rng = randomInt) {
  const { nome, idade, historia } = validarDados(dados);
  return transacao(db, () => {
    if (getFicha(db, id)) throw new ErroDeFicha('Você já tem uma ficha.');
    if (getRascunho(db, id)) throw new ErroDeFicha('Você já tem um rascunho aberto. Continue ou cancele o atual.');
    const origem = sortearOrigem(rng);
    const cla = sortearCla(rng);
    let tecnica = null;
    let raridade = null;
    if (!ORIGENS[origem].semTecnica) {
      const s = sortearTecnica({ cla, pity: lerPity(db, id), rng });
      tecnica = s.tecnica;
      raridade = s.raridade;
      gravarPity(db, id, s.pity);
    }
    db.prepare(`INSERT INTO sheet_sessions (discord_id, name, age, story, origem, cla, tecnica, tecnica_raridade,
      giros_origem, giros_cla, giros_tecnica, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, nome, idade, historia, origem, cla, tecnica, raridade, GIROS_INICIAIS.origem, GIROS_INICIAIS.cla, GIROS_INICIAIS.tecnica, Date.now());
    return getRascunho(db, id);
  });
}

const COLUNA_GIRO = { origem: 'giros_origem', cla: 'giros_cla', tecnica: 'giros_tecnica' };

/** Gasta um giro do eixo e sorteia de novo. O crédito e o pity mudam na MESMA transação do sorteio. */
export function girar(db, id, eixo, rng = randomInt) {
  const coluna = COLUNA_GIRO[eixo];
  if (!coluna) throw new ErroDeFicha('Eixo de sorteio desconhecido.');
  return transacao(db, () => {
    const r = getRascunho(db, id);
    if (!r) throw new ErroDeFicha('Você não tem um rascunho aberto.');
    if (eixo === 'tecnica' && ORIGENS[r.origem].semTecnica) throw new ErroDeFicha('Esta origem não tem técnica inata para sortear.');
    const gasto = db.prepare(`UPDATE sheet_sessions SET ${coluna} = ${coluna} - 1 WHERE discord_id = ? AND ${coluna} > 0`).run(id);
    if (Number(gasto.changes) !== 1) throw new ErroDeFicha('Você não tem mais giros neste eixo.');

    let { origem, cla, tecnica, tecnica_raridade: raridade } = r;
    const sortearTec = () => {
      const s = sortearTecnica({ cla, pity: lerPity(db, id), rng });
      gravarPity(db, id, s.pity);
      tecnica = s.tecnica;
      raridade = s.raridade;
    };
    if (eixo === 'origem') {
      origem = sortearOrigem(rng);
      if (ORIGENS[origem].semTecnica) { tecnica = null; raridade = null; } else if (!tecnica) sortearTec();
    } else if (eixo === 'cla') {
      cla = sortearCla(rng);
    } else {
      sortearTec();
    }
    db.prepare('UPDATE sheet_sessions SET origem = ?, cla = ?, tecnica = ?, tecnica_raridade = ?, updated_at = ? WHERE discord_id = ?')
      .run(origem, cla, tecnica, raridade, Date.now(), id);
    return getRascunho(db, id);
  });
}

export function cancelarRascunho(db, id) {
  return Number(db.prepare('DELETE FROM sheet_sessions WHERE discord_id = ?').run(id).changes) === 1;
}

/** Aceita o sorteio atual e cria o personagem (tudo ou nada). */
export function confirmarFicha(db, id) {
  return transacao(db, () => {
    const r = getRascunho(db, id);
    if (!r) throw new ErroDeFicha('Você não tem um rascunho aberto.');
    if (getFicha(db, id)) throw new ErroDeFicha('Você já tem uma ficha.');
    const atributos = Object.fromEntries(Object.keys(ATRIBUTOS).map((k) => [k, ORIGENS[r.origem].bonus?.[k] ?? 0]));
    db.prepare(`INSERT INTO characters (discord_id, name, age, story, origem, cla, tecnica, tecnica_raridade, grau, nivel, xp, pontos, atributos, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, ?, ?)`)
      .run(id, r.name, r.age, r.story, r.origem, r.cla, r.tecnica, r.tecnica_raridade, GRAUS[0].id, JSON.stringify(atributos), Date.now());
    db.prepare('DELETE FROM sheet_sessions WHERE discord_id = ?').run(id);
    return getFicha(db, id);
  });
}

/**
 * Porta única de XP. Idempotente por (fonte, ref): repetir a mesma ref não paga de novo.
 * Devolve o que foi PAGO (o recibo mostra esse número).
 */
export function concederXp(db, id, quantidade, fonte, ref) {
  const q = Math.floor(Number(quantidade));
  if (!(q > 0)) throw new ErroDeFicha('A quantidade de XP precisa ser positiva.');
  return transacao(db, () => {
    const f = getFicha(db, id);
    if (!f) throw new ErroDeFicha('Esse jogador não tem ficha.');
    const ja = db.prepare('SELECT 1 FROM xp_ledger WHERE discord_id = ? AND source = ? AND ref = ?').get(id, fonte, String(ref));
    if (ja) return { duplicate: true, pago: 0, nivel: f.nivel, subiu: 0, pontos: 0, grau: f.grau, grauAntes: f.grau };
    db.prepare('INSERT INTO xp_ledger VALUES (?, ?, ?, ?, ?)').run(id, fonte, String(ref), q, Date.now());
    const novo = aplicarXp(f, q);
    const grau = promover(f.grau, novo.nivel);
    db.prepare('UPDATE characters SET nivel = ?, xp = ?, pontos = pontos + ?, grau = ? WHERE discord_id = ?')
      .run(novo.nivel, novo.xp, novo.pontos, grau, id);
    return { duplicate: false, pago: q, nivel: novo.nivel, subiu: novo.subiu, pontos: novo.pontos, grau, grauAntes: f.grau };
  });
}

export const nomeDaOrigem = (id) => ORIGENS[id]?.nome ?? id;
export const nomeDoCla = (id) => CLAS[id]?.nome ?? id;
