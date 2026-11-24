// Trava da régua de balanceamento: toda habilidade precisa passar. Quebrou? Ou a mudança violou a régua (desfaça),
// ou a régua mudou de propósito (atualize REGUA e docs/regua-balanceamento.md juntos).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../src/combat/balance.js';
import { ATAQUE_BASICO, KOKUSEN, MOV_BASE, NANAMI, RATIO, REGUA } from '../src/combat/balance.js';
import { ARVORE_CORAGEM } from '../src/combat/arvores/coragem.js';
import { ARVORE_KAMO } from '../src/combat/arvores/kamo.js';
import { ARVORE_NANAMI } from '../src/combat/arvores/nanami.js';
import { ARVORE_PUNHOS } from '../src/combat/arvores/punhos.js';
import { ARVORE_SANGUE } from '../src/combat/arvores/sangue.js';
import { ARVORE_SOMBRAS } from '../src/combat/arvores/sombras.js';
import { ARVORE_RATIO } from '../src/combat/arvores/ratio.js';
import { ARVORE_ZENIN } from '../src/combat/arvores/zenin.js';
import { chanceKokusen } from '../src/combat/motor.js';
import { alvoUnicoDoNivel, auditar, auditarArvore, auditarBonus, auditarPacote, custoSugerido, tetoDeArea, picoMaxPorRecarga, rankDe } from '../src/combat/regua.js';
import { HABILIDADES } from '../src/combat/tecnicas.js';

test('régua: contas da skill rp-balance (pool 100, alvo único, ação comum)', () => {
  assert.equal(custoSugerido({ dano: 15 }), 14);
  assert.equal(custoSugerido({ dano: 30 }), 32);
  assert.equal(custoSugerido({ dano: 30, area: true }), 36);
  assert.equal(custoSugerido({ dano: 30, efeitos: [{ id: 'atordoar', duracao: 1 }] }), 39);
  assert.equal(custoSugerido({ dano: 30, acao: 'bonus' }), 42);
  assert.equal(rankDe(18), 'D');
  assert.equal(rankDe(32), 'B');
  assert.equal(rankDe(33), 'A');
  assert.equal(picoMaxPorRecarga(0), 15);
  assert.equal(picoMaxPorRecarga(2), 25);
  assert.equal(picoMaxPorRecarga(3), 35);
  assert.equal(picoMaxPorRecarga(9), 40);
});

test('régua: toda habilidade tem descritor e passa em custo, pico, % do pool e dano por energia', () => {
  for (const h of Object.values(HABILIDADES)) {
    assert.ok(h.regua, `${h.id} precisa do descritor regua`);
    const a = auditar(h);
    assert.deepEqual(a.avisos, [], `${h.id}: ${a.avisos.join('; ')}`);
  }
});

test('régua: o ataque básico (Stamina) cabe na faixa de dano por energia', () => {
  const dpe = ATAQUE_BASICO.dano / ATAQUE_BASICO.custoStamina;
  assert.ok(dpe >= REGUA.danoPorEnergia.min && dpe <= REGUA.danoPorEnergia.max, `dano/stamina ${dpe}`);
});

// Exceções APROVADAS à régua (nó → etiquetas), sempre com data e motivo. Sem isto o teste reprova.
// Hoje não há nenhuma: as duas que existiam (Colapso e Chuva de Punhos, 28 contra teto 27) sumiram quando o Golpe Compactado (36) elevou o
// corpo a corpo de referência do nível 20 para 36 (24/11/2026).
const EXCECOES = {};

test('árvore Ratio: 37 pontos, requisitos = soma do caminho, rank e pontos conforme a régua', () => {
  const a = auditarArvore(ARVORE_RATIO);
  assert.equal(a.totalPontos, 37);
  for (const n of a.nos) {
    const reprovados = n.avisos.filter((t) => !(EXCECOES[n.id] ?? []).some((e) => t.startsWith(e)));
    assert.deepEqual(reprovados, [], `${n.id}: ${reprovados.join('; ')}`);
  }
  assert.deepEqual(a.nos.map((n) => n.soma), [1, 2, 3, 4, 5, 9, 7, 11, 21, 35], 'soma do caminho de cada nó');
});

