// A régua de balanceamento aplicada a uma habilidade ou a uma árvore. PURA: lê REGUA de balance.js e o descritor `regua`
// (dano, efeitos, puxa/empurra, colisão, área, buff). Não escreve número: só mede e avisa.
// Todo aviso começa com uma [etiqueta] (custo, pico, pct, dpe, buff, area, rank, pontos, requisito) para o teste registrar exceções.
import { KOKUSEN, MOV_BASE, MOV_MAX, POOL_EA, PUNHO_ENERGIA, QUEIMADURA, REGUA, SANGRAMENTO } from './balance.js';

/** Soma escalonada por faixas: [[ate, taxa], ...]. */
function porFaixas(x, faixas) {
  let de = 0;
  let total = 0;
  for (const [ate, taxa] of faixas) {
    const n = Math.min(x, ate) - de;
    if (n > 0) total += n * taxa;
    de = ate;
  }
  return total;
}

export const vidaDeReferencia = (nivel = 1) => REGUA.vidaBase + REGUA.vidaPorNivel * Math.min(nivel, 50);

/** Custo de EA sugerido pela régua (pool de 100). `r` = descritor da habilidade. */
export function custoSugerido(r) {
  const C = REGUA.custo;
  let sub = porFaixas(r.dano ?? 0, C.faixas);
  for (const e of r.efeitos ?? []) sub += (C.severidade[e.id] ?? 1) * (e.duracao ?? 1) * (e.chance ?? 1);
  // deslocamento: empurrão (x chance), puxão, o próprio usuário se movendo depois do golpe e a investida (conta 2 casas)
  sub += ((r.empurra ?? 0) * (r.chanceEmpurrao ?? 1) + (r.puxa ?? 0) + (r.deslocaSi ?? 0) + (r.investida ? 2 : 0)) * C.deslocamentoPorCasa;
  if (r.colisao) sub += C.colisao;
  if (r.quebraBarreira) sub += C.quebraBarreira;
  if (r.area) sub *= C.area;
  sub += (r.buffsProprios ?? 0) * C.buffProprio;
  // sem defesa: imbloqueável 1,15 · inesquivável 1,2 · os dois 1,4
  sub *= r.inesquivavel && r.imbloqueavel ? C.semDefesa.ambos : r.inesquivavel ? C.semDefesa.esquiva : r.imbloqueavel ? C.semDefesa.bloqueio : 1;
  sub *= 1 - Math.min(C.descontoTeto, (r.preparo ? C.descontoPreparo : 0) + (r.usoUnico ? C.descontoUnico : 0));
  return Math.max(1, Math.round((sub + C.base) * C.acao[r.acao ?? 'comum']));
}

/** Rank pelo dano do jogo (área x1,15); sem dano, pelo nível de abertura (até 5 D, até 11 C, depois B). */
export function rankDe(dano, area = false, nivel = 1) {
  if (!dano) return nivel <= 5 ? 'D' : nivel <= 11 ? 'C' : 'B';
  return REGUA.rank.find(([, ate]) => dano * (area ? REGUA.custo.area : 1) <= ate)[0];
}
export const picoMaxPorRecarga = (recarga) => REGUA.picoPorRecarga.find(([ate]) => recarga <= ate)[1];
/** Teto de custo de um buff sem dano: 15% do pool, vezes o multiplicador da ação (bônus 1,3 → 20). */
export const custoMaxBuff = (acao = 'comum') => Math.round((POOL_EA * REGUA.buffSemDano.custoMaxPctPool * REGUA.custo.acao[acao]) / 100);
/** Teto do dano por alvo de uma técnica em área, dado o melhor golpe de alvo único do mesmo nível. */
export function tetoDeArea(casas, final, referencia, investida = false) {
  const fator = final ? REGUA.areaFinal : investida ? REGUA.investida : REGUA.areaPorAlvo.find(([ate]) => casas <= ate)[1];
  return Math.round(referencia * fator);
}

