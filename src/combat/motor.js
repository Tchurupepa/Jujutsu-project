// Motor do combate: PURO sobre o objeto da sessão (sem banco, sem Discord). `aplicar` clona o estado, valida e devolve o novo.
// Toda recusa acontece ANTES de cobrar. Todo dano passa por UM funil (`causarDano`), que grava a fonte.
import { randomUUID } from 'node:crypto';
import {
  AGILIDADE_POR_MOV, ATAQUE_BASICO, BLACK_FLASH, GRID, MOV_BASE, POOL_EA, POOL_STAMINA, RECUPERAR_EA, RECUPERAR_STAMINA, SESSION_VERSION,
} from './balance.js';
import { custoDoPasso, distancia, livre } from './grid.js';
import { HABILIDADES } from './tecnicas.js';

export class ErroDeCombate extends Error {}

const LIMITE_LOG = 14;

/** Monta um participante. `atributos` vem da ficha (ou do NPC); `habilidades` são ids de HABILIDADES. */
export function criarParticipante({ id, nome, lado, emoji, vidaMax, atributos = {}, habilidades = [], ataque = null, pos }) {
  const agi = atributos.agilidade ?? 0;
  const movMax = MOV_BASE + Math.floor(agi / AGILIDADE_POR_MOV);
  return {
    id, nome, lado, emoji, hp: vidaMax, hpMax: vidaMax, ea: POOL_EA, eaMax: POOL_EA, stamina: POOL_STAMINA, staminaMax: POOL_STAMINA, pos: { ...pos },
    atr: { ...atributos }, habilidades: [...habilidades], ataque, recargas: {}, status: [],
    movMax, mov: movMax, movidas: 0, usouComum: false, dmgFrom: {},
  };
}

/** Abre a sessão: ordem por Agilidade (empate preserva a ordem de entrada), jogador primeiro por padrão. */
export function criarCombate({ jogador, inimigo, id = randomUUID() }) {
  const participantes = [
    criarParticipante({ ...jogador, lado: 'jogador', pos: GRID.inicioJogador }),
    criarParticipante({ ...inimigo, lado: 'inimigo', pos: GRID.inicioInimigo }),
  ];
  const ordem = participantes.map((p, k) => ({ id: p.id, k, agi: p.atr.agilidade ?? 0 }))
    .sort((a, b) => b.agi - a.agi || a.k - b.k).map((o) => o.id);
  const estado = {
    v: SESSION_VERSION, id, grid: structuredClone(GRID), participantes, ordem, turno: 0, rodada: 1, seq: 0, fim: null, log: [],
  };
  estado.log.push('⚔️ O combate começou!');
  rodarNpcs(estado); // quem tem mais Agilidade abre; se for o NPC, ele age antes do primeiro cartão
  return estado;
}

/** Roda os turnos seguidos de NPC até chegar a vez de um jogador (ou o fim). Guarda contra laço infinito. */
function rodarNpcs(e) {
  for (let guarda = 0; guarda < 10 && !e.fim && ativoDe(e).lado === 'inimigo'; guarda += 1) turnoDoNpc(e);
}

export const porId = (e, id) => e.participantes.find((p) => p.id === id);
export const ativoDe = (e) => porId(e, e.ordem[e.turno]);
const vivos = (e, lado) => e.participantes.filter((p) => p.lado === lado && p.hp > 0);
/** Alvo padrão: o inimigo vivo mais próximo (empate: o primeiro da lista). */
export function alvoDe(e, ator) {
  const lista = e.participantes.filter((p) => p.lado !== ator.lado && p.hp > 0);
  return lista.sort((a, b) => distancia(ator.pos, a.pos) - distancia(ator.pos, b.pos))[0] ?? null;
}

const registrar = (e, texto) => { e.log.push(texto); if (e.log.length > LIMITE_LOG) e.log.splice(0, e.log.length - LIMITE_LOG); };

/** Funil ÚNICO de dano: foco, mínimo 1, piso em 0, fonte gravada, abate registrado. Devolve o dano aplicado. */
function causarDano(e, atacante, alvo, bruto, rotulo) {
  let valor = bruto;
  const foco = atacante.status.find((s) => s.id === 'foco');
  if (foco) {
    valor = Math.round(valor * BLACK_FLASH.focoMult);
    atacante.status = atacante.status.filter((s) => s.id !== 'foco');
  }
  valor = Math.max(1, Math.round(valor));
  alvo.hp = Math.max(0, alvo.hp - valor);
  alvo.dmgFrom[atacante.id] = (alvo.dmgFrom[atacante.id] ?? 0) + valor;
  registrar(e, `   ${rotulo}: **${valor}** de dano em **${alvo.nome}** (${alvo.hp}/${alvo.hpMax})`);
  if (alvo.hp <= 0) registrar(e, `☠️ **${alvo.nome}** foi derrotado.`);
  return valor;
}

