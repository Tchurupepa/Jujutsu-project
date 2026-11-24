import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import * as B from '../src/combat/balance.js';
import { agir, fugir, getCombate, iniciarTreino } from '../src/combat/combate-service.js';
import { telaCombate, telaFim } from '../src/combat/combate-ui.js';
import { distancia } from '../src/combat/grid.js';
import { ErroDeCombate, aplicar, ativoDe, chanceKokusen, criarCombate, porId } from '../src/combat/motor.js';
import { HABILIDADES, regrasDe } from '../src/combat/tecnicas.js';
import { migrate } from '../src/db/migrations.js';
import { confirmarFicha, getFicha, iniciarRascunho } from '../src/rpg/ficha-service.js';
import { medir } from '../src/ui/limites.js';

const GOJO = { id: 'j', nome: 'Satoru', emoji: '🔷', vidaMax: 100, atributos: { agilidade: 2 }, habilidades: ['azul', 'vermelho'] };
const MALDICAO = { ...B.MALDICAO_GRAU4 };
const novo = (jog = GOJO, ini = MALDICAO) => criarCombate({ jogador: jog, inimigo: ini, id: 'teste' });
/** Posiciona participantes à mão para o teste. */
const poe = (e, j, i) => { porId(e, 'j').pos = { ...j }; porId(e, B.MALDICAO_GRAU4.id).pos = { ...i }; return e; };
const inimigo = (e) => porId(e, B.MALDICAO_GRAU4.id);

test('balance: números do combate travados', () => {
  assert.deepEqual(B.AZUL, { custo: 20, recarga: 2, alcance: 6, dano: 12, puxa: 3 });
  assert.deepEqual(B.VERMELHO, { custo: 30, recarga: 3, alcance: 5, dano: 26, empurra: 3, impacto: 10, comboMult: 1.3 });
  assert.equal(B.POOL_EA, 100);
  assert.equal(B.RECUPERAR_EA, 20);
  assert.equal(B.POOL_STAMINA, 100);
  assert.equal(B.RECUPERAR_STAMINA, 30);
  assert.deepEqual(B.ATAQUE_BASICO, { dano: 10, alcance: 1, custoStamina: 15 });
  assert.equal(B.BLACK_FLASH.minCasas, 2);
  assert.ok(B.AZUL.custo <= B.POOL_EA && B.VERMELHO.custo <= B.POOL_EA, 'cabe no pool de 100');
});

test('atributo não escala dano: mesma habilidade, mesmo dano com Controle 0 ou 10', () => {
  const dano = (controle) => {
    const e = poe(novo({ ...GOJO, atributos: { controle, forca: controle } }), { x: 1, y: 3 }, { x: 3, y: 3 });
    const r = aplicar(e, { tipo: 'habilidade', id: 'azul' });
    return inimigo(e).hp - inimigo(r).hp;
  };
  assert.equal(dano(0), dano(10));
  assert.equal(dano(0), B.AZUL.dano);
});

test('turno: jogador abre; mover gasta orçamento (reto 1, diagonal 1,5) e recusa sem movimento', () => {
  let e = novo();
  assert.equal(ativoDe(e).id, 'j');
  e = aplicar(e, { tipo: 'mover', dx: 1, dy: 0 });
  e = aplicar(e, { tipo: 'mover', dx: 1, dy: 1 });
  assert.equal(porId(e, 'j').mov, 0.5);
  assert.throws(() => aplicar(e, { tipo: 'mover', dx: 1, dy: 0 }), ErroDeCombate);
});

test('mover recusa obstáculo e borda; o estado original não muda (aplicar é puro)', () => {
  const e = poe(novo(), { x: 3, y: 1 }, { x: 8, y: 5 });
  assert.throws(() => aplicar(e, { tipo: 'mover', dx: 1, dy: 0 }), /bloqueada/);
  const borda = poe(novo(), { x: 0, y: 0 }, { x: 8, y: 5 });
  assert.throws(() => aplicar(borda, { tipo: 'mover', dx: -1, dy: 0 }), ErroDeCombate);
  const antes = JSON.stringify(e);
  aplicar(e, { tipo: 'mover', dx: 0, dy: 1 });
  assert.equal(JSON.stringify(e), antes);
});