/** Auditoria de uma habilidade: números medidos + avisos (lista vazia = passou em toda a régua). */
export function auditar(h) {
  const r = h.regua;
  const avisos = [];
  const nivel = h.nivel ?? 1;
  if (r.semDano) {
    const teto = custoMaxBuff(r.acao);
    if (h.custo > teto) avisos.push(`[buff] buff sem dano custa ${h.custo}, acima de ${teto} (${REGUA.buffSemDano.custoMaxPctPool}% do pool x ação)`);
    if (h.recarga < REGUA.buffSemDano.recargaMin) avisos.push(`[buff] buff sem dano com recarga ${h.recarga}, abaixo de ${REGUA.buffSemDano.recargaMin}`);
    return { id: h.id, rank: rankDe(0, false, nivel), custo: h.custo, sugerido: null, pico: null, danoPorEnergia: null, avisos };
  }
  if (r.dominio) {
    // Domínio: técnica de teto, uso único, custo entre 40% e 60% do pool, com contrapartida (rp-balance, adaptar universo). Rank S por definição.
    const pct = (h.custo / POOL_EA) * 100;
    const [min, max] = REGUA.dominio.custoPct;
    if (pct < min || pct > max) avisos.push(`[pct] Domínio custa ${pct.toFixed(0)}% do pool, fora de ${min}-${max}%`);
    if (!r.usoUnico) avisos.push('[dominio] Domínio tem de ser de uso único por combate');
    return { id: h.id, rank: 'S', custo: h.custo, sugerido: null, pico: null, danoPorEnergia: null, avisos };
  }
  // `modo` (aura/manutenção) tem custo ESCRITO, fora da fórmula (rp-balance §3); os demais testes valem (dano/energia, % do pool, pico, recarga)
  const sugerido = r.modo ? null : custoSugerido(r);
  const pico = (r.dano / vidaDeReferencia(nivel)) * 100;
  const danoPorEnergia = r.dano / h.custo;
  const custoPct = (h.custo / POOL_EA) * 100;
  if (!r.modo && Math.abs(h.custo - sugerido) > REGUA.toleranciaCusto) avisos.push(`[custo] custo ${h.custo} difere da régua (${sugerido}) em mais de ${REGUA.toleranciaCusto}`);
  if (r.modo && r.acao !== 'reacao' && h.recarga < REGUA.buffSemDano.recargaMin) avisos.push(`[buff] modo com recarga ${h.recarga}, abaixo de ${REGUA.buffSemDano.recargaMin}`);
  if (r.acao === 'reacao') {
    const teto = (POOL_EA * REGUA.reacao.custoMaxPctPool) / 100;
    if (h.custo > teto) avisos.push(`[reacao] reação custa ${h.custo}, acima de ${teto} (${REGUA.reacao.custoMaxPctPool}% do pool)`);
    if (h.recarga < REGUA.reacao.recargaMin) avisos.push(`[reacao] reação com recarga ${h.recarga}, abaixo de ${REGUA.reacao.recargaMin}`);
  }
  const picoMax = r.area ? Math.min(picoMaxPorRecarga(h.recarga), 24) : picoMaxPorRecarga(h.recarga);
  if (pico > picoMax) avisos.push(`[pico] pico ${pico.toFixed(0)}% da vida passa do teto ${picoMax}% para recarga ${h.recarga}`);
  if (r.dano > REGUA.apice) avisos.push(`[apice] dano ${r.dano} passa do ápice da primeira camada (${REGUA.apice})`);
  const pctMax = r.final ? REGUA.custoPctPool.maxFinal : REGUA.custoPctPool.max;
  if (custoPct < REGUA.custoPctPool.min || custoPct > pctMax) avisos.push(`[pct] custo ${custoPct.toFixed(0)}% do pool fora de ${REGUA.custoPctPool.min}-${pctMax}%`);
  if (danoPorEnergia < REGUA.danoPorEnergia.min || danoPorEnergia > REGUA.danoPorEnergia.max) avisos.push(`[dpe] dano/energia ${danoPorEnergia.toFixed(2)} fora de ${REGUA.danoPorEnergia.min}-${REGUA.danoPorEnergia.max}`);
  if (r.area && h.recarga < 2 && !r.usoUnico) avisos.push('[pico] técnica de área com recarga menor que 2');
  // alvo único À DISTÂNCIA rende no máx. o mesmo que o corpo a corpo do nível (1,00); o final do estilo, até 1,15 (rp-balance §7)
  if (!r.area && (r.alcance ?? 1) >= 2) {
    const teto = Math.round(alvoUnicoDoNivel(nivel) * (r.final ? REGUA.areaFinal : 1));
    if (r.dano > teto) avisos.push(`[alcance] ${r.dano} à distância ${r.alcance} passa do teto ${teto} (corpo a corpo do nível = ${alvoUnicoDoNivel(nivel)}${r.final ? ', final x1,15' : ''})`);
  }
  return { id: h.id, rank: r.modo ? rankDe(0, false, nivel) : rankDe(r.dano, r.area, nivel), custo: h.custo, sugerido, pico, danoPorEnergia, avisos };
}

