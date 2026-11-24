// Todo número do combate mora aqui (rp-tactical-combat / rp-power-authoring). Um teste trava os valores publicados.
// Regras: atributo NÃO escala dano (é orçamento: vida, movimento, iniciativa); pool de energia fixo em 100; sem regen, só "Recuperar".

export const SESSION_VERSION = 1;

/** Mapa de treino 10x6 com um muro diagonal no meio (obstáculo bloqueia passo e empurrão). */
export const GRID = {
  w: 10, h: 6,
  obstaculos: [{ x: 4, y: 1 }, { x: 4, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 }],
  inicioJogador: { x: 1, y: 3 },
  inicioInimigo: { x: 8, y: 2 },
};

export const POOL_EA = 100;
export const RECUPERAR_EA = 20; // ação comum
export const POOL_STAMINA = 100; // fôlego físico: ataques comuns gastam, sem regen
export const RECUPERAR_STAMINA = 30; // ação comum

export const MOV_BASE = 3; // orçamento de movimento por turno
// (24/11/2026, dono) Movimento máximo por turno = 5 casas, somando Velocidade, linhagem e buffs: o que passar disso é cortado no motor.
export const MOV_MAX = 5;
export const AGILIDADE_POR_MOV = 3; // cada 3 pontos de Agilidade = +1 de orçamento
export const CUSTO_PASSO = { reto: 1, diagonal: 1.5 };

export const ATAQUE_BASICO = { dano: 10, alcance: 1, custoStamina: 15 }; // comum; gasta Stamina (só jogador), sem custo de EA

/**
 * Black Flash = crítico com GATILHO (não é chance): acerto corpo a corpo de quem se moveu `minCasas` neste turno.
 * Multiplica o dano, devolve EA, deixa um foco curto (+dano no próximo golpe, não soma) e tem recarga para não encadear.
 */
export const BLACK_FLASH = { minCasas: 2, mult: 2, eaPct: 20, recarga: 2, focoMult: 1.15, focoTurnos: 2 };

/** Gojo · Azul (Rank C): puxa o alvo e o deixa Atraído, o que potencializa o Vermelho. */
export const AZUL = { custo: 20, recarga: 2, alcance: 6, dano: 12, puxa: 3 };
/** Gojo · Vermelho (Rank B): repele; bater em obstáculo/borda/criatura dá impacto; x comboMult contra Atraído. */
export const VERMELHO = { custo: 30, recarga: 3, alcance: 5, dano: 26, empurra: 3, impacto: 10, comboMult: 1.3 };

/**
 * Punho de Energia: buff físico em si mesmo. Enquanto dura, o ataque básico dá +forcaPct% de dano e cada golpe tem
 * `kokusenChance`% (de 0 a 100) de virar Kokusen. `turnos` conta o turno da ativação: 4 = 3 turnos seguintes para bater.
 */
// (24/11/2026, régua) custo 20 → 15: buff sem dano custa no máx. 15% do pool; com 20 o ganho (~9 de dano em 3 turnos) ficava abaixo de 0,6 de dano por EA.
export const PUNHO_ENERGIA = { custo: 15, recarga: 5, alcance: 99, turnos: 4, forcaPct: 30, kokusenChance: 0.5 };
/**
 * Kokusen (Black Flash) vindo do Punho: o golpe causa dano x`mult` e abre o estado Kokusen por `turnos` (4 = 3 turnos seguintes):
 * +eaPct% de EA no início de cada turno, +chanceBonus pontos de chance de Kokusen (cai chanceDecai a cada Kokusen acertado
 * enquanto o estado dura, nunca abaixo de 0) e +danoPct% de dano em tudo.
 */
// (24/11/2026, dono) chanceMax 40: a chance total de Kokusen (base + estado + linhagem Nanami) nunca passa de 40%.
export const KOKUSEN = { mult: 2, turnos: 4, eaPct: 5, chanceBonus: 20, chanceDecai: 5, danoPct: 10, chanceMax: 40 };