test('Azul: puxa até 3 casas parando colado, cobra EA, aplica Atraído e entra em recarga', () => {
  const e = poe(novo(), { x: 1, y: 5 }, { x: 7, y: 5 });
  const r = aplicar(e, { tipo: 'habilidade', id: 'azul' });
  const j = porId(r, 'j');
  assert.equal(distancia(j.pos, inimigo(r).pos) >= 1, true);
  assert.equal(inimigo(r).pos.x, 4 + 0, 'puxado 3 casas: 7 → 4');
  assert.equal(j.ea, B.POOL_EA - B.AZUL.custo);
  assert.equal(j.recargas.azul, B.AZUL.recarga);
  assert.ok(inimigo(r).status.some((s) => s.id === 'atraido'));
  assert.ok(inimigo(r).hp <= inimigo(e).hp - B.AZUL.dano);
});

test('Azul para colado no conjurador (nunca atravessa)', () => {
  const e = poe(novo(), { x: 1, y: 3 }, { x: 3, y: 3 });
  const r = aplicar(e, { tipo: 'habilidade', id: 'azul' });
  assert.equal(distancia(porId(r, 'j').pos, inimigo(r).pos) <= 1, true);
});

test('Vermelho: empurra 3 casas e, contra Atraído, causa x1,3 e consome o status', () => {
  const base = poe(novo(), { x: 1, y: 5 }, { x: 3, y: 5 });
  const simples = aplicar(base, { tipo: 'habilidade', id: 'vermelho' });
  const dSimples = inimigo(base).hp - inimigo(simples).hp;
  assert.equal(inimigo(simples).pos.x, 6, 'lançado 3 casas');

  const atraido = structuredClone(base);
  inimigo(atraido).status.push({ id: 'atraido', turnos: 2 });
  const combo = aplicar(atraido, { tipo: 'habilidade', id: 'vermelho' });
  const dCombo = inimigo(atraido).hp - inimigo(combo).hp;
  assert.equal(dSimples, B.VERMELHO.dano);
  assert.equal(dCombo, Math.round(B.VERMELHO.dano * B.VERMELHO.comboMult));
  assert.ok(!inimigo(combo).status.some((s) => s.id === 'atraido'));
});

test('Vermelho contra obstáculo dá Impacto', () => {
  // Inimigo colado no muro (obstáculo em 4,1 e 4,2): empurrado para a direita bate no muro em (4,2)... usa (3,2) com origem à esquerda.
  const e = poe(novo(), { x: 1, y: 2 }, { x: 3, y: 2 });
  const r = aplicar(e, { tipo: 'habilidade', id: 'vermelho' });
  const perdido = inimigo(e).hp - inimigo(r).hp;
  assert.equal(perdido, B.VERMELHO.dano + B.VERMELHO.impacto);
  assert.ok(r.log.some((l) => l.includes('Impacto')));
});

test('Combo Azul → Vermelho: o status sobrevive ao turno do inimigo até o próximo turno do jogador', () => {
  let e = poe(novo(), { x: 1, y: 3 }, { x: 7, y: 3 });
  e = aplicar(e, { tipo: 'habilidade', id: 'azul' });
  e = aplicar(e, { tipo: 'passar' }); // vez da maldição roda sozinha
  assert.equal(ativoDe(e).id, 'j');
  assert.ok(inimigo(e).status.some((s) => s.id === 'atraido'), 'Atraído ainda ativo');
  assert.equal(porId(e, 'j').recargas.azul, B.AZUL.recarga - 1, 'recarga conta em turnos do dono');
});

test('recusas antes de cobrar: recarga, EA, alcance, ação comum e habilidade que não possui', () => {
  const e = poe(novo(), { x: 1, y: 3 }, { x: 7, y: 3 });
  assert.throws(() => aplicar(e, { tipo: 'habilidade', id: 'vermelho' }), /fora de alcance/);
  assert.throws(() => aplicar(e, { tipo: 'atacar' }), /ao alcance/);
  const semHab = novo({ ...GOJO, habilidades: [] });
  assert.throws(() => aplicar(semHab, { tipo: 'habilidade', id: 'azul' }), /não possui/);
  const pobre = poe(novo(), { x: 1, y: 3 }, { x: 3, y: 3 });
  porId(pobre, 'j').ea = 10;
  assert.throws(() => aplicar(pobre, { tipo: 'habilidade', id: 'azul' }), /EA insuficiente/);
  assert.equal(porId(pobre, 'j').ea, 10, 'recusado não cobra');
  const usada = aplicar(poe(novo(), { x: 1, y: 3 }, { x: 3, y: 3 }), { tipo: 'habilidade', id: 'azul' });
  assert.throws(() => aplicar(usada, { tipo: 'habilidade', id: 'vermelho' }), /ação comum/);
});

