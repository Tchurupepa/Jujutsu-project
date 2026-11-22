import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { migrate } from '../src/db/migrations.js';
import * as B from '../src/rpg/balance.js';
import { CLAS, ORIGENS, TECNICAS } from '../src/rpg/dados.js';
import { ErroDeFicha, concederXp, confirmarFicha, getFicha, getRascunho, girar, iniciarRascunho } from '../src/rpg/ficha-service.js';
import { aplicarXp, derivados, grauAutomatico, promover, xpParaSubir } from '../src/rpg/progressao.js';
import { atualizarPity, pisoDoPity, sortearPorPeso, sortearTecnica } from '../src/rpg/sorteio.js';

const banco = () => { const db = new DatabaseSync(':memory:'); migrate(db); return db; };
const DADOS = { nome: 'Haruki Mizuno', idade: '17', historia: 'Um garoto comum que viu uma maldição pela primeira vez no caminho da escola.' };
/** rng que devolve sempre o menor valor: primeira raridade, primeira entrada. */
const sempreZero = () => 0;

test('balance: números publicados travados', () => {
  assert.deepEqual(B.PESO_TECNICA, { comum: 5500, rara: 2700, epica: 1200, lendaria: 600 });
  assert.equal(Object.values(B.PESO_TECNICA).reduce((a, b) => a + b, 0), 10000);
  assert.deepEqual(B.PITY, { epica: 50, lendaria: 100 });
  assert.equal(B.PONTOS_POR_NIVEL, 4);
});

test('dados: pesos de origem e clã somam 10.000 e toda técnica de clã existe e é hereditária', () => {
  for (const tabela of [ORIGENS, CLAS]) assert.equal(Object.values(tabela).reduce((s, v) => s + v.peso, 0), 10000);
  for (const c of Object.values(CLAS)) if (c.tecnica) assert.ok(TECNICAS[c.tecnica]?.hereditaria, `${c.tecnica} é hereditária`);
  assert.ok(!Object.values(TECNICAS).some((t) => t.raridade === 'mitica'), 'mítica não sai por sorteio');
});

test('sorteio por peso respeita as faixas', () => {
  assert.equal(sortearPorPeso({ a: 10, b: 90 }, () => 9), 'a');
  assert.equal(sortearPorPeso({ a: 10, b: 90 }, () => 10), 'b');
  assert.equal(sortearPorPeso({ a: 10, b: 90 }, () => 99), 'b');
});

test('pity: piso só sobe a raridade e o contador zera ao sair Épica+/Lendária', () => {
  assert.equal(pisoDoPity({ semEpica: 48, semLendaria: 0 }), null);
  assert.equal(pisoDoPity({ semEpica: 49, semLendaria: 0 }), 'epica');
  assert.equal(pisoDoPity({ semEpica: 10, semLendaria: 99 }), 'lendaria');
  const r = sortearTecnica({ pity: { semEpica: 49, semLendaria: 0 }, rng: sempreZero });
  assert.ok(['epica', 'lendaria'].includes(r.raridade));
  assert.equal(r.pity.semEpica, 0);
  assert.deepEqual(atualizarPity({ semEpica: 3, semLendaria: 3 }, 'comum'), { semEpica: 4, semLendaria: 4 });
  assert.deepEqual(atualizarPity({ semEpica: 3, semLendaria: 3 }, 'epica'), { semEpica: 0, semLendaria: 4 });
});

test('técnica de clã de outro clã nunca entra no sorteio comum', () => {
  for (let k = 0; k < 300; k += 1) {
    const { tecnica } = sortearTecnica({ cla: 'sem_cla', pity: { semEpica: 49, semLendaria: 99 } });
    assert.ok(!TECNICAS[tecnica].hereditaria, `${tecnica} é hereditária`);
  }
});

test('progressão: curva, subida de vários níveis e promoção sem rebaixar', () => {
  assert.equal(xpParaSubir(1), 270);
  assert.equal(xpParaSubir(20), 2200);
  const r = aplicarXp({ nivel: 1, xp: 0 }, 270 + 340 + 5);
  assert.deepEqual([r.nivel, r.xp, r.subiu, r.pontos], [3, 5, 2, 8]);
  assert.equal(grauAutomatico(9), 'grau4');
  assert.equal(grauAutomatico(10), 'grau3');
  assert.equal(grauAutomatico(99), 'grau2', 'Grau 1 e Especial exigem a staff');
  assert.equal(promover('grau1', 30), 'grau1', 'nunca rebaixa');
  assert.deepEqual(derivados({ nivel: 1, atributos: {} }), { vidaMax: 100, eaMax: 100 });
});