/**
 * RÉGUA DE BALANCEAMENTO (rp-balance, formulas.md §3-5). Números em escala do JOGO (não há conversão de dano escrito).
 * `src/combat/regua.js` aplica; `test/regua.test.js` trava; `npm run regua` imprime a auditoria. Detalhes em docs/regua-balanceamento.md.
 */
export const REGUA = {
  // Vida de referência no nível de abertura da técnica, SEM pontos de Vitalidade: 100 + 3 por nível (1 → 103 · 20 → 160 · 50 → 250).
  // ATENÇÃO: src/rpg/balance.js ainda dá 10 de vida por nível; a régua segue a escala da skill até o dono decidir alinhar os dois.
  vidaBase: 100, vidaPorNivel: 3,
  toleranciaCusto: 2, // custo declarado pode diferir do sugerido em até isto (EA)
  custo: {
    base: 6, descontoPreparo: 0.1, descontoUnico: 0.1, descontoTeto: 0.3, // exigir condição/preparo e uso único por combate
    faixas: [[20, 0.55], [35, 1.5], [40, 0.15], [Infinity, 0.6]], // taxa de EA por ponto de dano, por faixa
    severidade: { atordoar: 7, imobilizar: 3, provocar: 3, vulneravel: 2, dot: 1.5, lentidao: 1 }, // x duração x chance
    deslocamentoPorCasa: 0.75, colisao: 2, quebraBarreira: 2, area: 1.15, buffProprio: 2,
    acao: { comum: 1, bonus: 1.3, reacao: 0.85 },
    semDefesa: { ambos: 1.4, esquiva: 1.2, bloqueio: 1.15 },
  },
  // Escada de pico: dano máx. em % da vida de referência, por recarga (0 | 1-2 | 3 | 4+)
  picoPorRecarga: [[0, 15], [2, 25], [3, 35], [Infinity, 40]],
  // custo de técnica com dano, em % do pool. (24/11/2026) max 35 → 40: a própria fórmula da régua dá 40 para dano 36-40 (rank A); finais/uso único: até 60%
  custoPctPool: { min: 5, max: 40, maxFinal: 60 },
  danoPorEnergia: { min: 0.6, max: 3.0 }, // vale para EA (técnicas) e Stamina (golpes físicos)
  buffSemDano: { custoMaxPctPool: 15, recargaMin: 3 },
  rank: [['D', 18], ['C', 24], ['B', 32], ['A', 40], ['S', Infinity]], // pelo dano do jogo (área x1,15)
  pontos: { raiz: 1, passiva: 2, D: 1, C: 3, B: 4, A: 6, S: 10 }, // custo de aquisição do nó
  // Dano por alvo de técnica em área ÷ melhor golpe de alvo único corpo a corpo do mesmo nível (teto por nº de casas atingidas)
  areaPorAlvo: [[1, 1.0], [4, 0.95], [9, 0.9], [Infinity, 0.85]],
  areaFinal: 1.15, // final do estilo, qualquer forma (recarga 4-5 ou uso único)
  // Requisitos de status (dono, 24/11/2026: "pode mudar requisitos, ou compartilhados"). Técnica Inata PAGA o nó e exige a soma do caminho;
  // um nó pode pedir TAMBÉM um segundo status como mínimo (não é gasto): Força para golpe pesado, Maestria em Armas para técnica de arma.
  // Valor do segundo status = soma do caminho ÷ 3 (arredonda para cima). Tudo junto cabe em 80% dos pontos do nível (4 por nível, até o 50).
  status: ['forca', 'velocidade', 'vitalidade', 'reserva_ce', 'maestria_armas', 'tecnica_inata'],
  requisitoSecundarioDiv: 3, orcamentoPct: 80, pontosPorNivel: 4,
  // Maior golpe de ALVO ÚNICO CORPO A CORPO aprovado no jogo até cada nível de abertura (Corte 7:3 14 · Corte de Membro 22 · Corte no Tronco 30 ·
  // Golpe Compactado 36, rank A). A referência da área é o maior entre este e o da própria árvore.
  // (24/11/2026) Entrou [20, 36] com o Golpe Compactado (Sangue): com a tabela antiga (30) a régua nerfou Colapso, Chuva de Punhos, Colapso Total,
  // Chama Plena e Sete Punhos; com 36 os números originais do dono voltam a caber (ver docs).
  alvoUnicoPorNivel: [[1, 14], [5, 22], [12, 30], [20, 36]],
  apice: 40, // nenhum dano escrito de técnica passa de 40 na primeira camada (rank S só vem de área x1,15)
  reacao: { custoMaxPctPool: 20, recargaMin: 2 }, // reação custa no máx. 20% do pool e tem recarga >= 2
  investida: 1.1, // investida em linha reta rende no máx. 1,10 do corpo a corpo do nível (por alvo)
  dominio: { custoPct: [40, 60] }, // Domínio: uso único, 40-60% do pool
  // Tetos de projeto para bônus PERMANENTES de linhagem/clã (o motor não corta: os números ficam abaixo, o teste trava)
  tetos: { descontoEaPassivo: 20, precisaoPp: 35, energiaPontos: 50, danoMesmoGolpe: 40, esquivaPermPp: 12, esquivaBase: 25, esquivaMax: 65, reducaoPassiva: 35, vidaPct: 35 },
};