const exigirComum = (ator) => { if (ator.usouComum) throw new ErroDeCombate('Você já usou a ação comum neste turno.'); };

function passo(e, ator, dx, dy) {
  const custo = custoDoPasso(dx, dy);
  if (ator.mov < custo) throw new ErroDeCombate('Sem movimento suficiente neste turno.');
  const destino = { x: ator.pos.x + dx, y: ator.pos.y + dy };
  if (!livre(e, destino, ator.id)) throw new ErroDeCombate('Essa casa está bloqueada.');
  ator.pos = destino;
  ator.mov -= custo;
  ator.movidas += 1;
}

function ataqueBasico(e, ator) {
  const alvo = alvoDe(e, ator);
  const alcance = ator.ataque ? 1 : ATAQUE_BASICO.alcance;
  if (!alvo || distancia(ator.pos, alvo.pos) > alcance) throw new ErroDeCombate('Nenhum inimigo ao alcance do corpo a corpo.');
  exigirComum(ator);
  // NPC não gasta Stamina; jogador paga o custo (recusa ANTES de cobrar).
  const custo = ator.ataque ? 0 : ATAQUE_BASICO.custoStamina;
  if (ator.stamina < custo) throw new ErroDeCombate(`Stamina insuficiente: o ataque custa ${custo} (você tem ${ator.stamina}).`);
  ator.stamina -= custo;
  ator.usouComum = true;
  const base = ator.ataque?.dano ?? ATAQUE_BASICO.dano;
  const nome = ator.ataque?.nome ?? 'Golpe';
  // Black Flash: gatilho declarado (só jogador, depois de se mover o bastante, fora da recarga). Não é chance.
  const flash = ator.lado === 'jogador' && ator.movidas >= BLACK_FLASH.minCasas && !(ator.recargas.black_flash > 0);
  registrar(e, `${ator.emoji} **${ator.nome}** ataca **${alvo.nome}** com ${nome}.`);
  if (flash) {
    registrar(e, '⚡ **BLACK FLASH!**');
    ator.recargas.black_flash = BLACK_FLASH.recarga;
    ator.ea = Math.min(ator.eaMax, ator.ea + Math.round(ator.eaMax * BLACK_FLASH.eaPct / 100));
    causarDano(e, ator, alvo, base * BLACK_FLASH.mult, 'Black Flash');
    if (!ator.status.some((s) => s.id === 'foco')) ator.status.push({ id: 'foco', turnos: BLACK_FLASH.focoTurnos });
  } else {
    causarDano(e, ator, alvo, base, nome);
  }
}

function usarHabilidade(e, ator, id) {
  const hab = HABILIDADES[id];
  if (!hab || !ator.habilidades.includes(id)) throw new ErroDeCombate('Você não possui essa habilidade.');
  const alvo = alvoDe(e, ator);
  if (!alvo) throw new ErroDeCombate('Não há alvo.');
  exigirComum(ator);
  if ((ator.recargas[id] ?? 0) > 0) throw new ErroDeCombate(`${hab.nome} está em recarga por ${ator.recargas[id]} turno(s).`);
  if (ator.ea < hab.custo) throw new ErroDeCombate(`EA insuficiente: ${hab.nome} custa ${hab.custo} (você tem ${ator.ea}).`);
  if (distancia(ator.pos, alvo.pos) > hab.alcance) throw new ErroDeCombate(`Alvo fora de alcance (máx. ${hab.alcance} casas).`);
  // ---- todas as recusas acima; daqui para baixo cobra ----
  ator.ea -= hab.custo;
  ator.usouComum = true;
  ator.recargas[id] = hab.recarga;
  hab.executar({ estado: e, ator, alvo, dano: (a, bruto, rotulo) => causarDano(e, ator, a, bruto, rotulo), log: (t) => registrar(e, t) });
}

function recuperar(e, ator) {
  exigirComum(ator);
  if (ator.ea >= ator.eaMax) throw new ErroDeCombate('Sua EA já está cheia.');
  ator.usouComum = true;
  const antes = ator.ea;
  ator.ea = Math.min(ator.eaMax, ator.ea + RECUPERAR_EA);
  registrar(e, `🔋 **${ator.nome}** recupera ${ator.ea - antes} de EA.`);
}

