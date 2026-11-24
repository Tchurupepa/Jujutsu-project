// Árvore da técnica inata RATIO (clã Nanami). Paga e exige o status Técnica Inata. As técnicas exigem arma ou punhos.
// Só DADOS por enquanto: os números vêm de RATIO (balance.js) e a régua audita (`npm run regua`, test/regua.test.js).
// O motor de combate ainda não executa estes nós (ponto fraco, área, arma/punhos entram quando o dono liberar).
import { RATIO as R } from '../balance.js';

export const ARVORE_RATIO = {
  id: 'ratio', nome: 'Ratio', stat: 'tecnica_inata', cla: 'nanami', exige: 'arma ou punhos',
  caminhos: {
    golpes: ['razao', 'corte', 'corte_membro', 'corte_tronco', 'colapso', 'colapso_total'],
    votos: ['razao', 'lamina_cega', 'voto_hora_extra', 'mostrar_cartas', 'colapso_total'],
    objetos: ['razao', 'corte', 'razao_sobre_objetos'],
  },
  nos: [
    { id: 'razao', nome: 'Razão 7:3', tipo: 'raiz', pontos: 1, nivel: 1, requisito: 1, cla: 'nanami', requer: [] },
    { id: 'corte', nome: 'Corte 7:3', tipo: 'tecnica', rank: 'D', pontos: 1, nivel: 1, requisito: 2, requer: ['razao'],
      custo: R.corte.custo, recarga: R.corte.recarga, regua: { dano: R.corte.dano } },
    { id: 'lamina_cega', nome: 'Lâmina Cega', tipo: 'passiva', pontos: 2, nivel: 3, requisito: 3, requer: ['razao'],
      bonus: [{ janela: 'cond', danoPct: R.laminaCega.danoArmaPct, so: ['arma'] }] }, // com arma; sem arma é -10%
    { id: 'razao_sobre_objetos', nome: 'Razão sobre Objetos', tipo: 'passiva', pontos: 2, nivel: 5, requisito: 4, requer: ['corte'] },
    // Golpes pesados também pedem Força (mínimo, não gasto): soma do caminho ÷ 3. Ratio aceita punhos, então não pede Maestria em Armas.
    { id: 'corte_membro', nome: 'Corte de Membro', tipo: 'tecnica', rank: 'C', pontos: 3, nivel: 5, requisito: 5, requer: ['corte'], exige: { forca: 2 },
      custo: R.corteMembro.custo, recarga: R.corteMembro.recarga,
      regua: { dano: R.corteMembro.dano, efeitos: [{ id: 'lentidao', duracao: R.corteMembro.turnos }] }, // -10% de dano do alvo ≈ Lentidão
    },
    { id: 'corte_tronco', nome: 'Corte no Tronco', tipo: 'tecnica', rank: 'B', pontos: 4, nivel: 12, requisito: 9, requer: ['corte_membro'], exige: { forca: 3 },
      custo: R.corteTronco.custo, recarga: R.corteTronco.recarga, regua: { dano: R.corteTronco.dano } },
    { id: 'voto_hora_extra', nome: 'Voto de Hora Extra', tipo: 'buff', rank: 'B', pontos: 4, nivel: 12, requisito: 7, requer: ['lamina_cega'],
      custo: R.votoHoraExtra.custo, recarga: R.votoHoraExtra.recarga, regua: { semDano: true, acao: 'bonus' },
      bonus: [{ janela: 'cond', danoPct: R.votoHoraExtra.danoPct }] }, // Mostrar as Cartas (+20) não soma com o Voto: vale o maior
    { id: 'mostrar_cartas', nome: 'Mostrar as Cartas', tipo: 'buff', rank: 'B', pontos: 4, nivel: 14, requisito: 11, requer: ['voto_hora_extra'],
      custo: R.mostrarCartas.custo, recarga: R.mostrarCartas.recarga, regua: { semDano: true, acao: 'bonus' } },
    { id: 'colapso', nome: 'Colapso', tipo: 'tecnica', rank: 'A', pontos: 6, nivel: 20, requisito: 21, requer: ['corte_tronco', 'voto_hora_extra'], exige: { forca: 7 },
      custo: R.colapso.custo, recarga: R.colapso.recarga,
      regua: { dano: R.colapso.dano, area: true, casas: R.colapso.lado ** 2, preparo: true } }, // exige o Voto ativo = preparo
    { id: 'colapso_total', nome: 'Colapso Total', tipo: 'tecnica', rank: 'S', pontos: 10, nivel: 30, requisito: 35, requer: ['colapso', 'mostrar_cartas'], exige: { forca: 12 },
      custo: R.colapsoTotal.custo, recarga: 99, // uso único por combate
      regua: {
        dano: R.colapsoTotal.dano, area: true, casas: R.colapsoTotal.lado ** 2, final: true, preparo: true, usoUnico: true,
        efeitos: [{ id: 'lentidao', duracao: R.colapsoTotal.lentidaoTurnos }],
      } },
  ],
};