test('árvore Ratio: os caminhos existem e cada passo exige o anterior; só técnicas com dano e a raiz exigem o clã', () => {
  const ids = new Set(ARVORE_RATIO.nos.map((n) => n.id));
  for (const lista of Object.values(ARVORE_RATIO.caminhos)) for (const id of lista) assert.ok(ids.has(id), id);
  for (const n of ARVORE_RATIO.nos) for (const p of n.requer) assert.ok(ids.has(p), `${n.id} requer ${p}`);
  assert.equal(ARVORE_RATIO.nos.filter((n) => n.cla).length, 1);
});

test('árvore Nanami: 35 pontos, escada 1/2/3/4/5/6 por profundidade, requisito = soma do caminho', () => {
  const a = auditarArvore(ARVORE_NANAMI);
  assert.equal(a.totalPontos, 35);
  for (const n of a.nos) assert.deepEqual(n.avisos, [], `${n.id}: ${n.avisos.join('; ')}`);
  assert.deepEqual(a.nos.map((n) => n.soma), [1, 3, 3, 6, 6, 10, 10, 15, 15, 35]);
});

test('árvore Nanami: tetos de projeto (desconto de EA, precisão, EA máxima, dano) e chance de Kokusen <= 40%', () => {
  const { info, avisos } = auditarBonus(ARVORE_NANAMI);
  assert.deepEqual(avisos, []);
  assert.equal(info.descontoPerm, 12, 'Rotina 3 + Método 4 + Eficiência 5');
  assert.equal(info.descontoComBurst, 30, 'com o Expediente Encerrado (-18%) ativo: fecha no teto de uso único (30%)');
  assert.equal(info.precisaoPp, 10);
  assert.equal(info.energiaMaxPontos, 5);
  assert.equal(info.danoCond, 5);
  assert.equal(info.kokusenPermPp, 5);
  assert.equal(info.kokusenPico, 39.5, 'base 0,5 + estado Kokusen 20 + linhagem 5 + Fluxo 10 + Expediente 4');
  assert.ok(info.kokusenPico <= KOKUSEN.chanceMax);
});

test('árvore Zenin: 30 pontos, escada por profundidade, requisito = soma do caminho', () => {
  const a = auditarArvore(ARVORE_ZENIN);
  assert.equal(a.totalPontos, 30);
  for (const n of a.nos) assert.deepEqual(n.avisos, [], `${n.id}: ${n.avisos.join('; ')}`);
  assert.deepEqual(a.nos.map((n) => n.soma), [1, 3, 3, 6, 6, 10, 10, 15, 30]);
});

test('árvore Zenin: tetos (esquiva permanente 12 pp e total 65%, desconto 20%, dano do mesmo golpe 40%)', () => {
  const { info, avisos } = auditarBonus(ARVORE_ZENIN);
  assert.deepEqual(avisos, []);
  assert.equal(info.esquivaPerm, 8, 'Reflexos Zenin');
  assert.equal(info.esquivaPico, 48, '25 base + 8 + 15 do Instante Decisivo');
  assert.equal(info.descontoPerm, 5);
  assert.equal(info.danoCond, 30, 'Estudo 5 + Contra-ataque 15 + Ritmo 10; com o Espadachim-Feiticeiro (+10) da Coragem Ardente fecha em 40');
  assert.equal(info.movPerm, 1);
  assert.equal(info.movPicoSemTeto, 6, 'base 3 + Passo 1 + Sangue 1 + Instante 1, tudo junto na 1ª rodada');
  assert.equal(info.movPicoRodada1, B.MOV_MAX, 'o motor corta em 5 casas');
  assert.ok(MOV_BASE + info.movPerm + Math.max(info.movCond, info.movBurst) <= B.MOV_MAX, 'cada janela cabe sozinha');
});

test('árvore Zenin: nós em standby ficam marcados até o sistema existir (esquiva, debuffs)', () => {
  const aguarda = Object.fromEntries(ARVORE_ZENIN.nos.filter((n) => n.aguarda).map((n) => [n.id, n.aguarda]));
  assert.deepEqual(aguarda, { reflexos_zenin: 'esquiva', mente_fria: 'debuffs', contra_ataque: 'esquiva', instante_decisivo: 'esquiva' });
});