test('Recuperar: +20 de EA como ação comum, limitado ao pool', () => {
  const e = poe(novo(), { x: 1, y: 3 }, { x: 8, y: 2 });
  porId(e, 'j').ea = 50;
  assert.equal(porId(aplicar(e, { tipo: 'recuperar' }), 'j').ea, 50 + B.RECUPERAR_EA);
  porId(e, 'j').ea = 100;
  assert.throws(() => aplicar(e, { tipo: 'recuperar' }), /cheia/);
});

test('Stamina: atacar gasta, recusa sem Stamina sem cobrar, Recuperar Stamina +30 limitado ao pool; NPC não gasta', () => {
  const e = poe(novo(), { x: 1, y: 3 }, { x: 2, y: 3 });
  const atacou = aplicar(e, { tipo: 'atacar' });
  assert.equal(porId(atacou, 'j').stamina, B.POOL_STAMINA - B.ATAQUE_BASICO.custoStamina);
  assert.equal(porId(atacou, 'j').ea, B.POOL_EA, 'atacar não gasta EA');

  porId(e, 'j').stamina = B.ATAQUE_BASICO.custoStamina - 1;
  assert.throws(() => aplicar(e, { tipo: 'atacar' }), /Stamina insuficiente/);
  assert.equal(porId(e, 'j').stamina, B.ATAQUE_BASICO.custoStamina - 1, 'recusado não cobra');
  assert.equal(inimigo(e).hp, inimigo(e).hpMax, 'recusado não causa dano');

  porId(e, 'j').stamina = 50;
  const r = aplicar(e, { tipo: 'recuperar_stamina' });
  assert.equal(porId(r, 'j').stamina, 50 + B.RECUPERAR_STAMINA);
  assert.equal(porId(r, 'j').ea, B.POOL_EA, 'recuperar stamina não mexe na EA');
  porId(e, 'j').stamina = B.POOL_STAMINA;
  assert.throws(() => aplicar(e, { tipo: 'recuperar_stamina' }), /cheia/);
  assert.equal(inimigo(atacou).stamina, B.POOL_STAMINA, 'NPC não gasta Stamina');
});

const PUNHO = { ...GOJO, habilidades: ['punho_energia'] };
const sempre = () => 0; // rng que sempre cai no Kokusen
const nunca = () => 0.99;
/** Jogador colado no inimigo, com Punho de Energia ativo e já na vez seguinte (a ativação gasta a ação comum). */
const comPunho = () => {
  let e = poe(novo(PUNHO), { x: 1, y: 3 }, { x: 2, y: 3 });
  e = aplicar(e, { tipo: 'habilidade', id: 'punho_energia' });
  return aplicar(e, { tipo: 'passar' });
};

test('balance: Punho de Energia e Kokusen travados', () => {
  assert.deepEqual(B.PUNHO_ENERGIA, { custo: 20, recarga: 5, alcance: 99, turnos: 4, forcaPct: 30, kokusenChance: 0.5 });
  assert.deepEqual(B.KOKUSEN, { mult: 2, turnos: 4, eaPct: 5, chanceBonus: 20, chanceDecai: 5, danoPct: 10 });
  assert.ok(B.PUNHO_ENERGIA.custo <= B.POOL_EA);
  assert.match(regrasDe('punho_energia'), /0\.5% de chance de Kokusen/);
});

test('Punho de Energia: cobra EA, vira buff de +30% no ataque básico e expira em 3 turnos de ataque', () => {
  let e = poe(novo(PUNHO), { x: 1, y: 3 }, { x: 2, y: 3 });
  e = aplicar(e, { tipo: 'habilidade', id: 'punho_energia' });
  assert.equal(porId(e, 'j').ea, B.POOL_EA - B.PUNHO_ENERGIA.custo);
  assert.equal(porId(e, 'j').recargas.punho_energia, B.PUNHO_ENERGIA.recarga);
  assert.ok(porId(e, 'j').status.some((s) => s.id === 'punho'));
  e = aplicar(e, { tipo: 'passar' });
  const antes = inimigo(e).hp;
  const bateu = aplicar(e, { tipo: 'atacar' }, nunca);
  assert.equal(antes - inimigo(bateu).hp, Math.round(B.ATAQUE_BASICO.dano * (1 + B.PUNHO_ENERGIA.forcaPct / 100)));
  for (let k = 0; k < 3; k += 1) e = aplicar(e, { tipo: 'passar' });
  assert.ok(!porId(e, 'j').status.some((s) => s.id === 'punho'), 'acabou depois de 3 turnos de ataque');
});