/**
 * Árvore da técnica inata SANGUE (V1, clã Kamo). Sangramento: 5 de dano fixo por turno (dono), teto de 4 rodadas (Ferida Profunda).
 * Marca de Sangue: 3 rodadas, não acumula. (24/11/2026, régua) Maré Rubra 42 → 40 (custo 41 → 38): ápice da primeira camada é 40.
 */
export const SANGRAMENTO = { danoPorTurno: 5, teto: 4 };
export const SANGUE = {
  marca: { turnos: 3 },
  pressaoArterial: { danoPct: 15 }, // técnicas de sangue contra alvo com Marca
  gota: { dano: 14, custo: 16, recarga: 0, alcance: 4, sangChance: 0.6, sangTurnos: 2 },
  lamina: { dano: 22, custo: 23, recarga: 1, sangChance: 1, sangTurnos: 2 },
  rede: { dano: 18, custo: 21, recarga: 2, alcance: 5, imobilizaTurnos: 1 },
  coagulo: { custo: 14, recarga: 2, barreira: 14, turnos: 2 }, // reação
  lanca: { dano: 26, custo: 32, recarga: 2, alcance: 5 }, // linha, imbloqueável
  golpe: { dano: 36, custo: 40, recarga: 3, atordoaChance: 0.6, atordoaTurnos: 1 }, // exige Marca
  chuva: { dano: 30, custo: 36, recarga: 4, lado: 3, sangChance: 1, sangTurnos: 2 }, // exige Marca em um alvo
  mare: { dano: 40, custo: 38 }, // uso único; detona todas as Marcas do campo
};

/**
 * Árvore do clã KAMO (linhagem de sangue, só passivas). Janelas: perm | cond (gatilho) | burst (1x por combate).
 * ASSUMIDO (24/11/2026): Reserva Rubra requer Herança de Fluxo e Sangue por Energia requer Pulso de Combate (o texto dizia Coagulação Natural e
 * Ferida Profunda): só assim os requisitos de Técnica Inata que você escreveu (6, 10, 14, 15) batem com a soma do caminho. Faltam 6 pontos (topo) para os 30.
 */
export const KAMO = {
  sangueAntigo: { sangramentoMenosRodadas: 1, minimo: 1 },
  circulacao: { vidaPct: 10 },
  herancaFluxo: { descontoPct: 5 }, // técnicas de sangue
  coagulacao: { sangramentoDanoPct: -30 }, // e o Sangramento não reduz mais a cura recebida
  reservaRubra: { vidaAbaixoPct: 50, eaPorRodada: 3 },
  pulsoCombate: { danoPct: 10 }, // técnicas de sangue contra alvos com Sangramento
  feridaProfunda: { sangramentoMaisRodadas: 1, sangramentoMaxRodadas: 4 },
  sanguePorEnergia: { eaViaVida: 15 }, // 1 vida por 1 de EA, 1x por combate
  // TOPO PROPOSTO PELA RÉGUA (24/11/2026, "mude o que achar melhor"): o dono não enviou o nó de 6 pontos; trocar quando enviar o dele.
  // 1x por combate, 3 rodadas: Sangramentos que você aplica +2 de dano por turno (5 → 7) e +4 de EA por rodada; depois 2 rodadas com -10% de dano.
  sangueAncestral: { turnos: 3, sangDanoExtra: 2, eaPorRodada: 4, fadigaTurnos: 2, fadigaDanoPct: -10 },
};