test('árvore Coragem Ardente: 35 pontos, requisito = soma do caminho, rank, custo, reação e modo conforme a régua', () => {
  const a = auditarArvore(ARVORE_CORAGEM);
  assert.equal(a.totalPontos, 35);
  for (const n of a.nos) assert.deepEqual(n.avisos, [], `${n.id}: ${n.avisos.join('; ')}`);
  assert.deepEqual(a.nos.map((n) => n.soma), [1, 2, 3, 5, 5, 6, 7, 9, 11, 25]);
  const { info, avisos } = auditarBonus(ARVORE_CORAGEM);
  assert.deepEqual(avisos, []);
  assert.equal(info.queimaduraPorTurno, 5, '3 base + 2 do Calor Intenso');
  assert.equal(info.queimaduraMaxTotal, 30, 'DoT cheio (6 turnos) = o maior golpe de alvo único');
  assert.equal(info.reducaoCond, 30, 'Corpo Resistente ao Calor, só contra fogo');
});

test('Coragem Ardente: a régua pega Chama Plena acima do teto (45) e Corredor com custo fora da régua', () => {
  const antes = { ...ARVORE_CORAGEM, nos: ARVORE_CORAGEM.nos.map((n) => (n.id === 'chama_plena' ? { ...n, regua: { ...n.regua, dano: 45 } } : n)) };
  const plena = auditarArvore(antes).nos.find((n) => n.id === 'chama_plena');
  assert.ok(plena.avisos.some((t) => t.startsWith('[area]')) && plena.avisos.some((t) => t.startsWith('[apice]')), plena.avisos.join('; '));
  const caro = auditar({ id: 'x', custo: 30, recarga: 3, nivel: 12, regua: { dano: 22, area: true, casas: 4, efeitos: [{ id: 'dot', duracao: 2, chance: 1 }] } });
  assert.ok(caro.avisos.some((t) => t.startsWith('[custo]')));
  const reacaoCara = auditar({ id: 'r', custo: 30, recarga: 1, nivel: 5, regua: { dano: 22, acao: 'reacao' } });
  assert.equal(reacaoCara.avisos.filter((t) => t.startsWith('[reacao]')).length, 2);
});

test('pacotes do clã (técnica + linhagem somadas): dano do mesmo golpe <= 40%, desconto de uso único <= 30%, sem nome repetido', () => {
  for (const [nome, arvores] of [['Nanami', [ARVORE_RATIO, ARVORE_NANAMI]], ['Zenin+Coragem', [ARVORE_CORAGEM, ARVORE_ZENIN]], ['Zenin+Punhos', [ARVORE_PUNHOS, ARVORE_ZENIN]]]) {
    const { info, avisos } = auditarPacote(arvores);
    assert.deepEqual(avisos, [], `${nome}: ${avisos.join('; ')}`);
    assert.equal(info.danoCond, 40, `${nome}: pacote encosta no teto (arma e punhos nunca juntos no mesmo golpe)`);
  }
  assert.equal(auditarPacote([ARVORE_RATIO, ARVORE_NANAMI]).info.descontoComBurst, 30);
  assert.ok(NANAMI.expedienteEncerrado.descontoPct + auditarBonus(ARVORE_NANAMI).info.descontoPerm <= REGUA.custo.descontoTeto * 100);
  assert.ok(RATIO.laminaCega.danoArmaPct + RATIO.votoHoraExtra.danoPct + NANAMI.horaExtra.danoPct <= REGUA.tetos.danoMesmoGolpe);
  const nomes = [...ARVORE_RATIO.nos, ...ARVORE_NANAMI.nos, ...ARVORE_ZENIN.nos, ...ARVORE_CORAGEM.nos, ...ARVORE_PUNHOS.nos, ...ARVORE_SOMBRAS.nos, ...ARVORE_KAMO.nos, ...ARVORE_SANGUE.nos].map((n) => n.nome);
  assert.equal(new Set(nomes).size, nomes.length, 'nome de nó repetido');
});