test('Kokusen: só com Punho ativo; sem o buff a chance é 0 mesmo com rng favorável', () => {
  const sem = poe(novo(PUNHO), { x: 1, y: 3 }, { x: 2, y: 3 });
  const r = aplicar(sem, { tipo: 'atacar' }, sempre);
  assert.equal(inimigo(sem).hp - inimigo(r).hp, B.ATAQUE_BASICO.dano);
  assert.ok(!r.log.some((l) => l.includes('KOKUSEN')));
  const com = aplicar(comPunho(), { tipo: 'atacar' }, nunca);
  assert.ok(!com.log.some((l) => l.includes('KOKUSEN')), 'rng alto: sem Kokusen');
});

test('Kokusen: dano x2 e abre o estado (+5% EA por turno, +20% chance, +10% dano, bônus decai a cada acerto)', () => {
  let e = comPunho();
  assert.equal(chanceKokusen(porId(e, 'j')), B.PUNHO_ENERGIA.kokusenChance);
  const vida = inimigo(e).hp;
  e = aplicar(e, { tipo: 'atacar' }, sempre);
  assert.ok(e.log.some((l) => l.includes('KOKUSEN')));
  assert.equal(vida - inimigo(e).hp, Math.round(B.ATAQUE_BASICO.dano * 1.3) * B.KOKUSEN.mult);
  const k = () => porId(e, 'j').status.find((s) => s.id === 'kokusen');
  assert.equal(k().turnos, B.KOKUSEN.turnos);
  assert.equal(chanceKokusen(porId(e, 'j')), B.PUNHO_ENERGIA.kokusenChance + B.KOKUSEN.chanceBonus);

  const eaAntes = porId(e, 'j').ea;
  e = aplicar(e, { tipo: 'passar' }); // inicia o turno seguinte do jogador
  assert.equal(porId(e, 'j').ea, eaAntes + Math.round(B.POOL_EA * B.KOKUSEN.eaPct / 100), '+5% de EA no início do turno');

  const vida2 = inimigo(e).hp;
  e = aplicar(e, { tipo: 'atacar' }, sempre);
  assert.equal(vida2 - inimigo(e).hp, Math.round(Math.round(B.ATAQUE_BASICO.dano * 1.3) * B.KOKUSEN.mult * 1.1), '+10% de dano no estado');
  assert.equal(k().acertos, 1);
  assert.equal(k().turnos, B.KOKUSEN.turnos, 'novo Kokusen renova a duração');
  assert.equal(chanceKokusen(porId(e, 'j')), B.PUNHO_ENERGIA.kokusenChance + B.KOKUSEN.chanceBonus - B.KOKUSEN.chanceDecai);
});

test('Kokusen: o bônus de chance nunca fica negativo e o estado acaba depois de 3 turnos', () => {
  const j = { status: [{ id: 'punho', turnos: 3 }, { id: 'kokusen', turnos: 3, acertos: 99 }] };
  assert.equal(chanceKokusen(j), B.PUNHO_ENERGIA.kokusenChance);
  let e = aplicar(comPunho(), { tipo: 'atacar' }, sempre);
  for (let n = 0; n < 4; n += 1) e = aplicar(e, { tipo: 'passar' });
  assert.ok(!porId(e, 'j').status.some((s) => s.id === 'kokusen'));
});

test('Black Flash: gatilho (mover >= 2 casas + corpo a corpo), x2, devolve EA, foco e recarga; sem mover não dispara', () => {
  const parado = poe(novo(), { x: 1, y: 3 }, { x: 2, y: 3 });
  const normal = aplicar(parado, { tipo: 'atacar' });
  assert.equal(inimigo(parado).hp - inimigo(normal).hp, B.ATAQUE_BASICO.dano, 'sem gatilho: dano normal');
  assert.ok(!normal.log.some((l) => l.includes('BLACK FLASH')));

  let e = poe(novo(), { x: 1, y: 3 }, { x: 4, y: 3 });
  porId(e, 'j').ea = 50;
  e = aplicar(e, { tipo: 'mover', dx: 1, dy: 0 });
  e = aplicar(e, { tipo: 'mover', dx: 1, dy: 0 });
  const antes = inimigo(e).hp;
  e = aplicar(e, { tipo: 'atacar' });
  assert.ok(e.log.some((l) => l.includes('BLACK FLASH')));
  assert.equal(antes - inimigo(e).hp, B.ATAQUE_BASICO.dano * B.BLACK_FLASH.mult);
  assert.equal(porId(e, 'j').ea, 50 + B.BLACK_FLASH.eaPct);
  assert.ok(porId(e, 'j').status.some((s) => s.id === 'foco'));
  assert.equal(porId(e, 'j').recargas.black_flash, B.BLACK_FLASH.recarga);
});