/**
 * Árvore ZENIN · DEZ SOMBRAS (sem Mahoraga): shikigami como ações comuns. Só dados por enquanto (shikigami, missão da staff e debuffs no motor depois).
 * (24/11/2026, régua) Sombra Viva movimento +2 → +1 (com o Passo Treinado da linhagem passaria de 5 casas); Cão Divino: Totalidade +50% → +20% e
 * Tigre Fúnebre +10%/máx. +30% → +5%/máx. +10% (dano no mesmo golpe do clã: Ritmo 10 + Totalidade 20 + Tigre 10 = 40, o teto);
 * Boi Perfurante 32/39 → 30/34 foi DESFEITO no mesmo dia (o teto de custo de técnica comum passou de 35% para 40% do pool);
 * Abismo Desconhecido do Poço custo 31 → 28 (exige Nue e Sapo vivos = preparo, -10%); Jardim de Sombras Quiméricas custo 65 → 60 (Domínio: 40-60% do pool).
 * ASSUMIDO: Encharcado = efeito leve (severidade de Lentidão) porque o dono não disse o que ele faz; "ignora cobertura" não entra no custo.
 */
export const SOMBRAS = {
  sombraViva: { movCasas: 1, itens: 3 }, // movimento entre sombras
  caes: { dano: 14, custo: 14, recarga: 0, alcance: 4 },
  sapo: { dano: 12, custo: 15, recarga: 1, alcance: 4, puxa: 3 },
  coelhos: { custo: 12, recarga: 3, turnos: 2, esquivaPp: 20, move: 2 },
  totalidade: { danoPct: 20 }, // do cão que sobrou, depois que o outro é destruído
  serpente: { dano: 18, custo: 19, recarga: 1, alcance: 4, imobilizaTurnos: 1 },
  nue: { dano: 22, custo: 20, recarga: 1, alcance: 6, carrega: 3 },
  elefante: { dano: 26, custo: 30, recarga: 4, alcance: 4, lado: 3, encharcadoTurnos: 2 },
  abismo: { dano: 28, custo: 28, recarga: 3, alcance: 5, puxa: 2 },
  cervo: { custo: 26, recarga: 4, cura: 20, alcance: 3, removeEfeitos: 1 },
  tigre: { danoPctPorBaixa: 5, danoPctMax: 10 },
  boi: { dano: 32, custo: 39, recarga: 3, alcance: 6, danoSemCorrida: 20, corridaCasas: 3 },
  jardim: { custo: 60, turnos: 3, lado: 5, invocacaoDescontoPct: 25, sobrecargaTurnos: 2 },
};

/**
 * Árvore ZENIN · PUNHOS MÍSSEIS (técnica de clã, só punhos: sem arma equipada). Só dados por enquanto (empurrão/barreira/alcance no motor depois).
 * (24/11/2026, régua) Rajada de Punhos 24 → 22 (custo 25 → 22): alvo único à distância rende no máx. o corpo a corpo do nível (22).
 * Chuva de Punhos 30 → 28 foi DESFEITO no mesmo dia (corpo a corpo de referência do nível 20 subiu para 36 com o Golpe Compactado): 30 / custo 36 cabem.
 * Sete Punhos 44 → 40 (custo 39 → 37), rank S → A, 10 → 6 pontos: o ápice da primeira camada é 40 e o rank S só existe acima de 40
 * (ou com área x1,15), então um golpe de alvo único não chega a S.
 */