test('árvore Punhos Mísseis: 33 pontos, requisitos, rank, custo, passivas na faixa e Força nas técnicas', () => {
  const a = auditarArvore(ARVORE_PUNHOS);
  assert.equal(a.totalPontos, 33);
  for (const n of a.nos) {
    const reprovados = n.avisos.filter((t) => !(EXCECOES[n.id] ?? []).some((e) => t.startsWith(e)));
    assert.deepEqual(reprovados, [], `${n.id}: ${reprovados.join('; ')}`);
  }
  assert.deepEqual(a.nos.map((n) => n.soma), [1, 2, 3, 5, 6, 9, 9, 13, 15, 21]);
  assert.deepEqual(a.nos.filter((n) => n.tipo === 'passiva').map((n) => n.pontos), [2, 3, 3, 4], 'Corpo Maciço, Temperamento, Enxame, Impacto: dentro de 2..escada');
  assert.equal(auditarBonus(ARVORE_PUNHOS).info.vidaPct, 10);
});

test('Punhos Mísseis: a régua pega os números ANTES (Rajada 24 à distância, Sete Punhos 44 como S de 10 pontos)', () => {
  const antes = { ...ARVORE_PUNHOS, nos: ARVORE_PUNHOS.nos.map((n) => {
    if (n.id === 'rajada_de_punhos') return { ...n, regua: { ...n.regua, dano: 24 } };
    if (n.id === 'sete_punhos') return { ...n, rank: 'S', pontos: 10, regua: { ...n.regua, dano: 44 } };
    return n;
  }) };
  const nos = Object.fromEntries(auditarArvore(antes).nos.map((n) => [n.id, n]));
  assert.ok(nos.rajada_de_punhos.avisos.some((t) => t.startsWith('[alcance]')));
  assert.ok(nos.sete_punhos.avisos.some((t) => t.startsWith('[alcance]')), 'final à distância passa de 41 (1,15 de 36)');
  assert.ok(nos.sete_punhos.avisos.some((t) => t.startsWith('[apice]')), 'e do ápice de 40');
  assert.equal(rankDe(44), 'S', 'S só existe acima de 40, o ápice da primeira camada');
});

test('Vermelho e Azul (à distância) também passam do teste de alcance, agora com nível de abertura', () => {
  assert.equal(HABILIDADES.vermelho.nivel, 12);
  assert.deepEqual(auditar(HABILIDADES.vermelho).avisos, []);
  assert.deepEqual(auditar(HABILIDADES.azul).avisos, []);
});

test('árvore Dez Sombras: 42 pontos, requisito = soma do caminho, rank, custo, Domínio e investida conforme a régua', () => {
  const a = auditarArvore(ARVORE_SOMBRAS);
  assert.equal(a.totalPontos, 42);
  for (const n of a.nos) assert.deepEqual(n.avisos, [], `${n.id}: ${n.avisos.join('; ')}`);
  assert.deepEqual(a.nos.map((n) => n.soma), [1, 2, 2, 4, 4, 3, 5, 7, 9, 8, 10, 13, 23]);
  assert.equal(a.nos.at(-1).rank, 'S');
  const { info, avisos } = auditarBonus(ARVORE_SOMBRAS);
  assert.deepEqual(avisos, []);
  assert.equal(info.danoCond, 30, 'Totalidade 20 + Tigre Fúnebre 10; com o Ritmo de Caça (+10) da linhagem Zenin fecha em 40');
});

test('Dez Sombras: a régua pega o Domínio caro, o Boi caro demais e a Totalidade a +50%', () => {
  const dominio = auditar({ id: 'j', custo: 65, recarga: 99, regua: { dominio: true, usoUnico: true } });
  assert.ok(dominio.avisos.some((t) => t.startsWith('[pct]')));
  assert.ok(auditar({ id: 'j', custo: 20, recarga: 99, regua: { dominio: true, usoUnico: true } }).avisos.some((t) => t.startsWith('[pct]')), 'Domínio barato demais');
  assert.ok(auditar({ id: 'j', custo: 60, recarga: 1, regua: { dominio: true } }).avisos.some((t) => t.startsWith('[dominio]')), 'Domínio sem uso único');
  const boi = ARVORE_SOMBRAS.nos.find((n) => n.id === 'boi_perfurante');
  assert.deepEqual(auditar(boi).avisos, [], 'Boi 32 / 39 (39% do pool) cabe: o teto de técnica comum é 40%');
  assert.ok(auditar({ ...boi, custo: 45 }).avisos.some((t) => t.startsWith('[pct]')), '45% do pool numa técnica comum');
  const antes = { ...ARVORE_SOMBRAS, nos: ARVORE_SOMBRAS.nos.map((n) => (n.id === 'cao_divino_totalidade' ? { ...n, bonus: [{ ...n.bonus[0], danoPct: 50 }] } : n)) };
  assert.ok(auditarPacote([ARVORE_ZENIN, antes]).avisos.some((t) => t.startsWith('[dano]')), 'Totalidade +50% estoura o teto do clã');
});

