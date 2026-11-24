// Árvore ZENIN · DEZ SOMBRAS (sem Mahoraga; exclusiva do clã Zenin). Paga e exige Técnica Inata. Só DADOS por enquanto.
// Cada nó de shikigami é uma ação comum (invoca e age). Cães Divinos são de graça; os outros pedem também um ritual de domesticação
// (missão da staff). Shikigami destruído não volta no mesmo combate. Números em SOMBRAS (balance.js).
// `aguarda`: shikigami (invocação, vida, destruição), missao (ritual da staff), debuffs, esquiva.
import { SOMBRAS as S } from '../balance.js';

const efeito = (id, duracao, chance = 1) => ({ id, duracao, chance });
// Bônus que dependem de baixa de shikigami valem só para ataques de shikigami à distância (nenhum shikigami ataca corpo a corpo).
const SO_SHIKIGAMI = ['shikigami', 'ranged'];

export const ARVORE_SOMBRAS = {
  id: 'sombras', nome: 'Dez Sombras', stat: 'tecnica_inata', cla: 'zenin', exige: 'shikigami',
  caminhos: {
    caes: ['sombra_viva', 'caes_divinos', 'cao_divino_totalidade'],
    caca: ['sombra_viva', 'caes_divinos', 'grande_serpente', 'elefante_maximo', 'boi_perfurante', 'jardim_de_sombras_quimericas'],
    vooControle: ['sombra_viva', 'sapo', 'nue', 'abismo_desconhecido_do_poco'],
    suporte: ['sombra_viva', 'coelhos_em_fuga', 'cervo_redondo', 'tigre_funebre'],
  },
  nos: [
    { id: 'sombra_viva', nome: 'Sombra Viva', tipo: 'raiz', pontos: 1, nivel: 1, requisito: 1, cla: 'zenin', requer: [],
      bonus: [{ janela: 'cond', movCasas: S.sombraViva.movCasas }] }, // movimento entre sombras
    { id: 'caes_divinos', nome: 'Cães Divinos', tipo: 'tecnica', rank: 'D', pontos: 1, nivel: 1, requisito: 2, requer: ['sombra_viva'],
      custo: S.caes.custo, recarga: S.caes.recarga, aguarda: ['shikigami'], regua: { dano: S.caes.dano, alcance: S.caes.alcance } },
    { id: 'sapo', nome: 'Sapo', tipo: 'tecnica', rank: 'D', pontos: 1, nivel: 1, requisito: 2, requer: ['sombra_viva'], ritual: true,
      custo: S.sapo.custo, recarga: S.sapo.recarga, aguarda: ['shikigami', 'missao'], regua: { dano: S.sapo.dano, alcance: S.sapo.alcance, puxa: S.sapo.puxa } },
    { id: 'coelhos_em_fuga', nome: 'Coelhos em Fuga', tipo: 'buff', rank: 'C', pontos: 3, nivel: 8, requisito: 4, requer: ['sombra_viva'], ritual: true,
      custo: S.coelhos.custo, recarga: S.coelhos.recarga, aguarda: ['shikigami', 'missao', 'esquiva'],
      regua: { semDano: true, acao: 'bonus' }, bonus: [{ janela: 'cond', esquivaPp: S.coelhos.esquivaPp }] },
    { id: 'cao_divino_totalidade', nome: 'Cão Divino: Totalidade', tipo: 'passiva', pontos: 2, nivel: 5, requisito: 4, requer: ['caes_divinos'], aguarda: ['shikigami'],
      bonus: [{ janela: 'cond', danoPct: S.totalidade.danoPct, so: SO_SHIKIGAMI }] },
    { id: 'grande_serpente', nome: 'Grande Serpente', tipo: 'tecnica', rank: 'D', pontos: 1, nivel: 3, requisito: 3, requer: ['caes_divinos'], ritual: true,
      custo: S.serpente.custo, recarga: S.serpente.recarga, aguarda: ['shikigami', 'missao', 'debuffs'],
      regua: { dano: S.serpente.dano, alcance: S.serpente.alcance, efeitos: [efeito('imobilizar', S.serpente.imobilizaTurnos)] } },
    { id: 'nue', nome: 'Nue', tipo: 'tecnica', rank: 'C', pontos: 3, nivel: 5, requisito: 5, requer: ['sapo'], ritual: true,
      custo: S.nue.custo, recarga: S.nue.recarga, aguarda: ['shikigami', 'missao'],
      regua: { dano: S.nue.dano, alcance: S.nue.alcance, deslocaSi: S.nue.carrega } },
    { id: 'elefante_maximo', nome: 'Elefante Máximo', tipo: 'tecnica', rank: 'B', pontos: 4, nivel: 12, requisito: 7, requer: ['grande_serpente'], ritual: true,
      custo: S.elefante.custo, recarga: S.elefante.recarga, aguarda: ['shikigami', 'missao', 'debuffs'],
      // Encharcado: efeito ASSUMIDO leve (severidade de Lentidão)
      regua: { dano: S.elefante.dano, alcance: S.elefante.alcance, area: true, casas: S.elefante.lado ** 2, efeitos: [efeito('lentidao', S.elefante.encharcadoTurnos)] } },
    { id: 'abismo_desconhecido_do_poco', nome: 'Abismo Desconhecido do Poço', tipo: 'tecnica', rank: 'B', pontos: 4, nivel: 12, requisito: 9, requer: ['nue'],
      custo: S.abismo.custo, recarga: S.abismo.recarga, aguarda: ['shikigami'],
      regua: { dano: S.abismo.dano, alcance: S.abismo.alcance, puxa: S.abismo.puxa, preparo: true } }, // só com Nue e Sapo vivos
    { id: 'cervo_redondo', nome: 'Cervo Redondo', tipo: 'buff', rank: 'B', pontos: 4, nivel: 12, requisito: 8, requer: ['coelhos_em_fuga'], ritual: true,
      custo: S.cervo.custo, recarga: S.cervo.recarga, aguarda: ['shikigami', 'missao', 'debuffs'],
      // utilidade sem dano (cura 20 + limpa 1 efeito): custo ESCRITO, fora da fórmula; dano/energia conta a cura como saída
      regua: { modo: true, dano: S.cervo.cura } },
    { id: 'tigre_funebre', nome: 'Tigre Fúnebre', tipo: 'passiva', pontos: 2, nivel: 14, requisito: 10, requer: ['cervo_redondo'], aguarda: ['shikigami'],
      bonus: [{ janela: 'cond', danoPct: S.tigre.danoPctMax, so: SO_SHIKIGAMI }] }, // +5% por baixa, máx. +10%
    { id: 'boi_perfurante', nome: 'Boi Perfurante', tipo: 'tecnica', rank: 'A', pontos: 6, nivel: 20, requisito: 13, requer: ['elefante_maximo'], ritual: true,
      custo: S.boi.custo, recarga: S.boi.recarga, aguarda: ['shikigami', 'missao'],
      // investida em linha; dano cheio exige correr 3 casas em linha reta (condição = preparo)
      regua: { dano: S.boi.dano, alcance: S.boi.alcance, area: true, casas: S.boi.alcance, investida: true, preparo: true } },
    { id: 'jardim_de_sombras_quimericas', nome: 'Jardim de Sombras Quiméricas', tipo: 'tecnica', rank: 'S', pontos: 10, nivel: 30, requisito: 23, requer: ['boi_perfurante'],
      custo: S.jardim.custo, recarga: 99, aguarda: ['shikigami'], // uso único; Sobrecarga de 2 rodadas depois
      regua: { dominio: true, usoUnico: true, area: true, casas: S.jardim.lado ** 2 } },
  ],
};