test('Black Flash não encadeia: em recarga, o mesmo gatilho dá dano normal', () => {
  const e = poe(novo(), { x: 1, y: 3 }, { x: 4, y: 3 });
  porId(e, 'j').recargas.black_flash = 1;
  let r = aplicar(e, { tipo: 'mover', dx: 1, dy: 0 });
  r = aplicar(r, { tipo: 'mover', dx: 1, dy: 0 });
  r = aplicar(r, { tipo: 'atacar' });
  assert.ok(!r.log.some((l) => l.includes('BLACK FLASH')));
});

test('IA da maldição: aproxima, ataca e devolve a vez ao jogador', () => {
  const e = poe(novo(), { x: 1, y: 3 }, { x: 8, y: 2 });
  const r = aplicar(e, { tipo: 'passar' });
  assert.equal(ativoDe(r).id, 'j');
  assert.ok(distancia(porId(r, 'j').pos, inimigo(r).pos) < distancia({ x: 1, y: 3 }, { x: 8, y: 2 }), 'se aproximou');
  const colado = poe(novo(), { x: 1, y: 3 }, { x: 2, y: 3 });
  const r2 = aplicar(colado, { tipo: 'passar' });
  assert.equal(porId(r2, 'j').hp, 100 - B.MALDICAO_GRAU4.ataque.dano);
});

test('fim: derrubar o inimigo vence e o funil de dano registra a fonte; depois disso nada mais aplica', () => {
  const e = poe(novo(), { x: 1, y: 3 }, { x: 3, y: 3 });
  inimigo(e).hp = 5;
  const r = aplicar(e, { tipo: 'habilidade', id: 'azul' });
  assert.deepEqual(r.fim, { vencedor: 'jogador' });
  assert.ok(inimigo(r).dmgFrom.j > 0);
  assert.throws(() => aplicar(r, { tipo: 'atacar' }), /já terminou/);
  const derrota = poe(novo(), { x: 1, y: 3 }, { x: 2, y: 3 });
  porId(derrota, 'j').hp = 1;
  assert.deepEqual(aplicar(derrota, { tipo: 'passar' }).fim, { vencedor: 'inimigo' });
});

test('iniciativa: maior Agilidade abre; empate preserva a ordem de entrada', () => {
  const rapido = criarCombate({ jogador: { ...GOJO, atributos: { agilidade: 0 } }, inimigo: { ...MALDICAO, atributos: { agilidade: 6 } } });
  assert.equal(rapido.ordem[0], B.MALDICAO_GRAU4.id, 'o inimigo mais ágil abre');
  assert.deepEqual(rapido.log.length > 1, true, 'e já agiu antes do primeiro cartão');
  assert.notDeepEqual(inimigo(rapido).pos, B.GRID.inicioInimigo, 'se aproximou');
  assert.equal(ativoDe(rapido).lado, 'jogador', 'a vez chega ao jogador');
  assert.equal(novo().ordem[0], 'j', 'empate de Agilidade preserva a ordem de entrada');
});

test('texto de regras é gerado dos números do balance', () => {
  assert.ok(regrasDe('azul').includes(String(B.AZUL.custo)) && regrasDe('azul').includes(String(B.AZUL.puxa)));
  assert.ok(regrasDe('vermelho').includes(String(B.VERMELHO.impacto)) && regrasDe('vermelho').includes(String(B.VERMELHO.comboMult)));
  assert.deepEqual(Object.keys(HABILIDADES).sort(), ['azul', 'punho_energia', 'vermelho']);
});