test('pacote Zenin + Dez Sombras: dano <= 40%, esquiva por janela cabe no teto e juntas o motor corta em 65%', () => {
  const { info, avisos } = auditarPacote([ARVORE_ZENIN, ARVORE_SOMBRAS]);
  assert.deepEqual(avisos, []);
  assert.equal(info.danoCond, 40);
  assert.equal(info.esquivaPicoSemTeto, 68, '25 base + 8 Reflexos + 15 Instante + 20 Coelhos');
  assert.equal(info.esquivaPico, REGUA.tetos.esquivaMax);
  assert.equal(B.SOMBRAS.sombraViva.movCasas, 1);
  assert.equal(MOV_BASE + info.movPerm + B.SOMBRAS.sombraViva.movCasas, B.MOV_MAX, 'base 3 + Passo 1 + a maior janela (1) = 5, sem desperdício isolado');
});

test('alvo único do nível é interpolado entre 14 (nível 1), 22 (nível 5) e 30 (nível 12)', () => {
  assert.equal(alvoUnicoDoNivel(1), 14);
  assert.equal(alvoUnicoDoNivel(3), 18);
  assert.equal(alvoUnicoDoNivel(5), 22);
  assert.equal(alvoUnicoDoNivel(12), 30);
  assert.equal(alvoUnicoDoNivel(16), 33, 'entre o Corte no Tronco (30, nível 12) e o Golpe Compactado (36, nível 20)');
  assert.equal(alvoUnicoDoNivel(20), 36);
  assert.equal(alvoUnicoDoNivel(40), 36);
});

test('árvore Sangue (Kamo): 40 pontos, requisito = soma do caminho, custos da régua (com preparo, imbloqueável e reação)', () => {
  const a = auditarArvore(ARVORE_SANGUE);
  assert.equal(a.totalPontos, 40);
  for (const n of a.nos) assert.deepEqual(n.avisos, [], `${n.id}: ${n.avisos.join('; ')}`);
  assert.deepEqual(a.nos.map((n) => n.soma), [1, 3, 2, 5, 6, 7, 10, 11, 16, 26]);
  const porId = Object.fromEntries(a.nos.map((n) => [n.id, n]));
  assert.equal(porId.lanca_perfurante.sugerido, 32, 'linha x1,15 e imbloqueável x1,15');
  assert.equal(porId.golpe_compactado.sugerido, 40, 'Atordoar 60% e Marca exigida (preparo -10%)');
  assert.equal(porId.chuva_escarlate.sugerido, 36, 'área, Sangramento e Marca exigida');
  assert.equal(porId.mare_rubra.rank, 'S');
  assert.equal(porId.coagulo.rank, 'B', 'reação: custo escrito 14, recarga 2');
  const { info, avisos } = auditarBonus(ARVORE_SANGUE);
  assert.deepEqual(avisos, []);
  assert.equal(info.danoCond, 15, 'Pressão Arterial; com o Pulso de Combate (+10) da linhagem Kamo fecha em 25');
  assert.equal(auditarPacote([ARVORE_SANGUE, ARVORE_KAMO]).info.danoCond, 25);
});

