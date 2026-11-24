// Árvore ZENIN · CORAGEM ARDENTE (exclusiva do clã Zenin). Paga e exige Técnica Inata. Todas as técnicas exigem arma equipada.
// Só DADOS por enquanto: Queimadura (DoT) e reação aguardam os sistemas do motor. Números em CORAGEM (balance.js).
// Passivas custam pela escada de profundidade (2/3/3/4), como a linhagem; a régua pura pediria 2 fixo (ver docs).
import { CORAGEM as C } from '../balance.js';

const queima = (chance, turnos) => ({ id: 'dot', duracao: turnos, chance });

export const ARVORE_CORAGEM = {
  id: 'coragem', nome: 'Coragem Ardente', stat: 'tecnica_inata', cla: 'zenin', exige: 'arma equipada', precoPassiva: 'escada',
  caminhos: {
    lamina: ['chama_na_lamina', 'lamina_de_fogo', 'corte_contra_ataque', 'corredor_de_chamas'],
    calor: ['chama_na_lamina', 'lamina_de_fogo', 'calor_intenso'],
    espadachim: ['chama_na_lamina', 'espadachim_feiticeiro', 'lamina_que_se_refaz'],
    aura: ['chama_na_lamina', 'espadachim_feiticeiro', 'chamas_em_volta', 'corpo_resistente_ao_calor'],
    topo: ['chamas_em_volta', 'corredor_de_chamas', 'chama_plena'],
  },
  nos: [
    { id: 'chama_na_lamina', nome: 'Chama na Lâmina', tipo: 'raiz', pontos: 1, nivel: 1, requisito: 1, cla: 'zenin', requer: [] },
    { id: 'lamina_de_fogo', nome: 'Lâmina de Fogo', tipo: 'tecnica', rank: 'D', pontos: 1, nivel: 1, requisito: 2, requer: ['chama_na_lamina'], exige: { maestria_armas: 1 },
      custo: C.laminaFogo.custo, recarga: C.laminaFogo.recarga, aguarda: ['debuffs'],
      regua: { dano: C.laminaFogo.dano, efeitos: [queima(C.laminaFogo.queimChance, C.laminaFogo.queimTurnos)] } },
    { id: 'espadachim_feiticeiro', nome: 'Espadachim-Feiticeiro', tipo: 'passiva', pontos: 2, nivel: 3, requisito: 3, requer: ['chama_na_lamina'],
      bonus: [{ janela: 'cond', danoPct: C.espadachim.danoPct, so: ['arma'] }] }, // só com arma equipada
    { id: 'calor_intenso', nome: 'Calor Intenso', tipo: 'passiva', pontos: 3, nivel: 5, requisito: 5, requer: ['lamina_de_fogo'], aguarda: ['debuffs'],
      bonus: [{ janela: 'perm', queimDanoExtra: C.calorIntenso.queimDanoExtra }] },
    { id: 'corte_contra_ataque', nome: 'Corte de Contra-ataque', tipo: 'tecnica', rank: 'C', pontos: 3, nivel: 5, requisito: 5, requer: ['lamina_de_fogo'], exige: { maestria_armas: 2 },
      custo: C.corteContraAtaque.custo, recarga: C.corteContraAtaque.recarga, aguarda: ['reacao', 'debuffs'],
      regua: { dano: C.corteContraAtaque.dano, acao: 'reacao', efeitos: [queima(C.corteContraAtaque.queimChance, C.corteContraAtaque.queimTurnos)] } },
    { id: 'lamina_que_se_refaz', nome: 'Lâmina que se Refaz', tipo: 'passiva', pontos: 3, nivel: 8, requisito: 6, requer: ['espadachim_feiticeiro'] },
    { id: 'chamas_em_volta', nome: 'Chamas em Volta', tipo: 'buff', rank: 'B', pontos: 4, nivel: 12, requisito: 7, requer: ['espadachim_feiticeiro'], exige: { maestria_armas: 3 },
      custo: C.chamasEmVolta.custo, recarga: C.chamasEmVolta.recarga, aguarda: ['debuffs'],
      // modo de 3 rodadas: dano de aura total = 5 x 3; o custo é ESCRITO (fora da fórmula), com dano/energia e recarga conferidos
      regua: { modo: true, acao: 'bonus', dano: C.chamasEmVolta.danoAura * C.chamasEmVolta.turnos } },
    { id: 'corredor_de_chamas', nome: 'Corredor de Chamas', tipo: 'tecnica', rank: 'B', pontos: 4, nivel: 12, requisito: 9, requer: ['corte_contra_ataque'], exige: { maestria_armas: 3 },
      custo: C.corredor.custo, recarga: C.corredor.recarga, aguarda: ['debuffs'],
      regua: { dano: C.corredor.dano, area: true, casas: C.corredor.alcance, efeitos: [queima(C.corredor.queimChance, C.corredor.queimTurnos)] } },
    { id: 'corpo_resistente_ao_calor', nome: 'Corpo Resistente ao Calor', tipo: 'passiva', pontos: 4, nivel: 14, requisito: 11, requer: ['chamas_em_volta'],
      bonus: [{ janela: 'cond', reducaoPct: C.corpoResistente.reducaoFogoPct }] }, // só contra dano de fogo
    { id: 'chama_plena', nome: 'Chama Plena', tipo: 'tecnica', rank: 'S', pontos: 10, nivel: 30, requisito: 25, requer: ['chamas_em_volta', 'corredor_de_chamas'], exige: { maestria_armas: 9 },
      custo: C.chamaPlena.custo, recarga: 99, aguarda: ['debuffs'], // uso único por combate
      regua: {
        dano: C.chamaPlena.dano, area: true, casas: C.chamaPlena.lado ** 2, final: true, preparo: true, usoUnico: true, // exige Chamas em Volta ativa
        efeitos: [queima(C.chamaPlena.queimChance, C.chamaPlena.queimTurnos)],
      } },
  ],
};
