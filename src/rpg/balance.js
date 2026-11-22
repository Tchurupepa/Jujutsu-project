// Todo número de balanceamento mora aqui (nunca constante mágica espalhada). Um teste trava os valores publicados.

/** Pesos (soma 10.000) da raridade da técnica. Mítica não sai por sorteio. */
export const PESO_TECNICA = { comum: 5500, rara: 2700, epica: 1200, lendaria: 600 };

/** Pity por CONTA (sobrevive a recriar a ficha): giros seguidos sem Épica+/Lendária até o piso garantido. */
export const PITY = { epica: 50, lendaria: 100 };

/** Chance (em %) de a técnica do clã sair em vez do sorteio comum, quando ela é compatível com a raridade sorteada. */
export const CHANCE_TECNICA_DO_CLA = 30;

/** Giros extras na ficha, por eixo (além do sorteio inicial). */
export const GIROS_INICIAIS = { origem: 3, cla: 3, tecnica: 3 };

export const NIVEL_MAX = 100;
export const PONTOS_POR_NIVEL = 4;
export const VIDA_BASE = 100;
export const VIDA_POR_NIVEL = 10;
export const VIDA_POR_RESISTENCIA = 5;
export const EA_BASE = 100;
export const EA_POR_PRODUCAO = 5;

export const NOME = { min: 2, max: 24 };
export const IDADE = { min: 15, max: 80 };
export const HISTORIA = { min: 20, max: 1500 };