function recuperarStamina(e, ator) {
  exigirComum(ator);
  if (ator.stamina >= ator.staminaMax) throw new ErroDeCombate('Sua Stamina já está cheia.');
  ator.usouComum = true;
  const antes = ator.stamina;
  ator.stamina = Math.min(ator.staminaMax, ator.stamina + RECUPERAR_STAMINA);
  registrar(e, `💨 **${ator.nome}** recupera ${ator.stamina - antes} de Stamina.`);
}

function verificarFim(e) {
  if (e.fim) return;
  if (vivos(e, 'jogador').length === 0) e.fim = { vencedor: 'inimigo' };
  else if (vivos(e, 'inimigo').length === 0) e.fim = { vencedor: 'jogador' };
}

/** Passa a vez para o próximo vivo; no início do turno: recargas e status andam, movimento e ação comum voltam. */
function proximoTurno(e) {
  for (let volta = 0; volta < e.ordem.length; volta += 1) {
    e.turno = (e.turno + 1) % e.ordem.length;
    if (e.turno === 0) e.rodada += 1;
    const p = ativoDe(e);
    if (p.hp <= 0) continue;
    for (const k of Object.keys(p.recargas)) p.recargas[k] = Math.max(0, p.recargas[k] - 1);
    p.status = p.status.map((s) => ({ ...s, turnos: s.turnos - 1 })).filter((s) => s.turnos > 0);
    p.mov = p.movMax;
    p.movidas = 0;
    p.usouComum = false;
    return;
  }
}

/** Turno esgotado: ação comum usada e sem movimento para mais um passo. */
export const turnoEsgotado = (p) => p.usouComum && p.mov < 1;

/** IA simples (rp-tactical-combat §8): chega perto do alvo, ataca, passa. */
function turnoDoNpc(e) {
  const ator = ativoDe(e);
  const alvo = alvoDe(e, ator);
  if (!alvo) return proximoTurno(e);
  const de = { ...ator.pos };
  while (ator.mov >= 1 && distancia(ator.pos, alvo.pos) > 1) {
    const dx = Math.sign(alvo.pos.x - ator.pos.x);
    const dy = Math.sign(alvo.pos.y - ator.pos.y);
    const tentativas = [[dx, dy], [dx, 0], [0, dy]].filter(([x, y]) => x !== 0 || y !== 0);
    const escolhida = tentativas.find(([x, y]) => ator.mov >= custoDoPasso(x, y) && livre(e, { x: ator.pos.x + x, y: ator.pos.y + y }, ator.id));
    if (!escolhida) break;
    passo(e, ator, escolhida[0], escolhida[1]);
  }
  if (ator.pos.x !== de.x || ator.pos.y !== de.y) registrar(e, `${ator.emoji} **${ator.nome}** avança.`);
  if (distancia(ator.pos, alvo.pos) <= 1) { try { ataqueBasico(e, ator); } catch { /* sem alvo ao alcance: passa */ } }
  verificarFim(e);
  if (!e.fim) proximoTurno(e);
}

/**
 * Aplica a ação do jogador da vez e, se o turno acabar, roda os turnos dos NPCs. Devolve um estado NOVO.
 * acao: { tipo: 'mover', dx, dy } | { tipo: 'atacar' } | { tipo: 'habilidade', id } | { tipo: 'recuperar' } | { tipo: 'passar' }
 */
export function aplicar(estado, acao) {
  if (estado.fim) throw new ErroDeCombate('O combate já terminou.');
  const e = structuredClone(estado);
  const ator = ativoDe(e);
  if (ator.lado !== 'jogador') throw new ErroDeCombate('Não é a vez do jogador.');
  switch (acao.tipo) {
    case 'mover': passo(e, ator, acao.dx, acao.dy); break;
    case 'atacar': ataqueBasico(e, ator); break;
    case 'habilidade': usarHabilidade(e, ator, acao.id); break;
    case 'recuperar': recuperar(e, ator); break;
    case 'recuperar_stamina': recuperarStamina(e, ator); break;
    case 'passar': break;
    default: throw new ErroDeCombate('Ação desconhecida.');
  }
  e.seq += 1;
  verificarFim(e);
  if (!e.fim && (acao.tipo === 'passar' || turnoEsgotado(ator))) {
    proximoTurno(e);
    rodarNpcs(e);
  }
  return e;
}
