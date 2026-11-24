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
export const PUNHO_ENERGIA = { custo: 20, recarga: 5, alcance: 99, turnos: 4, forcaPct: 30, kokusenChance: 0.5 };
/**
 * Kokusen (Black Flash) vindo do Punho: o golpe causa dano x`mult` e abre o estado Kokusen por `turnos` (4 = 3 turnos seguintes):
 * +eaPct% de EA no início de cada turno, +chanceBonus pontos de chance de Kokusen (cai chanceDecai a cada Kokusen acertado
 * enquanto o estado dura, nunca abaixo de 0) e +danoPct% de dano em tudo.
 */
export const KOKUSEN = { mult: 2, turnos: 4, eaPct: 5, chanceBonus: 20, chanceDecai: 5, danoPct: 10 };

/** Duração dos status em turnos do alvo. Atraído = 2 para sobreviver ao turno do inimigo e chegar ao próximo do dono. */
export const STATUS = { atraido: 2 };

/** Inimigo de treino. NPC não esquiva; vida compensa. */
export const MALDICAO_GRAU4 = {
  id: 'maldicao_grau4', nome: 'Maldição de Grau 4', emoji: '👹', vidaMax: 80, xp: 60,
  atributos: { forca: 0, agilidade: 2, resistencia: 0, controle: 0, producao: 0, percepcao: 0 },
  ataque: { nome: 'Garra', dano: 9 },
};