test('Sangue (Kamo): a régua pega a Maré Rubra a 42 (acima do ápice de 40) e as marcas que faltam', () => {
  const alto = { ...ARVORE_SANGUE, nos: ARVORE_SANGUE.nos.map((n) => (n.id === 'mare_rubra' ? { ...n, regua: { ...n.regua, dano: 42 } } : n)) };
  assert.ok(auditarArvore(alto).nos.find((n) => n.id === 'mare_rubra').avisos.some((t) => t.startsWith('[apice]')));
  const aguarda = Object.fromEntries(ARVORE_SANGUE.nos.filter((n) => n.aguarda).map((n) => [n.id, n.aguarda.join('+')]));
  assert.equal(aguarda.coagulo, 'reacao+barreira');
  assert.equal(aguarda.lanca_perfurante, 'marca+bloqueio');
  assert.equal(aguarda.mare_rubra, 'marca');
});

test('Dez Sombras: rituais da staff e sistemas em standby ficam marcados', () => {
  const ritual = ARVORE_SOMBRAS.nos.filter((n) => n.ritual).map((n) => n.id);
  assert.deepEqual(ritual, ['sapo', 'coelhos_em_fuga', 'grande_serpente', 'nue', 'elefante_maximo', 'cervo_redondo', 'boi_perfurante'], 'Cães Divinos são de graça; Abismo é fusão');
  for (const id of ritual) assert.ok(ARVORE_SOMBRAS.nos.find((n) => n.id === id).aguarda.includes('missao'), id);
  assert.ok(ARVORE_SOMBRAS.nos.every((n) => n.tipo === 'raiz' || n.aguarda.includes('shikigami')));
});

test('árvore Kamo: 24 pontos enviados + topo PROPOSTO de 6 = 30; requisitos batem no layout assumido', () => {
  const a = auditarArvore(ARVORE_KAMO);
  assert.equal(a.totalPontos, ARVORE_KAMO.totalDeclarado, 'os 30 do cabeçalho');
  assert.deepEqual(ARVORE_KAMO.proposta, ['sangue_ancestral'], 'o único nó escrito pela régua; trocar quando o dono enviar o dele');
  for (const n of a.nos) assert.deepEqual(n.avisos, [], `${n.id}: ${n.avisos.join('; ')}`);
  assert.deepEqual(a.nos.map((n) => n.soma), [1, 3, 3, 6, 6, 10, 14, 15, 30]);
  const { info, avisos } = auditarBonus(ARVORE_KAMO);
  assert.deepEqual(avisos, []);
  assert.equal(info.vidaPct, 10);
  assert.equal(info.descontoPerm, 5);
  assert.equal(info.reducaoCond, 30, 'Coagulação Natural: -30% do dano do Sangramento');
  assert.equal(info.eaPorRodada, 3);
  assert.equal(info.eaViaVida, 15, '15 de EA pagos com 15 de vida, 1x por combate (15% do pool)');
  assert.equal(info.eaPorRodadaBurst, 4, 'Sangue Ancestral');
  assert.equal(info.sangramentoMaxTotal, 28, '(5 + 2) x 4 rodadas, abaixo do maior golpe de alvo único (36)');
});

test('Kamo: lido ao pé da letra (Reserva Rubra após Coagulação, Sangue por Energia após Ferida) 4 requisitos ficam abaixo da soma do caminho', () => {
  const literal = { ...ARVORE_KAMO, nos: ARVORE_KAMO.nos.map((n) => {
    if (n.id === 'reserva_rubra') return { ...n, requer: ['coagulacao_natural'] };
    if (n.id === 'sangue_por_energia') return { ...n, requer: ['ferida_profunda'] };
    return n;
  }) };
  const ruins = auditarArvore(literal).nos.filter((n) => n.avisos.some((t) => t.startsWith('[requisito]'))).map((n) => n.id);
  assert.deepEqual(ruins, ['reserva_rubra', 'pulso_de_combate', 'ferida_profunda', 'sangue_por_energia']);
});