/** Maior golpe de alvo único aprovado no jogo até o nível (tabela da régua). */
/** Interpolada entre os pontos da tabela (14 no nível 1 → 22 no 5 → 30 no 12); abaixo do primeiro e acima do último, o valor da ponta. */
export function alvoUnicoDoNivel(nivel) {
  const t = REGUA.alvoUnicoPorNivel;
  if (nivel <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i += 1) {
    if (nivel <= t[i][0]) return t[i - 1][1] + ((t[i][1] - t[i - 1][1]) * (nivel - t[i - 1][0])) / (t[i][0] - t[i - 1][0]);
  }
  return t.at(-1)[1];
}

/**
 * Auditoria de uma árvore: cada nó (custo, pico, rank, pontos, requisito = soma do caminho, teto de área) e o total.
 * nó = { id, nome, tipo: 'raiz'|'passiva'|'tecnica'|'buff', rank?, pontos, nivel, requisito, requer: [ids], custo?, recarga?, regua? }
 */
export function auditarArvore(arvore) {
  const porId = Object.fromEntries(arvore.nos.map((n) => [n.id, n]));
  const caminho = (n, visto = new Set()) => {
    if (visto.has(n.id)) return visto;
    visto.add(n.id);
    for (const p of n.requer ?? []) caminho(porId[p], visto);
    return visto;
  };
  const unicoAlvo = arvore.nos.filter((n) => n.regua && !n.regua.area && n.regua.dano > 0 && (n.regua.alcance ?? 1) < 2); // só corpo a corpo é referência
  const profundidade = (n) => (n.requer?.length ? 1 + Math.max(...n.requer.map((p) => profundidade(porId[p]))) : 0);
  const nos = arvore.nos.map((n) => {
    const base = n.tipo === 'tecnica' || n.tipo === 'buff' ? auditar({ ...n }) : { id: n.id, rank: null, avisos: [] };
    const avisos = [...base.avisos];
    // linhagem/clã: raiz 1, depois a escada 2/3/4/5/6 por profundidade no caminho (a mesma da passiva racial)
    // passiva de árvore: 2 fixo (régua) ou, se a árvore declara `precoPassiva: 'escada'`, a escada por profundidade como a linhagem
    // `precoPassiva: 'faixa'`: a passiva custa entre 2 (régua) e a escada por profundidade (preço por poder, dentro da faixa)
    // linhagem de clã: o preço fica entre 2 e a escada por profundidade (mais barato que a escada é permitido; mais caro, não)
    const escada = n.tipo === 'linhagem' || (n.tipo === 'passiva' && arvore.precoPassiva === 'escada');
    const esperado = n.tipo === 'raiz' ? REGUA.pontos.raiz : escada ? profundidade(n) + 1 : n.tipo === 'passiva' ? REGUA.pontos.passiva : REGUA.pontos[base.rank];
    const naFaixa = (n.tipo === 'linhagem' || (n.tipo === 'passiva' && arvore.precoPassiva === 'faixa')) && n.pontos >= REGUA.pontos.passiva && n.pontos <= profundidade(n) + 1;
    if (n.pontos !== esperado && !naFaixa) avisos.push(`[pontos] custa ${n.pontos}, a régua pede ${esperado}${base.rank ? ` (rank ${base.rank})` : ''}`);
    if (base.rank && n.rank && n.rank !== base.rank) avisos.push(`[rank] declarado ${n.rank}, a régua mede ${base.rank}`);
    const soma = [...caminho(n)].reduce((s, id) => s + porId[id].pontos, 0);
    if (n.requisito < soma) avisos.push(`[requisito] exige ${n.requisito}, mas o caminho custa ${soma}`);
    // segundo status (mínimo, não gasto): valor = soma do caminho ÷ 3; e tudo junto cabe em 80% dos pontos do nível
    let exigido = n.requisito;
    for (const [stat, v] of Object.entries(n.exige ?? {})) {
      exigido += v;
      if (!REGUA.status.includes(stat) || stat === 'tecnica_inata') avisos.push(`[stat] "${stat}" não é um status de requisito secundário`);
      const pedido = Math.ceil(soma / REGUA.requisitoSecundarioDiv);
      if (v !== pedido) avisos.push(`[requisito] ${stat} ${v}, a régua pede ${pedido} (soma do caminho ${soma} ÷ ${REGUA.requisitoSecundarioDiv})`);
    }
    const orcamento = Math.floor((REGUA.pontosPorNivel * Math.min(n.nivel, 50) * REGUA.orcamentoPct) / 100);
    if (exigido > orcamento) avisos.push(`[orcamento] exige ${exigido} pontos de status no nível ${n.nivel}, acima de ${orcamento} (${REGUA.orcamentoPct}% dos pontos do nível)`);
    if (n.regua?.area) {
      const ref = Math.max(alvoUnicoDoNivel(n.nivel), ...unicoAlvo.filter((u) => u.nivel <= n.nivel).map((u) => u.regua.dano));
      const teto = tetoDeArea(n.regua.casas, n.regua.final, ref, n.regua.investida);
      if (n.regua.dano > teto) avisos.push(`[area] ${n.regua.dano} por alvo passa do teto ${teto} (melhor golpe de alvo único do nível = ${ref})`);
    }
    return { ...base, nome: n.nome, tipo: n.tipo, pontos: n.pontos, soma, exige: n.exige ?? {}, avisos };
  });
  return { id: arvore.id, totalPontos: arvore.nos.reduce((s, n) => s + n.pontos, 0), nos, bonus: auditarBonus(arvore) };
}