export const PUNHOS = {
  socoAcompanhado: { dano: 15, custo: 15, recarga: 0, empurra: 1 },
  corpoMacico: { vidaPct: 10 },
  rajada: { dano: 22, custo: 22, recarga: 2, alcance: 5, empurra: 2 },
  temperamento: { danoPctPorAcerto: 5, acumulos: 3 }, // por vez que recebe dano, até 3 vezes (+15%)
  enxame: { danoPct: 15 }, // técnicas da árvore que atingem mais de um alvo
  punhoGigante: { dano: 30, custo: 34, recarga: 3, alcance: 3 }, // quebra Barreira
  impacto: { danoFixoContraBarreira: 10 },
  chuva: { dano: 30, custo: 36, recarga: 4, alcance: 6, lado: 3 },
  setePunhos: { dano: 40, custo: 37, alcance: 5 },
};

/**
 * Queimadura (DoT de fogo): dano FIXO por turno (nunca % da vida). Reaplicar soma +1 turno até `teto`; "acúmulo" = +1 turno.
 * ASSUMIDO pela régua (o dono não informou): 3 por turno, que casa com a severidade de DoT da régua de custo (1,5 de EA por turno).
 */
export const QUEIMADURA = { danoPorTurno: 3, teto: 6 };

/**
 * Árvore do clã ZENIN (linhagem, só passivas): movimento, esquiva e armas. Janelas: perm | cond (gatilho) | burst (1x por combate).
 * Preço por profundidade como a Nanami (raiz 1, depois 2/3/4/5/6). Ainda não há esquiva nem controle no motor: só dados e régua.
 */
// (24/11/2026, dono: "máximo de 5 casas") Sangue Zenin 2 → 1 e Instante Decisivo 3 → 1 casas: cada janela, somada ao Passo Treinado (+1),
// cabe nas 2 casas acima da base (3 → 5). Juntas na 1ª rodada passariam de 5; o motor corta em MOV_MAX.
export const ZENIN = {
  sangueZenin: { movPrimeiraRodada: 1 },
  passoTreinado: { movCasas: 1 },
  maoArmeiro: { descontoPct: 5 }, // só técnicas físicas e de ferramenta amaldiçoada
  reflexos: { esquivaPp: 8 },
  // (24/11/2026, régua) Estudo de Armas 10 → 5 e Ritmo de Caça máx. 15 → 10: com a Coragem Ardente (Espadachim-Feiticeiro +10) o clã
  // somava 50% no mesmo golpe; agora 10 + 5 + 15 + 10 = 40, o teto.
  estudoArmas: { danoPct: 5 }, // só com ferramenta amaldiçoada equipada
  menteFria: { controleMenosRodadas: 1, minimo: 1 },
  contraAtaque: { danoPct: 15 }, // próximo golpe corpo a corpo depois de esquivar
  ritmoCaca: { danoPctPorRodada: 5, danoPctMax: 10 },
  instanteDecisivo: { turnos: 1, movCasas: 1, esquivaPp: 15 },
};

/**
 * Árvore do clã NANAMI (linhagem, só passivas). Cada bônus tem janela: perm (sempre), cond (depois de um gatilho) ou burst (1x por combate).
 * Preço por profundidade: raiz 1, depois 2/3/4/5/6 (a mesma escada da passiva racial).
 */
// (24/11/2026, régua, "faz o que achar melhor") Hora Extra dano 10 → 5: Lâmina Cega 10 + Voto 25 + Hora Extra 5 = 40, o teto de dano no mesmo golpe.
// (24/11/2026, régua) Expediente Encerrado desconto 25 → 18: com os 12% permanentes fecha em 30%, o teto de desconto de uso único.
export const NANAMI = {
  horaRegulamentada: { eaMaxPct: 5 },
  olhoPontoFraco: { kokusenPp: 1 },
  rotinaEscritorio: { descontoPct: 3 },
  golpeMedido: { kokusenPp: 2 },
  metodoTrabalho: { descontoPct: 4 },
  fluxoContinuo: { kokusenPp: 2, kokusenCondPp: 10, condTurnos: 2 },
  razao73: { precisaoPp: 10 },
  horaExtra: { aPartirRodada: 4, danoPct: 5, eaPorRodada: 2, fadigaRodada: 7, fadigaVida: 3 },
  eficienciaOficio: { descontoPct: 5 },
  expedienteEncerrado: { turnos: 3, kokusenPp: 4, descontoPct: 18, fadigaTurnos: 2, fadigaDanoPct: -15 },
};