test('requisito secundário: Força nos golpes pesados da Ratio, Maestria em Armas nas técnicas de arma; valor = soma do caminho ÷ 3 e cabe no orçamento', () => {
  const exige = (arv) => Object.fromEntries(auditarArvore(arv).nos.filter((n) => Object.keys(n.exige).length).map((n) => [n.id, n.exige]));
  assert.deepEqual(exige(ARVORE_RATIO), { corte_membro: { forca: 2 }, corte_tronco: { forca: 3 }, colapso: { forca: 7 }, colapso_total: { forca: 12 } });
  assert.deepEqual(exige(ARVORE_CORAGEM), {
    lamina_de_fogo: { maestria_armas: 1 }, corte_contra_ataque: { maestria_armas: 2 }, chamas_em_volta: { maestria_armas: 3 },
    corredor_de_chamas: { maestria_armas: 3 }, chama_plena: { maestria_armas: 9 },
  });
  assert.deepEqual(exige(ARVORE_ZENIN), { mao_armeiro: { maestria_armas: 1 }, estudo_armas: { maestria_armas: 2 } });
  assert.deepEqual(exige(ARVORE_PUNHOS), {
    soco_acompanhado: { forca: 1 }, rajada_de_punhos: { forca: 2 }, punho_gigante: { forca: 3 }, chuva_de_punhos: { forca: 5 }, sete_punhos: { forca: 7 },
  });
  // valor errado, status inexistente, Técnica Inata como secundária e orçamento estourado são pegos
  const errado = { ...ARVORE_RATIO, nos: ARVORE_RATIO.nos.map((n) => (n.id === 'corte_tronco' ? { ...n, exige: { forca: 40, sorte: 1, tecnica_inata: 1 } } : n)) };
  const avisos = auditarArvore(errado).nos.find((n) => n.id === 'corte_tronco').avisos;
  assert.ok(avisos.some((t) => t.startsWith('[requisito]')) && avisos.filter((t) => t.startsWith('[stat]')).length === 2 && avisos.some((t) => t.startsWith('[orcamento]')));
});

test('Coragem Ardente: nós em standby marcados (Queimadura/debuffs e reação)', () => {
  const aguarda = Object.fromEntries(ARVORE_CORAGEM.nos.filter((n) => n.aguarda).map((n) => [n.id, n.aguarda.join('+')]));
  assert.deepEqual(aguarda, {
    lamina_de_fogo: 'debuffs', calor_intenso: 'debuffs', corte_contra_ataque: 'reacao+debuffs', chamas_em_volta: 'debuffs',
    corredor_de_chamas: 'debuffs', chama_plena: 'debuffs',
  });
});

test('Kokusen: a chance total nunca passa do teto, mesmo com bônus absurdo', () => {
  const j = { status: [{ id: 'punho', turnos: 3 }, { id: 'kokusen', turnos: 3, acertos: -500 }] };
  assert.equal(chanceKokusen(j), KOKUSEN.chanceMax);
});

test('área: com o corpo a corpo de referência 36 no nível 20, o Colapso 30 e o Colapso Total 38 cabem; 34 e 43 não', () => {
  assert.equal(tetoDeArea(9, false, alvoUnicoDoNivel(20)), 32, '3x3 = 0,90 de 36');
  assert.equal(tetoDeArea(25, true, alvoUnicoDoNivel(30)), 41, 'final = 1,15 de 36');
  assert.equal(RATIO.colapso.dano, 30);
  assert.equal(RATIO.colapsoTotal.dano, 38);
  const alto = { ...ARVORE_RATIO, nos: ARVORE_RATIO.nos.map((n) => {
    if (n.id === 'colapso') return { ...n, regua: { ...n.regua, dano: 34 } };
    if (n.id === 'colapso_total') return { ...n, regua: { ...n.regua, dano: 43 } };
    return n;
  }) };
  const nos = Object.fromEntries(auditarArvore(alto).nos.map((n) => [n.id, n]));
  assert.ok(nos.colapso.avisos.some((t) => t.startsWith('[area]')));
  assert.ok(nos.colapso_total.avisos.some((t) => t.startsWith('[area]')) && nos.colapso_total.avisos.some((t) => t.startsWith('[apice]')));
});

test('régua: a auditoria pega violação (buff caro, pico alto, dano barato)', () => {
  const buffCaro = { id: 'x', custo: 40, recarga: 1, regua: { semDano: true } };
  assert.equal(auditar(buffCaro).avisos.length, 2);
  const pico = { id: 'y', custo: 40, recarga: 0, regua: { dano: 30 } };
  assert.ok(auditar(pico).avisos.some((t) => t.includes('pico')));
  const barato = { id: 'z', custo: 5, recarga: 2, regua: { dano: 12 } };
  assert.ok(auditar(barato).avisos.length > 0);
});