test('tela: o pior caso cabe nos limites do Components V2 (4000 caracteres, 40 componentes)', () => {
  const e = poe(novo({ ...GOJO, habilidades: ['azul', 'vermelho', 'punho_energia'] }), { x: 1, y: 3 }, { x: 3, y: 3 });
  porId(e, 'j').status.push({ id: 'punho', turnos: 3 }, { id: 'kokusen', turnos: 3, acertos: 1 }, { id: 'foco', turnos: 1 });
  e.log = Array.from({ length: 14 }, (_, k) => `${k} 🔴 **Satoru** usa **Vermelho** em **Maldição de Grau 4** (combo com o Azul!) com um texto longo de teste`);
  inimigo(e).status.push({ id: 'atraido', turnos: 2 });
  const m = medir(telaCombate(e, { note: '🔄 Esse cartão estava velho; este é o atual.' }));
  assert.ok(m.cabe, `${m.texto} caracteres, ${m.componentes} componentes`);
  const fim = aplicar(poe(novo(), { x: 1, y: 3 }, { x: 3, y: 3 }), { tipo: 'passar' });
  assert.ok(medir(telaFim({ ...fim, fim: { vencedor: 'jogador' } }, { recompensa: { pago: 60, subiu: 2, duplicate: false } })).cabe);
});

// ---------- serviço ----------
const banco = () => { const db = new DatabaseSync(':memory:'); migrate(db); return db; };

test('serviço: uma luta por canal e por jogador; estado persiste e o clique de cartão velho não executa', () => {
  const db = banco();
  iniciarTreino(db, 'c1', 'u1', { nomeDiscord: 'Ana', modoTeste: true });
  assert.throws(() => iniciarTreino(db, 'c1', 'u2', {}), /neste canal/);
  assert.throws(() => iniciarTreino(db, 'c2', 'u1', {}), /outra luta/);
  const { estado } = getCombate(db, 'c1');
  assert.deepEqual(porId(estado, 'u1').habilidades.sort(), ['azul', 'punho_energia', 'vermelho']);

  const r = agir(db, 'c1', 'u1', { tipo: 'mover', dx: 1, dy: 0 }, estado.seq);
  assert.equal(r.desatualizado, false);
  const velho = agir(db, 'c1', 'u1', { tipo: 'mover', dx: 1, dy: 0 }, estado.seq);
  assert.equal(velho.desatualizado, true, 'seq antigo');
  assert.equal(getCombate(db, 'c1').estado.seq, r.estado.seq, 'nada mudou');
  assert.throws(() => agir(db, 'c1', 'u2', { tipo: 'passar' }, 0), /não é a sua luta/i);
});

test('serviço: sem modo teste só quem tem a técnica inata (Infinito Lunar) ganha Azul e Vermelho', () => {
  const db = banco();
  iniciarRascunho(db, 'u1', { nome: 'Haruki Mizuno', idade: '17', historia: 'Uma história longa o bastante para passar na validação da ficha.' }, () => 0);
  confirmarFicha(db, 'u1');
  db.prepare("UPDATE characters SET tecnica = 'infinito_lunar' WHERE discord_id = 'u1'").run();
  const e = iniciarTreino(db, 'c1', 'u1', {});
  assert.deepEqual(porId(e, 'u1').habilidades.sort(), ['azul', 'vermelho']);
  assert.equal(porId(e, 'u1').nome, 'Haruki Mizuno');
  fugir(db, 'c1', 'u1');
  const comum = iniciarTreino(db, 'c1', 'u1', {});
  assert.equal(porId(comum, 'u1').habilidades.length, 2, 'técnica da ficha mantém as habilidades');
});

test('serviço: vitória paga o XP uma vez só e fecha a luta; derrota e fuga não pagam', () => {
  const db = banco();
  iniciarRascunho(db, 'u1', { nome: 'Haruki Mizuno', idade: '17', historia: 'Uma história longa o bastante para passar na validação da ficha.' }, () => 0);
  confirmarFicha(db, 'u1');
  let { estado } = { estado: iniciarTreino(db, 'c1', 'u1', { modoTeste: true }) };
  // Deixa o inimigo à beira da morte direto no JSON salvo, e o coloca ao alcance do Azul.
  estado.participantes.find((p) => p.lado === 'inimigo').hp = 3;
  estado.participantes.find((p) => p.lado === 'inimigo').pos = { x: 3, y: 3 };
  db.prepare('UPDATE combats SET state = ? WHERE channel_id = ?').run(JSON.stringify(estado), 'c1');
  const r = agir(db, 'c1', 'u1', { tipo: 'habilidade', id: 'azul' }, estado.seq);
  assert.deepEqual(r.estado.fim, { vencedor: 'jogador' });
  assert.equal(r.recompensa.pago, B.MALDICAO_GRAU4.xp);
  assert.equal(getFicha(db, 'u1').nivel, 1);
  assert.equal(getFicha(db, 'u1').xp, B.MALDICAO_GRAU4.xp);
  assert.equal(getCombate(db, 'c1'), null, 'luta fechada');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM xp_ledger WHERE source = 'combate'").get().n, 1);
});