/**
 * Árvore da técnica inata RATIO (Nanami). Números por nó; a estrutura (requisitos, caminhos) está em src/combat/arvores/ratio.js.
 * (24/11/2026, régua) Colapso 30 → 28 e Colapso Total 38 → 35 foram DESFEITOS no mesmo dia: o Golpe Compactado (36) elevou o corpo a corpo de
 * referência do nível 20 para 36, então 30 (custo 33) e 38 (custo 39) cabem. Ver docs/regua-balanceamento.md.
 */
export const RATIO = {
  razao: { ignoraReducaoPp: 15 },
  corte: { dano: 14, custo: 14, recarga: 0 },
  laminaCega: { danoArmaPct: 10, danoSemArmaPct: -10 },
  objetos: { danoConstrucaoMult: 2 },
  corteMembro: { dano: 22, custo: 23, recarga: 1, debuffDanoPct: -10, turnos: 2 },
  corteTronco: { dano: 30, custo: 32, recarga: 3 },
  votoHoraExtra: { custo: 20, recarga: 5, turnos: 3, danoPct: 25, eaPorRodada: 2, fadigaTurnos: 2, fadigaDanoPct: -10 },
  mostrarCartas: { custo: 12, recarga: 4, turnos: 3, danoPct: 20, precisaoPp: 10 },
  colapso: { dano: 30, custo: 33, recarga: 4, alcance: 4, lado: 3 },
  colapsoTotal: { dano: 38, custo: 39, alcance: 5, lado: 5, lentidaoTurnos: 2 },
};

/**
 * Árvore ZENIN · CORAGEM ARDENTE (técnica de clã, fogo e arma). Todas as técnicas exigem arma equipada. Só dados por enquanto:
 * Queimadura e reação aguardam os sistemas de debuffs e reação do motor.
 * (24/11/2026, régua) Chama Plena 40 → 35 foi DESFEITO no mesmo dia (referência do nível 20 subiu para 36 com o Golpe Compactado): 40 cabe.
 */
export const CORAGEM = {
  laminaFogo: { dano: 14, custo: 16, recarga: 0, queimChance: 0.6, queimTurnos: 2 },
  espadachim: { danoPct: 10 },
  calorIntenso: { queimDanoExtra: 2 },
  corteContraAtaque: { dano: 22, custo: 20, recarga: 2, queimChance: 1, queimTurnos: 2 },
  laminaRefaz: { danoPct: -10 },
  chamasEmVolta: { custo: 22, recarga: 4, turnos: 3, danoAura: 5, acumulos: 1 },
  corredor: { dano: 22, custo: 26, recarga: 3, alcance: 4, queimChance: 1, queimTurnos: 2 },
  corpoResistente: { reducaoFogoPct: 30 },
  chamaPlena: { dano: 40, custo: 40, lado: 3, queimChance: 1, queimTurnos: 2 },
};

/** Duração dos status em turnos do alvo. Atraído = 2 para sobreviver ao turno do inimigo e chegar ao próximo do dono. */
export const STATUS = { atraido: 2 };

/** Inimigo de treino. NPC não esquiva; vida compensa. */
export const MALDICAO_GRAU4 = {
  id: 'maldicao_grau4', nome: 'Maldição de Grau 4', emoji: '👹', vidaMax: 80, xp: 60,
  atributos: { forca: 0, agilidade: 2, resistencia: 0, controle: 0, producao: 0, percepcao: 0 },
  ataque: { nome: 'Garra', dano: 9 },
};