test('ficha: valida os dados digitados', () => {
  const db = banco();
  assert.throws(() => iniciarRascunho(db, '1', { ...DADOS, nome: 'X' }), ErroDeFicha);
  assert.throws(() => iniciarRascunho(db, '1', { ...DADOS, nome: 'Rei123' }), ErroDeFicha);
  assert.throws(() => iniciarRascunho(db, '1', { ...DADOS, idade: '9' }), ErroDeFicha);
  assert.throws(() => iniciarRascunho(db, '1', { ...DADOS, historia: 'curta' }), ErroDeFicha);
});

test('ficha: rascunho → giro gasta crédito → confirmar cria o personagem; não duplica', () => {
  const db = banco();
  const r = iniciarRascunho(db, '1', DADOS, sempreZero);
  assert.equal(r.origem, 'feiticeiro');
  assert.equal(r.giros_origem, 3);
  assert.throws(() => iniciarRascunho(db, '1', DADOS), ErroDeFicha, 'rascunho já aberto');

  const g = girar(db, '1', 'cla', sempreZero);
  assert.equal(g.giros_cla, 2);
  for (let k = 0; k < 2; k += 1) girar(db, '1', 'cla', sempreZero);
  assert.throws(() => girar(db, '1', 'cla', sempreZero), ErroDeFicha, 'sem giros');
  assert.equal(getRascunho(db, '1').giros_cla, 0, 'o giro recusado não debita nada');

  const f = confirmarFicha(db, '1');
  assert.equal(f.nivel, 1);
  assert.equal(f.grau, 'grau4');
  assert.equal(f.atributos.controle, 1, 'bônus da origem');
  assert.equal(getRascunho(db, '1'), null);
  assert.throws(() => confirmarFicha(db, '1'), ErroDeFicha);
  assert.throws(() => iniciarRascunho(db, '1', DADOS), ErroDeFicha, 'já tem ficha');
});

test('pity vive na conta: cancelar e recriar não zera o contador', () => {
  const db = banco();
  iniciarRascunho(db, '1', DADOS, sempreZero);
  const antes = db.prepare("SELECT count FROM roll_pity WHERE discord_id = '1' AND key = 'sem_epica'").get().count;
  assert.equal(antes, 1);
  db.prepare("DELETE FROM sheet_sessions WHERE discord_id = '1'").run();
  iniciarRascunho(db, '1', DADOS, sempreZero);
  assert.equal(db.prepare("SELECT count FROM roll_pity WHERE discord_id = '1' AND key = 'sem_epica'").get().count, 2);
});

test('restrição celestial não tem técnica; sair dela sorteia uma', () => {
  const db = banco();
  // 9.900 cai na faixa de Restrição Celestial (8500 + 1300 = 9800 → 9800..9999).
  let chamada = 0;
  const rng = (min, max) => (chamada++ === 0 ? 9900 : min);
  const r = iniciarRascunho(db, '1', DADOS, rng);
  assert.equal(r.origem, 'restricao_celestial');
  assert.equal(r.tecnica, null);
  assert.throws(() => girar(db, '1', 'tecnica', sempreZero), ErroDeFicha);
  assert.equal(getRascunho(db, '1').giros_tecnica, 3, 'recusado sem gastar giro');
  const g = girar(db, '1', 'origem', sempreZero);
  assert.equal(g.origem, 'feiticeiro');
  assert.ok(g.tecnica, 'ganhou uma técnica');
});

test('XP: idempotente por (fonte, ref), sobe de nível e promove o grau', () => {
  const db = banco();
  iniciarRascunho(db, '1', DADOS, sempreZero);
  confirmarFicha(db, '1');
  const a = concederXp(db, '1', 1000, 'missao', 'm1');
  assert.equal(a.duplicate, false);
  assert.ok(a.nivel > 1 && a.pontos === a.subiu * 4);
  const b = concederXp(db, '1', 1000, 'missao', 'm1');
  assert.equal(b.duplicate, true);
  assert.equal(b.pago, 0);
  assert.equal(getFicha(db, '1').nivel, a.nivel, 'repetir a ref não paga de novo');
  const c = concederXp(db, '1', 5000, 'missao', 'm2');
  assert.equal(c.grau, 'grau3');
  assert.throws(() => concederXp(db, '1', 0, 'x', 'y'), ErroDeFicha);
  assert.throws(() => concederXp(db, '2', 10, 'x', 'y'), ErroDeFicha, 'sem ficha');
});
