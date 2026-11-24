// Árvore ZENIN · PUNHOS MÍSSEIS (exclusiva do clã Zenin). Paga e exige Técnica Inata. Só golpe com os punhos (sem arma equipada).
// Só DADOS por enquanto. Números em PUNHOS (balance.js). Passivas pelo poder, dentro da faixa 2..escada por profundidade (precoPassiva 'faixa').
// Força (mínimo, não gasto) em todas as técnicas: soma do caminho ÷ 3. Aguarda: Barreira (Punho Gigante, Impacto Devastado) e empurrão/alcance no motor.
import { PUNHOS as P } from '../balance.js';

export const ARVORE_PUNHOS = {
  id: 'punhos', nome: 'Punhos Mísseis', stat: 'tecnica_inata', cla: 'zenin', exige: 'punhos (sem arma)', precoPassiva: 'faixa',
  caminhos: {
    golpes: ['punho_espelhado', 'soco_acompanhado', 'rajada_de_punhos', 'punho_gigante', 'chuva_de_punhos', 'sete_punhos'],
    corpo: ['punho_espelhado', 'corpo_macico', 'temperamento_explosivo', 'enxame_de_punhos'],
    impacto: ['punho_gigante', 'impacto_devastador'],
  },
  nos: [
    { id: 'punho_espelhado', nome: 'Punho Espelhado', tipo: 'raiz', pontos: 1, nivel: 1, requisito: 1, cla: 'zenin', requer: [] },
    { id: 'soco_acompanhado', nome: 'Soco Acompanhado', tipo: 'tecnica', rank: 'D', pontos: 1, nivel: 1, requisito: 2, requer: ['punho_espelhado'], exige: { forca: 1 },
      custo: P.socoAcompanhado.custo, recarga: P.socoAcompanhado.recarga, regua: { dano: P.socoAcompanhado.dano, empurra: P.socoAcompanhado.empurra } },
    { id: 'corpo_macico', nome: 'Corpo Maciço', tipo: 'passiva', pontos: 2, nivel: 3, requisito: 3, requer: ['punho_espelhado'],
      bonus: [{ janela: 'perm', vidaPct: P.corpoMacico.vidaPct }] },
    { id: 'rajada_de_punhos', nome: 'Rajada de Punhos', tipo: 'tecnica', rank: 'C', pontos: 3, nivel: 5, requisito: 5, requer: ['soco_acompanhado'], exige: { forca: 2 },
      custo: P.rajada.custo, recarga: P.rajada.recarga, regua: { dano: P.rajada.dano, alcance: P.rajada.alcance, empurra: P.rajada.empurra } },
    { id: 'temperamento_explosivo', nome: 'Temperamento Explosivo', tipo: 'passiva', pontos: 3, nivel: 8, requisito: 6, requer: ['corpo_macico'],
      bonus: [{ janela: 'cond', danoPct: P.temperamento.danoPctPorAcerto * P.temperamento.acumulos, so: ['punhos'] }] }, // +5% por dano recebido, até 3x
    { id: 'enxame_de_punhos', nome: 'Enxame de Punhos', tipo: 'passiva', pontos: 3, nivel: 12, requisito: 9, requer: ['temperamento_explosivo'],
      // só técnicas que atingem mais de um alvo: hoje só a Chuva de Punhos (à distância). Se surgir área corpo a corpo, revisar o teto de dano.
      bonus: [{ janela: 'cond', danoPct: P.enxame.danoPct, so: ['punhos', 'multi', 'ranged'] }] },
    { id: 'punho_gigante', nome: 'Punho Gigante', tipo: 'tecnica', rank: 'B', pontos: 4, nivel: 12, requisito: 9, requer: ['rajada_de_punhos'], exige: { forca: 3 },
      custo: P.punhoGigante.custo, recarga: P.punhoGigante.recarga, aguarda: ['barreira'],
      regua: { dano: P.punhoGigante.dano, alcance: P.punhoGigante.alcance, quebraBarreira: true } },
    { id: 'impacto_devastador', nome: 'Impacto Devastador', tipo: 'passiva', pontos: 4, nivel: 14, requisito: 13, requer: ['punho_gigante'], aguarda: ['barreira'] },
    { id: 'chuva_de_punhos', nome: 'Chuva de Punhos', tipo: 'tecnica', rank: 'A', pontos: 6, nivel: 20, requisito: 15, requer: ['punho_gigante'], exige: { forca: 5 },
      custo: P.chuva.custo, recarga: P.chuva.recarga,
      regua: { dano: P.chuva.dano, alcance: P.chuva.alcance, area: true, casas: P.chuva.lado ** 2 } },
    { id: 'sete_punhos', nome: 'Sete Punhos', tipo: 'tecnica', rank: 'A', pontos: 6, nivel: 30, requisito: 21, requer: ['chuva_de_punhos'], exige: { forca: 7 },
      custo: P.setePunhos.custo, recarga: 99, // uso único por combate
      regua: { dano: P.setePunhos.dano, alcance: P.setePunhos.alcance, final: true, usoUnico: true } },
  ],
};