/**
 * Soma os bônus de uma árvore de linhagem por janela e compara com os tetos de projeto.
 * Avisos = violação de teto PERMANENTE (e da chance total de Kokusen). `info` traz o resto para o dono decidir.
 */
export function auditarBonus(arvore) {
  const bonus = arvore.nos.flatMap((n) => n.bonus ?? []);
  const soma = (janelas, campo) => bonus.filter((b) => janelas.includes(b.janela)).reduce((s, b) => s + (b[campo] ?? 0), 0);
  // Bônus de dano com `so: [...]` só vale num cenário que tenha todas as etiquetas (arma|punhos, single|multi, melee|ranged):
  // o pior caso é o MAIOR total entre os cenários possíveis (arma e punhos nunca estão juntos no mesmo golpe).
  const maxJanela = (campo) => Math.max(0, ...bonus.filter((b) => ['cond', 'burst'].includes(b.janela)).map((b) => b[campo] ?? 0)); // a maior janela isolada
  const cenarios = ['arma', 'punhos', 'shikigami'].flatMap((e) => ['single', 'multi'].flatMap((a) => ['melee', 'ranged'].map((d) => new Set([e, a, d]))));
  const danoNoCenario = (c) => bonus.filter((b) => ['perm', 'cond'].includes(b.janela) && (b.so ?? []).every((t) => c.has(t))).reduce((s, b) => s + (b.danoPct ?? 0), 0);
  const T = REGUA.tetos;
  const info = {
    descontoPerm: soma(['perm'], 'descontoPct'),
    descontoComBurst: soma(['perm', 'burst'], 'descontoPct'),
    precisaoPp: soma(['perm', 'cond', 'burst'], 'precisaoPp'),
    esquivaPerm: soma(['perm'], 'esquivaPp'),
    esquivaPicoSemTeto: T.esquivaBase + soma(['perm', 'cond', 'burst'], 'esquivaPp'), // base + tudo ligado ao mesmo tempo
    esquivaPico: Math.min(T.esquivaMax, T.esquivaBase + soma(['perm', 'cond', 'burst'], 'esquivaPp')), // o motor corta em esquivaMax
    movPerm: soma(['perm'], 'movCasas'),
    movCond: soma(['cond'], 'movCasas'),
    movBurst: soma(['burst'], 'movCasas'),
    movPicoSemTeto: MOV_BASE + soma(['perm', 'cond', 'burst'], 'movCasas'), // tudo junto, sem a Velocidade do jogador
    movPicoRodada1: Math.min(MOV_MAX, MOV_BASE + soma(['perm', 'cond', 'burst'], 'movCasas')), // o motor corta em MOV_MAX
    // (Velocidade: 1 casa a cada 3 pontos; Passo Treinado dá 1 casa por 2 pontos de Técnica Inata)
    energiaMaxPontos: (soma(['perm'], 'eaMaxPct') * POOL_EA) / 100,
    reducaoCond: soma(['perm', 'cond'], 'reducaoPct'),
    eaPorRodada: soma(['perm', 'cond'], 'eaPorRodada'), // regeneração passiva de EA por rodada (a ação Recuperar devolve 20)
    eaViaVida: soma(['burst'], 'eaViaVida'), // EA paga com vida, 1x por combate
    eaPorRodadaBurst: soma(['burst'], 'eaPorRodada'),
    // Sangramento com tudo ligado: dano fixo por turno x teto de rodadas (não pode passar do maior golpe de alvo único)
    sangramentoMaxTotal: (SANGRAMENTO.danoPorTurno + soma(['perm', 'cond', 'burst'], 'sangDanoExtra')) * SANGRAMENTO.teto,
    queimaduraPorTurno: QUEIMADURA.danoPorTurno + soma(['perm'], 'queimDanoExtra'),
    queimaduraMaxTotal: (QUEIMADURA.danoPorTurno + soma(['perm'], 'queimDanoExtra')) * QUEIMADURA.teto, // DoT cheio até o teto de turnos
    danoPerm: soma(['perm'], 'danoPct'),
    danoCond: Math.max(...cenarios.map(danoNoCenario)),
    vidaPct: soma(['perm'], 'vidaPct'),
    kokusenPermPp: soma(['perm'], 'kokusenPp'),
    // pior caso: base do Punho + estado Kokusen (bônus cheio) + tudo da linhagem somado
    kokusenPico: PUNHO_ENERGIA.kokusenChance + KOKUSEN.chanceBonus + soma(['perm', 'cond', 'burst'], 'kokusenPp') + soma(['perm', 'cond', 'burst'], 'kokusenCondPp'),
  };
  const avisos = [];
  if (info.descontoPerm > T.descontoEaPassivo) avisos.push(`[desconto] descontos de EA permanentes somam ${info.descontoPerm}%, acima de ${T.descontoEaPassivo}%`);
  if (info.precisaoPp > T.precisaoPp) avisos.push(`[precisao] precisão soma ${info.precisaoPp} pp, acima de ${T.precisaoPp}`);
  // cada janela de movimento (1ª rodada ou burst), somada ao permanente, tem de caber no máximo; juntas o motor corta
  if (MOV_BASE + info.movPerm + maxJanela('movCasas') > MOV_MAX) avisos.push(`[movimento] uma janela de movimento passa do máximo de ${MOV_MAX} casas`);
  if (info.esquivaPerm > T.esquivaPermPp) avisos.push(`[esquiva] esquiva permanente soma ${info.esquivaPerm} pp, acima de ${T.esquivaPermPp}`);
  // cada janela de esquiva, somada à base e à permanente, cabe no teto geral; juntas o motor corta (como o movimento)
  if (T.esquivaBase + info.esquivaPerm + maxJanela('esquivaPp') > T.esquivaMax) avisos.push(`[esquiva] uma janela de esquiva passa do teto geral ${T.esquivaMax}%`);
  if (info.vidaPct > T.vidaPct) avisos.push(`[vida] vida máxima soma +${info.vidaPct}%, acima de ${T.vidaPct}%`);
  if (info.reducaoCond > T.reducaoPassiva) avisos.push(`[reducao] redução de dano soma ${info.reducaoCond}%, acima de ${T.reducaoPassiva}%`);
  if (info.queimaduraMaxTotal > alvoUnicoDoNivel(99)) avisos.push(`[queimadura] Queimadura cheia soma ${info.queimaduraMaxTotal}, acima do maior golpe de alvo único (${alvoUnicoDoNivel(99)})`);
  if (info.sangramentoMaxTotal > alvoUnicoDoNivel(99)) avisos.push(`[sangramento] Sangramento cheio soma ${info.sangramentoMaxTotal}, acima do maior golpe de alvo único (${alvoUnicoDoNivel(99)})`);
  if (info.energiaMaxPontos > T.energiaPontos) avisos.push(`[energia] EA máxima soma +${info.energiaMaxPontos}, acima de ${T.energiaPontos}`);
  if (info.danoCond > T.danoMesmoGolpe) avisos.push(`[dano] bônus de dano soma ${info.danoCond}%, acima de ${T.danoMesmoGolpe}%`);
  if (info.kokusenPico > KOKUSEN.chanceMax) avisos.push(`[kokusen] chance de Kokusen chega a ${info.kokusenPico}%, acima do teto ${KOKUSEN.chanceMax}%`);
  return { info, avisos };
}

/** O que um personagem do clã soma de verdade: árvores juntas (ex.: Ratio + Nanami; Zenin + Coragem Ardente), mesmo teto. */
export const auditarPacote = (arvores) => auditarBonus({ nos: arvores.flatMap((a) => a.nos) });
